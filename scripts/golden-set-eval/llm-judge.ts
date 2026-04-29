#!/usr/bin/env tsx
/**
 * SER-82: LLM-judge evaluation per NormaAI Golden Set
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... NORMAAI_URL=https://normaai.it tsx llm-judge.ts
 *   tsx llm-judge.ts --limit 10          # solo prime 10 query
 *   tsx llm-judge.ts --output report.json
 *
 * Output: JSON report con score per query + sommario aggregate
 * Exit code: 0 se score medio ≥ 0.70, 1 altrimenti (per CI)
 */

import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

// ── Config ────────────────────────────────────────────────────────────────────

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const NORMAAI_URL = process.env.NORMAAI_URL || "https://normaai.it";
const NORMAAI_API_KEY = process.env.NORMAAI_EVAL_API_KEY || "";
const PASS_THRESHOLD = parseFloat(process.env.EVAL_PASS_THRESHOLD || "0.70");
const JUDGE_MODEL = "claude-opus-4-5" ;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GoldenQuery {
  id: string;
  vertical: string;
  question: string;
  expected_citations: string[];
  required_topics: string[];
  forbidden_hallucinations: string[];
  difficulty: "easy" | "medium" | "hard";
}

interface GoldenSet {
  _meta: { version: string; total: number };
  queries: GoldenQuery[];
}

interface EvalResult {
  id: string;
  question: string;
  vertical: string;
  difficulty: string;
  response: string;
  scores: {
    accuracy: number;       // Correttezza fattuale (0-1)
    citation_quality: number; // Qualità citazioni normative (0-1)
    completeness: number;   // Completezza risposta (0-1)
    safety: number;         // Assenza allucinazioni pericolose (0-1)
    overall: number;        // Media pesata
  };
  issues: string[];
  passed: boolean;
  latency_ms: number;
}

interface EvalReport {
  run_at: string;
  normaai_url: string;
  total_queries: number;
  passed: number;
  failed: number;
  pass_rate: number;
  avg_score: number;
  avg_latency_ms: number;
  by_vertical: Record<string, { avg_score: number; count: number }>;
  by_difficulty: Record<string, { avg_score: number; count: number }>;
  results: EvalResult[];
  ci_passed: boolean;
}

// ── Fetch risposta NormaAI ────────────────────────────────────────────────────

async function fetchNormaAIResponse(query: GoldenQuery): Promise<{ text: string; latency_ms: number }> {
  const t0 = Date.now();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Smoke-Test": "true", // skip quota check
  };
  if (NORMAAI_API_KEY) headers["X-API-Key"] = NORMAAI_API_KEY;

  const res = await fetch(`${NORMAAI_URL}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      question: query.question,
      vertical: query.vertical,
      turnNumber: 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`NormaAI API error: ${res.status}`);
  }

  // Consuma SSE stream e raccoglie il testo
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  let fullText = "";
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "text") fullText += event.text;
      } catch { /* skip malformed */ }
    }
  }

  return { text: fullText, latency_ms: Date.now() - t0 };
}

// ── LLM Judge ────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

async function judgeResponse(query: GoldenQuery, response: string): Promise<EvalResult["scores"] & { issues: string[] }> {
  const judgePrompt = `Sei un esperto giurista italiano che valuta la qualità di risposte di un assistente AI legale.

## Query valutata
Verticale: ${query.vertical}
Domanda: "${query.question}"
Difficoltà: ${query.difficulty}

## Risposta da valutare
${response}

## Criteri di valutazione

### Citazioni attese (verifica presenza)
${query.expected_citations.map(c => `- ${c}`).join("\n")}

### Argomenti richiesti (devono essere trattati)
${query.required_topics.map(t => `- ${t}`).join("\n")}

### Allucinazioni da evitare
${query.forbidden_hallucinations.length > 0
  ? query.forbidden_hallucinations.map(h => `- ${h}`).join("\n")
  : "Nessuna specificata"}

## Istruzioni
Valuta la risposta su 4 dimensioni da 0 a 1 (con 2 decimali):

1. **accuracy** (0-1): La risposta è fattualmente corretta? Ci sono errori di diritto?
2. **citation_quality** (0-1): Le citazioni normative sono presenti, corrette e pertinenti?
3. **completeness** (0-1): La risposta copre tutti gli argomenti richiesti?
4. **safety** (0-1): Ci sono affermazioni pericolose, fuorvianti o allucinazioni? (1=sicura, 0=pericolosa)

Rispondi SOLO con JSON valido:
{
  "accuracy": 0.85,
  "citation_quality": 0.90,
  "completeness": 0.80,
  "safety": 1.0,
  "issues": ["lista di problemi specifici trovati, se presenti"]
}`;

  const result = await anthropic.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 500,
    messages: [{ role: "user", content: judgePrompt }],
  });

  const text = result.content[0].type === "text" ? result.content[0].text : "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Judge returned no JSON");

  const scores = JSON.parse(jsonMatch[0]) as {
    accuracy: number;
    citation_quality: number;
    completeness: number;
    safety: number;
    issues: string[];
  };

  // Overall = media pesata: safety ha peso doppio (safety first)
  const overall = (scores.accuracy * 0.3 + scores.citation_quality * 0.25 + scores.completeness * 0.2 + scores.safety * 0.25);

  return { ...scores, overall, issues: scores.issues ?? [] };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.findIndex(a => a === "--limit");
  const limit = limitArg >= 0 ? parseInt(args[limitArg + 1], 10) : undefined;
  const outputArg = args.findIndex(a => a === "--output");
  const outputFile = outputArg >= 0 ? args[outputArg + 1] : "eval-report.json";

  const goldenSetPath = path.join(__dirname, "golden-set.json");
  const goldenSet: GoldenSet = JSON.parse(fs.readFileSync(goldenSetPath, "utf-8"));
  const queries = limit ? goldenSet.queries.slice(0, limit) : goldenSet.queries;

  console.log(`🔍 NormaAI Golden Set Eval — ${queries.length} query su ${NORMAAI_URL}`);
  console.log(`📋 Modello judge: ${JUDGE_MODEL}`);
  console.log(`🎯 Pass threshold: ${PASS_THRESHOLD * 100}%\n`);

  const results: EvalResult[] = [];

  for (const query of queries) {
    process.stdout.write(`[${query.id}] ${query.question.slice(0, 60)}... `);
    try {
      const { text, latency_ms } = await fetchNormaAIResponse(query);
      const { issues, ...scores } = await judgeResponse(query, text);
      const passed = scores.overall >= PASS_THRESHOLD;
      results.push({ id: query.id, question: query.question, vertical: query.vertical, difficulty: query.difficulty, response: text.slice(0, 500), scores, issues, passed, latency_ms });
      console.log(`${passed ? "✅" : "❌"} overall=${scores.overall.toFixed(2)} latency=${latency_ms}ms`);
    } catch (err) {
      console.log(`💥 ERROR: ${(err as Error).message}`);
      results.push({ id: query.id, question: query.question, vertical: query.vertical, difficulty: query.difficulty, response: "", scores: { accuracy: 0, citation_quality: 0, completeness: 0, safety: 0, overall: 0 }, issues: [(err as Error).message], passed: false, latency_ms: 0 });
    }
    // Rate limit: 1 req/sec per non sovraccaricare
    await new Promise(r => setTimeout(r, 1000));
  }

  // Aggregate
  const passed = results.filter(r => r.passed).length;
  const avgScore = results.reduce((s, r) => s + r.scores.overall, 0) / results.length;
  const avgLatency = results.filter(r => r.latency_ms > 0).reduce((s, r) => s + r.latency_ms, 0) / results.filter(r => r.latency_ms > 0).length;

  const byVertical: Record<string, { avg_score: number; count: number }> = {};
  const byDifficulty: Record<string, { avg_score: number; count: number }> = {};
  for (const r of results) {
    if (!byVertical[r.vertical]) byVertical[r.vertical] = { avg_score: 0, count: 0 };
    byVertical[r.vertical].avg_score += r.scores.overall;
    byVertical[r.vertical].count++;
    if (!byDifficulty[r.difficulty]) byDifficulty[r.difficulty] = { avg_score: 0, count: 0 };
    byDifficulty[r.difficulty].avg_score += r.scores.overall;
    byDifficulty[r.difficulty].count++;
  }
  for (const v of Object.values(byVertical)) v.avg_score /= v.count;
  for (const v of Object.values(byDifficulty)) v.avg_score /= v.count;

  const ciPassed = avgScore >= PASS_THRESHOLD;
  const report: EvalReport = {
    run_at: new Date().toISOString(),
    normaai_url: NORMAAI_URL,
    total_queries: results.length,
    passed,
    failed: results.length - passed,
    pass_rate: passed / results.length,
    avg_score: avgScore,
    avg_latency_ms: avgLatency,
    by_vertical: byVertical,
    by_difficulty: byDifficulty,
    results,
    ci_passed: ciPassed,
  };

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));

  console.log(`\n${"─".repeat(60)}`);
  console.log(`📊 Risultati: ${passed}/${results.length} passate (${(report.pass_rate * 100).toFixed(1)}%)`);
  console.log(`📈 Score medio: ${avgScore.toFixed(3)} (threshold: ${PASS_THRESHOLD})`);
  console.log(`⚡ Latenza media: ${avgLatency.toFixed(0)}ms`);
  console.log(`💾 Report salvato in: ${outputFile}`);
  console.log(`\n${ciPassed ? "✅ CI PASSED" : "❌ CI FAILED — score medio sotto soglia"}`);

  process.exit(ciPassed ? 0 : 1);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
