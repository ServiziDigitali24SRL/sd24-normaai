#!/usr/bin/env tsx
/**
 * recall@k via chunk_id-match — workaround for the URL-match strategy that
 * needs a (currently missing) index on `normaai_chunks(url)`.
 *
 * Strategy:
 *  - Source of queries: scripts/golden-set-eval/golden-set.json (canonical).
 *    Each query has `expected_citations` (e.g. ["L. 604/1966", "art. 2103 c.c."]).
 *  - Bronze ground-truth: for each citation, RPC `corpus_simple_fts(citation, 10)`
 *    → top-10 chunk_ids that the FTS index considers relevant to that citation.
 *    Union across citations = bronze ground-truth set per query.
 *  - Retrieved set: `hybrid_search_chunks_v2(question_embedding, question, ...)`
 *    → top-K chunk_ids returned by the production retriever.
 *  - Metrics:
 *      recall@k = |top_k ∩ ground_truth| / max(1, |ground_truth|)
 *      MRR     = 1 / rank_of_first_hit  (0 if no hit in top-K_max)
 *
 * Caveat: bronze ground-truth is FTS-derived, so the metric is biased toward
 * lexical overlap — it under-credits the dense path's semantic gains. Use as
 * a "is hybrid at least as good as FTS-only" sanity floor; replace with chunk-
 * id–annotated gold when Tab 2 lands eval.itacasehold_gold + chunk linkage.
 *
 * Run:
 *   SUPABASE_SERVICE_ROLE_KEY=... EMBED_API_KEY=... \
 *     tsx scripts/eval/recall-at-k-chunkid.ts --limit 50 --output recall-at-k-chunkid.json
 */

import fs from "fs";

const SUPA_URL = process.env.SUPABASE_URL ?? "https://rjwaegzdfsdlnbijkark.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EMBED_URL = process.env.EMBED_VPS_URL ?? "https://embed.normaai.it";
const EMBED_KEY = process.env.EMBED_API_KEY ?? "";
const EMBED_DIM = parseInt(process.env.EMBED_DIM ?? "1024", 10);

interface GoldQuery {
  id: string;
  vertical: string;
  question: string;
  expected_citations: string[];
  required_topics: string[];
  difficulty: string;
}

async function rpc(name: string, args: Record<string, unknown>): Promise<unknown[]> {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`rpc ${name} ${r.status} ${(await r.text()).slice(0, 160)}`);
  return r.json() as Promise<unknown[]>;
}

async function embedQuery(text: string): Promise<number[]> {
  const r = await fetch(`${EMBED_URL}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${EMBED_KEY}` },
    body: JSON.stringify({ input: [text], model: "BAAI/bge-m3" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`embed ${r.status}`);
  const j = (await r.json()) as { data?: { embedding: number[] }[]; embeddings?: number[][] };
  const vec = j.data?.[0]?.embedding ?? j.embeddings?.[0];
  if (!vec || vec.length !== EMBED_DIM) throw new Error(`embed dim ${vec?.length} != ${EMBED_DIM}`);
  return vec;
}

async function bronzeGroundTruth(q: GoldQuery, perCitationLimit = 10): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const cit of q.expected_citations) {
    if (!cit?.trim()) continue;
    try {
      const rows = (await rpc("corpus_simple_fts", { query_text: cit, match_count: perCitationLimit })) as { id: string }[];
      for (const r of rows) ids.add(r.id);
    } catch (e) {
      // Skip citation on RPC error; record absence rather than abort
      console.warn(`  bronze fts fail for "${cit.slice(0, 40)}": ${(e as Error).message}`);
    }
  }
  return ids;
}

async function retrievedTopK(q: GoldQuery, k: number): Promise<string[]> {
  const emb = await embedQuery(q.question);
  const rows = (await rpc("hybrid_search_chunks_v2", {
    query_embedding: emb,
    query_text: q.question,
    match_vertical: null,
    match_count: k,
    candidate_count: Math.max(k * 3, 30),
  })) as { id: string }[];
  return rows.map((r) => r.id);
}

interface RowReport {
  id: string;
  vertical: string;
  difficulty: string;
  question: string;
  ground_truth_n: number;
  retrieved_n: number;
  recall_at_k: Record<string, number>;
  hits_at_k: Record<string, number>;
  first_hit_rank: number | null;
  reciprocal_rank: number;
}

async function evaluate(queries: GoldQuery[], ks: number[]): Promise<RowReport[]> {
  const maxK = Math.max(...ks);
  const reports: RowReport[] = [];
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    process.stdout.write(`[${i + 1}/${queries.length}] ${q.id} ${q.vertical.padEnd(13)} `);
    try {
      const [gt, retrieved] = await Promise.all([
        bronzeGroundTruth(q),
        retrievedTopK(q, maxK),
      ]);
      const recall: Record<string, number> = {};
      const hits: Record<string, number> = {};
      for (const k of ks) {
        const top = retrieved.slice(0, k);
        const hitN = top.filter((id) => gt.has(id)).length;
        hits[`@${k}`] = hitN;
        recall[`@${k}`] = gt.size > 0 ? hitN / gt.size : 0;
      }
      const firstHitRank = retrieved.findIndex((id) => gt.has(id));
      const rr = firstHitRank >= 0 ? 1 / (firstHitRank + 1) : 0;
      reports.push({
        id: q.id,
        vertical: q.vertical,
        difficulty: q.difficulty,
        question: q.question.slice(0, 100),
        ground_truth_n: gt.size,
        retrieved_n: retrieved.length,
        recall_at_k: recall,
        hits_at_k: hits,
        first_hit_rank: firstHitRank >= 0 ? firstHitRank + 1 : null,
        reciprocal_rank: rr,
      });
      console.log(`gt=${gt.size} ret=${retrieved.length} ` + ks.map((k) => `r@${k}=${recall[`@${k}`].toFixed(2)}`).join(" ") + ` rr=${rr.toFixed(2)}`);
    } catch (e) {
      console.log(`ERR ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return reports;
}

function aggregate(reports: RowReport[], ks: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of ks) {
    const vals = reports.map((r) => r.recall_at_k[`@${k}`]).filter((v) => typeof v === "number");
    out[`recall@${k}`] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }
  out.MRR = reports.length ? reports.reduce((s, r) => s + r.reciprocal_rank, 0) / reports.length : 0;
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const idx = (k: string) => args.indexOf(k);
  const ks = (idx("--k") >= 0 ? args[idx("--k") + 1] : "5,10,20").split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => n > 0);
  const limit = idx("--limit") >= 0 ? parseInt(args[idx("--limit") + 1], 10) : 50;
  const inputFile = idx("--input") >= 0 ? args[idx("--input") + 1] : "scripts/golden-set-eval/golden-set.json";
  const outFile = idx("--output") >= 0 ? args[idx("--output") + 1] : "recall-at-k-chunkid.json";

  if (!SUPA_KEY || !EMBED_KEY) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY + EMBED_API_KEY required");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputFile, "utf-8")) as { queries: GoldQuery[] };
  const queries = data.queries.slice(0, limit);
  console.log(`recall@${ks.join(",")} chunk_id-match — ${queries.length}/${data.queries.length} from ${inputFile}`);

  const reports = await evaluate(queries, ks);
  const agg = aggregate(reports, ks);

  fs.writeFileSync(outFile, JSON.stringify({
    run_at: new Date().toISOString(),
    method: "bronze-ft-ground-truth + chunk_id intersection",
    retriever: "hybrid_search_chunks_v2 (linear sim*0.7+fts*0.3)",
    embedder: "bge-m3 1024d",
    ground_truth_source: "corpus_simple_fts on each expected_citation, top-10",
    n_queries: reports.length,
    ks,
    aggregate: agg,
    reports,
  }, null, 2));

  console.log(`\n${"-".repeat(60)}`);
  console.log("Aggregate:");
  for (const k of ks) console.log(`  recall@${k} = ${agg[`recall@${k}`].toFixed(3)}`);
  console.log(`  MRR        = ${agg.MRR.toFixed(3)}`);
  console.log(`saved: ${outFile}`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
