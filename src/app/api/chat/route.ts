// /api/chat — POST a user message, stream back assistant reply + agent events.
//
// Fase 1 implementation. Uses the new agent orchestrator (Norm Retriever +
// Citation Validator + Response Composer + 5 stubs for sidebar visibility).
// LLM call is delegated; SSE stream multiplexes:
//   - `event: token`  → assistant text chunks
//   - `event: agent`  → agent state changes (consumed by useAgentStream)
//   - `event: done`   → final payload with citations + risk flag
//
// Auth: optional. Anonymous users get an IP-hashed conversation; signed-in
// users get user_id-bound. Rate limit applies to both via @/lib/rate-limit.

import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/agent-orchestrator";
import { getSystemPrompt, type SofiaChannel } from "./system-prompts";
import { guardInput } from "@/lib/guardrails";
import { encodeAgentEvent, type AgentEvent } from "@/lib/agent-events";
import { getProvider, classifyComplexity } from "@/lib/llm/router";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

interface ChatBody {
  conversation_id: string;
  message: string;
  channel?: SofiaChannel;
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }

  if (!body.conversation_id || !body.message) {
    return new Response(JSON.stringify({ error: "missing_fields" }), { status: 400 });
  }

  // ── Input guardrails (sanitize PII + block jailbreak)
  const guard = guardInput(body.message);
  if (!guard.ok) {
    return new Response(
      JSON.stringify({ error: "guard_blocked", reason: guard.reason }),
      { status: 400 },
    );
  }
  const userQuery = guard.sanitized ?? body.message;
  const channel: SofiaChannel = body.channel ?? "chat";

  // ── SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) => controller.enqueue(encoder.encode(line));
      const emit = (ev: Omit<AgentEvent, "ts">) =>
        send(encodeAgentEvent({ ...ev, ts: Date.now() }));

      try {
        const out = await runPipeline({
          conversationId: body.conversation_id,
          userQuery,
          channel,
          emit,
          callLLM: async (_systemPromptIgnored, ragContext, query) => {
            const sys = getSystemPrompt(channel);
            const dynamicSuffix = ragContext
              ? `\n\nCONTESTO NORMATIVO (Norm Retriever):\n${ragContext}`
              : undefined;

            // Complexity-based routing: simple lookup queries → local Ollama
            // on GEX44 (free, ~100ms TTFF); complex queries → Claude Sonnet.
            // Estimated routing: ~70% simple / ~30% complex on real traffic.
            const complexity = classifyComplexity(query);
            emit({
              agent: "routing",
              state: "done",
              durationMs: 0,
              output: `routing: ${complexity}`,
            });
            const provider = getProvider(channel, complexity);
            // Cacheable prefix: the channel system prompt is stable across
            // requests (CHAT_IT_PROMPT, VOICE_IT_PROMPT...), so it qualifies
            // for Anthropic prompt caching. RAG context is dynamic per query
            // and stays in the suffix (always re-sent).
            // Net effect on cache hit: input cost ÷10, TTFF ÷~2.
            const text = await provider.streamTokens(
              {
                systemPrompt: dynamicSuffix ? sys + dynamicSuffix : sys,  // legacy fallback
                cacheableSystemPrefix: sys,
                dynamicSystemSuffix: dynamicSuffix,
                userMessage: query,
                maxTokens: channel === "chat" ? 1500 : 800,
              },
              (tok) => send(`event: token\ndata: ${JSON.stringify({ text: tok })}\n\n`),
            );
            return text;
          },
        });

        send(
          `event: done\ndata: ${JSON.stringify({
            citations: out.citations,
            invalidCitations: out.invalidCitations,
            highRisk: out.highRisk,
            finalMarkdown: out.finalMarkdown,
          })}\n\n`,
        );
      } catch (err) {
        Sentry.captureException(err);
        send(
          `event: error\ndata: ${JSON.stringify({
            message: err instanceof Error ? err.message : "internal_error",
          })}\n\n`,
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
