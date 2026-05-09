#!/usr/bin/env tsx
/**
 * Avatar prompt eval + iteration loop.
 *
 * Single iteration:
 *   1. Load AVATAR_IT_PROMPT
 *   2. For each scenario, call generator (Sonnet) with prompt + history + user turn
 *   3. Judge each response (Opus) on rubric → score 0-100
 *   4. If avg ≥ TARGET, stop
 *   5. Else, ask Opus to propose a refined prompt (concrete diff, preserve structure)
 *   6. Save iteration to logs/, if new score > best then update prompt file
 *
 * Run continuously: `tsx run.ts --iterations 8`
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const PROMPT_FILE = path.join(REPO_ROOT, "src/lib/prompts/avatar_it.ts");
const SCENARIOS_FILE = path.join(__dirname, "scenarios.json");
const LOGS_DIR = path.join(__dirname, "logs");
fs.mkdirSync(LOGS_DIR, { recursive: true });

const TARGET_SCORE = parseFloat(process.env.TARGET || "99");
const MAX_ITERATIONS = parseInt(process.env.MAX_ITER || "8", 10);
// Generator = same model that runs in production for voice/avatar (Groq llama-3.3-70b)
const GENERATOR_MODEL = process.env.GEN_MODEL || "llama-3.3-70b-versatile";
const JUDGE_MODEL = process.env.JUDGE_MODEL || "llama-3.3-70b-versatile";
const GROQ_BASE = "https://api.groq.com/openai/v1";

// ── env loader (.env.local) ──
function loadEnv() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}
loadEnv();

if (!process.env.GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY in .env.local");
  process.exit(1);
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function groqChat(model: string, messages: Array<{ role: string; content: string }>, maxTokens: number, temperature = 0.3): Promise<string> {
  let attempt = 0;
  while (true) {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
    });
    if (res.ok) {
      const data = await res.json() as any;
      // Throttle: keep average under 12K TPM (free tier). Sleep proportional to tokens used.
      const used = (data.usage?.total_tokens ?? 1500);
      await sleep(Math.ceil((used / 12000) * 60_000) + 500);
      return data.choices?.[0]?.message?.content ?? "";
    }
    if (res.status === 429 && attempt < 6) {
      const t = await res.text();
      const m = t.match(/try again in ([\d.]+)s/);
      const wait = m ? Math.ceil(parseFloat(m[1]) * 1000) + 1000 : 6000 * (attempt + 1);
      console.log(`    [429 retry ${attempt + 1}/6, wait ${wait}ms]`);
      await sleep(wait);
      attempt++;
      continue;
    }
    const t = await res.text();
    throw new Error(`Groq ${res.status}: ${t.slice(0, 300)}`);
  }
}

// ── prompt loader/saver ──
function loadPrompt(): string {
  const src = fs.readFileSync(PROMPT_FILE, "utf8");
  const m = src.match(/export const AVATAR_IT_PROMPT = `([\s\S]*?)`;/);
  if (!m) throw new Error("Cannot extract AVATAR_IT_PROMPT");
  return m[1];
}
function savePrompt(newBody: string, version: string, score: number) {
  const src = fs.readFileSync(PROMPT_FILE, "utf8");
  const updated = src
    .replace(/Score finale: [\d.]+\/100/, `Score finale: ${score.toFixed(1)}/100`)
    .replace(/Versione prompt: v\d+/, `Versione prompt: ${version}`)
    .replace(/Generato: [^\n]+/, `Generato: ${new Date().toISOString()}`)
    .replace(/export const AVATAR_IT_PROMPT = `[\s\S]*?`;/, `export const AVATAR_IT_PROMPT = \`${newBody}\`;`);
  fs.writeFileSync(PROMPT_FILE, updated);
}

// ── scenarios ──
interface Scenario {
  id: string;
  category: string;
  user: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  expect: Record<string, unknown>;
}
const scenarios: Scenario[] = JSON.parse(fs.readFileSync(SCENARIOS_FILE, "utf8")).scenarios;

// ── generator: simulate Sofia response ──
async function generate(systemPrompt: string, sc: Scenario): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
  ];
  if (sc.history) for (const m of sc.history) messages.push({ role: m.role, content: m.content });
  messages.push({ role: "user", content: sc.user });
  return await groqChat(GENERATOR_MODEL, messages, 800, 0.3);
}

// ── judge: score a single response ──
async function judge(sc: Scenario, response: string, systemPrompt: string): Promise<{ score: number; rationale: string; issues: string[] }> {
  const judgePrompt = `Sei un valutatore esperto. Scora la risposta di Sofia (avatar AI legale) su una scala 0-100.

REGOLE DEL PROMPT (sintesi):
- Tono "Lei" SEMPRE
- Etichette [CERTO]/[PROBABILE]/[NON SO]
- Citazioni format [Fonte X] D.Lgs. Y/Z, art. N — solo se sicuro
- 3-7 frasi, max 10. NO elenchi/numerati/emoji/sezioni titolate
- Numeri in LETTERE (per TTS)
- Termina con "Risposta generata da AI ai sensi Reg. UE 2024/1689"
- Non reindirizzi mai a umani esterni; CTA €9 solo se richiesto

SCENARIO ID: ${sc.id} (${sc.category})
USER: ${sc.user}
${sc.history ? "HISTORY: " + JSON.stringify(sc.history) : ""}
ASPETTATIVE: ${JSON.stringify(sc.expect)}

RISPOSTA DI SOFIA:
"""
${response}
"""

Verifica TUTTE le aspettative + le regole generali. Penalità tipiche:
- Manca disclaimer: -10
- Manca etichetta [CERTO]/[PROBABILE]/[NON SO] dove servirebbe: -10
- Numeri arabi in riferimenti normativi (es. "art. 35" invece di "trentacinque"): -5
- Usa "tu": -15
- Inventa una fonte: -30
- Reindirizza a umano esterno: -15
- >10 frasi: -5
- Emoji o elenchi puntati/numerati: -10
- Non rispetta una aspettativa specifica dello scenario: -10 ciascuna
- Risposta vuota o off-topic grave: 0

Ritorna SOLO JSON valido:
{"score": <0-100>, "rationale": "...", "issues": ["..."]}`;

  const text = await groqChat(JUDGE_MODEL, [{ role: "user", content: judgePrompt }], 500, 0.1);
  const m = text.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(m ? m[0] : text);
  } catch {
    return { score: 0, rationale: "judge_parse_error: " + text.slice(0, 200), issues: ["parse_error"] };
  }
}

// ── refiner: ask Opus to improve the prompt ──
async function refinePrompt(currentPrompt: string, results: Array<{ sc: Scenario; response: string; judgeOut: any }>): Promise<string> {
  const failures = results.filter(r => r.judgeOut.score < 95);
  const summary = failures.slice(0, 8).map(r =>
    `[${r.sc.id} ${r.sc.category}] score ${r.judgeOut.score}\n  user: ${r.sc.user}\n  response: ${r.response.slice(0, 300)}\n  issues: ${(r.judgeOut.issues || []).join("; ")}`
  ).join("\n\n");

  const refinePrompt = `Sei un prompt engineer esperto. Migliora il system prompt di Sofia (avatar AI legale italiano) per chiudere i fallimenti elencati. PRESERVA struttura, tono, esempi, formato. Cambia SOLO sezione REGOLE o aggiungi micro-istruzioni mirate (max 5-6 righe nuove). Mantieni tutto in italiano.

PROMPT ATTUALE:
"""
${currentPrompt}
"""

FALLIMENTI:
${summary}

Ritorna SOLO il nuovo testo del prompt, senza commenti, senza backticks. Mantieni esattamente la stessa intestazione "Sei **Sofia**...".`;

  let text = await groqChat(JUDGE_MODEL, [{ role: "user", content: refinePrompt }], 4000, 0.4);
  text = text.replace(/^```\w*\n/, "").replace(/\n```\s*$/, "").trim();
  return text;
}

// ── one full eval pass ──
async function evalPass(systemPrompt: string, label: string) {
  console.log(`\n=== EVAL PASS: ${label} ===`);
  const results: Array<{ sc: Scenario; response: string; judgeOut: any }> = [];
  for (const sc of scenarios) {
    try {
      const response = await generate(systemPrompt, sc);
      const judgeOut = await judge(sc, response, systemPrompt);
      console.log(`  ${sc.id} → ${judgeOut.score}/100 ${judgeOut.score < 95 ? "❌" : "✅"}`);
      results.push({ sc, response, judgeOut });
    } catch (e: any) {
      console.error(`  ${sc.id} ERROR: ${e.message}`);
      results.push({ sc, response: "", judgeOut: { score: 0, rationale: e.message, issues: ["api_error"] } });
    }
  }
  const avg = results.reduce((a, r) => a + (r.judgeOut.score || 0), 0) / results.length;
  console.log(`  AVG: ${avg.toFixed(2)}/100`);
  const logFile = path.join(LOGS_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}-${label}.json`);
  fs.writeFileSync(logFile, JSON.stringify({ label, avg, results }, null, 2));
  return { avg, results };
}

// ── main loop ──
async function main() {
  let bestPrompt = loadPrompt();
  let { avg: bestScore, results: bestResults } = await evalPass(bestPrompt, "baseline");

  for (let iter = 1; iter <= MAX_ITERATIONS && bestScore < TARGET_SCORE; iter++) {
    console.log(`\n--- ITER ${iter} (best=${bestScore.toFixed(2)}, target=${TARGET_SCORE}) ---`);
    let candidate: string;
    try {
      candidate = await refinePrompt(bestPrompt, bestResults);
    } catch (e: any) {
      console.error("Refine failed:", e.message);
      break;
    }
    if (!candidate || candidate.length < 200) {
      console.error("Candidate prompt too short, skipping");
      continue;
    }
    const { avg, results } = await evalPass(candidate, `iter${iter}`);
    if (avg > bestScore) {
      bestScore = avg;
      bestPrompt = candidate;
      bestResults = results;
      const version = `v${6 + iter}`;
      savePrompt(bestPrompt, version, bestScore);
      console.log(`  ✅ Improved → saved ${version} (${bestScore.toFixed(2)}/100)`);
    } else {
      console.log(`  ⚪ No improvement (${avg.toFixed(2)} ≤ ${bestScore.toFixed(2)})`);
    }
  }

  console.log(`\n=== DONE ===\nFinal best score: ${bestScore.toFixed(2)}/100`);
  fs.writeFileSync(path.join(LOGS_DIR, "summary.json"), JSON.stringify({ bestScore, target: TARGET_SCORE, completedAt: new Date().toISOString() }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
