// /api/leads/[leadId]/pdf — POST generates the parere PDF and stores it.
// Called server-to-server from /api/stripe/webhook after the 9 € payment.
// Auth: x-internal-secret header must match INTERNAL_SECRET env.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateParerePdf } from "@/lib/pdf/generate-parere";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const internalSecret = req.headers.get("x-internal-secret");
  if (internalSecret !== (process.env.INTERNAL_SECRET ?? "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { leadId } = await params;
  const sb = getSupabase();

  const { data: lead, error } = await sb
    .from("leads")
    .select("id, conversation_id, contact_name, summary, city, vertical")
    .eq("id", leadId)
    .maybeSingle();

  if (error || !lead) {
    return NextResponse.json({ error: "lead_not_found" }, { status: 404 });
  }

  // Fetch last assistant message + citations from the conversation
  const { data: messages } = await sb
    .from("messages")
    .select("role, content, citations_jsonb, created_at")
    .eq("conversation_id", lead.conversation_id)
    .order("created_at", { ascending: true });

  const userMsgs = (messages ?? []).filter(m => m.role === "user");
  const assistantMsgs = (messages ?? []).filter(m => m.role === "assistant");
  const userQuestion = userMsgs.map(m => m.content).join("\n\n").slice(0, 1500);
  const aiSummary = assistantMsgs.map(m => m.content).join("\n\n").slice(0, 4000);
  const citationsRaw = assistantMsgs
    .flatMap(m => (Array.isArray(m.citations_jsonb) ? m.citations_jsonb : []))
    .slice(0, 10);
  type Cit = { title?: string; article?: string | null; urn?: string };
  const citations = (citationsRaw as Cit[]).map(c => ({
    title: c.title ?? "",
    article: c.article ?? null,
    urn: c.urn ?? "",
  }));

  const pdfBuffer = await generateParerePdf({
    conversationId: lead.conversation_id,
    userName: lead.contact_name ?? "Cliente",
    userCity: lead.city ?? undefined,
    userQuestion: userQuestion || lead.summary,
    aiSummary: aiSummary || "Nessun contenuto AI registrato.",
    citations,
    vertical: lead.vertical ?? undefined,
    generatedAt: new Date(),
  });

  // Upload to Supabase Storage
  const path = `${leadId}.pdf`;
  const { error: upErr } = await sb.storage
    .from("parere-pdfs")
    .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (upErr) {
    console.error("[leads/pdf] storage upload error", upErr);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data: pub } = sb.storage.from("parere-pdfs").getPublicUrl(path);
  const pdfUrl = pub?.publicUrl ?? "";

  await sb.from("leads").update({ pdf_url: pdfUrl }).eq("id", leadId);
  await sb.from("conversations")
    .update({ parere_pdf_url: pdfUrl })
    .eq("id", lead.conversation_id);

  return NextResponse.json({ ok: true, url: pdfUrl });
}
