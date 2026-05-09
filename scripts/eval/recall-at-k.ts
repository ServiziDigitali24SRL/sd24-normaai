#!/usr/bin/env tsx
/**
 * recall@k baseline — ITA-CASEHOLD gold set against hybrid_search_chunks_v2.
 *
 * Tab 2 is ingesting `eval.itacasehold_gold` (~1101 TAR/CdS docs full text).
 * This script computes recall@k at multiple k values for the production
 * retriever (hybrid_search_chunks_v2 RPC) so we have a baseline before any
 * SQ-RAG agent improvements land.
 *
 * Schema assumption (verify with Tab 2 once table is live):
 *   eval.itacasehold_gold
 *     - id            text         primary key
 *     - query_text    text         the legal question
 *     - gold_doc_ids  text[]       relevant chunk/doc ids
 *     - vertical      text         legal vertical (optional)
 *     - source_url    text         original TAR/CdS URL (optional)
 *
 * If the schema differs, adjust the SELECT in `loadGold()` and the join/match
 * logic in `evaluate()`. Re-run when ready.
 *
 * Usage:
 *   tsx scripts/eval/recall-at-k.ts --k 5,10,20 --limit 100 --output recall-baseline.json
 */

const SUPA_URL = process.env.SUPABASE_URL ?? "https://rjwaegzdfsdlnbijkark.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EMBED_URL = process.env.EMBED_VPS_URL ?? "https://embed.normaai.it";
const EMBED_KEY = process.env.EMBED_API_KEY ?? "";
const EMBED_DIM = parseInt(process.env.EMBED_DIM ?? "1024", 10);

interface GoldRow {
  id: string;
  query_text: string;
  gold_doc_ids: string[];
  vertical: string | null;
}

async function supabase(method: string, path: string, body?: unknown): Promise<unknown> {
  const r = await fetch(`${SUPA_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      "Accept-Profile": "eval", // ← schema=eval
      "Content-Profile": "eval",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`supabase ${method} ${path} ${r.status} ${await r.text().catch(() => "")}`);
  return r.json();
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
  if (!r.ok) throw new Error(`rpc ${name} ${r.status} ${await r.text().catch(() => "")}`);
  return r.json() as Promise<unknown[]>;
}

async function embedQuery(text: string): Promise<number[]> {
  const r = await fetch(`${EMBED_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${EMBED_KEY}`,
    },
    body: JSON.stringify({ input: [text], model: "BAAI/bge-m3" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`embed ${r.status}`);
  const j = (await r.json()) as { data?: { embedding: number[] }[]; embeddings?: number[][] };
  const vec = j.data?.[0]?.embedding ?? j.embeddings?.[0];
  if (!vec || vec.length !== EMBED_DIM) {
    throw new Error(`embed dim ${vec?.length} != ${EMBED_DIM}`);
  }
  return vec;
}

async function loadGold(limit?: number): Promise<GoldRow[]> {
  const lim = limit ? `&limit=${limit}` : "";
  const data = (await supabase("GET", `/itacasehold_gold?select=id,query_text,gold_doc_ids,vertical&order=id.asc${lim}`)) as GoldRow[];
  return data;
}

interface EvalRow {
  id: string;
  query: string;
  vertical: string | null;
  gold_n: number;
  retrieved_ids: string[];
  hits_at_k: Record<string, number>;
  recall_at_k: Record<string, number>;
}

async function evaluate(rows: GoldRow[], ks: number[]): Promise<EvalRow[]> {
  const maxK = Math.max(...ks);
  const results: EvalRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const g = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] ${g.id} ... `);
    try {
      const emb = await embedQuery(g.query_text);
      const ret = (await rpc("hybrid_search_chunks_v2", {
        query_embedding: emb,
        query_text: g.query_text,
        match_vertical: g.vertical,
        match_count: maxK,
        candidate_count: Math.max(maxK * 3, 30),
      })) as { id: string }[];
      const retrievedIds = ret.map((r) => r.id);
      const goldSet = new Set(g.gold_doc_ids ?? []);
      const hits_at_k: Record<string, number> = {};
      const recall_at_k: Record<string, number> = {};
      for (const k of ks) {
        const topk = retrievedIds.slice(0, k);
        const hits = topk.filter((id) => goldSet.has(id)).length;
        hits_at_k[`@${k}`] = hits;
        recall_at_k[`@${k}`] = goldSet.size > 0 ? hits / goldSet.size : 0;
      }
      results.push({
        id: g.id,
        query: g.query_text.slice(0, 100),
        vertical: g.vertical,
        gold_n: goldSet.size,
        retrieved_ids: retrievedIds.slice(0, maxK),
        hits_at_k,
        recall_at_k,
      });
      console.log(ks.map((k) => `r@${k}=${recall_at_k[`@${k}`].toFixed(2)}`).join(" "));
    } catch (err) {
      console.log(`ERR ${(err as Error).message}`);
    }
  }
  return results;
}

function aggregate(results: EvalRow[], ks: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of ks) {
    const vals = results.map((r) => r.recall_at_k[`@${k}`]).filter((v) => typeof v === "number");
    out[`recall@${k}`] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const idx = (k: string) => args.indexOf(k);
  const ks = (idx("--k") >= 0 ? args[idx("--k") + 1] : "5,10,20")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => n > 0);
  const limit = idx("--limit") >= 0 ? parseInt(args[idx("--limit") + 1], 10) : undefined;
  const outFile = idx("--output") >= 0 ? args[idx("--output") + 1] : "recall-at-k-baseline.json";

  if (!SUPA_KEY) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY missing");
    process.exit(1);
  }

  const gold = await loadGold(limit);
  if (gold.length === 0) {
    console.error("eval.itacasehold_gold is empty (Tab 2 ingestion not landed yet?). Run again when populated.");
    process.exit(2);
  }
  console.log(`recall@${ks.join(",")} on ${gold.length} ITA-CASEHOLD gold queries (hybrid_search_chunks_v2)\n`);

  const results = await evaluate(gold, ks);
  const agg = aggregate(results, ks);

  const report = {
    run_at: new Date().toISOString(),
    retriever: "hybrid_search_chunks_v2 (linear weighted sim*0.7+fts*0.3)",
    embedder: "bge-m3 1024d via embed.normaai.it",
    n_queries: results.length,
    ks,
    aggregate: agg,
    results,
  };
  await import("fs").then((fs) => fs.writeFileSync(outFile, JSON.stringify(report, null, 2)));

  console.log(`\n${"-".repeat(60)}`);
  console.log("Aggregate recall:");
  for (const k of ks) console.log(`  recall@${k} = ${agg[`recall@${k}`].toFixed(3)}`);
  console.log(`saved: ${outFile}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
