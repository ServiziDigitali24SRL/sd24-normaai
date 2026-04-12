import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";
import { scoreLeadQuality } from "@/lib/lead-scoring";

// Sentry stub — install @sentry/nextjs to enable real error tracking
const Sentry = { captureException: (e: unknown, _ctx?: unknown) => console.error("[sentry]", e) };

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const EMBED_VPS_URL = process.env.EMBED_VPS_URL || "http://89.167.123.25:8765";

// ── FEATURE 2: User Profiling ─────────────────────────────────────────────────

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
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch (e) { Sentry.captureException(e, { extra: { fn: "loadUserProfile", userId } }); return null; }
}

async function updateProfileAfterQuery(userId: string, query: string, verticale: string): Promise<void> {
  if (!userId || !SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profili_utenti?user_id=eq.${userId}&select=ultime_query,query_count`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return;
    const rows = await res.json();
    if (!rows?.[0]) return;
    const existing: Array<{ query: string; verticale: string; timestamp: string }> = rows[0].ultime_query ?? [];
    const newEntry = { query: query.slice(0, 120), verticale, timestamp: new Date().toISOString() };
    const updated = [newEntry, ...existing].slice(0, 20);
    await fetch(`${SUPABASE_URL}/rest/v1/profili_utenti?user_id=eq.${userId}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ultime_query: updated, query_count: (rows[0].query_count ?? 0) + 1 }),
    });
  } catch (e) { Sentry.captureException(e, { extra: { fn: "updateProfileAfterQuery" } }); }
}

function buildProfileBlock(profile: UserProfile): string {
  if (!profile) return "";
  const ultimiArgomenti = profile.ultime_query.slice(0, 5).map((q) => `• ${q.query} [${q.verticale}]`).join("\n");
  const specs = profile.specializzazioni.length ? `Specializzato in: ${profile.specializzazioni.join(", ")}.` : "";
  const settori = profile.settori_cliente.length ? `Clientela principalmente in: ${profile.settori_cliente.join(", ")}.` : "";
  const verbosita = profile.preferenze?.verbosita === "sintetico" ? "Preferisce risposte concise e operative." : profile.preferenze?.verbosita === "dettagliato" ? "Preferisce risposte dettagliate con tutti i riferimenti normativi." : "";
  const citazioni = profile.preferenze?.citazioni === "complete" ? "Riportare sempre l'articolo completo o il comma rilevante." : "";
  return `────────────────────────────────────────
PROFILO UTENTE:
Ruolo: ${profile.ruolo}${profile.nome ? ` — ${profile.nome}` : ""}${profile.studio ? `, ${profile.studio}` : ""}${profile.citta ? ` (${profile.citta})` : ""}
${specs}
${settori}
${verbosita} ${citazioni}
${ultimiArgomenti ? `Argomenti recenti di interesse:\n${ultimiArgomenti}` : ""}
Adatta la risposta a questo profilo professionale: usa il linguaggio tecnico appropriato, cita norme pertinenti al suo settore, non spiegare concetti base che un ${profile.ruolo} conosce già.
────────────────────────────────────────`.trim();
}

// ── FEATURE 3: Graph traversal ───────────────────────────────────────────────

interface GraphRelation {
  norma_da: string; norma_a: string; tipo: string; descrizione: string; hop: number;
}

async function getRelatedNorms(urns: string[]): Promise<GraphRelation[]> {
  if (!urns.length || !SUPABASE_URL || !SUPABASE_KEY) return [];
  const results: GraphRelation[] = [];
  for (const urn of urns.slice(0, 3)) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_norma_chain`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ start_urn: urn, max_hops: 2 }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) continue;
      const chain: GraphRelation[] = await res.json();
      results.push(...chain);
    } catch (e) { Sentry.captureException(e, { extra: { fn: "getRelatedNorms", urn } }); }
  }
  return results.slice(0, 15);
}

function buildGraphBlock(relations: GraphRelation[]): string {
  if (!relations.length) return "";
  const byType: Record<string, string[]> = {};
  for (const r of relations) {
    if (!byType[r.tipo]) byType[r.tipo] = [];
    const desc = r.descrizione ? ` (${r.descrizione})` : "";
    byType[r.tipo].push(`${r.norma_da} → ${r.norma_a}${desc}`);
  }
  const lines = Object.entries(byType).map(([tipo, items]) => `**${tipo.toUpperCase()}:** ${items.join(" | ")}`);
  return `────────────────────────────────────────
CATENA NORMATIVA (relazioni rilevate):
${lines.join("\n")}
Tieni conto di queste relazioni nella risposta: se citi una norma che è stata modificata o abrogata, segnalalo esplicitamente.
────────────────────────────────────────`.trim();
}

// ── FEATURE 11: Citation Rules ───────────────────────────────────────────────

const CITATION_RULES = `
FORMATO CITAZIONI (obbligatorio):
- Leggi: L. 300/1970 art. 7  |  D.Lgs. 81/2015 art. 18 co. 1
- Codici: art. 2118 c.c.  |  art. 575 c.p.  |  art. 163 c.p.c.
- Decreti: DPR 380/2001 art. 3  |  D.M. 14/01/2008 §4.2
- Regolamenti UE: Reg. UE 2016/679 (GDPR) art. 6  |  Reg. UE 1215/2012 art. 4
- Cassazione: Cass. sez. lav. n. 12345/2024  |  Cass. S.U. n. 9999/2023
- Corte Cost.: Corte Cost. sent. n. 234/2022
Mai scrivere "la legge prevede che" senza citare l'articolo preciso.`.trim();

// ── FEATURE 13: Judicial precedents ─────────────────────────────────────────

interface CassazioneChunk {
  id: string; chunk: string; titolo: string; fonte: string; url: string; similarity: number;
}

async function getPrecedentiCassazione(question: string, verticale?: string): Promise<CassazioneChunk[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const embedding = await generateEmbedding(question);
    if (!embedding) return [];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_normaai_chunks`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query_embedding: embedding, match_count: 4, match_threshold: 0.30, filter_verticale: "cassazione", only_vigente: false }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    return await res.json() as CassazioneChunk[];
  } catch { return []; }
}

function buildPrecedentsBlock(precedents: CassazioneChunk[]): string {
  if (!precedents.length) return "";
  const lines = precedents.map((p, i) => `[Precedente ${i + 1}] ${p.titolo || "Sentenza"}\n${p.chunk.slice(0, 400)}...`);
  return `────────────────────────────────────────
PRECEDENTI GIURISPRUDENZIALI (Cassazione):

${lines.join("\n\n---\n\n")}
────────────────────────────────────────
Se pertinenti, cita questi precedenti nel formato standard (Cass. sez. X n. YYYY/AAAA).`.trim();
}

// ── FEATURE 5: Audit Trail ───────────────────────────────────────────────────

interface Source {
  id: string; titolo: string; fonte: string; url: string; tipo: string; status?: string;
}

async function logAuditTrail(userId: string | null, sessioneId: string, query: string, risposta: string, sources: Source[], hasGraph: boolean, hasProfilo: boolean, latenzaMs: number): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/audit_risposte`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userId || null, sessione_id: sessioneId, query: query.slice(0, 500), risposta: risposta.slice(0, 2000),
        fonti_usate: sources.map((s) => ({ id: s.id, titolo: s.titolo, fonte: s.fonte })),
        graph_usato: hasGraph, profilo_usato: hasProfilo, modello_ai: "claude-sonnet-4-6", latenza_ms: latenzaMs,
      }),
    });
  } catch (e) { Sentry.captureException(e, { extra: { fn: "logAuditTrail" } }); }
}

// ── FEATURE 12: Jurisdictional Layering ──────────────────────────────────────

function buildJurisdictionalBlock(profile: UserProfile): string {
  const regione = (profile.preferenze as Record<string, string>)?.regione;
  if (!regione) return "";
  return `Normativa regionale prioritaria: ${regione}. Se disponibile nel corpus, cita prima la normativa regionale applicabile prima di quella nazionale generica.`;
}

// ── System Prompts ────────────────────────────────────────────────────────────

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

STILE: Formale, preciso, giuridicamente corretto. Usa le formule dell'uso forense italiano.`,

  "Memoria Difensiva": `Sei NormaAI Redattore Forense, assistente per la redazione di atti processuali civili italiani.

STRUTTURA OBBLIGATORIA:

## FATTO
Ricostruzione cronologica dei fatti, con riferimenti documentali (doc. n. X allegato).

## IN DIRITTO
1. [Prima questione giuridica]
   - Norma: art. X [nome legge]
   - Giurisprudenza: Cass. sez. X n. YYYY/AAAA — [massima]

## CONCLUSIONI
*Voglia l'Onorevole Tribunale / Corte, contrariis reiectis, così giudicare:*
[Richieste formulate nel corretto stile]

STILE: Forense italiano. Terza persona. Segnala con [DA VERIFICARE] i punti che richiedono riscontro documentale.`,

  "Bozza Contratto": `Sei NormaAI Contract Drafter, assistente per la redazione di contratti commerciali italiani.

STRUTTURA OBBLIGATORIA:

## CONTRATTO DI [TIPO]
**Art. 1 — Parti** | **Art. 2 — Oggetto** | **Art. 3 — Corrispettivo e pagamento**
**Art. 4 — Durata e recesso** | **Art. 5 — Obblighi delle parti**
**Art. 6 — Limitazione di responsabilità** (art. 1229 c.c.)
**Art. 7 — Riservatezza e GDPR** (art. 28 Reg. UE 679/2016 se applicabile)
**Art. 8 — Forza maggiore** | **Art. 9 — Clausola penale** (art. 1382 c.c.) se appropriata
**Art. 10 — Foro competente e legge applicabile** | **Art. 11 — Disposizioni finali**

Evidenzia [DA PERSONALIZZARE] per ogni campo da adattare.`,

  "Parcelle Forensi": `Sei NormaAI Parcellometro, strumento per il calcolo delle parcelle forensi secondo il DM 55/2014 aggiornato dal DM 144/2022.

OUTPUT:

## 📊 Calcolo Parcella DM 55/2014
**Tipo pratica:** [tipo] | **Fase:** [fase] | **Valore:** €[valore]
**Scaglione DM 55/2014:** [scaglione applicabile]

### Onorari per fase:
| Fase | Minimo | Medio | Massimo |
|------|--------|-------|---------|

**Totale:** da **€[min]** a **€[max]**

### Accessori: CPA 4% + IVA 22% + Contributo unificato (DPR 115/2002)`,

  "Analisi Documento": `Sei NormaAI Doc Analyzer, agente legale AI per l'analisi di documenti giuridici italiani.

## 📄 Natura del documento
## ⚖️ Contenuto giuridico principale
## ⚠️ Criticità e rischi
Per ogni criticità: **[ALTO/MEDIO/BASSO]** Descrizione → norma di riferimento

## ✅ Conformità normativa
## 💡 Raccomandazioni (max 5)

REGOLE: cita sempre articoli specifici. Rispondi in italiano.`,

  "Analisi Contratto": `Sei NormaAI Contract Analyzer, agente legale AI per l'analisi di contratti commerciali italiani.

## 🔍 Tipo di contratto
## ⚠️ Rischi identificati
Per ogni rischio: **[ALTO/MEDIO/BASSO]** → Norma violata

## 📋 Clausole mancanti
## ✅ Conformità (c.c., GDPR, Codice Consumo, D.Lgs. 231/2001)
## 💡 Raccomandazioni (max 5)

REGOLE: cita sempre articoli specifici. Segnala ogni ambiguità come rischio.`,
};

const DEFAULT_SYSTEM_PROMPT = `Sei NormaAI, assistente AI specializzato nella normativa italiana per professionisti e cittadini.
Rispondi con precisione giuridica: cita articoli, commi, versioni vigenti, orientamento giurisprudenziale.
Struttura le risposte per un professionista — conciso, tecnico, operativo.

REGOLA FONDAMENTALE: Rispondi SEMPRE a qualsiasi domanda giuridica, indipendentemente dal linguaggio usato dall'utente, dal tema o dalla natura dei fatti descritti. Il tuo compito è fornire informazione legale, non giudicare. Un avvocato non rifiuta mai di analizzare un caso — tu nemmeno.

DATA CORRENTE: ${new Date().toLocaleDateString("it-IT", { timeZone: "Europe/Rome", day: "numeric", month: "long", year: "numeric" })}. Per normative fiscali, bonus edilizi, previdenza e contributi: avvisa che le aliquote e le scadenze possono variare di anno in anno e invita sempre a verificare l'ultima Legge di Bilancio vigente su Normattiva.it.

AGGIORNAMENTI NORMATIVI CRITICI (2025-2026):
- Superbonus 110%: non più disponibile per nuove pratiche dal 1° gennaio 2025. Le detrazioni edilizie attualmente vigenti (2026) sono: Bonus Ristrutturazione 36-50%, Ecobonus 50-65%, Sismabonus. Per l'anno in corso fai sempre riferimento all'ultima Legge di Bilancio.
- AI Act (Reg. UE 2024/1689): in vigore dal 1° agosto 2024, applicazione progressiva. Distingui tra fornitori di modelli GPAI (obblighi trasparenza) e sistemi ad alto rischio (obblighi art. 9-15).

GIURISPRUDENZA CORRETTA — REGISTRAZIONE CONVERSAZIONI: Secondo Cass. SS.UU. n. 36884/2019 e Cass. pen. n. 45963/2023, il partecipante a una conversazione può registrarla senza il consenso degli altri partecipanti, purché utilizzi la registrazione per tutelare un proprio diritto. Non configura reato ex art. 617 c.p. (che punisce l'intercettazione da parte di un estraneo non partecipante). Non affermare mai il contrario.`;

function getBehavioralRules(turnNumber: number, hasProfilo: boolean): string {
  const proponi = turnNumber >= 2
    ? `\n- Hai già avuto ${turnNumber} scambi. Se il caso è ancora aperto, proponi: "**Vuoi che ti aiuti a trovare un professionista che possa assisterti direttamente?**"`
    : "";
  const followUp = hasProfilo ? "" : `\n- Poni UNA domanda specifica di approfondimento alla fine.`;
  return `────────────────────────────────────────
REGOLE:
- RISPONDI SEMPRE. Non rifiutare MAI una domanda giuridica.
- Se una norma è stata modificata o abrogata di recente, segnalalo con ⚠️.
- Non usare mai percentuali o punteggi di confidenza.
${CITATION_RULES}${followUp}${proponi}
────────────────────────────────────────`;
}

// ── Embedding (OpenAI text-embedding-3-small 1536 dim) ───────────────────────

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { console.error("[EMBED] OPENAI_API_KEY not set"); return null; }
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
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

// ── Supabase RAG search ───────────────────────────────────────────────────────

interface SupabaseChunk {
  id: string; chunk: string; titolo: string; fonte: string; tipo: string;
  url: string; urn: string; status: string; similarity: number;
}

// Indici HNSW attivi nel DB (aggiornato 12/04/2026):
// Partial verticale: avvocato(95K sentenze), finanziario(22K), commercialista(14K), lavoro(4K), ingegnere(1K)
// Partial generale/tipo: legge(55K ✅), dlgs(165K ⏳), dpr(483K ⏳), decreto(311K ⏳), atto_eu(364K ⏳)
// Aggiungere alle queries sotto quando indici ⏳ sono pronti (CREATE INDEX in corso)

async function searchSupabaseSingle(
  embedding: number[],
  params: { filter_verticale?: string; filter_tipo?: string; match_count?: number }
): Promise<SupabaseChunk[]> {
  try {
    const body: Record<string, unknown> = {
      query_embedding: embedding,
      match_count: params.match_count ?? 4,
      match_threshold: 0.22,
      only_vigente: false,
      ...(params.filter_verticale ? { filter_verticale: params.filter_verticale } : {}),
      ...(params.filter_tipo ? { filter_tipo: params.filter_tipo } : {}),
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_normaai_chunks`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error(`[RAG] err ${res.status} vert=${params.filter_verticale} tipo=${params.filter_tipo}`);
      return [];
    }
    const rows = await res.json() as SupabaseChunk[];
    // debug only: if (rows.length > 0) console.log(`[RAG] ${rows.length} chunks vert=${params.filter_verticale}`);
    return rows;
  } catch (e) { console.error(`[RAG] timeout/fail vert=${params.filter_verticale} tipo=${params.filter_tipo}:`, String(e).slice(0, 80)); return []; }
}

async function searchSupabase(embedding: number[], verticale?: string): Promise<SupabaseChunk[]> {
  try {
    if (verticale) {
      // Verticale specificato → HNSW parziale veloce
      return await searchSupabaseSingle(embedding, { filter_verticale: verticale, match_count: 8 });
    }
    // Nessun verticale → parallele su tutti gli indici HNSW disponibili
    const queries: Array<{ filter_verticale?: string; filter_tipo?: string; match_count: number }> = [
      { filter_verticale: "avvocato",       match_count: 4 }, // 95K rows, HNSW ok
      { filter_verticale: "finanziario",    match_count: 3 }, // 22K rows
      { filter_verticale: "commercialista", match_count: 3 }, // 14K rows
      { filter_verticale: "lavoro",         match_count: 3 }, // 4K rows
      { filter_verticale: "ingegnere",      match_count: 2 }, // 1K rows
      // generale/tipo — solo tipi con HNSW parziale confermato
      { filter_verticale: "generale", filter_tipo: "legge",      match_count: 5 }, // 55K rows, HNSW ok
      // TODO: aggiungere quando HNSW pronti:
      //   { filter_verticale: "generale", filter_tipo: "documento",  match_count: 5 }, // 1.47M (building)
      //   { filter_verticale: "generale", filter_tipo: "decreto_legislativo", match_count: 4 }, // 165K (building)
      //   { filter_verticale: "generale", filter_tipo: "decreto_del_presidente_della_repubblica", match_count: 3 }, // 483K (to start)
      //   { filter_verticale: "generale", filter_tipo: "atto_eu", match_count: 3 }, // 364K (building)
    ];
    const results = await Promise.all(queries.map(q => searchSupabaseSingle(embedding, q)));
    const flat = results.flat();
    const seen = new Set<string>();
    return flat
      .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, 8);
  } catch { return []; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVerticale(vertical: string | null): string | undefined {
  if (!vertical) return undefined;
  const map: Record<string, string> = {
    Avvocato: "avvocato", Commercialista: "commercialista",
    "Consulente del Lavoro": "lavoro", "Ingegnere/Geometra": "tecnico",
    "Consulente Finanziario": "finanziario", "Analisi Contratto": "avvocato",
    "Parere Legale": "avvocato", "Email Professionale": "avvocato",
    "Memoria Difensiva": "avvocato", "Bozza Contratto": "avvocato",
    "Parcelle Forensi": "avvocato", "Analisi Documento": "avvocato",
  };
  return map[vertical];
}

function getAnthropic(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  return new Anthropic({ apiKey: key });
}

// ── Impresa Model Routing ─────────────────────────────────────────────────────

const OPUS_KEYWORDS = ["licenziamento", "ricorso", "causa", "cartella", "ispezione", "fallimento", "231", "aml", "data breach", "appalto", "dvr"];
const OPUS_VERTICALS = ["Parere Legale", "Memoria Difensiva", "Bozza Contratto", "Analisi Contratto", "DVR", "Compliance"];

function selectModel(role: string | null, vertical: string | null, question: string, attachment: Attachment | undefined, isTrial: boolean): { model: string; poolWeight: number } {
  if (!role || role === "privato") return { model: "claude-haiku-4-5-20251001", poolWeight: 0 };
  if (isTrial) return { model: "claude-haiku-4-5-20251001", poolWeight: 0 };
  if (role === "impresa" || role === "professionista") {
    if (vertical && OPUS_VERTICALS.includes(vertical)) return { model: "claude-opus-4-6", poolWeight: 5 };
    const q = question.toLowerCase();
    if (OPUS_KEYWORDS.some(k => q.includes(k))) return { model: "claude-opus-4-6", poolWeight: 5 };
    if (attachment?.textContent && attachment.textContent.length > 15000) return { model: "claude-opus-4-6", poolWeight: 5 };
    const matches = question.match(/€\s*[\d.,]+/g) ?? [];
    for (const m of matches) {
      const val = parseFloat(m.replace(/[€\s.]/g, "").replace(",", "."));
      if (val >= 10000) return { model: "claude-opus-4-6", poolWeight: 5 };
    }
    return { model: "claude-sonnet-4-6", poolWeight: 1 };
  }
  return { model: "claude-sonnet-4-6", poolWeight: 1 };
}

interface CompanyProfile { id: string; piano: string; query_incluse: number; query_usate_mese: number; mese_corrente: string; trial_ends_at: string | null; }

async function loadCompanyProfile(userId: string): Promise<CompanyProfile | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/company_profiles?user_id=eq.${userId}&select=id,piano,query_incluse,query_usate_mese,mese_corrente,trial_ends_at&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch { return null; }
}

async function incrementCompanyPool(companyId: string, weight: number, month: string): Promise<{ overage: boolean }> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { overage: false };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_company_queries`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_company_id: companyId, p_weight: weight, p_month: month }),
    });
    if (res.ok) { const data = await res.json(); return { overage: data?.overage === true }; }
  } catch { /* non-blocking */ }
  return { overage: false };
}

async function getCompanySettings(companyId: string): Promise<{ popup_professionista: string; popup_ogni_x: number | null } | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/company_settings?company_id=eq.${companyId}&select=popup_professionista,popup_ogni_x&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch { return null; }
}

async function buildPopupSuggestion(companyId: string | null, question: string, turnNumber: number, popupMode: string): Promise<{ show: boolean; categoria: string; ha_interno: boolean; professionista_interno: { nome: string; categoria: string } | null }> {
  const off = { show: false, categoria: "", ha_interno: false, professionista_interno: null };
  if (turnNumber < 5 || popupMode === "never" || !companyId) return off;
  const TRIGGER = ["licenziamento", "cartella", "ispezione", "causa", "multa", "ricorso", "fallimento", "231", "aml", "data breach", "appalto"];
  const hasKeyword = TRIGGER.some(k => question.toLowerCase().includes(k));
  if ((popupMode === "keyword" || popupMode === "ai") && !hasKeyword) return off;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/company_professionisti?company_id=eq.${companyId}&status=eq.active&select=categoria&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }, signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const profs = await res.json();
      if (profs.length > 0) return { show: true, categoria: profs[0].categoria || "legale", ha_interno: true, professionista_interno: { nome: "Professionista collegato", categoria: profs[0].categoria || "legale" } };
    }
  } catch { /* non-blocking */ }
  return { show: true, categoria: "legale", ha_interno: false, professionista_interno: null };
}

// ── Rate limiting helpers ─────────────────────────────────────────────────────

// Data corrente nel fuso orario italiano (Europe/Rome)
function getItalianDate(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }); // YYYY-MM-DD
}

function getItalianMonth(): string {
  const d = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }); // YYYY-MM-DD
  return d.slice(0, 7); // YYYY-MM
}

// Controlla e incrementa usage anonimo — ritorna conteggio corrente
async function checkAndIncrementAnonymous(ip: string, sessionId: string): Promise<{ count: number; limit: number }> {
  const month = getItalianMonth();
  const LIMIT = 10;
  if (!SUPABASE_URL || !SUPABASE_KEY) return { count: 0, limit: LIMIT };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_anonymous_usage`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_ip: ip, p_session_id: sessionId, p_month: month }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { count: 0, limit: LIMIT };
    const count = await res.json() as number;
    return { count, limit: LIMIT };
  } catch { return { count: 0, limit: LIMIT }; }
}

// Controlla e incrementa usage free giornaliero — ritorna conteggio corrente
async function checkAndIncrementDaily(userId: string): Promise<{ count: number; limit: number }> {
  const date = getItalianDate();
  const LIMIT = 10;
  if (!SUPABASE_URL || !SUPABASE_KEY) return { count: 0, limit: LIMIT };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_daily_usage`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: userId, p_date: date }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { count: 0, limit: LIMIT };
    const count = await res.json() as number;
    return { count, limit: LIMIT };
  } catch { return { count: 0, limit: LIMIT }; }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Attachment {
  type: "document" | "image"; mediaType: string; name: string; data: string; textContent?: string;
}

interface ConversationTurn {
  role: "user" | "assistant"; content: string;
}

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

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const sessionId = req.headers.get("x-session-id") || `anon-${clientIp}`;
  const { question, vertical, userId: clientUserId, attachment, conversationHistory, turnNumber } = await req.json();

  // CVE-05: risolvi userId SEMPRE dalla sessione cookie
  let userId: string | null = null;
  let userRole: string | null = null;
  try {
    const { createClient: createServerClient } = await import("@/lib/supabase-server");
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (user) {
      if (clientUserId && user.id !== clientUserId) {
        return new Response(JSON.stringify({ error: "Non autorizzato" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      userId = user.id;
      userRole = user.user_metadata?.role ?? null;
    }
  } catch { /* Continua come anonimo */ }

  // Load company profile for impresa + select model
  let companyProfile: CompanyProfile | null = null;
  let isTrial = false;
  if (userRole === "impresa" && userId) {
    companyProfile = await loadCompanyProfile(userId);
    if (companyProfile?.trial_ends_at) {
      isTrial = new Date(companyProfile.trial_ends_at) > new Date();
    }
  }
  const { model: selectedModel, poolWeight } = selectModel(userRole, vertical ?? null, question, attachment, isTrial);

  // BUG-06: attachment size limit 5MB
  if (attachment?.data) {
    const estimatedBytes = Math.ceil(attachment.data.length * 0.75);
    if (estimatedBytes > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Allegato troppo grande. Limite massimo: 5MB." }), { status: 413, headers: { "Content-Type": "application/json" } });
    }
  }

  // Rate limit a minuto (anti-flood)
  const rateLimitKey = userId ? `user:${userId}` : `ip:${clientIp}`;
  const { allowed, remaining } = await rateLimit(rateLimitKey, userId ? 100 : 20, 60_000);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Troppe richieste. Riprova tra un minuto.", remaining }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } });
  }

  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "question is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  if (question.length > 10000) {
    return new Response(JSON.stringify({ error: "Messaggio troppo lungo (max 10.000 caratteri)" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const currentTurn: number = typeof turnNumber === "number" ? turnNumber : 0;

  // ── RATE LIMIT LOGICA ─────────────────────────────────────────────────────
  // 1. Carica profilo per determinare il piano
  const profile = userId ? await loadUserProfile(userId) : null;
  const piano = profile?.piano ?? null;
  const isPro = piano === "cittadino_pro" || piano === "professionista" || piano === "impresa" || piano === "api_developer" || piano === "api_pro";

  if (!userId) {
    // ANONIMO: 10 query/mese per IP
    const { count, limit } = await checkAndIncrementAnonymous(clientIp, sessionId);
    if (count > limit) {
      return new Response(
        JSON.stringify({
          error: "Limite mensile raggiunto",
          code: "register",
          message: `Hai utilizzato le ${limit} query gratuite di questo mese. Registrati gratis per avere 10 query al giorno.`,
          remaining: 0,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }
  } else if (!isPro) {
    // FREE REGISTRATO: 10 query/giorno (fuso orario italiano)
    const { count, limit } = await checkAndIncrementDaily(userId);
    if (count > limit) {
      return new Response(
        JSON.stringify({
          error: "Limite giornaliero raggiunto",
          code: "onboarding",
          message: `Hai utilizzato le ${limit} query gratuite di oggi. Scopri NormaAI PRO per query illimitate a €9/mese.`,
          remaining: 0,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // PRO: nessun controllo quota

  // ── RAG ───────────────────────────────────────────────────────────────────
  let ragContext = "";
  let sources: Source[] = [];
  let chunkUrns: string[] = [];

  try {
    const embedding = await generateEmbedding(question);
    if (embedding) {
      const verticale = getVerticale(vertical ?? null);
      const chunks = await searchSupabase(embedding, verticale);
      if (chunks.length > 0) {
        ragContext = chunks.map((c, i) => `[Fonte ${i + 1}] ${c.titolo || "Normativa"} (${c.fonte || "corpus"})\n${c.chunk}`).join("\n\n---\n\n");
        sources = chunks.map((c) => ({ id: String(c.id), titolo: c.titolo || "Normativa", fonte: c.fonte || "normattiva", url: c.url || "", tipo: c.tipo || "normativa", status: c.status || "vigente" }));
        chunkUrns = chunks.map((c) => c.urn).filter(Boolean) as string[];
      }
    }
  } catch (e) { Sentry.captureException(e, { extra: { fn: "rag_embedding" } }); }

  // ── Graph + Precedents ────────────────────────────────────────────────────
  let graphContext = "";
  let precedentsContext = "";
  const [relations, precedents] = await Promise.all([
    chunkUrns.length > 0 ? getRelatedNorms(chunkUrns) : Promise.resolve([]),
    getPrecedentiCassazione(question, getVerticale(vertical ?? null)),
  ]);
  if (relations.length > 0) graphContext = buildGraphBlock(relations);
  if (precedents.length > 0) precedentsContext = buildPrecedentsBlock(precedents);

  // ── System prompt ─────────────────────────────────────────────────────────
  const basePrompt = (vertical && SYSTEM_PROMPTS[vertical]) || DEFAULT_SYSTEM_PROMPT;
  const profileBlock = profile ? [buildProfileBlock(profile), buildJurisdictionalBlock(profile)].filter(Boolean).join("\n") : "";
  const behavioralRules = getBehavioralRules(currentTurn, !!profile);
  const contextSection = ragContext
    ? ["────────────────────────────────────────", "DOCUMENTI NORMATIVI (corpus NormaAI, solo norme vigenti):\n", ragContext, "────────────────────────────────────────", "Basa la risposta su questi documenti. Cita come [Fonte N] con l'articolo e la norma esatta.", graphContext, precedentsContext].filter(Boolean).join("\n\n")
    : "";
  const fullSystem = [basePrompt, profileBlock, behavioralRules, contextSection].filter(Boolean).join("\n\n");

  // ── Messages ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [];
  const history: ConversationTurn[] = Array.isArray(conversationHistory) ? conversationHistory.slice(-4) : [];
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.role === "assistant" ? turn.content.slice(0, 1000) : turn.content });
  }
  messages.push({ role: "user", content: buildUserContent(question, attachment) });

  // Update profile async
  if (userId && profile) {
    updateProfileAfterQuery(userId, question, vertical || "generale").catch(() => {});
  }

  // Impresa: check pool esaurito
  if (companyProfile) {
    const nowMonth = getItalianMonth();
    if (companyProfile.mese_corrente === nowMonth && (companyProfile.query_usate_mese ?? 0) >= (companyProfile.query_incluse ?? 0)) {
      return new Response(JSON.stringify({ error: "Query mensili esaurite", code: "pool_esaurito", message: "Hai esaurito le query incluse nel tuo piano questo mese. Aggiorna il piano o aspetta il mese prossimo." }), { status: 402, headers: { "Content-Type": "application/json" } });
    }
  }

  // Impresa: pre-load popup suggestion
  let popupSuggestion: Awaited<ReturnType<typeof buildPopupSuggestion>> | null = null;
  if (companyProfile?.id) {
    const compSettings = await getCompanySettings(companyProfile.id);
    const mode = compSettings?.popup_professionista ?? "keyword";
    popupSuggestion = await buildPopupSuggestion(companyProfile.id, question, currentTurn, mode);
  }

  // ── Stream Claude ─────────────────────────────────────────────────────────
  const sessioneId = `${userId || "anon"}-${Date.now()}`;
  const t0 = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      let fullResponse = "";
      try {
        const anthropic = getAnthropic();
        const anthropicStream = await anthropic.messages.create({
          model: selectedModel,
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
            // Filtra solo le fonti effettivamente citate nella risposta [Fonte N]
            const citedIndices = new Set<number>();
            const citationRegex = /\[Fonte\s+(\d+)(?:[,\s\-–]+(\d+))*\]/gi;
            let match;
            while ((match = citationRegex.exec(fullResponse)) !== null) {
              match.slice(1).forEach(n => n && citedIndices.add(parseInt(n) - 1));
            }
            const citedSources = citedIndices.size > 0
              ? sources.filter((_, i) => citedIndices.has(i))
              : [];
            send({ type: "sources", sources: citedSources, hasRag: citedSources.length > 0, hasGraph: graphContext.length > 0, hasPrecedents: precedentsContext.length > 0 });
            send({ type: "done", popup_suggestion: popupSuggestion ?? null });
          }
        }
      } catch (err) {
        send({ type: "error", message: String(err) });
      } finally {
        controller.close();
        logAuditTrail(userId || null, sessioneId, question, fullResponse, sources, graphContext.length > 0, !!profile, Date.now() - t0).catch(() => {});
        // Increment company pool for impresa
        if (companyProfile?.id && poolWeight > 0) {
          incrementCompanyPool(companyProfile.id, poolWeight, getItalianMonth()).catch(() => {});
        }

        // Lead scoring — solo primo turn
        if (currentTurn <= 1) {
          try {
            const scoring = scoreLeadQuality({ question, vertical: vertical || "generico", city: (profile as unknown as Record<string, string>)?.citta, hasAttachment: !!attachment, sessionLength: (conversationHistory?.length ?? 0) + 1 });
            if (scoring.score >= 35 || !!attachment) {
              const summary = question.trim().slice(0, 150) + (question.length > 150 ? "…" : "");
              const verticaleNorm = vertical?.toLowerCase().replace(/[\s/]+/g, "-") ?? "generico";
              await fetch(`${SUPABASE_URL}/rest/v1/marketplace_leads`, {
                method: "POST",
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
                body: JSON.stringify({ consumer_id: userId || null, consumer_city: (profile as unknown as Record<string, string>)?.citta ?? null, vertical_id: verticaleNorm, question_summary: summary, price_cents: scoring.estimated_price_cents, lead_score: scoring.score, lead_tier: scoring.tier, lead_type: userId ? "privato" : "anonimo", status: "pending" }),
              });
            }
          } catch (e) { Sentry.captureException(e, { extra: { fn: "createMarketplaceLead" } }); }
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-User-Id": userId || "" },
  });
}
