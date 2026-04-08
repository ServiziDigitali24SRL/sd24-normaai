import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  const client = await createServerClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

// GET /api/conversations?conversationId=xxx
// Returns: { messages: HistoryMsg[], conversationId: string | null }
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  const supabase = getServiceClient();

  try {
    let convId = conversationId;

    if (!convId) {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      convId = convs?.[0]?.id ?? null;
    } else {
      // Verify conversation belongs to this user
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", convId)
        .eq("user_id", user.id)
        .single();
      if (!conv) return NextResponse.json({ messages: [], conversationId: null });
    }

    if (!convId) return NextResponse.json({ messages: [], conversationId: null });

    const { data: rows } = await supabase
      .from("messages")
      .select("id, role, content, sources, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (!rows || rows.length === 0) return NextResponse.json({ messages: [], conversationId: convId });

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
// Body: { conversationId?, msg: HistoryMsg }
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { conversationId, msg } = await req.json();
    if (!msg) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const supabase = getServiceClient();
    let convId = conversationId;

    if (!convId) {
      const title = msg.question.slice(0, 80);
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ user_id: user.id, title, vertical: msg.vertical })
        .select("id")
        .single();
      if (convErr) throw convErr;
      convId = conv.id;
    } else {
      // Verify ownership before update
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("id", convId)
        .eq("user_id", user.id)
        .single();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
    }

    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "user",
      content: msg.question,
      sources: { vertical: msg.vertical ?? null, attachmentName: msg.attachmentName ?? null },
    });

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
