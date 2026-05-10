// /api/voice/sofia — Surface 1 (Sofia voice agent)
//
// POST { user_message, conversation_id?, audio_input_b64? }
//   → forwards to ElevenLabs Conversational Agent
//   → streams back SSE with token / audio / done events
//
// Auth: server-side via xi-api-key env. Public route (whitelisted in middleware).
// Runtime: nodejs (we need Buffer for base64 audio decoding/encoding).
// maxDuration: 60s (matches /api/voice/chat-stream).
//
// SSE events:
//   event: token  data: {"text": "...", "elapsed_ms": 123}
//   event: audio  data: {"chunk_b64": "...", "elapsed_ms": 234}
//   event: done   data: {"total_ms": 1234, "first_chunk_ms": 200}
//   event: error  data: {"error": "...", "code": "..."}
//
// Errors:
//   503  → env missing (no leak)
//   502  → ElevenLabs upstream failure { error, code, retry_after_ms }

import { NextRequest } from "next/server";
import { LatencyTracker } from "@/lib/voice/latency-track";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

interface SofiaRequestBody {
  user_message?: string;
  conversation_id?: string;
  audio_input_b64?: string;
}

interface ElevenLabsAgentEvent {
  type?: string;
  text?: string;
  delta?: string;
  audio_event?: { audio_base_64?: string };
  audio?: string;
  // ElevenLabs may also stream other shapes; we tolerate them.
  [k: string]: unknown;
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

function jsonError(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID_SOFIA;

  if (!apiKey || !agentId) {
    return jsonError(503, {
      error: "service_unavailable",
      message:
        "Voice agent not configured (missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID_SOFIA).",
    });
  }

  let body: SofiaRequestBody;
  try {
    body = (await req.json()) as SofiaRequestBody;
  } catch {
    return jsonError(400, { error: "invalid_json" });
  }

  const userMessage = (body.user_message ?? "").trim();
  if (!userMessage && !body.audio_input_b64) {
    return jsonError(400, {
      error: "missing_input",
      message: "Provide user_message or audio_input_b64.",
    });
  }

  const tracker = new LatencyTracker();

  // Forward to ElevenLabs Conversational Agent.
  // Endpoint per brief: /v1/convai/agents/{agent_id}/conversation
  const upstreamUrl = `https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(
    agentId,
  )}/conversation`;

  const upstreamPayload: Record<string, unknown> = {
    text: userMessage || undefined,
    audio_input_b64: body.audio_input_b64 || undefined,
    conversation_id: body.conversation_id || undefined,
  };

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      body: JSON.stringify(upstreamPayload),
    });
  } catch (err) {
    return jsonError(502, {
      error: "upstream_unreachable",
      code: "fetch_failed",
      retry_after_ms: 2000,
      message: err instanceof Error ? err.message : "fetch failed",
    });
  }

  if (!upstream.ok || !upstream.body) {
    const retryAfterHeader = upstream.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader
      ? Math.max(1000, Number(retryAfterHeader) * 1000)
      : 2000;
    let upstreamMessage = "elevenlabs_error";
    try {
      const txt = await upstream.text();
      if (txt) upstreamMessage = txt.slice(0, 500);
    } catch {
      /* ignore */
    }
    return jsonError(502, {
      error: "upstream_error",
      code: `elevenlabs_${upstream.status}`,
      retry_after_ms: retryAfterMs,
      message: upstreamMessage,
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      let firstChunkMs: number | null = null;
      const reader = upstream.body!.getReader();
      let buf = "";

      const handleEvent = (raw: string): void => {
        // Each upstream SSE record may have multiple `data:` lines.
        const dataLines = raw
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trimStart());
        if (dataLines.length === 0) return;
        const dataStr = dataLines.join("\n").trim();
        if (!dataStr || dataStr === "[DONE]") return;

        let parsed: ElevenLabsAgentEvent;
        try {
          parsed = JSON.parse(dataStr) as ElevenLabsAgentEvent;
        } catch {
          // Plain-text token stream: emit as token.
          const elapsed = tracker.mark("token");
          if (firstChunkMs === null) firstChunkMs = elapsed;
          send("token", { text: dataStr, elapsed_ms: elapsed });
          return;
        }

        const text =
          (typeof parsed.text === "string" && parsed.text) ||
          (typeof parsed.delta === "string" && parsed.delta) ||
          "";
        const audioB64 =
          parsed.audio_event?.audio_base_64 ||
          (typeof parsed.audio === "string" ? parsed.audio : "") ||
          "";

        if (text) {
          const elapsed = tracker.mark("token");
          if (firstChunkMs === null) firstChunkMs = elapsed;
          send("token", { text, elapsed_ms: elapsed });
        }
        if (audioB64) {
          const elapsed = tracker.mark("audio");
          if (firstChunkMs === null) firstChunkMs = elapsed;
          send("audio", { chunk_b64: audioB64, elapsed_ms: elapsed });
        }
      };

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          // Split SSE records on blank line.
          let sepIdx = buf.indexOf("\n\n");
          while (sepIdx !== -1) {
            const record = buf.slice(0, sepIdx);
            buf = buf.slice(sepIdx + 2);
            if (record.trim()) handleEvent(record);
            sepIdx = buf.indexOf("\n\n");
          }
        }
        // Flush any tail (non-SSE upstream returning JSON-line).
        const tail = buf.trim();
        if (tail) handleEvent(tail);

        const result = tracker.finish();
        send("done", {
          total_ms: result.total_ms,
          first_chunk_ms: firstChunkMs,
        });
        controller.close();
      } catch (err) {
        send("error", {
          error: "stream_failed",
          code: "upstream_stream_error",
          message: err instanceof Error ? err.message : "stream failed",
        });
        controller.close();
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }
      }
    },
    cancel(): void {
      // Client disconnected — let the upstream body GC.
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
