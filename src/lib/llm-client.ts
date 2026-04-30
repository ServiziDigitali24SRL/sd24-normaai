/**
 * llm-client.ts
 * Server-side LLM client: OpenRouter primary (via OpenAI-compatible
 * /chat/completions endpoint) with Anthropic direct fallback.
 *
 * Design:
 *  - connectOpenRouter() awaits the HTTP connection + headers (15s timeout).
 *    If that fails the caller can immediately fall back to Anthropic direct
 *    before any streaming begins.
 *  - readOpenRouterStream() is a lazy AsyncGenerator — it starts reading
 *    only when the caller iterates. No timeout on the body stream (responses
 *    can legitimately take 30-60 s for long legal answers).
 *  - If OPENROUTER_API_KEY is absent, falls straight through to Anthropic.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageStreamEvent,
  MessageCreateParamsStreaming,
} from "@anthropic-ai/sdk/resources/messages";
import type { Stream } from "@anthropic-ai/sdk/streaming";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODEL_MAP = {
  openrouter: {
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.5",
    "claude-opus-4-6":   "anthropic/claude-opus-4.1",
  } as Record<string, string>,
  anthropic: {} as Record<string, string>,
};

const OPENROUTER_FALLBACKS: Record<string, string[]> = {
  "anthropic/claude-sonnet-4.5": ["openai/gpt-4o", "google/gemini-2.5-pro"],
  "anthropic/claude-opus-4.1":   ["openai/gpt-4o", "anthropic/claude-sonnet-4.5"],
};

export type LLMProvider = "openrouter" | "anthropic_direct";

export interface LLMStreamResult {
  stream: AsyncIterable<MessageStreamEvent>;
  provider: LLMProvider;
  resolvedModel: string;
}

export interface CreateLLMStreamParams {
  model: string;
  max_tokens: number;
  system: MessageCreateParamsStreaming["system"];
  messages: MessageCreateParamsStreaming["messages"];
}

// ── helpers ──────────────────────────────────────────────────────────────

interface OAIDelta { content?: string | null; }
interface OAIChoice { delta: OAIDelta; finish_reason: string | null; }
interface OAIUsage { completion_tokens: number; }
interface OAIChunk { choices: OAIChoice[]; usage?: OAIUsage | null; }

function toOAIMessages(
  system: MessageCreateParamsStreaming["system"],
  messages: MessageCreateParamsStreaming["messages"]
): Array<{ role: string; content: string }> {
  const result: Array<{ role: string; content: string }> = [];
  if (system) {
    const text = typeof system === "string"
      ? system
      : system.map((b) => ("text" in b ? b.text : "")).join("\n");
    result.push({ role: "system", content: text });
  }
  for (const msg of messages) {
    const content = typeof msg.content === "string"
      ? msg.content
      : msg.content.map((b) => ("text" in b ? b.text : "")).join("");
    result.push({ role: msg.role, content });
  }
  return result;
}

function parseSseLine(line: string): OAIChunk | null {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6).trim();
  if (payload === "[DONE]") return null;
  try { return JSON.parse(payload); } catch { return null; }
}

// ── OpenRouter connection (awaited, with timeout) ─────────────────────────

/**
 * Open the HTTP connection to OpenRouter and wait for the response headers.
 * Throws on non-2xx or if headers don't arrive within 15 s.
 * Returns the raw stream reader so the caller can start iterating lazily.
 */
async function connectOpenRouter(
  params: CreateLLMStreamParams
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const key   = process.env.OPENROUTER_API_KEY!;
  const site  = process.env.OPENROUTER_SITE_URL  ?? "https://normaai.it";
  const title = process.env.OPENROUTER_APP_NAME  ?? "NormaAI";
  const model = MODEL_MAP.openrouter[params.model] ?? params.model;

  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer":  site,
      "X-Title":       title,
    },
    body: JSON.stringify({
      model,
      messages:       toOAIMessages(params.system, params.messages),
      max_tokens:     params.max_tokens,
      stream:         true,
      stream_options: { include_usage: true },
      // OpenRouter model-level fallbacks (used when primary is unavailable)
      ...(OPENROUTER_FALLBACKS[model]?.length
        ? { models: [model, ...OPENROUTER_FALLBACKS[model]] }
        : {}),
    }),
    // Timeout only for the initial connection + response headers.
    // The body stream itself is unbounded.
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    const e   = new Error(`OpenRouter ${res.status}: ${txt.slice(0, 300)}`) as Error & { status: number };
    e.status  = res.status;
    throw e;
  }

  return res.body.getReader();
}

// ── OpenRouter stream reader (lazy AsyncGenerator) ────────────────────────

/**
 * Translate OpenAI-format SSE chunks from an already-connected OpenRouter
 * stream into Anthropic-compatible MessageStreamEvent objects.
 * This generator is lazy — no I/O happens until the caller iterates.
 */
async function* readOpenRouterStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<MessageStreamEvent> {
  const dec = new TextDecoder();
  let buf = "";
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      const chunk = parseSseLine(line.trimEnd());
      if (!chunk) continue;

      const delta        = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      if (delta?.content) {
        yield {
          type:  "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: delta.content },
        } as MessageStreamEvent;
      }

      if (chunk.usage?.completion_tokens) {
        outputTokens = chunk.usage.completion_tokens;
      }

      if (finishReason === "stop" || finishReason === "end_turn") {
        yield {
          type:  "message_delta",
          delta: { stop_reason: "end_turn", stop_sequence: null },
          usage: { output_tokens: outputTokens },
        } as unknown as MessageStreamEvent;

        yield { type: "message_stop" } as MessageStreamEvent;
      }
    }
  }
}

// ── Fallback logic ────────────────────────────────────────────────────────

function shouldFallback(err: unknown): boolean {
  const s = (err as { status?: number } | undefined)?.status;
  if (s === undefined) return true; // network / fetch / timeout error
  // 401/403 on OpenRouter: likely invalid/missing API key or account issue.
  // Fall back to Anthropic so the chat continues to work while the key
  // is investigated. Remove 401/403 from this list once OpenRouter is stable.
  if (s === 401 || s === 403) return true;
  return s >= 500 || s === 429 || s === 408;
}

// ── Public API ────────────────────────────────────────────────────────────

export async function createLLMStream(
  params: CreateLLMStreamParams
): Promise<LLMStreamResult> {
  const hasOR  = !!process.env.OPENROUTER_API_KEY;
  const hasAnt = !!process.env.ANTHROPIC_API_KEY;

  if (!hasOR && !hasAnt) {
    throw new Error("No LLM provider configured: set OPENROUTER_API_KEY or ANTHROPIC_API_KEY");
  }

  if (hasOR) {
    const model = MODEL_MAP.openrouter[params.model] ?? params.model;
    try {
      // connectOpenRouter awaits headers (with 15 s timeout).
      // If this throws, we fall back to Anthropic before any streaming starts.
      const reader = await connectOpenRouter(params);
      const stream = readOpenRouterStream(reader);
      return { stream, provider: "openrouter", resolvedModel: model };
    } catch (err) {
      if (!hasAnt || !shouldFallback(err)) throw err;
      const e = err as { status?: number; message?: string };
      console.warn(`[llm-client] OpenRouter failed (status=${e.status ?? "net"}) → Anthropic fallback`);
    }
  }

  // Anthropic direct (primary if no OpenRouter key, or fallback)
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model     = MODEL_MAP.anthropic[params.model] ?? params.model;
  const stream    = (await anthropic.messages.create({
    model,
    max_tokens: params.max_tokens,
    system:     params.system,
    messages:   params.messages,
    stream:     true,
  })) as Stream<MessageStreamEvent>;

  return { stream, provider: "anthropic_direct", resolvedModel: model };
}
