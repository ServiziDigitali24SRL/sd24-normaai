/**
 * llm-client.ts
 * Server-side LLM client wrapper with OpenRouter primary + Anthropic direct
 * fallback. The Anthropic SDK is used as the underlying HTTP client for both
 * providers (OpenRouter exposes an Anthropic-compatible /messages endpoint at
 * https://openrouter.ai/api/v1).
 *
 * Behaviour:
 *  - If OPENROUTER_API_KEY is set → primary = OpenRouter.
 *    Also if ANTHROPIC_API_KEY is set → secondary = Anthropic direct (used
 *    only if OpenRouter itself fails, e.g. 5xx on openrouter.ai).
 *  - If only ANTHROPIC_API_KEY is set → Anthropic direct, no fallback.
 *  - If neither is set → throws (same failure mode as before).
 *
 * Model names: we keep the internal NormaAI names ("claude-sonnet-4-6",
 * "claude-opus-4-6") and translate them per provider. OpenRouter requires
 * the "anthropic/..." prefix; Anthropic direct accepts the bare name.
 *
 * The returned stream has the SAME shape as a native Anthropic SDK stream
 * (MessageStreamEvent), so existing consumer code in route.ts does not need
 * to change its event loop.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MessageStreamEvent, MessageCreateParamsStreaming } from "@anthropic-ai/sdk/resources/messages";
import type { Stream } from "@anthropic-ai/sdk/streaming";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Internal NormaAI model id → per-provider model id
const MODEL_MAP = {
  openrouter: {
    "claude-sonnet-4-6": "anthropic/claude-sonnet-4.5",
    "claude-opus-4-6": "anthropic/claude-opus-4.1",
  } as Record<string, string>,
  // Anthropic direct accepts NormaAI internal names as-is (mapped upstream by
  // Anthropic to the underlying model version). If Anthropic ever rejects a
  // name, extend this map.
  anthropic: {} as Record<string, string>,
};

// Optional OpenRouter fallback chain per tier. If the primary model fails
// (e.g. Anthropic outage upstream of OpenRouter), OpenRouter auto-routes to
// the next model in this list. Only top-tier models — we don't want to
// silently degrade legal answers to a cheap model.
const OPENROUTER_FALLBACK_MODELS: Record<string, string[]> = {
  "anthropic/claude-sonnet-4.5": ["openai/gpt-4o", "google/gemini-2.5-pro"],
  "anthropic/claude-opus-4.1": ["openai/gpt-4o", "anthropic/claude-sonnet-4.5"],
};

function resolveModelName(internalModel: string, provider: "openrouter" | "anthropic"): string {
  return MODEL_MAP[provider][internalModel] ?? internalModel;
}

function getOpenRouterClient(): Anthropic | null {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const siteUrl = process.env.OPENROUTER_SITE_URL ?? "https://normaai.it";
  const appName = process.env.OPENROUTER_APP_NAME ?? "NormaAI";
  return new Anthropic({
    apiKey: key,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      // OpenRouter attribution headers (optional but recommended; enables
      // free-tier model access and proper usage dashboards).
      "HTTP-Referer": siteUrl,
      "X-Title": appName,
    },
  });
}

function getAnthropicDirectClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

/**
 * LLM provider classification used for observability and error handling.
 */
export type LLMProvider = "openrouter" | "anthropic_direct";

export interface LLMStreamResult {
  stream: Stream<MessageStreamEvent>;
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

/**
 * Create a streaming message with OpenRouter as primary and Anthropic direct
 * as fallback. Returns the stream plus metadata about which provider served
 * the request.
 *
 * Retries: no internal retry — the caller already has user-facing retry UI.
 * If OpenRouter fails with a non-recoverable error (auth, 4xx) we do NOT
 * fall back, because retrying will not help and Anthropic direct would
 * incur cost for a request the user probably made in error.
 *
 * Fallback triggers (transient-only):
 *  - Network error / fetch failure
 *  - HTTP 5xx
 *  - HTTP 429 (rate limit)
 *  - HTTP 408 (request timeout)
 */
export async function createLLMStream(params: CreateLLMStreamParams): Promise<LLMStreamResult> {
  const openrouter = getOpenRouterClient();
  const anthropicDirect = getAnthropicDirectClient();

  if (!openrouter && !anthropicDirect) {
    throw new Error("No LLM provider configured: set OPENROUTER_API_KEY or ANTHROPIC_API_KEY");
  }

  // Primary: OpenRouter (if configured)
  if (openrouter) {
    const model = resolveModelName(params.model, "openrouter");
    const fallbacks = OPENROUTER_FALLBACK_MODELS[model];
    try {
      // OpenRouter supports `models` field (array) in the Anthropic-compatible
      // endpoint for provider-level fallback. We pass it via the SDK's escape
      // hatch for extra body fields.
      const extraBody = fallbacks ? { models: [model, ...fallbacks] } : undefined;
      const stream = await openrouter.messages.create({
        model,
        max_tokens: params.max_tokens,
        system: params.system,
        messages: params.messages,
        stream: true,
        ...(extraBody ?? {}),
      } as MessageCreateParamsStreaming) as Stream<MessageStreamEvent>;
      return { stream, provider: "openrouter", resolvedModel: model };
    } catch (err) {
      if (!anthropicDirect || !shouldFallback(err)) {
        throw err;
      }
      // Log structured so Sentry picks it up; don't re-throw, fall through.
      console.warn("[llm-client] OpenRouter failed, falling back to Anthropic direct:", safeErrSummary(err));
    }
  }

  // Fallback: Anthropic direct
  if (!anthropicDirect) {
    throw new Error("OpenRouter failed and no Anthropic direct fallback configured");
  }
  const model = resolveModelName(params.model, "anthropic");
  const stream = await anthropicDirect.messages.create({
    model,
    max_tokens: params.max_tokens,
    system: params.system,
    messages: params.messages,
    stream: true,
  }) as Stream<MessageStreamEvent>;
  return { stream, provider: "anthropic_direct", resolvedModel: model };
}

/**
 * Decide whether a given error from the primary provider is transient enough
 * to justify a fallback. Permanent errors (401, 403, 400 validation) should
 * NOT trigger fallback — they'd fail the same way on Anthropic direct (for
 * real auth issues) or indicate a client bug.
 */
function shouldFallback(err: unknown): boolean {
  const e = err as { status?: number; code?: string; message?: string } | undefined;
  const status = e?.status;
  if (status === undefined) {
    // No HTTP status → likely a network/fetch error → retry on fallback
    return true;
  }
  if (status >= 500) return true;
  if (status === 408) return true;
  if (status === 429) return true;
  return false;
}

function safeErrSummary(err: unknown): string {
  const e = err as { status?: number; message?: string } | undefined;
  return `status=${e?.status ?? "?"} msg=${(e?.message ?? "").slice(0, 200)}`;
}
