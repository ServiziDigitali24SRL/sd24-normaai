/**
 * llm-client.ts
 * Server-side LLM client: OpenRouter primary (via OpenAI-compatible
 * /chat/completions endpoint) with Anthropic direct fallback.
 *
 * OpenRouter does NOT expose an Anthropic-compatible /messages endpoint.
 * We call OpenRouter via fetch (OpenAI format) and emit a synthetic
 * AsyncIterable<MessageStreamEvent> so the existing consumer code in
 * route.ts does not need to change.
 *
 * Activation: set OPENROUTER_API_KEY env var on Vercel.
 * Fallback:   if OPENROUTER_API_KEY is absent or OpenRouter fails with a
 *             transient error (5xx/429/network), uses Anthropic direct.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageStreamEvent,
  MessageCreateParamsStreaming,
} from "@anthropic-ai/sdk/resources/messages";
import type { Stream } from "@anthropic-ai/sdk/streaming";

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

// Internal NormaAI model id → per-provider model id
const MODEL_MAP = {
  openrouter: {
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.5",
    "claude-opus-4-6":   "anthropic/claude-opus-4.1",
  } as Record<string, string>,
  anthropic: {} as Record<string, string>, // bare name works for Anthropic direct
};

// Per-model fallback list sent to OpenRouter. If the primary model is down
// upstream, OpenRouter automatically tries the next one. We only fall back
// to models of equivalent quality — never cheap models for legal answers.
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
  /** Internal NormaAI model id (e.g. "claude-sonnet-4-6"). */
  model: string;
  max_tokens: number;
  system: MessageCreateParamsStreaming["system"];
  messages: MessageCreateParamsStreaming["messages"];
}

// ── OpenRouter via fetch (OpenAI-compat) ──────────────────────────────────

interface OAIDelta { content?: string | null; }
interface OAIChoice { delta: OAIDelta; finish_reason: string | null; }
interface OAIUsage { prompt_tokens: number; completion_tokens: number; }
interface OAIChunk { choices: OAIChoice[]; usage?: OAIUsage | null; }

/** Convert Anthropic SDK message array to OpenAI messages array. */
function toOAIMessages(
  system: MessageCreateParamsStreaming["system"],
  messages: MessageCreateParamsStreaming["messages"]
): Array<{ role: string; content: string }> {
  const result: Array<{ role: string; content: string }> = [];

  // System prompt → OpenAI system message
  if (system) {
    const text = typeof system === "string"
      ? system
      : system.map((b) => ("text" in b ? b.text : "")).join("\n");
    result.push({ role: "system", content: text });
  }

  // User/assistant turns — flatten content arrays to plain text
  for (const msg of messages) {
    const content = typeof msg.content === "string"
      ? msg.content
      : msg.content
          .map((b) => {
            if ("text" in b) return b.text;
            return "";
          })
          .join("");
    result.push({ role: msg.role, content });
  }

  return result;
}

/**
 * Parse a single SSE line and return the JSON payload (or null).
 * Handles the "data: [DONE]" sentinel.
 */
function parseSseLine(line: string): OAIChunk | null {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6).trim();
  if (payload === "[DONE]") return null;
  try { return JSON.parse(payload); } catch { return null; }
}

/**
 * Call OpenRouter and return an AsyncGenerator that emits
 * Anthropic-compatible MessageStreamEvent objects.
 *
 * Events emitted:
 *   content_block_delta (text_delta) — for each text chunk
 *   message_delta                    — with output token count at end
 *   message_stop                     — once finished
 */
async function* openRouterStream(
  params: CreateLLMStreamParams
): AsyncGenerator<MessageStreamEvent> {
  const key = process.env.OPENROUTER_API_KEY!;
  const siteUrl = process.env.OPENROUTER_SITE_URL ?? "https://normaai.it";
  const appName = process.env.OPENROUTER_APP_NAME ?? "NormaAI";

  const model = MODEL_MAP.openrouter[params.model] ?? params.model;
  const fallbacks = OPENROUTER_FALLBACKS[model] ?? [];

  const body = {
    model,
    messages: toOAIMessages(params.system, params.messages),
    max_tokens: params.max_tokens,
    stream: true,
    stream_options: { include_usage: true },
    // OpenRouter-specific: fallback model list if primary unavailable upstream
    ...(fallbacks.length ? { models: [model, ...fallbacks] } : {}),
  };

  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": siteUrl,
      "X-Title": appName,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    const e: Error & { status?: number } = new Error(
      `OpenRouter ${res.status}: ${errText.slice(0, 300)}`
    );
    e.status = res.status;
    throw e;
  }

  // Read the SSE stream line-by-line
  const reader = res.body.getReader();
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

      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      if (delta?.content) {
        yield {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: delta.content },
        } as MessageStreamEvent;
      }

      if (chunk.usage?.completion_tokens) {
        outputTokens = chunk.usage.completion_tokens;
      }

      if (finishReason === "stop" || finishReason === "end_turn") {
        // Emit message_delta with usage (mirrors Anthropic format)
        yield {
          type: "message_delta",
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
  const e = err as { status?: number } | undefined;
  const s = e?.status;
  if (s === undefined) return true; // network / fetch error
  if (s >= 500) return true;
  if (s === 429 || s === 408) return true;
  return false;
}

function safeErrSummary(err: unknown): string {
  const e = err as { status?: number; message?: string } | undefined;
  return `status=${e?.status ?? "?"} msg=${(e?.message ?? "").slice(0, 200)}`;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Create a streaming message with OpenRouter as primary and Anthropic direct
 * as fallback. Returns an AsyncIterable<MessageStreamEvent> compatible with
 * the existing consumer loop in route.ts.
 */
export async function createLLMStream(
  params: CreateLLMStreamParams
): Promise<LLMStreamResult> {
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasAnthropic  = !!process.env.ANTHROPIC_API_KEY;

  if (!hasOpenRouter && !hasAnthropic) {
    throw new Error("No LLM provider configured: set OPENROUTER_API_KEY or ANTHROPIC_API_KEY");
  }

  // Primary: OpenRouter
  if (hasOpenRouter) {
    const model = MODEL_MAP.openrouter[params.model] ?? params.model;
    try {
      const gen = openRouterStream(params);
      // Probe: start the generator to the first yield so we can catch
      // connection errors before we hand back to the caller. We re-wrap
      // so the caller gets a standard AsyncIterable from the first event.
      const first = await gen.next();
      const stream = (async function* () {
        if (!first.done) yield first.value;
        yield* gen;
      })();
      return { stream, provider: "openrouter", resolvedModel: model };
    } catch (err) {
      if (!hasAnthropic || !shouldFallback(err)) throw err;
      console.warn("[llm-client] OpenRouter failed → Anthropic fallback:", safeErrSummary(err));
    }
  }

  // Fallback: Anthropic direct (or primary if no OpenRouter key)
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = MODEL_MAP.anthropic[params.model] ?? params.model;
  const stream = (await anthropic.messages.create({
    model,
    max_tokens: params.max_tokens,
    system: params.system,
    messages: params.messages,
    stream: true,
  })) as Stream<MessageStreamEvent>;
  return { stream, provider: "anthropic_direct", resolvedModel: model };
}
