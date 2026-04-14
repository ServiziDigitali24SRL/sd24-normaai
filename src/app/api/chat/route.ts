import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit } from "@/lib/rate-limit";
import { scoreLeadQuality } from "@/lib/lead-scoring";
import { resolveUserTier, assembleBasePrompt } from "./system-prompts";
import {
  traceRAGQuery,
  traceEmbedding,
  traceRetrieval,
  traceGeneration,
  scoreTrace,
  updateTraceOutput,
  flushLangfuse,
} from "@/lib/langfuse";

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
- Leggi: L. 300/1970 art. 7  |  D.Lgs. 81/2008 art. 18 co. 1
- Codici: art. 2118 c.c.  |  art. 575 c.p.  |  art. 163 c.p.c.
- Decreti: DPR 380/2001 art. 3  |  D.M. 14/01/2008 §4.2
- Regolamenti UE: Reg. UE 2016/679 (GDPR) art. 6  |  Reg. UE 1215/2012 art. 4
- Cassazione: Cass. sez. lav. n. 12345/2024  |  Cass. S.U. n. 9999/2023
- Corte Cost.: Corte Cost. sent. n. 234/2022
Mai scrivere "la legge prevede che" senza citare l'articolo preciso.

REGOLA ANTI-HALLUCINATION (assoluta): Se non trovi il numero esatto di articolo o sentenza nel corpus fornito, scrivi "normativa in materia di [tema]" senza inventare numeri. Un numero sbagliato è un errore professionale grave. MAI inventare sentenze. MAI citare leggi inesistenti.

REGOLA NORME ABROGATE: Verifica sempre se la norma è vigente:
- D.Lgs. 50/2016 (Codice Appalti) → ABROGATO, sostituito da D.Lgs. 36/2023 dal 1/7/2023 (art. 119 per subappalto)
- D.Lgs. 626/1994 → ABROGATO, sostituito da D.Lgs. 81/2008
- Art. 18 L. 300/1970 → applicabile solo ad assunti prima del 7/3/2015; per assunti dopo si applica D.Lgs. 23/2015 (Jobs Act, tutele crescenti)
- Detrazioni figli a carico under 21 → SOSTITUITE dall'Assegno Unico (D.Lgs. 230/2021, in vigore dal 1/3/2022); la detrazione IRPEF art. 12 TUIR resta solo per figli over 21 con reddito < 2.840,51 EUR (< 4.000 EUR se under 24)
- D.Lgs. 216/2023 (riforma fiscale) e D.Lgs. 219/2023 → modifiche TUIR 2024
Quando citi una norma modificata di recente, segnala con ⚠️ la versione vigente.

REGOLA GIURISPRUDENZA CORRETTA:
- Interruzione usucapione (art. 1158 c.c.): si interrompe SOLO con la perdita materiale del possesso (art. 1167 c.c.), NON con atti giudiziali o stragiudiziali (che interrompono la prescrizione estintiva, non acquisitiva).
- Prescrizione risarcimento danni extracontrattuale: 5 anni ex art. 2947 c.c., decorrenza dal momento in cui il danneggiato ha conoscenza del danno e del nesso causale.
- Registrazione conversazioni: lecita per il partecipante (Cass. SS.UU. n. 36884/2019; Cass. pen. n. 45963/2023), non configura art. 617 c.p. (intercettazione da estraneo).
- Opposizione a decreto ingiuntivo ex art. 645 c.p.c.: NESSUN effetto sospensivo automatico; sospensione provvisoria esecuzione tramite art. 649 c.p.c. (riforma Cartabia D.Lgs. 149/2022).
- Delibazione sentenze straniere: sentenze UE dal 1/8/2022 → riconoscimento automatico Reg. UE 2019/1111 (Bruxelles II-ter), senza delibazione; sentenze extra-UE → procedura artt. 64-71 L. 218/1995.
- Ricorso contro cartella esattoriale: termine 60 giorni dalla notifica (art. 21 D.Lgs. 546/1992), non 30 giorni. Mediazione tributaria obbligatoria ex art. 17-bis per importi ≤ 50.000 EUR.
- Aliquote IVA: disciplinate da art. 16 e Tabelle allegate DPR 633/1972 (non art. 17 che riguarda i soggetti passivi). Aliquote vigenti: 22% ordinaria, 10% ridotta, 5% speciale, 4% super-ridotta (art. 16 co. 2).`.trim();

// ── FEATURE 13: Judicial precedents ─────────────────────────────────────────

interface CassazioneChunk {
  id: string; chunk: string; titolo: string; fonte: string; url: string; similarity: number;
}

async function getPrecedentiCassazione(question: string, verticale?: string): Promise<CassazioneChunk[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const emb = await generateEmbedding(question);
    if (!emb) return [];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_normaai_chunks`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query_embedding: emb, match_count: 4, match_threshold: 0.30, filter_verticale: "cassazione", only_vigente: false }),
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
// Tier-based prompts (gratis/cittadino/impresa/professionista) + vertical overlays
// are defined in ./system-prompts.ts — imported at top of file.
// The assembleBasePrompt() function handles the 2-axis selection:
//   Axis 1 (tier): resolveUserTier(role, piano, specializzazioni) → gratis|cittadino|impresa|prof_avv|prof_comm
//   Axis 2 (vertical): vertical overlays for drafter tools (Parere, Memoria, Contratto, etc.)

function getBehavioralRules(turnNumber: number, hasProfilo: boolean, tier: string): string {
  // Professionisti non hanno bisogno del suggerimento referral
  const proponi = (turnNumber >= 2 && !tier.startsWith("professionista"))
    ? `\n- Hai già avuto ${turnNumber} scambi. Se il caso è ancora aperto, proponi: "**Vuoi che ti aiuti a trovare un professionista che possa assisterti direttamente?**"`
    : "";
  // Solo per utenti senza profilo e non professionisti: una domanda di follow-up
  const followUp = (hasProfilo || tier.startsWith("professionista")) ? "" : `\n- Se mancano dati essenziali per rispondere bene, chiedi PRIMA di rispondere (max 2-3 domande). NON aggiungere domande di follow-up DOPO una risposta già completa.`;
  return `────────────────────────────────────────
REGOLE COMPORTAMENTALI:
- RISPONDI SEMPRE. Non rifiutare MAI una domanda giuridica.
- Se una norma è stata modificata o abrogata di recente, segnalalo con ⚠️.
- Non usare mai percentuali o punteggi di confidenza.
- Quando il corpus fornisce [Fonte N], basati su quelle fonti e citale esplicitamente.
- Se non trovi la norma nel corpus, dillo: "ti consiglio di verificare su Normattiva.it"
${CITATION_RULES}${followUp}${proponi}
────────────────────────────────────────`;
}

// ── Embedding (VPS fastembed 384d — normaai_chunks table uses 384d) ──────────
// DB normaai_chunks stores 384d vectors (FastEmbed multilingual-e5-small).
// 2 tentativi su VPS con backoff 1.5s. Se VPS down → null → Claude risponde senza RAG.

async function generateEmbedding(text: string): Promise<number[] | null> {
  const input = text.slice(0, 8000);
  const url = `${EMBED_VPS_URL}/embed`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const timeout = attempt === 0 ? 8000 : 5000;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(timeout),
      });
      if (res.ok) {
        const json = await res.json();
        const emb = json?.data?.[0]?.embedding;
        if (emb) return emb;
      }
      console.error(`[EMBED] VPS attempt ${attempt + 1}: HTTP ${res.status}`);
    } catch (e) {
      console.error(`[EMBED] VPS attempt ${attempt + 1} failed:`, String(e).slice(0, 80));
    }
    if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
  }

  console.error("[EMBED] VPS down after 2 attempts — Claude risponde senza RAG");
  return null;
}

// autoDetectVertical rimosso — RAG è globale su tutto il corpus, nessun filtro verticale.

// ── Supabase RAG search ───────────────────────────────────────────────────────

interface SupabaseChunk {
  id: string; chunk: string; titolo: string; fonte: string; tipo: string;
  url: string; urn: string; status: string; similarity: number;
}

// Indici HNSW attivi nel DB (aggiornato 14/04/2026):
// Scatter-gather JS-side: 13 RPC in parallelo via Promise.all, ciascuna su indice partial.
// Ogni shard usa il proprio WHERE identico al suo partial index → Postgres usa l'indice HNSW.
// Merge + dedup lato JS. Copertura: ~6.5M/6.87M chunks (~95% corpus embeddato).
// Non copre: regio_decreto (~277K, no HNSW), chunks micro-verticali senza HNSW.
// Global HNSW (273MB) e global_v2 (740MB) non usati — coprono <10% corpus.

async function searchSupabaseSingle(
  embedding: number[],
  params: { filter_verticale?: string; filter_tipo?: string; match_count?: number }
): Promise<SupabaseChunk[]> {
  try {
    const body: Record<string, unknown> = {
      query_embedding: embedding,
      match_count: params.match_count ?? 4,
      match_threshold: 0.10,
      only_vigente: false,
      ...(params.filter_verticale ? { filter_verticale: params.filter_verticale } : {}),
      ...(params.filter_tipo ? { filter_tipo: params.filter_tipo } : {}),
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_normaai_chunks`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
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

// Shards per scatter-gather: ogni entry = params per searchSupabaseSingle
// WHERE deve essere identico alla definizione del partial HNSW index per forcing index scan.
const SCATTER_SHARDS: Array<{ filter_verticale?: string; filter_tipo?: string }> = [
  { filter_verticale: "generale", filter_tipo: "documento" },
  { filter_verticale: "generale", filter_tipo: "decreto" },
  { filter_verticale: "generale", filter_tipo: "atto_eu" },
  { filter_verticale: "generale", filter_tipo: "decreto_del_presidente_della_repubblica" },
  { filter_verticale: "generale", filter_tipo: "legge" },
  { filter_verticale: "generale", filter_tipo: "decreto_legislativo" },
  { filter_tipo: "gazzetta_ufficiale" },
  { filter_verticale: "impresa" },
  { filter_verticale: "avvocato" },
  { filter_verticale: "commercialista" },
  { filter_verticale: "lavoro" },
  { filter_verticale: "finanziario" },
  { filter_verticale: "ingegnere" },
];

async function searchSupabase(embedding: number[]): Promise<SupabaseChunk[]> {
  // Scatter-gather JS-side: 13 shard in parallelo, ciascuno su indice HNSW partial.
  // Merge + dedup per id, top 12 per similarity.
  const PER_SHARD = 3; // candidati per shard → 13*3=39 candidati → top 12
  const shardResults = await Promise.all(
    SCATTER_SHARDS.map(params => searchSupabaseSingle(embedding, { ...params, match_count: PER_SHARD }))
  );
  // Merge: dedup per id, top similarity
  const seen = new Map<string, SupabaseChunk>();
  for (const shard of shardResults) {
    for (const chunk of shard) {
      const existing = seen.get(chunk.id);
      if (!existing || chunk.similarity > existing.similarity) seen.set(chunk.id, chunk);
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.similarity - a.similarity).slice(0, 12);
}

// ── Reranker (keyword + legal citation overlap) ─────────────────────────────

function rerankChunks(question: string, chunks: SupabaseChunk[]): SupabaseChunk[] {
  if (chunks.length <= 1) return chunks;
  const qLower = question.toLowerCase();
  const qTokens = new Set(qLower.split(/\s+/).filter(t => t.length > 3));
  // Extract legal references from question (art. 2043, d.lgs. 81, l. 300, etc.)
  const legalRefs = new Set(
    (qLower.match(/(?:art\.?\s*\d+|d\.?\s*lgs\.?\s*\d+|l\.?\s*\d+|dpr\s*\d+|c\.c\.|c\.p\.|c\.p\.c\.|c\.p\.p\.)/g) ?? [])
      .map(r => r.replace(/\s+/g, ""))
  );

  return chunks
    .map(chunk => {
      const cLower = chunk.chunk.toLowerCase();
      // 1. Keyword overlap (Jaccard-like)
      const cTokens = new Set(cLower.split(/\s+/).filter(t => t.length > 3));
      const overlap = [...qTokens].filter(t => cTokens.has(t)).length;
      const kwScore = qTokens.size > 0 ? overlap / qTokens.size : 0;

      // 2. Legal citation match (high value if chunk contains the specific article/law)
      const cRefs = new Set(
        (cLower.match(/(?:art\.?\s*\d+|d\.?\s*lgs\.?\s*\d+|l\.?\s*\d+|dpr\s*\d+|c\.c\.|c\.p\.|c\.p\.c\.|c\.p\.p\.)/g) ?? [])
          .map(r => r.replace(/\s+/g, ""))
      );
      const refMatch = legalRefs.size > 0 ? [...legalRefs].filter(r => cRefs.has(r)).length / legalRefs.size : 0;

      // Combined score: 60% vector similarity + 20% keyword + 20% legal ref
      const combined = (chunk.similarity ?? 0) * 0.6 + kwScore * 0.2 + refMatch * 0.2;
      return { ...chunk, similarity: combined };
    })
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVerticale(vertical: string | null): string | undefined {
  if (!vertical) return undefined;
  // Usato solo per lead scoring e getPrecedentiCassazione — non per RAG filter
  const map: Record<string, string> = {
    Avvocato: "avvocato", Commercialista: "commercialista",
    "Analisi Contratto": "avvocato", "Parere Legale": "avvocato",
    "Email Professionale": "avvocato", "Memoria Difensiva": "avvocato",
    "Bozza Contratto": "avvocato", "Parcelle Forensi": "avvocato",
    "Analisi Documento": "avvocato",
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
  if (!role || role === "privato") return { model: "claude-sonnet-4-6", poolWeight: 0 };
  if (isTrial) return { model: "claude-sonnet-4-6", poolWeight: 0 };
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

  // Smoke test bypass — skip rate limit + auth for CI/CD health checks
  const smokeKey = req.headers.get("x-smoke-key");
  const validSmokeKey = process.env.SMOKE_KEY;
  const isSmokeTest = !!(validSmokeKey && smokeKey && smokeKey === validSmokeKey);

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

  // Rate limit a minuto (anti-flood) — skip for smoke tests
  if (!isSmokeTest) {
    const rateLimitKey = userId ? `user:${userId}` : `ip:${clientIp}`;
    const { allowed, remaining } = await rateLimit(rateLimitKey, userId ? 100 : 20, 60_000);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Troppe richieste. Riprova tra un minuto.", remaining }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } });
    }
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

  if (!userId && !isSmokeTest) {
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
    const { count, limit } = await checkAndIncrementDaily(userId!);
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

  // ── Langfuse trace ─────────────────────────────────────────────────────
  const lfTrace = traceRAGQuery({
    name: "rag-query",
    userId: userId,
    sessionId,
    input: question,
    metadata: { vertical: vertical ?? null, userRole, model: selectedModel, turnNumber: currentTurn },
  });
  const traceId = lfTrace.traceId;

  // ── RAG (retry + fallback + auto-detect vertical) ────────────────────────
  let ragContext = "";
  let sources: Source[] = [];
  let chunkUrns: string[] = [];

  try {
    const tEmbed0 = Date.now();
    const embedding = await generateEmbedding(question);
    const tEmbed1 = Date.now();
    // Langfuse: log embedding step (fire-and-forget)
    traceEmbedding(traceId, question, embedding ? embedding.length : null, tEmbed1 - tEmbed0);

    if (embedding) {
      const tRetrieval0 = Date.now();
      const rawChunks = await searchSupabase(embedding);
      const chunks = rerankChunks(question, rawChunks);
      const tRetrieval1 = Date.now();
      // Langfuse: log retrieval step (fire-and-forget)
      traceRetrieval(traceId, question, chunks.map(c => ({ id: String(c.id), titolo: c.titolo, fonte: c.fonte, similarity: c.similarity })), tRetrieval1 - tRetrieval0);

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

  // ── System prompt (tier-based) ─────────────────────────────────────────────
  const userTier = resolveUserTier(userRole, piano, profile?.specializzazioni);
  const basePrompt = assembleBasePrompt(userTier, vertical ?? null);
  const profileBlock = profile ? [buildProfileBlock(profile), buildJurisdictionalBlock(profile)].filter(Boolean).join("\n") : "";
  const behavioralRules = getBehavioralRules(currentTurn, !!profile, userTier);
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
      const tGen0 = Date.now();
      try {
        const anthropic = getAnthropic();
        const anthropicStream = await anthropic.messages.create({
          model: selectedModel,
          max_tokens: (vertical && ["Parere Legale", "Memoria Difensiva", "Bozza Contratto", "Analisi Documento", "Analisi Contratto"].includes(vertical)) ? 4096 : 3000,
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
          // Capture token usage from message_delta (Anthropic streams usage in the final event)
          if (event.type === "message_delta") {
            const usage = (event as unknown as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;
            if (usage) {
              const tGen1 = Date.now();
              traceGeneration(
                traceId,
                fullSystem,
                question,
                fullResponse,
                selectedModel,
                tGen1 - tGen0,
                { input: usage.input_tokens, output: usage.output_tokens, total: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0) },
              );
            }
          }
        }
      } catch (err) {
        send({ type: "error", message: String(err) });
      } finally {
        // If generation was not logged via message_delta, log it now
        if (fullResponse) {
          const tGen1 = Date.now();
          // Update trace output with final response (fire-and-forget)
          updateTraceOutput(traceId, fullResponse, {
            latencyMs: tGen1 - t0,
            model: selectedModel,
            sourcesCount: sources.length,
            hasGraph: graphContext.length > 0,
            hasPrecedents: precedentsContext.length > 0,
          });
          // Score: has_rag (1 if RAG context was used, 0 otherwise)
          scoreTrace(traceId, "has_rag", ragContext.length > 0 ? 1 : 0);
          // Score: chunk_count
          scoreTrace(traceId, "chunk_count", sources.length);
        }

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

        // Langfuse: flush pending events (fire-and-forget, never blocks response)
        flushLangfuse().catch(() => {});
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-User-Id": userId || "", "X-Trace-Id": traceId },
  });
}
