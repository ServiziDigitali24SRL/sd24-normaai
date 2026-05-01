// LLM router — dual-provider adapter.
//   - chat              → Anthropic Claude Sonnet 4.6 (quality)
//   - voice / avatar    → Groq llama-3.3-70b (ultra-low first-token latency)
//
// Both providers expose a uniform `complete()` and `streamTokens()` interface so
// the chat route can switch by `channel` without branching everywhere.

import Anthropic from "@anthropic-ai/sdk";

export type LlmChannel = "chat" | "voice" | "avatar" | "api";

export interface CompleteParams {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmProvider {
  name: "anthropic" | "groq";
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

const anthropicProvider: LlmProvider = {
  name: "anthropic",

  async complete({ systemPrompt, userMessage, maxTokens = 1500, temperature = 0.4 }) {
    if (!ANTHROPIC_KEY) return `[Stub] ${userMessage}`;
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const r = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    return r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");
  },

  async streamTokens({ systemPrompt, userMessage, maxTokens = 1500, temperature = 0.4 }, onToken) {
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
      system: systemPrompt,
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

/**
 * Pick the right provider for the channel:
 *   chat   → Anthropic (quality), with auto-fallback to OR/Groq on 4xx/5xx
 *            (e.g. low credit balance, rate limit)
 *   voice  → Groq (sub-300ms first token), with auto-fallback to Anthropic
 *   avatar → Groq, same fallback
 *
 * If GROQ/OR key is missing, voice/avatar fall back to Anthropic.
 */
export function getProvider(channel: LlmChannel): LlmProvider {
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
