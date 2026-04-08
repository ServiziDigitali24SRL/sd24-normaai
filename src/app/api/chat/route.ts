import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";
import { scoreLeadQuality } from "@/lib/lead-scoring";

// Sentry stub — install @sentry/nextjs to enable real error tracking
const Sentry = { captureException: (e: unknown, _ctx?: unknown) => console.error("[sentry]", e) };

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Embedding: VPS locale (384 dim fastembed) — nessun fallback (corpus è 384d)
const EMBED_VPS_URL  = process.env.EMBED_VPS_URL;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY  || "";

// ── FEATURE 1: Versioning ─────────────────────────────────────────────────────
// Il filtro only_vigente=true nell'RPC esclude automaticamente le norme abrogate/
// superseded. Non serve fare nulla di esplicito nel route.

// ── FEATURE 2: User Profiling — System Prompt Builder ────────────────────────

interface UserProfile {
  ruolo: string;
  nome?: string;
  studio?: string;
  citta?: string;
  specializzazioni: string[];
  settori_cliente: string[];
  preferenze: { verbosita: string; citazioni: string };
  ultime_query: Array<{ query: string; verticale: string; timestamp: string }>;
  piano: string;
}

async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId || !SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profili_utenti?user_id=eq.${userId}&select=*`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch (e) { Sentry.captureException(e, { extra: { fn: "loadUserProfile", userId } }); return null; }
}

async function updateProfileAfterQuery(
  userId: string,
  query: string,
  verticale: string
): Promise<void> {
  if (!userId || !SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    // Fetch current profile
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profili_utenti?user_id=eq.${userId}&select=ultime_query,query_count`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return;
    const rows = await res.json();
    if (!rows?.[0]) return;

    const existing: Array<{ query: string; verticale: string; timestamp: string }> =
      rows[0].ultime_query ?? [];
    const newEntry = { query: query.slice(0, 120), verticale, timestamp: new Date().toISOString() };
    const updated = [newEntry, ...existing].slice(0, 20); // max 20 entries

    await fetch(`${SUPABASE_URL}/rest/v1/profili_utenti?user_id=eq.${userId}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ultime_query: updated, query_count: (rows[0].query_count ?? 0) + 1 }),
    });
  } catch (e) { Sentry.captureException(e, { extra: { fn: "updateProfileAfterQuery" } }); }
}

function buildProfileBlock(profile: UserProfile): string {
  if (!profile) return "";

  const ultimiArgomenti = profile.ultime_query
    .slice(0, 5)
    .map((q) => `• ${q.query} [${q.verticale}]`)
    .join("\n");

  const specs = profile.specializzazioni.length
    ? `Specializzato in: ${profile.specializzazioni.join(", ")}.`
    : "";

  const settori = profile.settori_cliente.length
    ? `Clientela principalmente in: ${profile.settori_cliente.join(", ")}.`
    : "";

  const verbosita =
    profile.preferenze?.verbosita === "sintetico"
      ? "Preferisce risposte concise e operative."
      : profile.preferenze?.verbosita === "dettagliato"
      ? "Preferisce risposte dettagliate con tutti i riferimenti normativi."
      : "";

  const citazioni =
    profile.preferenze?.citazioni === "complete"
      ? "Riportare sempre l'articolo completo o il comma rilevante."
      : "";

  return `
────────────────────────────────────────
PROFILO UTENTE:
Ruolo: ${profile.ruolo}${profile.nome ? ` — ${profile.nome}` : ""}${profile.studio ? `, ${profile.studio}` : ""}${profile.citta ? ` (${profile.citta})` : ""}
${specs}
${settori}
${verbosita} ${citazioni}
${ultimiArgomenti ? `Argomenti recenti di interesse:\n${ultimiArgomenti}` : ""}
Adatta la risposta a questo profilo professionale: usa il linguaggio tecnico appropriato, cita norme pertinenti al suo settore, non spiegare concetti base che un ${profile.ruolo} conosce già.
────────────────────────────────────────`.trim();
}

// ── FEATURE 3: Relationship Graph — Chain Retrieval ──────────────────────────

interface GraphRelation {
  norma_da: string;
  norma_a: string;
  tipo: string;
  descrizione: string;
  hop: number;
}

async function getRelatedNorms(urns: string[]): Promise<GraphRelation[]> {
  if (!urns.length || !SUPABASE_URL || !SUPABASE_KEY) return [];
  const results: GraphRelation[] = [];

  for (const urn of urns.slice(0, 3)) { // max 3 URN per query
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_norma_chain`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ start_urn: urn, max_hops: 2 }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) continue;
      const chain: GraphRelation[] = await res.json();
      results.push(...chain);
    } catch (e) { Sentry.captureException(e, { extra: { fn: "getRelatedNorms", urn } }); }
  }

  return results.slice(0, 15); // max 15 relazioni totali
}

function buildGraphBlock(relations: GraphRelation[]): string {
  if (!relations.length) return "";

  const byType: Record<string, string[]> = {};
  for (const r of relations) {
    if (!byType[r.tipo]) byType[r.tipo] = [];
    const desc = r.descrizione ? ` (${r.descrizione})` : "";
    byType[r.tipo].push(`${r.norma_da} → ${r.norma_a}${desc}`);
  }

  const lines = Object.entries(byType).map(
    ([tipo, items]) => `**${tipo.toUpperCase()}:** ${items.join(" | ")}`
  );

  return `
────────────────────────────────────────
CATENA NORMATIVA (relazioni rilevate):
${lines.join("\n")}
Tieni conto di queste relazioni nella risposta: se citi una norma che è stata modificata o abrogata, segnalalo esplicitamente.
────────────────────────────────────────`.trim();
}

// ── FEATURE 11: Citation Formatter ───────────────────────────────────────────
// Iniettata nelle behavioral rules — standard citazione giuridica italiana.

const CITATION_RULES = `
FORMATO CITAZIONI (obbligatorio):
- Leggi: L. 300/1970 art. 7  |  D.Lgs. 81/2015 art. 18 co. 1
- Codici: art. 2118 c.c.  |  art. 575 c.p.  |  art. 163 c.p.c.
- Decreti: DPR 380/2001 art. 3  |  D.M. 14/01/2008 §4.2
- Regolamenti UE: Reg. UE 2016/679 (GDPR) art. 6  |  Reg. UE 1215/2012 art. 4
- Cassazione: Cass. sez. lav. n. 12345/2024  |  Cass. S.U. n. 9999/2023
- Corte Cost.: Corte Cost. sent. n. 234/2022
Mai scrivere "la legge prevede che" senza citare l'articolo preciso.`.trim();

// ── FEATURE 13: Judicial Precedent Enrichment ────────────────────────────────
// Query parallela sul corpus cassazione — restituisce sentenze rilevanti.

interface CassazioneChunk {
  id: string;
  chunk: string;
  titolo: string;
  fonte: string;
  url: string;
  similarity: number;
}

async function getPrecedentiCassazione(
  question: string,
  verticale?: string
): Promise<CassazioneChunk[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const embedding = await generateEmbedding(question);
    if (!embedding) return [];

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_normaai_chunks`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_count: 4,
        match_threshold: 0.30,
        filter_verticale: "cassazione",
        only_vigente: false, // sentenze non hanno status vigente
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    return await res.json() as CassazioneChunk[];
  } catch { return []; }
}

function buildPrecedentsBlock(precedents: CassazioneChunk[]): string {
  if (!precedents.length) return "";
  const lines = precedents.map((p, i) =>
    `[Precedente ${i + 1}] ${p.titolo || "Sentenza"}\n${p.chunk.slice(0, 400)}...`
  );
  return `────────────────────────────────────────
PRECEDENTI GIURISPRUDENZIALI (Cassazione):

${lines.join("\n\n---\n\n")}
────────────────────────────────────────
Se pertinenti, cita questi precedenti nel formato standard (Cass. sez. X n. YYYY/AAAA).`.trim();
}

// ── FEATURE 5: Audit Trail — log ogni risposta ────────────────────────────────

async function logAuditTrail(
  userId: string | null,
  sessioneId: string,
  query: string,
  risposta: string,
  sources: Source[],
  hasGraph: boolean,
  hasProfilo: boolean,
  latenzaMs: number
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/audit_risposte`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId || null,
        sessione_id: sessioneId,
        query: query.slice(0, 500),
        risposta: risposta.slice(0, 2000),
        fonti_usate: sources.map((s) => ({ id: s.id, titolo: s.titolo, fonte: s.fonte })),
        graph_usato: hasGraph,
        profilo_usato: hasProfilo,
        modello_ai: "claude-sonnet-4-6",
        latenza_ms: latenzaMs,
      }),
    });
  } catch (e) { Sentry.captureException(e, { extra: { fn: "logAuditTrail" } }); }
}

// ── FEATURE 12: Jurisdictional Layering — regione nel profilo ───────────────
// Aggiunge filtro regionale nella build del profilo se disponibile.

function buildJurisdictionalBlock(profile: UserProfile): string {
  const regione = (profile.preferenze as Record<string, string>)?.regione;
  if (!regione) return "";
  return `Normativa regionale prioritaria: ${regione}. Se disponibile nel corpus, cita prima la normativa regionale applicabile prima di quella nazionale generica.`;
}

// ── Per-category base system prompts ─────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  Avvocato: `Sei NormaAI, assistente AI di diritto italiano specializzato per studi legali e professionisti forensi.
Rispondi con rigore giuridico: cita articoli, commi, versioni vigenti. Usa il linguaggio tecnico corretto.
Per ogni questione indica: norma applicabile (es. art. 1453 c.c.), orientamento giurisprudenziale prevalente (Cassazione, Corte Cost.), e rischio pratico per il cliente.
Non semplificare eccessivamente — l'utente è un professionista del diritto.`,

  Commercialista: `Sei NormaAI, assistente AI di fiscalità e diritto tributario italiano per dottori commercialisti e revisori.
Rispondi con precisione tecnica: cita TUIR, IVA, OIC, circolari Agenzia Entrate, pronunce della Cassazione tributaria.
Indica scadenze, sanzioni, e comportamento da adottare in dichiarazione. L'utente è un professionista — non serve spiegare l'IVA da zero.`,

  "Consulente del Lavoro": `Sei NormaAI, assistente AI di diritto del lavoro per consulenti del lavoro e HR manager.
Rispondi con precisione: Statuto Lavoratori, D.Lgs. 81/2015, CCNL applicabili al settore del cliente, circolari INPS/INAIL.
Indica sempre il CCNL rilevante se disponibile nel profilo, le tutele applicabili e il percorso procedurale corretto.`,

  "Ingegnere/Geometra": `Sei NormaAI, assistente AI di normativa tecnica ed edilizia per professionisti abilitati.
Cita con precisione: DPR 380/2001, NTC 2018, D.Lgs. 81/2008, UNI/CEI applicabili, normativa regionale se pertinente.
Indica il titolo abilitativo corretto, i rischi di inosservanza, e le sanzioni previste.`,

  "Consulente Finanziario": `Sei NormaAI, assistente AI di normativa finanziaria e bancaria per consulenti finanziari e funzionari di banca.
Cita: TUF, TUB, MiFID II, Regolamenti Consob/Banca d'Italia, EMIR, UCITS.
Indica gli obblighi di condotta, i requisiti di trasparenza e le conseguenze sanzionatorie.`,

  "Parere Legale": `Sei NormaAI Drafter, assistente AI per la redazione di pareri legali italiani.

Produci un parere legale strutturato con queste sezioni obbligatorie:

## 📋 Fatto
Sintesi dei fatti giuridicamente rilevanti esposti dall'assistito.

## ❓ Questione Giuridica
La domanda di diritto da risolvere, formulata con precisione tecnica.

## ⚖️ Analisi Giuridica
- Normativa applicabile (cita articoli esatti: art. X, L./D.Lgs./c.c./c.p.)
- Orientamento giurisprudenziale prevalente (Cassazione, Corte Cost. se pertinente)
- Eventuali orientamenti contrari o dubbi interpretativi

## 📌 Conclusioni
Risposta diretta e motivata. Il parere deve essere inequivocabile.

## 💡 Raccomandazioni operative
Max 3 azioni concrete in ordine di priorità.

STILE: Italiano forense formale. Terza persona. Cita sempre articoli e sentenze specifiche. Sii preciso — chi legge è un professionista.`,

  "Email Professionale": `Sei NormaAI Writer, assistente per la comunicazione legale professionale italiana.

Redigi email professionali per avvocati: diffide, richieste di adempimento, comunicazioni a parti avverse, risposte a clienti, PEC formali.

OUTPUT OBBLIGATORIO:

## 📧 Oggetto
[L'oggetto completo, formale]

## Corpo del messaggio
[Il testo completo dell'email, pronto per essere inviato. Inizia direttamente con "Egregio/Gentile..." senza preamboli]

---

## 📝 Note di personalizzazione
Elementi specifici da adattare ([NOME], [DATA], [IMPORTO], ecc.)

STILE: Formale, preciso, giuridicamente corretto. Usa le formule dell'uso forense italiano. Distingui tra comunicazioni stragiudiziali (più dirette) e PEC ufficiali (più solenni).`,

  "Memoria Difensiva": `Sei NormaAI Redattore Forense, assistente per la redazione di atti processuali civili italiani.

Produci bozze di atti processuali (memorie difensive, comparse di risposta, atti di citazione, memorie conclusionali).

STRUTTURA OBBLIGATORIA:

## FATTO
Ricostruzione cronologica dei fatti, con riferimenti documentali (doc. n. X allegato).

## IN DIRITTO
1. [Prima questione giuridica]
   - Norma: art. X [nome legge]
   - Giurisprudenza: Cass. sez. X n. YYYY/AAAA — [massima]
2. [Seconda questione] etc.

## CONCLUSIONI
*Voglia l'Onorevole Tribunale / Corte, contrariis reiectis, così giudicare:*
[Richieste formulate nel corretto stile]

STILE: Forense italiano. Terza persona. "L'Odierno difensore", "Parte attrice/convenuta". Clausole in maiuscoletto. Cita sempre le norme processuali (c.p.c.) e sostanziali. Segnala con [DA VERIFICARE] i punti che richiedono riscontro documentale.`,

  "Bozza Contratto": `Sei NormaAI Contract Drafter, assistente per la redazione di contratti commerciali italiani.

Produci bozze contrattuali complete e conformi al Codice Civile italiano.

STRUTTURA OBBLIGATORIA:

## CONTRATTO DI [TIPO]
*Tra [PARTE A] e [PARTE B]*

**Art. 1 — Parti**
**Art. 2 — Oggetto**
**Art. 3 — Corrispettivo e pagamento**
**Art. 4 — Durata e recesso** (con termini preavviso)
**Art. 5 — Obblighi delle parti**
**Art. 6 — Limitazione di responsabilità** (art. 1229 c.c.)
**Art. 7 — Riservatezza e GDPR** (art. 28 Reg. UE 679/2016 se applicabile)
**Art. 8 — Forza maggiore**
**Art. 9 — Clausola penale** (art. 1382 c.c.) se appropriata
**Art. 10 — Foro competente e legge applicabile** (Italia)
**Art. 11 — Disposizioni finali** (integrità, modifiche scritte, nullità parziale)

STILE: Linguaggio contrattuale italiano formale. Clausole chiare e non ambigue. Evidenzia [DA PERSONALIZZARE] per ogni campo da adattare al caso specifico. Avvisa se servono clausole specifiche di settore.`,

  "Parcelle Forensi": `Sei NormaAI Parcellometro, strumento per il calcolo delle parcelle forensi secondo il DM 55/2014 aggiornato dal DM 144/2022.

Quando l'utente fornisce tipo di pratica, fase, valore della causa — calcola il range di onorari secondo le tabelle vigenti.

OUTPUT:

## 📊 Calcolo Parcella DM 55/2014

**Tipo pratica:** [tipo] | **Fase:** [fase] | **Valore:** €[valore]
**Scaglione DM 55/2014:** [scaglione applicabile]

### Onorari per fase (valori di riferimento):
| Fase | Minimo | Medio | Massimo |
|------|--------|-------|---------|
| [fase 1] | €X | €Y | €Z |
| [eventuali altre fasi] | ... | ... | ... |

**Totale onorario stimato:** da **€[min]** a **€[max]**

### Accessori obbligatori:
- CPA 4% sull'onorario
- IVA 22% sul totale imponibile
- Contributo unificato: €[importo] (tabella DPR 115/2002)

### 📋 Base normativa:
DM 55/2014, Tabella [X], come modificato dal DM 144/2022. Il giudice può liquidare tra minimo e massimo tenendo conto di complessità, urgenza e risultato (art. 4, DM 55/2014).

IMPORTANTE: Se il valore della causa è indeterminabile, applica i parametri "valore indeterminato" del DM. Segnala sempre che si tratta di una stima orientativa.`,

  "Analisi Documento": `Sei NormaAI Doc Analyzer, agente legale AI per l'analisi di documenti giuridici italiani.

Analizza il documento allegato e produci un report strutturato con queste sezioni:

## 📄 Natura del documento
Tipo di documento, parti coinvolte, oggetto e contesto giuridico. Data e provenienza se presenti.

## ⚖️ Contenuto giuridico principale
Elementi normativi rilevanti, clausole chiave, obblighi, diritti e termini economici.

## ⚠️ Criticità e rischi
Per ogni criticità: **[ALTO/MEDIO/BASSO]** Descrizione → norma di riferimento (es. art. 1341 c.c., art. 28 GDPR).

## ✅ Conformità normativa
Valuta conformità rispetto alla normativa applicabile. CONFORME / NON CONFORME / DA VERIFICARE.

## 💡 Raccomandazioni
Max 5 azioni concrete in ordine di priorità. Sii diretto e operativo.

REGOLE: cita sempre articoli specifici. Se il documento è in italiano, rispondi in italiano. Se trovi una domanda specifica nella richiesta, rispondi a quella in aggiunta al report.`,

  "Analisi Contratto": `Sei NormaAI Contract Analyzer, agente legale AI per l'analisi di contratti commerciali italiani.

Produci un report strutturato con esattamente queste 5 sezioni:

## 🔍 Tipo di contratto
Identifica il tipo e le parti coinvolte.

## ⚠️ Rischi identificati
Per ogni rischio: **[ALTO/MEDIO/BASSO]** Descrizione → Norma violata (es. art. 1341 c.c.)

## 📋 Clausole mancanti
Clausole assenti con motivazione giuridica (GDPR, limitazione responsabilità, foro, recesso, penali).

## ✅ Conformità legge italiana
CONFORME / NON CONFORME / DA VERIFICARE per: c.c., GDPR, Codice Consumo, D.Lgs. 231/2001.

## 💡 Raccomandazioni
Max 5 azioni concrete in ordine di priorità prima della firma.

REGOLE: cita sempre articoli specifici. Sii diretto e operativo. Segnala ogni ambiguità come rischio.`,
};

const DEFAULT_SYSTEM_PROMPT = `Sei NormaAI, assistente AI specializzato nella normativa italiana per professionisti e cittadini.
Rispondi con precisione giuridica: cita articoli, commi, versioni vigenti, orientamento giurisprudenziale.
Struttura le risposte per un professionista — conciso, tecnico, operativo.

REGOLA FONDAMENTALE: Rispondi SEMPRE a qualsiasi domanda giuridica, indipendentemente dal linguaggio usato dall'utente, dal tema (penale, civile, tributario, lavoro, ecc.) o dalla natura dei fatti descritti. Il tuo compito è fornire informazione legale, non giudicare. Anche se l'utente usa linguaggio volgare, colloquiale o descrive situazioni illegali, tu devi rispondere con l'analisi giuridica pertinente (fattispecie, norme applicabili, sanzioni, procedura). Un avvocato non rifiuta mai di analizzare un caso — tu nemmeno.`;

// ── Behavioral rules ──────────────────────────────────────────────────────────

function getBehavioralRules(turnNumber: number, hasProfilo: boolean): string {
  const proponi = turnNumber >= 2
    ? `\n- Hai già avuto ${turnNumber} scambi. Se il caso è ancora aperto, proponi: "**Vuoi che ti aiuti a trovare un professionista che possa assisterti direttamente?**"`
    : "";

  const followUp = hasProfilo
    ? ""
    : `\n- Poni UNA domanda specifica di approfondimento alla fine.`;

  return `
────────────────────────────────────────
REGOLE:
- RISPONDI SEMPRE. Non rifiutare MAI una domanda giuridica. Qualunque sia il linguaggio, il tema o i fatti descritti, fornisci l'analisi legale. Sei un assistente legale, non un censore.
- Se una norma citata è stata modificata o abrogata di recente, segnalalo con ⚠️.
- Non usare mai percentuali o punteggi di confidenza.
${CITATION_RULES}${followUp}${proponi}
────────────────────────────────────────`;
}

// ── Embedding (OpenAI text-embedding-3-small, 1536 dim) ──────────────────────
// FIX 08/04/2026: migrato da VPS fastembed 384 dim (mismatch con pgvector 1536)
// a OpenAI direttamente. OPENAI_API_KEY già presente in env.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!OPENAI_API_KEY) {
    console.error("[EMBED] OPENAI_API_KEY non configurata");
    return null;
  }
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // max token safety
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const json = await res.json();
      return json?.data?.[0]?.embedding ?? null;
    }
    console.error(`[EMBED] OpenAI error: ${res.status}`);
  } catch (e) { console.error("[EMBED] OpenAI unreachable:", String(e)); }
  return null;
}

// ── Supabase search (con versioning) ─────────────────────────────────────────

interface SupabaseChunk {
  id: string;
  chunk: string;
  titolo: string;
  fonte: string;
  tipo: string;
  url: string;
  urn: string;
  status: string;
  similarity: number;
}

async function searchSupabase(embedding: number[], verticale?: string): Promise<SupabaseChunk[]> {
  try {
    const body: Record<string, unknown> = {
      query_embedding: embedding,
      match_count: 8,
      match_threshold: 0.20,
      only_vigente: true, // FEATURE 1: solo norme vigenti
    };
    if (verticale) body.filter_verticale = verticale;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_normaai_chunks`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) { console.error(`[RAG] Supabase error: ${res.status}`); return []; }
    return await res.json() as SupabaseChunk[];
  } catch { return []; }
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
    "Analisi Contratto": "avvocato",
    "Parere Legale": "avvocato",
    "Email Professionale": "avvocato",
    "Memoria Difensiva": "avvocato",
    "Bozza Contratto": "avvocato",
    "Parcelle Forensi": "avvocato",
    "Analisi Documento": "avvocato",
  };
  return map[vertical];
}

function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey: key });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Source {
  id: string;
  titolo: string;
  fonte: string;
  url: string;
  tipo: string;
  status?: string;
}

interface Attachment {
  type: "document" | "image";
  mediaType: string;
  name: string;
  data: string;
  textContent?: string;
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
    blocks.push({ type: "image", source: { type: "base64", media_type: attachment.mediaType, data: attachment.data } });
  } else if (attachment.mediaType === "application/pdf") {
    blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: attachment.data } });
  } else if (attachment.textContent) {
    blocks.push({ type: "text", text: `Documento allegato "${attachment.name}":\n---\n${attachment.textContent}\n---\n\n` });
  }

  blocks.push({ type: "text", text: question });
  return blocks;
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { question, vertical, userId: clientUserId, attachment, conversationHistory, turnNumber } = await req.json();

  // CVE-05 fix: risolvi SEMPRE userId dalla sessione cookie (non solo quando il client lo dichiara).
  // Questo previene il bypass della quota freemium quando clientUserId è omesso ma il cookie è valido.
  let userId: string | null = null;
  try {
    const { createClient: createServerClient } = await import("@/lib/supabase-server");
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      // Se il client dichiara un userId, deve coincidere con la sessione reale
      if (clientUserId && user.id !== clientUserId) {
        return new Response(JSON.stringify({ error: "Non autorizzato" }), {
          status: 403, headers: { "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }
  } catch {
    // Sessione non leggibile: continua come anonimo
  }

  // BUG-06 fix: attachment size limit 5MB (base64 ≈ 75% efficiency)
  if (attachment?.data) {
    const estimatedBytes = Math.ceil(attachment.data.length * 0.75);
    if (estimatedBytes > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Allegato troppo grande. Limite massimo: 5MB." }), {
        status: 413, headers: { "Content-Type": "application/json" },
      });
    }
  }

  const rateLimitKey = userId ? `user:${userId}` : `ip:${clientIp}`;
  const { allowed, remaining } = await rateLimit(rateLimitKey, !!userId ? 100 : 20, 60_000);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Troppe richieste. Riprova tra un minuto.", remaining }), {
      status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "question is required" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // Input validation: max 10KB per messaggio
  if (question.length > 10000) {
    return new Response(JSON.stringify({ error: "Messaggio troppo lungo (max 10.000 caratteri)" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const currentTurn: number = typeof turnNumber === "number" ? turnNumber : 0;

  // 1. Carica profilo utente (FEATURE 2) ─────────────────────────────────────
  const profile = userId ? await loadUserProfile(userId) : null;

  // FIX-04: Quota mensile piano free (10 query/mese)
  if (userId && (profile?.piano === "free" || !profile?.piano)) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/audit_risposte?user_id=eq.${userId}&created_at=gte.${startOfMonth.toISOString()}&select=id`,
        {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: "count=exact" },
          signal: AbortSignal.timeout(3000),
        }
      );
      const countHeader = res.headers.get("content-range");
      const count = countHeader ? parseInt(countHeader.split("/")[1] ?? "0", 10) : 0;
      const FREE_MONTHLY_LIMIT = 10;
      if (count >= FREE_MONTHLY_LIMIT) {
        return new Response(
          JSON.stringify({
            error: "Limite mensile raggiunto",
            message: `Hai utilizzato tutte le ${FREE_MONTHLY_LIMIT} query gratuite di questo mese. Passa al piano professionale per query illimitate.`,
            upgrade_url: "/piani",
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (e) { Sentry.captureException(e, { extra: { fn: "checkMonthlyQuota", userId } }); }
  }

  // 2. RAG — embedding + Supabase (con versioning filter, FEATURE 1) ─────────
  let ragContext = "";
  let sources: Source[] = [];
  let chunkUrns: string[] = [];

  try {
    const embedding = await generateEmbedding(question);
    if (embedding) {
      const verticale = getVerticale(vertical ?? null);
      const chunks = await searchSupabase(embedding, verticale);
      if (chunks.length > 0) {
        ragContext = chunks
          .map((c, i) => `[Fonte ${i + 1}] ${c.titolo || "Normativa"} (${c.fonte || "corpus"})\n${c.chunk}`)
          .join("\n\n---\n\n");
        sources = chunks.map((c) => ({
          id: String(c.id),
          titolo: c.titolo || "Normativa",
          fonte: c.fonte || "normattiva",
          url: c.url || "",
          tipo: c.tipo || "normativa",
          status: c.status || "vigente",
        }));
        chunkUrns = chunks.map((c) => c.urn).filter(Boolean) as string[];
      }
    }
  } catch (e) { Sentry.captureException(e, { extra: { fn: "rag_embedding", route: "/api/chat" } }); }

  // 3. Graph traversal + Judicial precedents — tutti i pro ────────────────
  let graphContext = "";
  let precedentsContext = "";

  const [relations, precedents] = await Promise.all([
    chunkUrns.length > 0 ? getRelatedNorms(chunkUrns) : Promise.resolve([]),
    getPrecedentiCassazione(question, getVerticale(vertical ?? null)),
  ]);

  if (relations.length > 0) graphContext = buildGraphBlock(relations);
  if (precedents.length > 0) precedentsContext = buildPrecedentsBlock(precedents);

  // 4. Build system prompt ──────────────────────────────────────────────────
  const basePrompt = (vertical && SYSTEM_PROMPTS[vertical]) || DEFAULT_SYSTEM_PROMPT;
  const profileBlock = profile
    ? [buildProfileBlock(profile), buildJurisdictionalBlock(profile)].filter(Boolean).join("\n")
    : "";
  const behavioralRules = getBehavioralRules(currentTurn, !!profile);

  const contextSection = ragContext
    ? [
        "────────────────────────────────────────",
        "DOCUMENTI NORMATIVI (corpus NormaAI, solo norme vigenti):\n",
        ragContext,
        "────────────────────────────────────────",
        "Basa la risposta su questi documenti. Cita come [Fonte N] con l'articolo e la norma esatta. Non citare mai punteggi.",
        graphContext,
        precedentsContext,
      ].filter(Boolean).join("\n\n")
    : ``;

  const fullSystem = [basePrompt, profileBlock, behavioralRules, contextSection]
    .filter(Boolean)
    .join("\n\n");

  // 5. Build messages (multi-turn) ──────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [];
  const history: ConversationTurn[] = Array.isArray(conversationHistory)
    ? conversationHistory.slice(-4)
    : [];

  for (const turn of history) {
    messages.push({
      role: turn.role,
      content: turn.role === "assistant" ? turn.content.slice(0, 1000) : turn.content,
    });
  }
  messages.push({ role: "user", content: buildUserContent(question, attachment) });

  // 6. Update profile async (FEATURE 2 — non bloccante) ────────────────────
  if (userId && profile) {
    updateProfileAfterQuery(userId, question, vertical || "generale").catch(() => {});
  }

  // 7. Stream Claude response + Audit trail ───────────────────────────────
  const sessioneId = `${userId || "anon"}-${Date.now()}`;
  const t0 = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ type: "sources", sources, hasRag: ragContext.length > 0, hasGraph: graphContext.length > 0, hasPrecedents: precedentsContext.length > 0 });

      let fullResponse = "";
      try {
        const anthropic = getAnthropic();
        const anthropicStream = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: (vertical && ["Parere Legale", "Memoria Difensiva", "Bozza Contratto", "Analisi Documento", "Analisi Contratto"].includes(vertical)) ? 4096 : 2000,
          system: fullSystem,
          messages,
          stream: true,
        });

        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            fullResponse += event.delta.text;
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
        // F5: Audit trail — async, non blocca la risposta
        logAuditTrail(
          userId || null,
          sessioneId,
          question,
          fullResponse,
          sources,
          graphContext.length > 0,
          !!profile,
          Date.now() - t0
        ).catch(() => {});

        // Lead scoring e salvataggio marketplace — solo su primo turn (evita duplicati)
        // Lead creati anche per anonimi (consumer_id = null) per mostrare domanda pubblica
        if (currentTurn <= 1) {
          try {
            const scoring = scoreLeadQuality({
              question,
              vertical: vertical || "generico",
              city: (profile as unknown as Record<string, string>)?.citta,
              hasAttachment: !!attachment,
              sessionLength: (conversationHistory?.length ?? 0) + 1,
            });
            // Crea lead solo se warm o hot (score >= 35) oppure ha allegato
            if (scoring.score >= 35 || !!attachment) {
              const summary = question.trim().slice(0, 150) + (question.length > 150 ? "…" : "");
              const verticaleNorm = vertical?.toLowerCase().replace(/[\s/]+/g, "-") ?? "generico";
              await fetch(`${SUPABASE_URL}/rest/v1/marketplace_leads`, {
                method: "POST",
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: `Bearer ${SUPABASE_KEY}`,
                  "Content-Type": "application/json",
                  Prefer: "return=minimal",
                },
                body: JSON.stringify({
                  consumer_id: userId || null,
                  consumer_city: (profile as unknown as Record<string, string>)?.citta ?? null,
                  vertical_id: verticaleNorm,
                  question_summary: summary,
                  price_cents: scoring.estimated_price_cents,
                  lead_score: scoring.score,
                  lead_tier: scoring.tier,
                  lead_type: userId ? "privato" : "anonimo",
                  status: "pending",
                }),
              });
            }
          } catch (e) {
            Sentry.captureException(e, { extra: { fn: "createMarketplaceLead", route: "/api/chat" } });
          }
        }
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
