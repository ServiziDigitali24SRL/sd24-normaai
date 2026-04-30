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

// "Groq" provider routes via OpenRouter by default (single API key, free tier available).
// Override OPENROUTER_API_KEY with GROQ_API_KEY to hit Groq directly when latency matters.
const GROQ_KEY = process.env.GROQ_API_KEY ?? process.env.OPENROUTER_API_KEY ?? "";
const GROQ_BASE = process.env.GROQ_API_KEY
  ? "https://api.groq.com/openai/v1"          // direct Groq (lowest latency)
  : "https://openrouter.ai/api/v1";           // OpenRouter fallback (single key)
const GROQ_MODEL = process.env.GROQ_MODEL ?? (
  process.env.GROQ_API_KEY
    ? "llama-3.3-70b-versatile"               // Groq direct model id
    : "meta-llama/llama-3.3-70b-instruct:free" // OpenRouter FREE tier (20 RPM, 50/day)
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

// Groq exposes an OpenAI-compatible endpoint at https://api.groq.com/openai/v1
// We hit it directly with fetch — no SDK dependency.
const groqProvider: LlmProvider = {
  name: "groq",

  async complete({ systemPrompt, userMessage, maxTokens = 800, temperature = 0.4 }) {
    if (!GROQ_KEY) return `[Stub Groq] ${userMessage}`;
    const r = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
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
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        temperature,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
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
 *   chat   → Anthropic (quality, no real-time pressure)
 *   voice  → Groq (sub-300ms first token)
 *   avatar → Groq (lip-sync window is tight)
 *
 * If GROQ_API_KEY is missing, voice/avatar fall back to Anthropic.
 */
export function getProvider(channel: LlmChannel): LlmProvider {
  if (channel === "chat") return anthropicProvider;
  if (!GROQ_KEY) return anthropicProvider;
  return groqProvider;
}
