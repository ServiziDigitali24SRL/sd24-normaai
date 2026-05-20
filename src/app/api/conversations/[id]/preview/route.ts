// /api/conversations/[id]/preview — restituisce un'anteprima leggera della
// conversazione, usata da /lead/new per mostrare all'utente cosa sta inoltrando
// all'avvocato prima del pagamento.
//
// Privacy: questa route richiede auth E che l'utente sia proprietario della
// conversazione (RLS lo enforcera comunque a livello DB).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  // Verify ownership
  const { data: conv } = await sb
    .from("conversations")
    .select("id, user_id, summary_text, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (conv.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { count: messagesCount } = await sb
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", id);

  // First user question
  const { data: firstMsg } = await sb
    .from("messages")
    .select("content, created_at")
    .eq("conversation_id", id)
    .eq("role", "user")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    conversation_id: id,
    messages_count: messagesCount ?? 0,
    first_question: typeof firstMsg?.content === "string"
      ? firstMsg.content
      : Array.isArray(firstMsg?.content)
        ? firstMsg.content.find((c: { type?: string; text?: string }) => c.type === "text")?.text ?? ""
        : "",
    summary_text: conv.summary_text ?? null,
    created_at: conv.created_at,
  });
}
