import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    chat: { id: number; title?: string; first_name?: string; last_name?: string; type: string };
    date: number;
    text?: string;
  };
}

interface ChatInfo {
  chatId: number;
  chatName: string;
  lastMessage: string;
  date: string;
}

// GET: fetch recent chats list
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Get Telegram token
  const { data: tokenRecord } = await supabase
    .from("user_telegram_tokens")
    .select("bot_token")
    .eq("user_id", user.id)
    .single();

  if (!tokenRecord) {
    return NextResponse.json(
      { error: "Telegram non connesso" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${tokenRecord.bot_token}/getUpdates?limit=100`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Errore comunicazione con Telegram" },
        { status: 502 }
      );
    }

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json(
        { error: "Risposta non valida da Telegram" },
        { status: 502 }
      );
    }

    const updates: TelegramUpdate[] = data.result || [];

    // Group messages by chat and get latest for each
    const chatMap = new Map<number, ChatInfo>();

    for (const update of updates) {
      const msg = update.message;
      if (!msg) continue;

      const chatId = msg.chat.id;
      const chatName =
        msg.chat.title ||
        [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(" ") ||
        `Chat ${chatId}`;
      const text = msg.text || "(media)";
      const date = new Date(msg.date * 1000).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
      });

      const existing = chatMap.get(chatId);
      if (!existing || msg.date > new Date(existing.date).getTime() / 1000) {
        chatMap.set(chatId, {
          chatId,
          chatName,
          lastMessage: text.length > 80 ? text.slice(0, 80) + "..." : text,
          date,
        });
      }
    }

    const messages = Array.from(chatMap.values()).sort((a, b) => {
      // Sort by most recent first
      const dateA = updates.find(u => u.message?.chat.id === a.chatId)?.message?.date || 0;
      const dateB = updates.find(u => u.message?.chat.id === b.chatId)?.message?.date || 0;
      return dateB - dateA;
    });

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json(
      { error: "Errore di connessione a Telegram" },
      { status: 502 }
    );
  }
}

// POST: analyze a specific chat
export async function POST(req: NextRequest) {
  const { chatId } = await req.json();

  if (!chatId) {
    return NextResponse.json(
      { error: "Chat ID mancante" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  // Get Telegram token
  const { data: tokenRecord } = await supabase
    .from("user_telegram_tokens")
    .select("bot_token")
    .eq("user_id", user.id)
    .single();

  if (!tokenRecord) {
    return NextResponse.json(
      { error: "Telegram non connesso" },
      { status: 400 }
    );
  }

  try {
    // Fetch updates and filter by chat
    const res = await fetch(
      `https://api.telegram.org/bot${tokenRecord.bot_token}/getUpdates?limit=100`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Errore comunicazione con Telegram" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const updates: TelegramUpdate[] = data.result || [];

    const chatMessages = updates
      .filter(u => u.message && u.message.chat.id === chatId)
      .map(u => u.message!)
      .sort((a, b) => a.date - b.date)
      .slice(-30);

    if (chatMessages.length === 0) {
      return NextResponse.json({
        analysis: "Nessun messaggio trovato in questa chat.",
        count: 0,
      });
    }

    // Get chat name from first message
    const chatName =
      chatMessages[0].chat.title ||
      [chatMessages[0].chat.first_name, chatMessages[0].chat.last_name]
        .filter(Boolean)
        .join(" ") ||
      `Chat ${chatId}`;

    // Build message summaries
    const msgSummaries = chatMessages
      .map((msg, i) => {
        const senderName = msg.from
          ? [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") ||
            msg.from.username ||
            "Sconosciuto"
          : "Sconosciuto";
        const date = new Date(msg.date * 1000).toLocaleString("it-IT");
        return `Messaggio ${i + 1}:
Da: ${senderName}
Data: ${date}
Testo: ${msg.text || "(media/allegato)"}`;
      })
      .join("\n\n---\n\n");

    // Analyze with Claude
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      system: `Sei NormaAI, assistente giuridico AI. Analizza questa conversazione Telegram e fornisci:
1. **Riepilogo della conversazione** — partecipanti e contesto
2. **Argomenti principali** — elenco breve dei temi trattati
3. **Aspetti legali rilevanti** — accordi, impegni, scadenze, contestazioni, richieste formali
4. **Valore probatorio** — i messaggi digitali hanno valore legale in Italia. Segnala elementi utilizzabili
5. **Suggerimenti pratici** — cosa fare dal punto di vista normativo/legale
Rispondi in italiano, in modo conciso e professionale.`,
      messages: [
        {
          role: "user",
          content: `Analizza la seguente conversazione Telegram "${chatName}" (${chatMessages.length} messaggi):\n\n${msgSummaries}`,
        },
      ],
    });

    const analysis =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ analysis, count: chatMessages.length });
  } catch (err) {
    console.error("Errore analisi Telegram:", err);
    return NextResponse.json(
      { error: "Errore durante l'analisi dei messaggi" },
      { status: 500 }
    );
  }
}
