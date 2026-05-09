#!/usr/bin/env tsx
/**
 * LLM-judge eval — Ollama qwen2.5:7b on GEX44 (NOT Anthropic).
 * Replaces llm-judge.ts (Claude Opus violates "judge sempre Ollama locale" rule).
 *
 * Same input (golden-set.json), same JSON output schema as llm-judge.ts.
 * Reads LLM_URL Bearer (https://llm.normaai.it) or OLLAMA_DIRECT_URL (Tailscale).
 *
 * Usage:
 *   EMBED_API_KEY=... tsx llm-judge-ollama.ts
 *   tsx llm-judge-ollama.ts --limit 10 --output report-ollama.json
 */

import fs from "fs";
import path from "path";

const LLM_URL = (process.env.LLM_URL ?? "https://llm.normaai.it").replace(/\/$/, "");
const LLM_KEY = process.env.EMBED_API_KEY ?? process.env.NORMAAI_INTERNAL_API_KEY ?? "";
const OLLAMA_DIRECT = process.env.OLLAMA_DIRECT_URL;
const MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct";
const NORMAAI_URL = process.env.NORMAAI_URL ?? "https://normaai.it";
const NORMAAI_API_KEY = process.env.NORMAAI_EVAL_API_KEY ?? "";
const PASS_THRESHOLD = parseFloat(process.env.EVAL_PASS_THRESHOLD ?? "0.70");

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
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Smoke-Test": "true" };
  if (NORMAAI_API_KEY) headers["X-API-Key"] = NORMAAI_API_KEY;

  const res = await fetch(`${NORMAAI_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question: query.question, vertical: query.vertical, turnNumber: 0 }),
  });
  if (!res.ok) throw new Error(`NormaAI API ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No body");
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value, { stream: true }).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.type === "text") full += ev.text;
      } catch {}
    }
  }
  return { text: full, latency_ms: Date.now() - t0 };
}

async function callOllama(prompt: string): Promise<string> {
  if (OLLAMA_DIRECT) {
    const url = `${OLLAMA_DIRECT.replace(/\/$/, "")}/api/chat`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: { temperature: 0.0, num_predict: 600 },
      }),
    });
    if (!r.ok) throw new Error(`ollama ${r.status}`);
    const j = await r.json() as { message: { content: string } };
    return j.message.content;
  }

  const r = await fetch(`${LLM_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(LLM_KEY ? { Authorization: `Bearer ${LLM_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.0,
      max_tokens: 600,
      stream: false,
    }),
  });
  if (!r.ok) throw new Error(`llm.normaai.it ${r.status}`);
  const j = await r.json() as { choices: { message: { content: string } }[] };
  return j.choices[0].message.content;
}

async function judgeResponse(query: GoldenQuery, response: string): Promise<EvalResult["scores"] & { issues: string[] }> {
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

Rispondi SOLO con JSON valido (no preamboli, no markdown):
{"accuracy": 0.85, "citation_quality": 0.90, "completeness": 0.80, "safety": 1.0, "issues": ["lista problemi"]}`;

  const text = await callOllama(prompt);
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`judge no JSON in: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(m[0]) as {
    accuracy: number; citation_quality: number; completeness: number; safety: number; issues?: string[];
  };
  const overall = parsed.accuracy * 0.30 + parsed.citation_quality * 0.25 +
                  parsed.completeness * 0.20 + parsed.safety * 0.25;
  return { ...parsed, overall, issues: parsed.issues ?? [] };
}

async function main() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : undefined;
  const outIdx = args.indexOf("--output");
  const outFile = outIdx >= 0 ? args[outIdx + 1] : "eval-report-ollama.json";
  const inputIdx = args.indexOf("--input");
  const inputFile = inputIdx >= 0 ? args[inputIdx + 1] : path.join(__dirname, "golden-set.json");

  const data = JSON.parse(fs.readFileSync(inputFile, "utf-8")) as { queries: GoldenQuery[] };
  const queries = limit ? data.queries.slice(0, limit) : data.queries;

  console.log(`NormaAI Ollama-judge — ${queries.length} query on ${NORMAAI_URL}`);
  console.log(`judge=${MODEL} via ${OLLAMA_DIRECT ?? LLM_URL}, threshold=${PASS_THRESHOLD}\n`);

  const results: EvalResult[] = [];
  for (const q of queries) {
    process.stdout.write(`[${q.id}] ${q.question.slice(0, 60)}... `);
    try {
      const { text, latency_ms } = await fetchNormaAIResponse(q);
      const { issues, ...scores } = await judgeResponse(q, text);
      const passed = scores.overall >= PASS_THRESHOLD;
      results.push({ id: q.id, question: q.question, vertical: q.vertical, difficulty: q.difficulty,
        response: text.slice(0, 500), scores, issues, passed, latency_ms });
      console.log(`${passed ? "OK" : "KO"} overall=${scores.overall.toFixed(2)} t=${latency_ms}ms`);
    } catch (err) {
      console.log(`ERR ${(err as Error).message}`);
      results.push({ id: q.id, question: q.question, vertical: q.vertical, difficulty: q.difficulty,
        response: "", scores: { accuracy: 0, citation_quality: 0, completeness: 0, safety: 0, overall: 0 },
        issues: [(err as Error).message], passed: false, latency_ms: 0 });
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const passed = results.filter((r) => r.passed).length;
  const avgScore = results.reduce((s, r) => s + r.scores.overall, 0) / results.length;
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
    judge_model: MODEL,
    judge_endpoint: OLLAMA_DIRECT ?? LLM_URL,
    normaai_url: NORMAAI_URL,
    total: results.length,
    passed,
    failed: results.length - passed,
    pass_rate: passed / results.length,
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

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
