#!/usr/bin/env tsx
/**
 * Generate 200 synthetic legal queries via Groq llama-3.3-70b.
 *
 * Stratified: 8 verticals × 25 queries each × difficulty (easy 8 / medium 10 / hard 7).
 * Output schema matches scripts/golden-set-eval/golden-set.json so existing
 * harness (llm-judge-groq.ts, split-suite.ts) reads it without changes.
 *
 * Synthetic ≠ real user queries (LLM bias, no production tail). Used to UNBLOCK
 * baseline + A/B + decision gate; replace with frozen 200 from triage.py when
 * Francesco completes manual review.
 *
 * Run:
 *   GROQ_API_KEY=... tsx scripts/eval/generate-synth-200.ts \
 *     --output scripts/golden-set-eval/golden-200-synthetic.json
 */

import fs from "fs";
import path from "path";

const GROQ_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GEN_MODEL ?? "llama-3.3-70b-versatile";

const VERTICALS = (process.env.SYNTH_VERTICALS ?? "lavoro,fisco,privacy,civile,edilizia,appalti,penale,famiglia").split(",").map((s) => s.trim()).filter(Boolean);
const DIFFICULTY_MIX = { easy: 8, medium: 10, hard: 7 } as const;

interface Query {
  id: string;
  vertical: string;
  question: string;
  expected_citations: string[];
  required_topics: string[];
  forbidden_hallucinations: string[];
  difficulty: "easy" | "medium" | "hard";
}

function buildPrompt(vertical: string): string {
  return `Sei un giurista italiano senior. Genera 25 query LEGALI realistiche per il verticale "${vertical}".

Mix difficoltà:
- 8 EASY (concetti base, definizioni, soglie comuni)
- 10 MEDIUM (procedure, eccezioni, calcoli, casistica frequente)
- 7 HARD (orientamenti giurisprudenziali, casi limite, normativa multi-livello)

Per ogni query produci JSON con:
- question        : domanda naturale che un cittadino o professionista farebbe
- expected_citations  : array di 1-3 norme attese (es. "art. 2103 c.c.", "D.Lgs. 81/2015 art. 2", "Cass. sez. lav.")
- required_topics : array di 2-4 concetti chiave che la risposta deve toccare
- forbidden_hallucinations : array (può essere vuoto) di errori comuni da evitare
- difficulty      : "easy" | "medium" | "hard"

Vincoli:
- NO query che richiedano numeri/date pegged a 2024+ (aliquote, soglie con anno specifico) — quelle vanno in un eval set separato
- NO domande astratte/filosofiche
- Italiano corretto, no anglicismi non necessari
- Diversità: copri sotto-aree del verticale, non ripetere temi
- IDs auto: "SYN-${vertical.toUpperCase().slice(0, 3)}-001" .. "-025"

Rispondi SOLO con JSON valido nel formato:
{"queries": [{...}, {...}, ...]}  (esattamente 25 elementi)`;
}

async function callGroq(prompt: string, retries = 2): Promise<string> {
  let lastErr: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 6000,
          response_format: { type: "json_object" },
        }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`groq ${r.status} ${t.slice(0, 200)}`);
      }
      const j = (await r.json()) as { choices: { message: { content: string } }[] };
      return j.choices[0].message.content;
    } catch (e) {
      lastErr = e as Error;
      if (i < retries) await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr ?? new Error("groq failed");
}

function normalizeQuery(q: any, vertical: string, idx: number): Query | null {
  if (!q || typeof q.question !== "string" || !q.difficulty) return null;
  const diff = String(q.difficulty).toLowerCase() as Query["difficulty"];
  if (!["easy", "medium", "hard"].includes(diff)) return null;
  return {
    id: q.id ?? `SYN-${vertical.toUpperCase().slice(0, 3)}-${String(idx).padStart(3, "0")}`,
    vertical,
    question: q.question.trim(),
    expected_citations: Array.isArray(q.expected_citations) ? q.expected_citations.slice(0, 5) : [],
    required_topics: Array.isArray(q.required_topics) ? q.required_topics.slice(0, 6) : [],
    forbidden_hallucinations: Array.isArray(q.forbidden_hallucinations) ? q.forbidden_hallucinations.slice(0, 5) : [],
    difficulty: diff,
  };
}

async function generateForVertical(vertical: string): Promise<Query[]> {
  const raw = await callGroq(buildPrompt(vertical));
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`no JSON for ${vertical}`);
    parsed = JSON.parse(m[0]);
  }
  const arr: any[] = parsed.queries ?? parsed;
  if (!Array.isArray(arr)) throw new Error(`bad shape for ${vertical}`);
  const out: Query[] = [];
  for (let i = 0; i < arr.length; i++) {
    const q = normalizeQuery(arr[i], vertical, i + 1);
    if (q) out.push(q);
  }
  return out;
}

async function main() {
  if (!GROQ_KEY) {
    console.error("GROQ_API_KEY missing");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const idx = (k: string) => args.indexOf(k);
  const outFile = idx("--output") >= 0
    ? args[idx("--output") + 1]
    : path.resolve("scripts/golden-set-eval/golden-200-synthetic.json");

  console.log(`Generating 25 queries × ${VERTICALS.length} verticals = ${VERTICALS.length * 25} target via ${MODEL}`);

  const all: Query[] = [];
  const stats: { vertical: string; n: number; mix: Record<string, number> }[] = [];
  for (const v of VERTICALS) {
    process.stdout.write(`  ${v.padEnd(13)} ... `);
    try {
      const qs = await generateForVertical(v);
      all.push(...qs);
      const mix: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
      for (const q of qs) mix[q.difficulty]++;
      stats.push({ vertical: v, n: qs.length, mix });
      console.log(`${qs.length} (${mix.easy}e/${mix.medium}m/${mix.hard}h)`);
    } catch (e) {
      console.log(`ERR ${(e as Error).message}`);
      stats.push({ vertical: v, n: 0, mix: {} });
    }
    // 60s between verticals to stay under Groq TPM 12k for llama-3.3-70b
    await new Promise((r) => setTimeout(r, parseInt(process.env.GEN_SLEEP_MS ?? "60000", 10)));
  }

  const meta = {
    version: "synth-1.0.0",
    generated_at: new Date().toISOString(),
    model: MODEL,
    description: "Synthetic golden set, 8 verticals × 25 stratified, generated to UNBLOCK baseline-200 ahead of manual triage.",
    target_per_vertical: 25,
    target_difficulty_mix: DIFFICULTY_MIX,
    total: all.length,
    verticals: VERTICALS,
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ _meta: meta, queries: all }, null, 2));

  console.log(`\nWrote ${all.length} queries -> ${path.relative(process.cwd(), outFile)}`);
  console.log("By vertical:");
  for (const s of stats) {
    console.log(`  ${s.vertical.padEnd(13)} ${s.n}`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
