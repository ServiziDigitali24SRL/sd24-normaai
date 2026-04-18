/**
 * chat-stream.ts
 * Client-side helpers for talking to /api/chat with resilient retry logic and
 * user-friendly error messages. Used by ChatBar and ruixen-moon-chat.
 *
 * Design choices:
 *  - Retry only BEFORE the first byte of the SSE stream arrives. Once the server
 *    starts streaming we never retry: we may already have shown partial text.
 *  - Retry on network errors, timeouts, and transient server errors (5xx, 429).
 *  - Do NOT retry on 4xx other than 429 (client error — retry won't help).
 *  - Expose a single `fetchChatStream()` that returns a Response ready to be
 *    consumed with `res.body.getReader()` by the caller (existing SSE logic).
 */

export interface FetchChatOptions {
  /** External abort signal (e.g. component unmount). */
  signal?: AbortSignal;
  /** Max retry attempts on transient errors (default: 2 → total 3 tries). */
  maxRetries?: number;
  /** Timeout for the initial fetch/headers (default: 20s). */
  initialTimeoutMs?: number;
}

const DEFAULT_BACKOFFS_MS = [600, 1800, 4000];

/**
 * Outcome of classifying a failed request, used to decide whether to retry
 * and what message to show the user.
 */
export type ChatErrorKind =
  | "timeout"
  | "network"
  | "server" // 5xx
  | "rate_limit" // 429
  | "payment_required" // 402 (handled by caller, not retried)
  | "client" // other 4xx
  | "aborted"
  | "unknown";

export interface ChatError extends Error {
  kind: ChatErrorKind;
  status?: number;
}

function makeError(kind: ChatErrorKind, message: string, status?: number): ChatError {
  const e = new Error(message) as ChatError;
  e.kind = kind;
  e.status = status;
  return e;
}

function classifyResponse(status: number): ChatErrorKind {
  if (status === 429) return "rate_limit";
  if (status === 402) return "payment_required";
  if (status >= 500) return "server";
  if (status >= 400) return "client";
  return "unknown";
}

function isRetryable(kind: ChatErrorKind): boolean {
  return kind === "timeout" || kind === "network" || kind === "server" || kind === "rate_limit";
}

/**
 * Perform POST /api/chat with automatic retry on transient failures.
 * Returns the Response once headers arrive successfully (status 2xx).
 * The caller is responsible for reading the SSE body.
 *
 * For non-2xx statuses that are NOT retryable (e.g. 402 payment required),
 * the Response is returned as-is so the caller can inspect it.
 *
 * Throws a `ChatError` if all retries are exhausted or on abort.
 */
export async function fetchChatStream(
  body: unknown,
  opts: FetchChatOptions = {}
): Promise<Response> {
  const maxRetries = opts.maxRetries ?? 2;
  const initialTimeoutMs = opts.initialTimeoutMs ?? 20_000;

  let lastError: ChatError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check external abort before each attempt
    if (opts.signal?.aborted) {
      throw makeError("aborted", "Richiesta annullata.");
    }

    const internalAbort = new AbortController();
    const onExternalAbort = () => internalAbort.abort();
    opts.signal?.addEventListener("abort", onExternalAbort, { once: true });

    const timeoutHandle = setTimeout(() => internalAbort.abort(), initialTimeoutMs);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: internalAbort.signal,
      });

      // Headers received — clear the initial-response timeout. The body stream
      // itself is free to take as long as it needs.
      clearTimeout(timeoutHandle);
      opts.signal?.removeEventListener("abort", onExternalAbort);

      if (res.ok) return res;

      const kind = classifyResponse(res.status);

      // 402 (and other non-retryable statuses) → return to caller as-is
      if (!isRetryable(kind)) return res;

      lastError = makeError(kind, `HTTP ${res.status}`, res.status);

      // Best effort: consume and discard body so the connection can be reused
      try { await res.body?.cancel(); } catch { /* ignore */ }
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);
      opts.signal?.removeEventListener("abort", onExternalAbort);

      // External abort (component unmount, user-cancel) — never retry
      if (opts.signal?.aborted) {
        throw makeError("aborted", "Richiesta annullata.");
      }

      // AbortError from our own timeout
      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = makeError("timeout", "Timeout sulla richiesta.");
      } else {
        lastError = makeError("network", "Errore di rete.");
      }
    }

    // If we're here, the attempt failed with a retryable error
    if (attempt < maxRetries) {
      const backoff = DEFAULT_BACKOFFS_MS[attempt] ?? 4000;
      // Add small jitter (±20%) to avoid thundering herd on shared outage
      const jitter = backoff * (0.8 + Math.random() * 0.4);
      await sleep(jitter, opts.signal);
    }
  }

  throw lastError ?? makeError("unknown", "Errore sconosciuto.");
}

/**
 * Sleep that respects an abort signal. Resolves early if signal fires.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const handle = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(handle);
        resolve();
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/**
 * Produce a user-facing Italian message for an error thrown by fetchChatStream
 * (or raised when the SSE stream breaks mid-flight).
 *
 * `midStream` = true means the stream started successfully and then broke; in
 * that case we tell the user explicitly that the answer was interrupted.
 */
export function formatChatErrorMessage(err: unknown, midStream = false): string {
  const e = err as Partial<ChatError> | undefined;
  const kind: ChatErrorKind = (e && typeof e.kind === "string" ? e.kind : "unknown") as ChatErrorKind;

  if (midStream) {
    return "La risposta è stata interrotta. Tocca Riprova per rigenerarla.";
  }

  switch (kind) {
    case "timeout":
      return "Il sistema è momentaneamente rallentato. Riprova tra qualche secondo.";
    case "server":
      return "Il servizio sta ripartendo. Riprova tra 30 secondi.";
    case "rate_limit":
      return "Troppe richieste in questo momento. Attendi un istante e riprova.";
    case "network":
      return "Connessione instabile. Controlla la rete e riprova.";
    case "aborted":
      return "Richiesta annullata.";
    case "client":
      return "Richiesta non valida. Ricarica la pagina e riprova.";
    default:
      return "Impossibile connettersi. Riprova tra qualche secondo.";
  }
}
