// LLM router — dual-provider adapter.
//   - chat              → Anthropic Claude Sonnet 4.6 (quality)
//   - voice / avatar    → Groq llama-3.3-70b (ultra-low first-token latency)
//
// Both providers expose a uniform `complete()` and `streamTokens()` interface so
// the chat route can switch by `channel` without branching everywhere.

import Anthropic from "@anthropic-ai/sdk";

export type LlmChannel = "chat" | "voice" | "avatar" | "api";

// ── Local inference (GEX44 GPU on Hetzner via Tailscale) ──────────────────
// OLLAMA_BASE_URL e.g. http://100.x.x.x:11434  (Tailscale IP, never public)
// Models installed (verified May 2026):
//   gemma2:9b-instruct-fp16   (18GB, fits in VRAM, best quality)
//   llama3.1:8b-instruct-fp16 (16GB)
//   mistral:7b-instruct-v0.3-fp16 (14GB)
//   qwen2.5:7b                (4.7GB, multilingual — for Globo orb)
//   phi3.5:3.8b               (2.2GB, fast/cheap)
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "";
const OLLAMA_MODEL_DEFAULT = process.env.OLLAMA_MODEL ?? "gemma2:9b-instruct-fp16";
const OLLAMA_ENABLED = !!OLLAMA_BASE && process.env.LLM_LOCAL_ENABLED !== "0";

export interface CompleteParams {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  /**
   * Optional: split the system prompt into a stable (cacheable) prefix and a
   * dynamic suffix (e.g. RAG context that changes per query).
   * When provided, the Anthropic provider attaches `cache_control` to the
   * stable prefix so subsequent requests within the cache TTL hit the prompt
   * cache (~10× cheaper input + ~300ms TTFF reduction).
   *
   * If both are provided, `cacheableSystemPrefix` wins over `systemPrompt`
   * and the final system passed to the model is `prefix + dynamicSuffix`.
   */
  cacheableSystemPrefix?: string;
  dynamicSystemSuffix?: string;
}

export interface LlmProvider {
  name: "anthropic" | "groq" | "ollama";
  complete(p: CompleteParams): Promise<string>;
  streamTokens(p: CompleteParams, onToken: (t: string) => void): Promise<string>;
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const ANTHROPIC_MODEL = process.env.LLM_MODEL ?? "claude-sonnet-4-5-20250929";

// "Groq" provider routing.
// Priority:
//   1. OPENROUTER_API_KEY → routes to Llama-3.3-70b on OpenRouter, prefers Groq backend
//      (paid pay-per-token, no 30 RPM cap, single key for everything)
//   2. GROQ_API_KEY → direct Groq (free tier 30 RPM, lowest latency)
//   3. neither → Anthropic fallback
const USE_OPENROUTER = !!process.env.OPENROUTER_API_KEY;
const GROQ_KEY = USE_OPENROUTER
  ? process.env.OPENROUTER_API_KEY!
  : (process.env.GROQ_API_KEY ?? "");
const GROQ_BASE = USE_OPENROUTER
  ? "https://openrouter.ai/api/v1"
  : "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL ?? (
  USE_OPENROUTER
    ? "meta-llama/llama-3.3-70b-instruct"   // OpenRouter paid (provider:groq enforced below)
    : "llama-3.3-70b-versatile"             // Groq direct model id
);

/**
 * Build the `system` parameter for Anthropic — either a plain string (legacy
 * single-block) or an array of typed blocks with cache_control on the stable
 * prefix.
 *
 * Cache thresholds (Anthropic Sonnet 4.6, May 2026):
 *   - Minimum cacheable prefix: 1024 tokens (~4096 chars)
 *   - Cache TTL: 5 min default, 1h with `ttl: "1h"` (extended cache)
 *   - Cache write: 1.25× normal input price (one-time)
 *   - Cache read: 0.10× normal input price (every hit)
 */
type AnthropicSystemBlock =
  | { type: "text"; text: string }
  | { type: "text"; text: string; cache_control: { type: "ephemeral" } };

function buildAnthropicSystem(p: CompleteParams): string | AnthropicSystemBlock[] {
  const prefix = p.cacheableSystemPrefix?.trim();
  const suffix = p.dynamicSystemSuffix?.trim();

  // Caller did not opt-in to caching: behave as before.
  if (!prefix) return p.systemPrompt;

  // Heuristic: only attach cache_control when the prefix is large enough that
  // Anthropic will actually cache it (>= ~3500 chars ≈ 1000 tokens).
  // Below this threshold, attaching cache_control is harmless but wasteful.
  const shouldCache = prefix.length >= 3500;

  const blocks: AnthropicSystemBlock[] = [];
  if (shouldCache) {
    blocks.push({
      type: "text",
      text: prefix,
      cache_control: { type: "ephemeral" },
    });
  } else {
    blocks.push({ type: "text", text: prefix });
  }
  if (suffix) blocks.push({ type: "text", text: suffix });
  return blocks;
}

const anthropicProvider: LlmProvider = {
  name: "anthropic",

  async complete(p) {
    const { userMessage, maxTokens = 1500, temperature = 0.4 } = p;
    if (!ANTHROPIC_KEY) return `[Stub] ${userMessage}`;
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const r = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: buildAnthropicSystem(p),
      messages: [{ role: "user", content: userMessage }],
    });
    return r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");
  },

  async streamTokens(p, onToken) {
    const { userMessage, maxTokens = 1500, temperature = 0.4 } = p;
    if (!ANTHROPIC_KEY) {
      const stub = `[Stub] ${userMessage}`;
      onToken(stub);
      return stub;
    }
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const stream = client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: buildAnthropicSystem(p),
      messages: [{ role: "user", content: userMessage }],
    });
    let full = "";
    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        onToken(ev.delta.text);
        full += ev.delta.text;
      }
    }
    return full;
  },
};

// Helpers shared between complete() and streamTokens()
function groqHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${GROQ_KEY}`,
    "Content-Type": "application/json",
  };
  if (USE_OPENROUTER) {
    h["HTTP-Referer"] = "https://normaai.it";
    h["X-Title"] = "NormaAI Voice";
  }
  return h;
}

function groqBody(p: {
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  temperature: number;
  stream: boolean;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    max_tokens: p.maxTokens,
    temperature: p.temperature,
    stream: p.stream,
    messages: [
      { role: "system", content: p.systemPrompt },
      { role: "user", content: p.userMessage },
    ],
  };
  // On OpenRouter, force Groq backend (with fallback if unavailable)
  if (USE_OPENROUTER) {
    body.provider = { order: ["groq"], allow_fallbacks: true };
  }
  return body;
}

// Groq exposes an OpenAI-compatible endpoint at https://api.groq.com/openai/v1
// We hit it directly with fetch — no SDK dependency.
const groqProvider: LlmProvider = {
  name: "groq",

  async complete({ systemPrompt, userMessage, maxTokens = 800, temperature = 0.4 }) {
    if (!GROQ_KEY) return `[Stub Groq] ${userMessage}`;
    const r = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: groqHeaders(),
      body: JSON.stringify(groqBody({ systemPrompt, userMessage, maxTokens, temperature, stream: false })),
    });
    if (!r.ok) throw new Error(`groq_${r.status}`);
    const j = await r.json() as { choices: Array<{ message: { content: string } }> };
    return j.choices[0]?.message?.content ?? "";
  },

  async streamTokens({ systemPrompt, userMessage, maxTokens = 800, temperature = 0.4 }, onToken) {
    if (!GROQ_KEY) {
      const stub = `[Stub Groq] ${userMessage}`;
      onToken(stub);
      return stub;
    }
    const r = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: groqHeaders(),
      body: JSON.stringify(groqBody({ systemPrompt, userMessage, maxTokens, temperature, stream: true })),
    });
    if (!r.ok || !r.body) throw new Error(`groq_${r.status}`);

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload) as {
            choices: Array<{ delta: { content?: string } }>;
          };
          const tok = j.choices[0]?.delta?.content;
          if (tok) {
            onToken(tok);
            full += tok;
          }
        } catch {
          // skip malformed line
        }
      }
    }
    return full;
  },
};

// ── Ollama (GEX44 local GPU) ──────────────────────────────────────────────
// OpenAI-compatible chat completions endpoint at $OLLAMA_BASE/v1/chat/completions
// Reachable only over Tailscale — no public internet exposure.
// Model fp16 selected by caller via `model` param or env OLLAMA_MODEL.
const ollamaProvider: LlmProvider = {
  name: "ollama",

  async complete(p) {
    const { systemPrompt, userMessage, maxTokens = 1500, temperature = 0.4 } = p;
    if (!OLLAMA_BASE) throw new Error("ollama_no_base_url");
    const r = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL_DEFAULT,
        max_tokens: maxTokens,
        temperature,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`ollama_${r.status}`);
    const j = (await r.json()) as { choices: Array<{ message: { content: string } }> };
    return j.choices[0]?.message?.content ?? "";
  },

  async streamTokens(p, onToken) {
    const { systemPrompt, userMessage, maxTokens = 1500, temperature = 0.4 } = p;
    if (!OLLAMA_BASE) throw new Error("ollama_no_base_url");
    const r = await fetch(`${OLLAMA_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL_DEFAULT,
        max_tokens: maxTokens,
        temperature,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok || !r.body) throw new Error(`ollama_${r.status}`);

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload) as {
            choices: Array<{ delta: { content?: string } }>;
          };
          const tok = j.choices[0]?.delta?.content;
          if (tok) {
            onToken(tok);
            full += tok;
          }
        } catch {
          // skip malformed line
        }
      }
    }
    return full;
  },
};

/**
 * Heuristic complexity classifier — runs in <1ms, no LLM call.
 * Local model handles ~70% of NormaAI legal queries (lookup-style); the rest
 * (analysis, comparison, synthesis) goes to Claude Sonnet for quality.
 *
 * Classified as SIMPLE (→ local Ollama on GEX44):
 *   - "Cos'è l'art. X?", "L'art. Y c.c. è ancora in vigore?"
 *   - Lookups by URN: "D.Lgs. 81/2008", "L. 604/1966"
 *   - Definitional questions under 80 chars
 *   - Single-vertical, single-norm queries
 *
 * Classified as COMPLEX (→ Claude Sonnet):
 *   - Multi-step reasoning ("compara X e Y", "analizza questo contratto")
 *   - Document attachments
 *   - Long queries (>200 chars), multiple sub-questions
 *   - Penal/litigation keywords (high-stakes)
 */
export interface ComplexityHints {
  hasAttachment?: boolean;
  conversationTurns?: number;
}

export function classifyComplexity(query: string, hints?: ComplexityHints): "simple" | "complex" {
  if (hints?.hasAttachment) return "complex";

  const q = query.trim();
  if (q.length > 200) return "complex";
  if ((hints?.conversationTurns ?? 0) > 4) return "complex";

  const COMPLEX_TRIGGERS = [
    /\bcompar[aoe]\b/i,
    /\banalizz[aoe]\b/i,
    /\bvaluta\b/i,
    /\bricors[oi]\b/i,
    /\bcontratt[oi]\b.*\bdiff\b/i,
    /\bredig[ie]\b/i,
    /\bpenal[ei]\b/i,
    /\blicenziament[oi]\b/i,
    /\bcustodia\b/i,
    /\bseparazion[ei]\b/i,
    /\bdivorzi[oa]\b/i,
    /\?\s*[a-zA-Z].*\?/,  // multiple question marks → multiple sub-questions
  ];
  if (COMPLEX_TRIGGERS.some((re) => re.test(q))) return "complex";

  // Default → simple (cheap, fast, local)
  return "simple";
}

/**
 * Pick the right provider for the channel:
 *   chat   → Anthropic (quality), with auto-fallback to OR/Groq on 4xx/5xx
 *            (e.g. low credit balance, rate limit)
 *   voice  → Groq (sub-300ms first token), with auto-fallback to Anthropic
 *   avatar → Groq, same fallback
 *
 * If GROQ/OR key is missing, voice/avatar fall back to Anthropic.
 *
 * To enable local Ollama routing, pass `complexity: "simple"` and ensure
 * OLLAMA_BASE_URL is set. See classifyComplexity().
 */
export function getProvider(
  channel: LlmChannel,
  complexity?: "simple" | "complex",
): LlmProvider {
  // Local Ollama route: only for chat-style channels with simple queries.
  // Voice/avatar always go to Groq for sub-300ms TTFF (Ollama on GEX44 is
  // fast but introduces an extra network hop).
  if (
    OLLAMA_ENABLED &&
    complexity === "simple" &&
    (channel === "chat" || channel === "api")
  ) {
    return {
      name: "ollama",
      async complete(p) {
        try {
          return await ollamaProvider.complete(p);
        } catch (err) {
          // Local model down → fall back to Anthropic seamlessly
          if (shouldFallback(err) || /ollama_/.test(String(err))) {
            return anthropicProvider.complete(p);
          }
          throw err;
        }
      },
      async streamTokens(p, onToken) {
        try {
          return await ollamaProvider.streamTokens(p, onToken);
        } catch (err) {
          if (shouldFallback(err) || /ollama_/.test(String(err))) {
            return anthropicProvider.streamTokens(p, onToken);
          }
          throw err;
        }
      },
    };
  }

  if (channel === "chat") {
    // Wrap anthropic with fallback to Groq/OR on credit/quota errors
    if (!GROQ_KEY) return anthropicProvider;
    return {
      name: "anthropic",
      async complete(p) {
        try {
          return await anthropicProvider.complete(p);
        } catch (err) {
          if (shouldFallback(err)) return groqProvider.complete(p);
          throw err;
        }
      },
      async streamTokens(p, onToken) {
        try {
          return await anthropicProvider.streamTokens(p, onToken);
        } catch (err) {
          if (shouldFallback(err)) return groqProvider.streamTokens(p, onToken);
          throw err;
        }
      },
    };
  }
  if (!GROQ_KEY) return anthropicProvider;

  // Wrap groqProvider with auto-fallback to Anthropic on rate-limit/5xx
  return {
    name: "groq",
    async complete(p) {
      try {
        return await groqProvider.complete(p);
      } catch (err) {
        if (shouldFallback(err)) return anthropicProvider.complete(p);
        throw err;
      }
    },
    async streamTokens(p, onToken) {
      try {
        return await groqProvider.streamTokens(p, onToken);
      } catch (err) {
        if (shouldFallback(err)) return anthropicProvider.streamTokens(p, onToken);
        throw err;
      }
    },
  };
}

function shouldFallback(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  // Groq/OR: "groq_429" / "groq_5xx"
  if (/groq_(4(?!00|01|03)\d\d|5\d\d)/.test(msg)) return true;
  // Anthropic SDK error messages — credit balance / rate limit / overload
  if (/credit balance|rate.?limit|overloaded|429|529|insufficient/i.test(msg)) return true;
  // Bare "400 {...credit balance...}" string from SDK
  if (/^400\s.*credit/i.test(msg)) return true;
  return false;
}
