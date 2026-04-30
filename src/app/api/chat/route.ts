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
import Anthropic from "@anthropic-ai/sdk";
import { runPipeline } from "@/lib/agent-orchestrator";
import { getSystemPrompt, type SofiaChannel } from "./system-prompts";
import { guardInput } from "@/lib/guardrails";
import { encodeAgentEvent, type AgentEvent } from "@/lib/agent-events";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const LLM_MODEL = process.env.LLM_MODEL ?? "claude-sonnet-4-5-20250929";

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
            const fullSys = ragContext
              ? `${sys}\n\nCONTESTO NORMATIVO (Norm Retriever):\n${ragContext}`
              : sys;

            if (!ANTHROPIC_API_KEY) {
              return `[Stub Sofia — API key non configurata]\nDomanda: ${query}`;
            }

            const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
            const r = await client.messages.create({
              model: LLM_MODEL,
              max_tokens: 1500,
              system: fullSys,
              messages: [{ role: "user", content: query }],
            });
            const text = r.content
              .filter((b) => b.type === "text")
              .map((b) => (b as { type: "text"; text: string }).text)
              .join("\n");

            send(`event: token\ndata: ${JSON.stringify({ text })}\n\n`);
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
