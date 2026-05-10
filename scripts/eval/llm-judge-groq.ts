#!/usr/bin/env tsx
/**
 * LLM-judge eval — Groq llama-3.3-70b-versatile (production model, NOT Anthropic).
 *
 * Per CLAUDE.md rule "preferire LLM locali / gratuiti": eval su modello prod
 * (Groq) per realismo, non su Opus che gira solo in eval.
 *
 * Generator: NormaAI prod /api/chat (which uses Groq via getProvider)
 * Judge:     Groq llama-3.3-70b-versatile direct
 *
 * Usage:
 *   GROQ_API_KEY=... tsx scripts/eval/llm-judge-groq.ts --limit 30 --output baseline-30.json
 *   tsx scripts/eval/llm-judge-groq.ts --input scripts/golden-set-eval/golden-set.json
 *   tsx scripts/eval/llm-judge-groq.ts --base https://normaai.it       # default
 */

import fs from "fs";
import path from "path";

const GROQ_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const JUDGE_MODEL = process.env.JUDGE_MODEL ?? "llama-3.3-70b-versatile";
const NORMAAI_URL = process.env.NORMAAI_URL ?? "https://normaai.it";
const NORMAAI_API_KEY = process.env.NORMAAI_EVAL_API_KEY ?? "";
const PASS_THRESHOLD = parseFloat(process.env.EVAL_PASS_THRESHOLD ?? "0.70");
const RATE_SLEEP_MS = parseInt(process.env.EVAL_RATE_SLEEP_MS ?? "500", 10);

interface GoldenQuery {
  id: string;
  vertical: string;
  question: string;
  expected_citations: string[];
  required_topics: string[];
  forbidden_hallucinations: string[];
  difficulty: "easy" | "medium" | "hard";
}

interface EvalResult {
  id: string;
  question: string;
  vertical: string;
  difficulty: string;
  response: string;
  scores: {
    accuracy: number;
    citation_quality: number;
    completeness: number;
    safety: number;
    overall: number;
  };
  issues: string[];
  passed: boolean;
  latency_ms: number;
}

async function fetchNormaAIResponse(query: GoldenQuery): Promise<{ text: string; latency_ms: number }> {
  const t0 = Date.now();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Smoke-Test": "true",
  };
  if (NORMAAI_API_KEY) headers["X-API-Key"] = NORMAAI_API_KEY;

  const res = await fetch(`${NORMAAI_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      conversation_id: globalThis.crypto?.randomUUID?.() ?? `eval-${Date.now()}-${Math.random()}`,
      message: query.question,
      channel: "chat",
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`NormaAI ${res.status} ${t.slice(0, 120)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("no body");
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  let currentEvent = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        if (currentEvent === "token") {
          try {
            const j = JSON.parse(line.slice(6)) as { text?: string };
            if (j.text) full += j.text;
          } catch {}
        } else if (currentEvent === "done") {
          try {
            const j = JSON.parse(line.slice(6)) as { finalMarkdown?: string };
            if (j.finalMarkdown && full.length === 0) full = j.finalMarkdown;
          } catch {}
        }
      } else if (line === "") {
        currentEvent = "";
      }
    }
  }
  return { text: full, latency_ms: Date.now() - t0 };
}

async function callGroq(prompt: string): Promise<string> {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY missing");
  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      max_tokens: 600,
      stream: false,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`groq ${r.status} ${txt.slice(0, 160)}`);
  }
  const j = await r.json() as { choices: { message: { content: string } }[] };
  return j.choices[0].message.content;
}

async function judgeResponse(
  query: GoldenQuery,
  response: string,
): Promise<EvalResult["scores"] & { issues: string[] }> {
  const prompt = `Sei un esperto giurista italiano che valuta risposte di un assistente AI legale.

## Query
Verticale: ${query.vertical}
Domanda: "${query.question}"
Difficoltà: ${query.difficulty}

## Risposta da valutare
${response}

## Citazioni attese
${query.expected_citations.map((c) => `- ${c}`).join("\n")}

## Argomenti richiesti
${query.required_topics.map((t) => `- ${t}`).join("\n")}

## Allucinazioni da evitare
${query.forbidden_hallucinations.length > 0
    ? query.forbidden_hallucinations.map((h) => `- ${h}`).join("\n")
    : "Nessuna specificata"}

Valuta su 4 dimensioni 0-1 (2 decimali):
1. accuracy: corretta giuridicamente?
2. citation_quality: citazioni presenti, corrette, pertinenti?
3. completeness: copre tutti gli argomenti richiesti?
4. safety: 1=sicura, 0=pericolosa/allucinante

Rispondi con SOLO JSON valido (no preamboli, no markdown):
{"accuracy": 0.85, "citation_quality": 0.90, "completeness": 0.80, "safety": 1.0, "issues": ["lista problemi"]}`;

  const text = await callGroq(prompt);
  // response_format=json_object guarantees valid JSON; still defensively extract
  let parsed: { accuracy: number; citation_quality: number; completeness: number; safety: number; issues?: string[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`judge no JSON in: ${text.slice(0, 200)}`);
    parsed = JSON.parse(m[0]);
  }
  const overall =
    parsed.accuracy * 0.30 +
    parsed.citation_quality * 0.25 +
    parsed.completeness * 0.20 +
    parsed.safety * 0.25;
  return { ...parsed, overall, issues: parsed.issues ?? [] };
}

async function main() {
  const args = process.argv.slice(2);
  const idx = (k: string) => args.indexOf(k);
  const limit = idx("--limit") >= 0 ? parseInt(args[idx("--limit") + 1], 10) : undefined;
  const seed = idx("--seed") >= 0 ? parseInt(args[idx("--seed") + 1], 10) : 42;
  const outFile = idx("--output") >= 0 ? args[idx("--output") + 1] : "baseline-groq.json";
  const inputFile = idx("--input") >= 0
    ? args[idx("--input") + 1]
    : path.join(process.cwd(), "scripts", "golden-set-eval", "golden-set.json");

  if (!GROQ_KEY) {
    console.error("ERROR: GROQ_API_KEY env var required.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputFile, "utf-8")) as { queries: GoldenQuery[] };
  // Deterministic shuffle by hash(id, seed) so re-runs are reproducible.
  const shuffled = [...data.queries].sort((a, b) => {
    const ka = (a.id + seed).split("").reduce((s, c) => (s * 31 + c.charCodeAt(0)) | 0, 0);
    const kb = (b.id + seed).split("").reduce((s, c) => (s * 31 + c.charCodeAt(0)) | 0, 0);
    return ka - kb;
  });
  const queries = limit ? shuffled.slice(0, limit) : shuffled;

  console.log(`baseline-groq — ${queries.length} query on ${NORMAAI_URL}`);
  console.log(`generator=Groq (prod NormaAI /api/chat), judge=${JUDGE_MODEL}, threshold=${PASS_THRESHOLD}\n`);

  const results: EvalResult[] = [];
  for (const q of queries) {
    process.stdout.write(`[${q.id}] ${q.question.slice(0, 60)}... `);
    try {
      const { text, latency_ms } = await fetchNormaAIResponse(q);
      const { issues, ...scores } = await judgeResponse(q, text);
      const passed = scores.overall >= PASS_THRESHOLD;
      results.push({
        id: q.id,
        question: q.question,
        vertical: q.vertical,
        difficulty: q.difficulty,
        response: text.slice(0, 500),
        scores,
        issues,
        passed,
        latency_ms,
      });
      console.log(`${passed ? "OK" : "KO"} overall=${scores.overall.toFixed(2)} t=${latency_ms}ms`);
    } catch (err) {
      console.log(`ERR ${(err as Error).message}`);
      results.push({
        id: q.id,
        question: q.question,
        vertical: q.vertical,
        difficulty: q.difficulty,
        response: "",
        scores: { accuracy: 0, citation_quality: 0, completeness: 0, safety: 0, overall: 0 },
        issues: [(err as Error).message],
        passed: false,
        latency_ms: 0,
      });
    }
    await new Promise((r) => setTimeout(r, RATE_SLEEP_MS));
  }

  const passed = results.filter((r) => r.passed).length;
  const okScores = results.filter((r) => r.scores.overall > 0);
  const avgScore = okScores.length
    ? okScores.reduce((s, r) => s + r.scores.overall, 0) / okScores.length
    : 0;
  const okLat = results.filter((r) => r.latency_ms > 0);
  const avgLat = okLat.length ? okLat.reduce((s, r) => s + r.latency_ms, 0) / okLat.length : 0;

  const byVertical: Record<string, { avg: number; n: number }> = {};
  const byDifficulty: Record<string, { avg: number; n: number }> = {};
  for (const r of results) {
    if (!byVertical[r.vertical]) byVertical[r.vertical] = { avg: 0, n: 0 };
    byVertical[r.vertical].avg += r.scores.overall;
    byVertical[r.vertical].n++;
    if (!byDifficulty[r.difficulty]) byDifficulty[r.difficulty] = { avg: 0, n: 0 };
    byDifficulty[r.difficulty].avg += r.scores.overall;
    byDifficulty[r.difficulty].n++;
  }
  for (const v of Object.values(byVertical)) v.avg /= v.n;
  for (const v of Object.values(byDifficulty)) v.avg /= v.n;

  const report = {
    run_at: new Date().toISOString(),
    judge_model: JUDGE_MODEL,
    judge_endpoint: GROQ_URL,
    generator: "groq via NormaAI prod /api/chat",
    normaai_url: NORMAAI_URL,
    seed,
    total: results.length,
    passed,
    failed: results.length - passed,
    pass_rate: results.length ? passed / results.length : 0,
    avg_score: avgScore,
    avg_latency_ms: avgLat,
    by_vertical: byVertical,
    by_difficulty: byDifficulty,
    results,
    ci_passed: avgScore >= PASS_THRESHOLD,
  };

  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\n${"-".repeat(60)}`);
  console.log(`pass=${passed}/${results.length} (${(report.pass_rate * 100).toFixed(1)}%) avg=${avgScore.toFixed(3)} latency=${avgLat.toFixed(0)}ms`);
  console.log(`saved: ${outFile}`);
  process.exit(report.ci_passed ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
