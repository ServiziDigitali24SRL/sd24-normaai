import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const RAG_URL = process.env.RAG_SERVICE_URL || "http://89.167.123.25:8001";

// ── Per-category system prompts ──────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  Avvocato: `Sei NormaAI, l'assistente AI specializzato nella normativa italiana.
Stai assistendo un cittadino che ha una domanda su diritto civile, penale o amministrativo.
Rispondi in modo chiaro e comprensibile, senza gergo tecnico eccessivo. Spiega cosa dice la legge in parole semplici, poi cita la norma di riferimento.
Indica sempre: cosa può fare il cittadino concretamente, entro quali termini, e se serve rivolgersi a un avvocato.
Cita le fonti normative specifiche (es. art. 1453 c.c., D.Lgs. 231/2001 art. 5) ma spiegane il significato pratico.`,

  Commercialista: `Sei NormaAI, l'assistente AI specializzato nella normativa fiscale italiana.
Stai assistendo un cittadino che ha una domanda su tasse, dichiarazioni, partita IVA, detrazioni o adempimenti fiscali.
Rispondi in modo chiaro e pratico. Spiega cosa deve fare il cittadino, le scadenze da rispettare e le conseguenze di eventuali errori.
Cita le fonti normative (TUIR, IVA, circolari Agenzia delle Entrate) ma rendile comprensibili.
Se il caso è complesso, suggerisci di rivolgersi a un commercialista.`,

  "Consulente del Lavoro": `Sei NormaAI, l'assistente AI specializzato nel diritto del lavoro italiano.
Stai assistendo un cittadino (lavoratore o datore di lavoro) che ha una domanda su busta paga, licenziamento, ferie, malattia, CCNL, contributi INPS o INAIL.
Rispondi in modo diretto e concreto: cosa spetta al cittadino, cosa può fare, entro quando.
Cita le norme rilevanti (Statuto dei Lavoratori, D.Lgs. 81/2015, CCNL applicabili) spiegandone il significato pratico.
Se il caso richiede un professionista, indicalo chiaramente.`,

  "Ingegnere/Geometra": `Sei NormaAI, l'assistente AI specializzato nella normativa edilizia e urbanistica italiana.
Stai assistendo un cittadino che ha una domanda su lavori in casa, permessi edilizi, abusi, ristrutturazioni o normative tecniche.
Rispondi in modo pratico: quale titolo abilitativo serve (CILA, SCIA, permesso di costruire), quali sono le sanzioni, cosa può fare il cittadino.
Cita le norme rilevanti (DPR 380/2001, normative regionali, D.Lgs. 81/2008) in modo comprensibile.
Se il caso richiede un tecnico abilitato, indicalo.`,

  "Consulente Finanziario": `Sei NormaAI, l'assistente AI specializzato nella normativa finanziaria e bancaria italiana.
Stai assistendo un cittadino che ha una domanda su investimenti, conti correnti, mutui, assicurazioni, tutele del consumatore finanziario o obblighi di trasparenza.
Rispondi in modo chiaro e concreto: quali sono i diritti del cittadino, cosa può pretendere dalla banca o dall'intermediario, come tutelarsi.
Cita le norme rilevanti (TUF, TUB, MiFID II, regolamenti Consob/Banca d'Italia) spiegandole in parole semplici.
Ricorda sempre che non stai fornendo consulenza finanziaria personalizzata.`,
};

const DEFAULT_SYSTEM_PROMPT = `Sei NormaAI, l'assistente AI specializzato nella normativa italiana.
Rispondi con precisione giuridica, citando le fonti normative rilevanti quando disponibili.
Struttura le risposte in modo chiaro e professionale. Indica sempre la fonte normativa specifica (legge, decreto, articolo).
Se non hai informazioni sufficienti, indica chiaramente i limiti della risposta.`;

// ── Behavioral rules appended to every system prompt ─────────────────────────

function getBehavioralRules(turnNumber: number): string {
  const proponiProfessionista = turnNumber >= 2
    ? `\n- Hai già avuto ${turnNumber} scambi con il cittadino. Se la situazione è ancora complessa o delicata, DEVI proporre alla fine della risposta: "**Vuoi che ti aiuti a trovare un professionista che possa assisterti direttamente?** Può esaminare il tuo caso e decidere se accettare l'incarico." — attendi la sua risposta (sì/no).`
    : "";

  return `
────────────────────────────────────────
REGOLE COMPORTAMENTALI:
- Cita sempre gli articoli e le norme con riferimento preciso (es. art. 2118 c.c., art. 7 L. 300/1970, D.Lgs. 81/2015 art. 18). Non usare mai percentuali o punteggi di confidenza.
- Alla fine di ogni risposta, poni UNA domanda specifica e mirata per capire meglio la situazione concreta del cittadino (es. "Da quanto tempo lavori in questa azienda?", "Hai già ricevuto contestazioni scritte?").${proponiProfessionista}
────────────────────────────────────────`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVerticale(vertical: string | null): string | undefined {
  if (!vertical) return undefined;
  const map: Record<string, string> = {
    Avvocato: "avvocato",
    Commercialista: "commercialista",
    "Consulente del Lavoro": "lavoro",
    "Ingegnere/Geometra": "tecnico",
    "Consulente Finanziario": "finanziario",
  };
  return map[vertical];
}

function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey: key });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RagResult {
  id: string;
  titolo: string;
  chunk: string;
  fonte: string;
  tipo: string;
  data: string;
  url: string;
  score: number;
}

interface Source {
  id: string;
  titolo: string;
  fonte: string;
  url: string;
  tipo: string;
}

interface Attachment {
  type: "document" | "image";
  mediaType: string;
  name: string;
  data: string;         // base64 for PDF / images
  textContent?: string; // plain text for .txt files
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

// ── Route ─────────────────────────────────────────────────────────────────────

function buildUserContent(question: string, attachment?: Attachment) {
  if (!attachment) return question;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];

  if (attachment.type === "image") {
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: attachment.mediaType, data: attachment.data },
    });
  } else if (attachment.mediaType === "application/pdf") {
    blocks.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: attachment.data },
    });
  } else if (attachment.textContent) {
    blocks.push({
      type: "text",
      text: `Documento allegato "${attachment.name}":\n---\n${attachment.textContent}\n---\n\n`,
    });
  }

  blocks.push({ type: "text", text: question });
  return blocks;
}

export async function POST(req: NextRequest) {
  const { question, vertical, userId, attachment, conversationHistory, turnNumber } = await req.json();

  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "question is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const currentTurn: number = typeof turnNumber === "number" ? turnNumber : 0;

  // 1. Fetch RAG chunks from VPS ─────────────────────────────────────────────
  let ragContext = "";
  let sources: Source[] = [];

  try {
    const ragRes = await fetch(`${RAG_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: question,
        top_k: 6,
        verticale: getVerticale(vertical),
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (ragRes.ok) {
      const ragData = await ragRes.json();
      const results: RagResult[] = ragData.results || [];

      if (results.length > 0) {
        ragContext = results
          .map(
            (r, i) =>
              `[Fonte ${i + 1}] ${r.titolo}\nFonte: ${r.fonte} | Tipo: ${r.tipo}${r.data ? " | Data: " + r.data : ""}\n${r.chunk}`
          )
          .join("\n\n---\n\n");

        sources = results.map((r) => ({
          id: r.id,
          titolo: r.titolo,
          fonte: r.fonte,
          url: r.url,
          tipo: r.tipo,
        }));
      }
    }
  } catch {
    // RAG unavailable — continue without context, Claude answers from training
  }

  // 2. Build system prompt ───────────────────────────────────────────────────
  const basePrompt =
    (vertical && SYSTEM_PROMPTS[vertical]) || DEFAULT_SYSTEM_PROMPT;

  const behavioralRules = getBehavioralRules(currentTurn);

  const fullSystem = ragContext
    ? `${basePrompt}${behavioralRules}\n\n────────────────────────────────────────\nDOCUMENTI NORMATIVI RECUPERATI DAL CORPUS NORMAAI:\n\n${ragContext}\n────────────────────────────────────────\n\nBasa la risposta prioritariamente su questi documenti. Cita le fonti come [Fonte N] con il riferimento normativo esatto (articolo, legge, decreto). Non citare mai percentuali o punteggi.`
    : `${basePrompt}${behavioralRules}\n\n⚠️ Il corpus normativo non è al momento raggiungibile. Rispondi basandoti sulla tua conoscenza della normativa italiana, specificando che la risposta non è stata verificata sul corpus aggiornato di NormaAI.`;

  // 3. Build messages array (multi-turn) ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [];

  // Add previous conversation turns (max last 4 = 2 exchanges) truncated
  const history: ConversationTurn[] = Array.isArray(conversationHistory)
    ? conversationHistory.slice(-4)
    : [];

  for (const turn of history) {
    messages.push({
      role: turn.role,
      content: turn.role === "assistant"
        ? turn.content.slice(0, 1000) // truncate long past responses
        : turn.content,
    });
  }

  // Add current user message
  messages.push({
    role: "user",
    content: buildUserContent(question, attachment),
  });

  // 4. Stream Claude response ────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      // First event: sources metadata
      send({ type: "sources", sources, hasRag: ragContext.length > 0 });

      try {
        const anthropic = getAnthropic();
        const anthropicStream = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 1500,
          system: fullSystem,
          messages,
          stream: true,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send({ type: "text", text: event.delta.text });
          }
          if (event.type === "message_stop") {
            send({ type: "done" });
          }
        }
      } catch (err) {
        send({ type: "error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-User-Id": userId || "",
    },
  });
}
