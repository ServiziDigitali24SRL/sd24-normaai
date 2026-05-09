// /api/avatar/corpus-tool — Sync JSON wrapper around norm-retriever for the
// ElevenLabs Conversational Agent (Sofia). The agent's `query_normaai_corpus`
// tool POSTs here; we return raw chunks so Sofia can cite them per the v7
// system prompt rules ([CERTO] [Fonte X] D.Lgs. Y/Z, art. N).
//
// Auth: Bearer NORMAAI_INTERNAL_API_KEY (configured in ElevenLabs tool secret).

import { NextResponse } from "next/server";
import { normRetrieverAgent } from "@/lib/agents/norm-retriever";
import type { AgentContext } from "@/lib/agents/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ToolBody {
  message: string;
  conversation_id?: string;
  vertical?: string | null;
  top_k?: number;
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.NORMAAI_INTERNAL_API_KEY;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ToolBody;
  try {
    body = (await req.json()) as ToolBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "missing_message" }, { status: 400 });
  }

  const ctx: AgentContext = {
    conversationId: body.conversation_id ?? `avatar-${Date.now()}`,
    userQuery: body.message,
    emit: () => {},
  };

  const result = await normRetrieverAgent.run(
    { query: body.message, vertical: body.vertical ?? null, topK: body.top_k ?? 6 },
    ctx,
  );

  if (!result.ok || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "retriever_failed", chunks: [], context: "" },
      { status: 502 },
    );
  }

  // Compact payload — ElevenLabs Tool returns a string to the agent which
  // is injected as observation. Keep under ~2 KB to avoid token bloat.
  const citations = result.data.chunks.slice(0, 6).map((c, i) => ({
    n: i + 1,
    fonte: c.title,
    art: c.article,
    excerpt: c.excerpt.slice(0, 320),
    urn: c.urn,
  }));

  return NextResponse.json({
    chunks: citations,
    context: result.data.ragContext,
  });
}
