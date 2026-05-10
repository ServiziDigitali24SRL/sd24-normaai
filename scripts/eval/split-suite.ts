#!/usr/bin/env tsx
/**
 * Split golden-set.json into knowledge vs date-fact suites.
 *
 * Knowledge → no time-pegged numeric facts → RAG-only quality eval
 * Date-fact → numbers/thresholds pegged to a year → needs a dedicated tool
 *             (web_search or date-filtered sub-corpus); skip from RAG eval to
 *             avoid attributing knowledge-cutoff failures to the retriever.
 *
 * Run:
 *   tsx scripts/eval/split-suite.ts
 *   tsx scripts/eval/split-suite.ts --input scripts/golden-set-eval/golden-set.json
 */

import fs from "fs";
import path from "path";

import { classifyDateFact } from "../../src/lib/eval/date-fact-detector";

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
  _meta: Record<string, unknown>;
  queries: GoldenQuery[];
}

function main() {
  const args = process.argv.slice(2);
  const idx = (k: string) => args.indexOf(k);
  const inputFile = idx("--input") >= 0
    ? args[idx("--input") + 1]
    : path.resolve("scripts/golden-set-eval/golden-set.json");

  const data = JSON.parse(fs.readFileSync(inputFile, "utf-8")) as GoldenSet;
  const knowledge: GoldenQuery[] = [];
  const fact: GoldenQuery[] = [];
  const reasons: { id: string; reason: string | null; bucket: "fact" | "knowledge" }[] = [];

  for (const q of data.queries) {
    const c = classifyDateFact(q.question, q.vertical);
    if (c.isDateFact) {
      fact.push(q);
      reasons.push({ id: q.id, reason: c.reason, bucket: "fact" });
    } else {
      knowledge.push(q);
      reasons.push({ id: q.id, reason: c.reason, bucket: "knowledge" });
    }
  }

  const baseDir = path.dirname(inputFile);
  const knowledgeFile = path.join(baseDir, "golden-knowledge.json");
  const factFile = path.join(baseDir, "golden-fact.json");

  const meta = data._meta ?? {};
  fs.writeFileSync(
    knowledgeFile,
    JSON.stringify({ _meta: { ...meta, split: "knowledge", parent: path.basename(inputFile) }, queries: knowledge }, null, 2),
  );
  fs.writeFileSync(
    factFile,
    JSON.stringify({ _meta: { ...meta, split: "date-fact", parent: path.basename(inputFile) }, queries: fact }, null, 2),
  );

  console.log(`Split ${data.queries.length} queries:`);
  console.log(`  knowledge -> ${knowledge.length} -> ${path.relative(process.cwd(), knowledgeFile)}`);
  console.log(`  date-fact -> ${fact.length} -> ${path.relative(process.cwd(), factFile)}`);
  console.log("\nDate-fact queries:");
  for (const r of reasons.filter((x) => x.bucket === "fact")) {
    const q = data.queries.find((x) => x.id === r.id)!;
    console.log(`  ${q.id} ${q.vertical.padEnd(13)} ${q.question.slice(0, 80)}`);
    console.log(`         reason: ${r.reason}`);
  }
}

main();
