import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const WA_API = "https://graph.facebook.com/v18.0";

export async function POST(req: NextRequest) {
  const { targetPhone } = await req.json();

  if (!targetPhone?.trim() || targetPhone.trim().length < 5) {
    return NextResponse.json(
      { error: "Numero di telefono mancante" },
      { status: 400 }
    );
  }

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Get WhatsApp token
  const { data: tokenRecord } = await supabase
    .from("user_whatsapp_tokens")
    .select("phone_id, access_token, phone_number")
    .eq("user_id", user.id)
    .single();

  if (!tokenRecord) {
    return NextResponse.json(
      { error: "WhatsApp non connesso" },
      { status: 400 }
    );
  }

  const { phone_id, access_token } = tokenRecord;

  // Fetch messages using WhatsApp Cloud API
  // Note: The Cloud API provides messages via webhooks, but we can fetch
  // conversation data through the messages endpoint
  try {
    // Clean the target phone number (remove spaces, dashes)
    const cleanPhone = targetPhone.trim().replace(/[\s\-()]/g, "");

    // Fetch messages from the WhatsApp Business API
    const messagesRes = await fetch(
      `${WA_API}/${phone_id}/messages?messaging_product=whatsapp`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    // The Cloud API is primarily webhook-based for receiving messages.
    // We attempt to fetch conversation context. If the API returns limited data,
    // we build analysis from what's available.
    let messages: { from: string; text: string; timestamp: string }[] = [];

    if (messagesRes.ok) {
      const messagesData = await messagesRes.json();
      if (messagesData.data && Array.isArray(messagesData.data)) {
        messages = messagesData.data
          .filter(
            (m: { from?: string }) =>
              m.from === cleanPhone || m.from === cleanPhone.replace("+", "")
          )
          .slice(0, 30)
          .map(
            (m: {
              from?: string;
              text?: { body?: string };
              timestamp?: string;
            }) => ({
              from: m.from || "",
              text: m.text?.body || "(media)",
              timestamp: m.timestamp || "",
            })
          );
      }
    }

    if (messages.length === 0) {
      // If no messages found via API, provide guidance
      return NextResponse.json({
        analysis: `Nessun messaggio trovato per **${targetPhone}**.\n\nLa WhatsApp Cloud API funziona principalmente tramite webhook. Per analizzare le conversazioni:\n\n1. Configura un webhook nel tuo account Meta Developer\n2. I messaggi ricevuti verranno salvati automaticamente\n3. Torna qui per analizzarli\n\nIn alternativa, puoi copiare e incollare il testo della conversazione nella chat principale di NormaAI per un'analisi immediata.`,
        count: 0,
      });
    }

    // Build message summaries for Claude
    const msgSummaries = messages
      .map((m, i) => {
        const date = m.timestamp
          ? new Date(parseInt(m.timestamp) * 1000).toLocaleString("it-IT")
          : "";
        return `Messaggio ${i + 1}:
Da: ${m.from}
Data: ${date}
Testo: ${m.text}`;
      })
      .join("\n\n---\n\n");

    // Analyze with Claude
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      system: `Sei NormaAI, assistente giuridico AI. Analizza questa conversazione WhatsApp e fornisci:
1. **Riepilogo della conversazione** — chi sono gli interlocutori, tipo di rapporto
2. **Argomenti principali** — elenco breve dei temi trattati
3. **Aspetti legali rilevanti** — accordi verbali, impegni, scadenze, contestazioni, richieste formali
4. **Valore probatorio** — i messaggi WhatsApp hanno valore legale in Italia (Cass. n. 49016/2017). Segnala eventuali elementi utilizzabili
5. **Suggerimenti pratici** — cosa fare dal punto di vista normativo/legale
Rispondi in italiano, in modo conciso e professionale.`,
      messages: [
        {
          role: "user",
          content: `Analizza la seguente conversazione WhatsApp con ${targetPhone} (${messages.length} messaggi):\n\n${msgSummaries}`,
        },
      ],
    });

    const analysis =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ analysis, count: messages.length });
  } catch (err) {
    console.error("Errore analisi WhatsApp:", err);
    return NextResponse.json(
      { error: "Errore durante l'analisi dei messaggi" },
      { status: 500 }
    );
  }
}
