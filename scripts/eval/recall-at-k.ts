#!/usr/bin/env tsx
/**
 * recall@k baseline — ITA-CASEHOLD gold against hybrid_search_chunks_v2 (PROD retriever).
 *
 * Real schema of eval.itacasehold_gold (Tab 2 verified 2026-05-09):
 *   id            bigint     primary key
 *   split         text       train / val / test
 *   url           text       canonical URL of the original sentence (TAR/CdS)
 *   title         text       sentence title (e.g. "TAR Lazio sez. III 2024-...")
 *   doc           text       full document text
 *   summary       text       canonical legal "holding" / massima
 *   materia       text       legal vertical
 *   source_dataset text      provenance
 *   license       text       license string
 *   inserted_at   timestamptz
 *
 * NOTE: schema is dataset-only (no query+gold_doc_ids fields). To compute
 * recall@k we need a query↔gold mapping. Two strategies, both implemented:
 *
 *   1. --query=summary  : use `summary` (legal holding) as the query. Hit if
 *                         any top-k chunk has the SAME `url` as the gold row.
 *                         Coverage requires Tab 2 to have ingested these docs
 *                         into normaai_chunks with `url` = gold.url. Verified
 *                         pre-run via a count query.
 *   2. --query=title    : use `title` as the query. Same hit definition.
 *
 * If normaai_chunks does NOT have url-matching rows for the gold set, recall
 * is structurally 0; we exit with an error message pointing at the missing
 * coverage rather than emit a meaningless 0.0 score.
 *
 * Pre-requisite (blocker as of 2026-05-09):
 *   PostgREST default config exposes only {public, storage, graphql_public,
 *   studio}. To run this script, schema `eval` must be exposed (Supabase
 *   dashboard Settings > API > Exposed Schemas) OR a public view created:
 *     CREATE VIEW public.itacasehold_gold_view AS
 *       SELECT id, split, url, title, summary, materia FROM eval.itacasehold_gold;
 *   Coordinate with Tab 2 — they own this surface.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... EMBED_API_KEY=... \
 *     tsx scripts/eval/recall-at-k.ts --k 5,10,20 --limit 100 --query summary
 */

const SUPA_URL = process.env.SUPABASE_URL ?? "https://rjwaegzdfsdlnbijkark.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const EMBED_URL = process.env.EMBED_VPS_URL ?? "https://embed.normaai.it";
const EMBED_KEY = process.env.EMBED_API_KEY ?? "";
const EMBED_DIM = parseInt(process.env.EMBED_DIM ?? "1024", 10);

interface GoldRow {
  id: number;
  split: string | null;
  url: string | null;
  title: string | null;
  summary: string | null;
  materia: string | null;
}

async function supaGet(path: string, schema: string = "public"): Promise<unknown[]> {
  const r = await fetch(`${SUPA_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Accept-Profile": schema,
      "Content-Type": "application/json",
    },
  });
  if (!r.ok) throw new Error(`supabase GET ${path} ${r.status} ${await r.text().catch(() => "")}`);
  return r.json() as Promise<unknown[]>;
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

async function loadGold(limit?: number): Promise<GoldRow[]> {
  const lim = limit ? `&limit=${limit}` : "";
  const data = (await supaGet(
    `/itacasehold_gold?select=id,split,url,title,summary,materia&order=id.asc${lim}`,
    "eval",
  )) as GoldRow[];
  return data;
}

async function checkCorpusCoverage(goldUrls: string[]): Promise<number> {
  if (goldUrls.length === 0) return 0;
  // Count rows in normaai_chunks whose url matches any gold url.
  // PostgREST in.() with many strings can be slow; sample 50.
  const sample = goldUrls.slice(0, 50);
  const inList = sample.map((u) => `"${u.replace(/"/g, "")}"`).join(",");
  try {
    const r = (await supaGet(
      `/normaai_chunks?select=count&url=in.(${encodeURIComponent(inList)})`,
    )) as { count: number }[];
    return r[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

interface EvalRow {
  gold_id: number;
  gold_url: string | null;
  query: string;
  vertical: string | null;
  retrieved_urls: string[];
  hits_at_k: Record<string, 0 | 1>;
}

async function evaluate(rows: GoldRow[], ks: number[], queryField: "summary" | "title"): Promise<EvalRow[]> {
  const maxK = Math.max(...ks);
  const results: EvalRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const g = rows[i];
    const queryText = queryField === "summary" ? (g.summary ?? g.title ?? "") : (g.title ?? "");
    if (!queryText || !g.url) {
      console.log(`  [${i + 1}/${rows.length}] gold_id=${g.id} skipped (missing ${queryField} or url)`);
      continue;
    }
    process.stdout.write(`  [${i + 1}/${rows.length}] id=${g.id} ... `);
    try {
      const emb = await embedQuery(queryText);
      const ret = (await rpc("hybrid_search_chunks_v2", {
        query_embedding: emb,
        query_text: queryText,
        match_vertical: g.materia,
        match_count: maxK,
        candidate_count: Math.max(maxK * 3, 30),
      })) as { url: string | null }[];
      const retrievedUrls = ret.map((r) => r.url).filter((u): u is string => Boolean(u));
      const hits_at_k: Record<string, 0 | 1> = {};
      for (const k of ks) {
        const topk = retrievedUrls.slice(0, k);
        hits_at_k[`@${k}`] = topk.includes(g.url) ? 1 : 0;
      }
      results.push({
        gold_id: g.id,
        gold_url: g.url,
        query: queryText.slice(0, 100),
        vertical: g.materia,
        retrieved_urls: retrievedUrls.slice(0, maxK),
        hits_at_k,
      });
      console.log(ks.map((k) => `@${k}=${hits_at_k[`@${k}`]}`).join(" "));
    } catch (err) {
      console.log(`ERR ${(err as Error).message}`);
    }
  }
  return results;
}

function aggregate(results: EvalRow[], ks: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of ks) {
    const vals = results.map((r) => r.hits_at_k[`@${k}`]);
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
  const queryField = (idx("--query") >= 0 ? args[idx("--query") + 1] : "summary") as "summary" | "title";
  const outFile = idx("--output") >= 0 ? args[idx("--output") + 1] : "recall-at-k-baseline.json";

  if (!SUPA_KEY || !EMBED_KEY) {
    console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY and EMBED_API_KEY required");
    process.exit(1);
  }

  console.log(`recall@${ks.join(",")} on eval.itacasehold_gold (query=${queryField}) vs hybrid_search_chunks_v2`);

  const gold = await loadGold(limit);
  if (gold.length === 0) {
    console.error("\n  eval.itacasehold_gold is empty (Tab 2 ingestion not landed yet). Re-run when populated.");
    process.exit(2);
  }
  console.log(`  loaded ${gold.length} gold rows`);

  const goldUrls = gold.map((g) => g.url).filter((u): u is string => Boolean(u));
  const coverage = await checkCorpusCoverage(goldUrls);
  console.log(`  normaai_chunks rows whose url matches a gold url (sample 50): ${coverage}`);
  if (coverage === 0) {
    console.error(
      "\n  No url-match between gold set and normaai_chunks. Either Tab 2 has not yet\n" +
      "  ingested these docs into the chunked corpus, or the join key is not `url`.\n" +
      "  Coordinate with Tab 2 on the doc -> chunks linkage before re-running.",
    );
    process.exit(3);
  }

  const results = await evaluate(gold, ks, queryField);
  const agg = aggregate(results, ks);

  const fs = await import("fs");
  const report = {
    run_at: new Date().toISOString(),
    retriever: "hybrid_search_chunks_v2 (linear weighted sim*0.7+fts*0.3)",
    embedder: "bge-m3 1024d via embed.normaai.it",
    query_field: queryField,
    n_queries: results.length,
    n_gold: gold.length,
    coverage_sample_50: coverage,
    ks,
    aggregate: agg,
    results,
  };
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log(`\n${"-".repeat(60)}`);
  console.log("Aggregate recall:");
  for (const k of ks) console.log(`  recall@${k} = ${agg[`recall@${k}`].toFixed(3)}`);
  console.log(`saved: ${outFile}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
