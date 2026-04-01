import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

// Dev fallback: carica .env.local se ANTHROPIC_API_KEY non è ancora in process.env
// (capita quando il server viene avviato prima che il file esista)
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^#\s][^=]*)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) process.env[key] = value;
      }
    }
  } catch { /* .env.local non trovato — ignorato */ }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

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
  if (!key) {
    console.error("[NormaAI] ANTHROPIC_API_KEY not found in env. Available keys:", Object.keys(process.env).filter(k => k.includes("ANTHROPIC") || k.includes("NEXT")));
    throw new Error("ANTHROPIC_API_KEY not configured");
  }
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

interface SupabaseChunk {
  id: string;
  content: string;
  metadata: Record<string, string>;
  similarity: number;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data?.[0]?.embedding ?? null;
  } catch { return null; }
}

async function searchSupabase(embedding: number[]): Promise<SupabaseChunk[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_embeddings`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_count: 6,
        match_threshold: 0.30,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return await res.json() as SupabaseChunk[];
  } catch { return []; }
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

  // 1. RAG — embedding + Supabase hybrid_search ────────────────────────────
  let ragContext = "";
  let sources: Source[] = [];

  try {
    const embedding = await generateEmbedding(question);
    if (embedding) {
      const chunks = await searchSupabase(embedding);
      if (chunks.length > 0) {
        ragContext = chunks
          .map((c, i) => {
            const m = c.metadata || {};
            const ref = m.law_reference || m.source_type || "Normativa";
            const art = m.article_number ? ` art. ${m.article_number}` : "";
            return `[Fonte ${i + 1}] ${ref}${art} (${m.source_type || "corpus"})\n${c.content}`;
          })
          .join("\n\n---\n\n");
        sources = chunks.map((c) => {
          const m = c.metadata || {};
          return {
            id: String(c.id),
            titolo: (m.law_reference || m.source_type || "Normativa") + (m.article_number ? " art. " + m.article_number : ""),
            fonte: m.source_type || "normattiva",
            url: "",
            tipo: m.category || m.source_type || "normativa",
          };
        });
      }
    }
  } catch {
    // RAG unavailable — Claude risponde dalla sua conoscenza
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
          model: "claude-sonnet-4-6",
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
