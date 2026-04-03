import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/conversations?userId=xxx&conversationId=xxx
// Returns: { messages: HistoryMsg[], conversationId: string | null }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const conversationId = searchParams.get("conversationId");

  if (!userId) return NextResponse.json({ messages: [], conversationId: null });

  try {
    let convId = conversationId;

    // If no conversationId, find the most recent conversation
    if (!convId) {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);
      convId = convs?.[0]?.id ?? null;
    }

    if (!convId) return NextResponse.json({ messages: [], conversationId: null });

    const { data: rows } = await supabase
      .from("messages")
      .select("id, role, content, sources, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (!rows || rows.length === 0) return NextResponse.json({ messages: [], conversationId: convId });

    // Pair user+assistant messages into HistoryMsg objects
    const history: any[] = [];
    for (let i = 0; i < rows.length - 1; i += 2) {
      const userMsg = rows[i];
      const assistantMsg = rows[i + 1];
      if (!userMsg || !assistantMsg) continue;
      if (userMsg.role !== "user" || assistantMsg.role !== "assistant") continue;

      const meta = assistantMsg.sources as any;
      history.push({
        id: assistantMsg.id,
        question: userMsg.content,
        vertical: userMsg.sources?.vertical ?? null,
        text: assistantMsg.content,
        sources: meta?.sources ?? [],
        hasRag: meta?.hasRag ?? false,
        ts: new Date(userMsg.created_at).getTime(),
        attachmentName: userMsg.sources?.attachmentName ?? undefined,
      });
    }

    return NextResponse.json({ messages: history, conversationId: convId });
  } catch (e: any) {
    console.error("[CONVERSATIONS GET]", e.message);
    return NextResponse.json({ messages: [], conversationId: null });
  }
}

// POST /api/conversations
// Body: { userId, conversationId?, msg: HistoryMsg }
// Returns: { ok: true, conversationId: string }
export async function POST(req: NextRequest) {
  try {
    const { userId, conversationId, msg } = await req.json();
    if (!userId || !msg) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    let convId = conversationId;

    // Create conversation if needed
    if (!convId) {
      const title = msg.question.slice(0, 80);
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title, vertical: msg.vertical })
        .select("id")
        .single();
      if (convErr) throw convErr;
      convId = conv.id;
    } else {
      // Update updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
    }

    // Insert user message
    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "user",
      content: msg.question,
      sources: { vertical: msg.vertical ?? null, attachmentName: msg.attachmentName ?? null },
    });

    // Insert assistant message (sources field carries all metadata)
    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: msg.text,
      sources: { sources: msg.sources, hasRag: msg.hasRag },
    });

    return NextResponse.json({ ok: true, conversationId: convId });
  } catch (e: any) {
    console.error("[CONVERSATIONS POST]", e.message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
