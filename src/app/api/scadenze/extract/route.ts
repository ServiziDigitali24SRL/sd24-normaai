import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const EXTRACT_PROMPT = `Sei un estrattore di scadenze da documenti legali e fiscali italiani.

Analizza il documento e estrai TUTTE le scadenze rilevanti. Per ogni scadenza restituisci un oggetto JSON con:
- tipo: uno tra ["Pagamento", "Fiscale", "Legale", "Permesso soggiorno", "Contrattuale", "Garanzia", "Prescrizione", "Altro"]
- data: formato ISO YYYY-MM-DD (se la data è relativa, calcola a partire da oggi)
- descrizione: descrizione breve e chiara della scadenza (max 80 caratteri)

Rispondi SOLO con un array JSON valido, senza testo aggiuntivo. Esempio:
[
  {"tipo":"Pagamento","data":"2026-05-15","descrizione":"Pagamento canone affitto mensile"},
  {"tipo":"Fiscale","data":"2026-06-30","descrizione":"Scadenza dichiarazione dei redditi 730"}
]

Se non ci sono scadenze, rispondi con un array vuoto: []`;

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey: key });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const categoria = formData.get("categoria") as string | null;
    const sottocategoria = formData.get("sottocategoria") as string | null;

    if (!file || !userId || !categoria) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File troppo grande (max 10MB)" }, { status: 413 });
    }

    // Converti file in base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    // Chiama Claude per estrarre scadenze
    const anthropic = getAnthropic();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = [];

    if (isPdf) {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } });
    } else if (isImage) {
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
    } else {
      // Testo: decodifica e passa direttamente
      const text = Buffer.from(bytes).toString("utf-8").slice(0, 50000);
      content.push({ type: "text", text: `Documento:\n${text}` });
    }

    content.push({ type: "text", text: EXTRACT_PROMPT });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content }],
    });

    let scadenze: Array<{ tipo: string; data: string; descrizione: string }> = [];
    const rawText = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    try {
      // Estrai solo il JSON dall'output
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) scadenze = JSON.parse(match[0]);
    } catch {
      console.error("[SCADENZE/EXTRACT] Parse error:", rawText.slice(0, 200));
      scadenze = [];
    }

    // Salva documento in Supabase
    const docRes = await fetch(`${SUPABASE_URL}/rest/v1/user_documents`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        categoria,
        sottocategoria: sottocategoria || null,
        nome_file: file.name,
        size_bytes: file.size,
        scadenze_estratte: scadenze,
        // file_url: in produzione si uploa su Supabase Storage o R2
      }),
    });

    if (!docRes.ok) {
      console.error("[SCADENZE/EXTRACT] Errore salvataggio documento:", docRes.status);
    }

    return NextResponse.json({ scadenze, ok: true });
  } catch (e) {
    console.error("[SCADENZE/EXTRACT] Errore:", e);
    return NextResponse.json({ error: "Errore nell'analisi del documento." }, { status: 500 });
  }
}
