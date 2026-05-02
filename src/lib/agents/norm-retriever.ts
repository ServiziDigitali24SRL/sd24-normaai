// Norm Retriever Agent — RAG dense vector search over normaai_chunks (8.3M rows).
// SER-108 (1 maggio 2026): switched from corpus_chunks (empty) to normaai_chunks (production).
// Embedding: FastEmbed bge-small-en-v1.5 via Hetzner VPS (EMBED_VPS_URL).
// RPC: match_normaai_chunks (existing in production, embedding inline on chunks).

import { createAdminClient } from "@/lib/supabase-admin";
import type { Agent, AgentContext, AgentResult, CitationRef } from "./types";

interface NormRetrieverInput {
  query: string;
  vertical?: string | null;
  topK?: number;
}

interface NormRetrieverOutput {
  chunks: CitationRef[];
  ragContext: string;        // formatted text block to inject in LLM prompt
}

/**
 * Embed the user query with the same model used for normaai_chunks.embedding.
 * Returns a 384-dim vector. Uses FastEmbed bge-small-en-v1.5 served via Hetzner VPS
 * (EMBED_VPS_URL=http://89.167.123.25:8765/embed).
 *
 * Response format: { data: [{ embedding: [0.22, 0.08, ...] }] }
 */
async function embedQuery(query: string): Promise<number[]> {
  // Support both EMBED_VPS_URL (current GEX44 https://embed.normaai.it) and
  // EMBED_ENDPOINT_URL (legacy http://89.167.123.25:8765) for backwards compat.
  const endpoint = process.env.EMBED_VPS_URL ?? process.env.EMBED_ENDPOINT_URL;
  if (!endpoint) {
    // No embedding endpoint configured → graceful degradation (zero vector).
    // Default dim is 384 (legacy bge-small) — bge-m3 returns 1024 but RPC
    // match_normaai_chunks expects 384 today (corpus indexed with bge-small).
    // Re-embedding to bge-m3 1024 is SER-118 (post-rebench).
    return new Array(384).fill(0);
  }
  // Detect new GEX44 endpoint (TEI bge-m3) vs legacy (FastEmbed bge-small).
  // - New: HF TEI POST /embed body {"inputs": [...]} → returns [[float], ...]
  // - Legacy: POST /embed body {"texts": [...]} → returns {data: [{embedding: [...]}]}
  const isTei = endpoint.includes("embed.normaai.it") || endpoint.includes("/v1");
  const apiKey = process.env.NORMAAI_INTERNAL_API_KEY;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const body = isTei
      ? JSON.stringify({ inputs: [query] })
      : JSON.stringify({ texts: [query] });

    const res = await fetch(`${endpoint}/embed`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`embed ${res.status}`);
    const j = await res.json() as
      | number[][]
      | { data?: Array<{ embedding: number[] }>; embeddings?: number[][] };
    // TEI returns [[...]] directly
    if (Array.isArray(j)) return j[0] ?? new Array(384).fill(0);
    // Legacy returns { data: [{embedding: [...]}] } or { embeddings: [[...]] }
    return j.data?.[0]?.embedding ?? j.embeddings?.[0] ?? new Array(384).fill(0);
  } catch {
    return new Array(384).fill(0);
  }
}

/**
 * Extract article reference from titolo (e.g. "L. 604/1966 - art. 6" → "art. 6")
 * or from chunk text first 200 chars (looks for "art. N" / "articolo N").
 */
function extractArticle(titolo: string, chunk: string): string | null {
  // Try titolo first
  const titoloMatch = titolo.match(/\bart(?:icolo|\.)\s*(\d+(?:[\-\s]?(?:bis|ter|quater|quinquies))?)/i);
  if (titoloMatch) return `art. ${titoloMatch[1]}`;
  // Fallback: first 200 chars of chunk
  const chunkMatch = chunk.slice(0, 200).match(/\bart(?:icolo|\.)\s*(\d+(?:[\-\s]?(?:bis|ter|quater|quinquies))?)/i);
  if (chunkMatch) return `art. ${chunkMatch[1]}`;
  return null;
}

/**
 * Build URN from fonte field. Best-effort.
 * Examples: "L. 604/1966" → "urn:nir:stato:legge:1966-07-15;604"
 *           "D.Lgs. 36/2023" → "urn:nir:stato:decreto.legislativo:2023;36"
 */
function buildUrn(fonte: string): string {
  // Just return the fonte string — it already serves as a unique reference
  // for citation purposes. Real URN construction would need a NIR mapper.
  return fonte || "";
}

export const normRetrieverAgent: Agent<NormRetrieverInput, NormRetrieverOutput> = {
  name: "norm-retriever",

  async run(input, ctx: AgentContext): Promise<AgentResult<NormRetrieverOutput>> {
    const t0 = Date.now();
    ctx.emit({ agent: "norm-retriever", state: "started" });

    try {
      const topK = input.topK ?? 6;
      const embedding = await embedQuery(input.query);

      // pgvector cosine search via RPC match_normaai_chunks (production, 8.3M chunks).
      // Embedding inline on normaai_chunks.embedding (384-dim, bge-small-en-v1.5).
      //
      // ⚠️ The HNSW index is PARTIAL per verticale (lavoro, edilizia, finanziario,
      // avvocato, commercialista, generale). Without filter_verticale the query
      // does a full table scan on 8.3M rows → timeout. So when vertical is null
      // we fan-out across the 4 main verticals in parallel and merge top-K.
      //
      // Returned schema: id, fonte, tipo, titolo, chunk, url, verticale, data, similarity
      const sb = createAdminClient();

      type ChunkRow = {
        id: string;
        fonte: string;
        tipo: string;
        titolo: string;
        chunk: string;
        url: string | null;
        verticale: string | null;
        data: string | null;
        similarity: number;
      };

      const callRpc = async (verticale: string | null) => {
        const { data, error } = await sb.rpc("match_normaai_chunks", {
          query_embedding: embedding,
          match_count: topK,
          match_threshold: 0.10,
          filter_verticale: verticale,
          filter_tipo: null,
          only_vigente: false,
        });
        if (error) return { rows: [] as ChunkRow[], err: error };
        return { rows: (data ?? []) as ChunkRow[], err: null };
      };

      let allRows: ChunkRow[] = [];
      let lastError: { code?: string; message?: string } | null = null;

      if (input.vertical) {
        // Specific vertical → single fast indexed query
        const r = await callRpc(input.vertical);
        if (r.err) lastError = r.err;
        allRows = r.rows;
      } else {
        // Fan-out across the 4 main verticals (HNSW index covers each)
        const verticals = ["lavoro", "edilizia", "avvocato", "commercialista"];
        const results = await Promise.all(verticals.map((v) => callRpc(v)));
        for (const r of results) {
          if (r.err && !lastError) lastError = r.err;
          allRows.push(...r.rows);
        }
        // Sort by similarity desc and dedup by id
        const seen = new Set<string>();
        allRows = allRows
          .sort((a, b) => b.similarity - a.similarity)
          .filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          })
          .slice(0, topK);
      }

      if (lastError && allRows.length === 0) {
        // All RPC calls failed → graceful degradation
        ctx.emit({
          agent: "norm-retriever",
          state: "done",
          durationMs: Date.now() - t0,
          output: `RAG non disponibile (${lastError.code ?? "rpc_error"}: ${lastError.message ?? ""}); LLM only`,
        });
        return { ok: true, data: { chunks: [], ragContext: "" } };
      }

      // Map normaai_chunks schema → CitationRef
      let chunks: CitationRef[] = allRows.map((r) => ({
        urn: buildUrn(r.fonte),
        title: r.titolo || r.fonte,
        article: extractArticle(r.titolo ?? "", r.chunk ?? ""),
        excerpt: (r.chunk ?? "").slice(0, 600),
        source_chunk_id: r.id,
        verified: r.similarity >= 0.5, // higher threshold = more confident match
      }));

      // Optional rerank step. Skipped gracefully when RERANK_ENDPOINT_URL is unset
      // (e.g. before GEX44 is provisioned). When set, re-orders chunks via
      // bge-reranker-v2-m3 self-hosted on GEX44 and keeps the top topK.
      const rerankUrl = process.env.RERANK_ENDPOINT_URL;
      if (rerankUrl && chunks.length > 0) {
        try {
          const rr = await fetch(`${rerankUrl}/rerank`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: input.query,
              documents: chunks.map(c => c.excerpt),
              top_n: topK,
            }),
            signal: AbortSignal.timeout(2000),
          });
          if (rr.ok) {
            const rj = await rr.json() as { results?: Array<{ index: number; score: number }> };
            if (rj.results?.length) {
              chunks = rj.results.map(r => chunks[r.index]).filter(Boolean);
            }
          }
        } catch {
          // Reranker offline → keep dense order, no degradation
        }
      }

      const ragContext = chunks
        .map((c, i) => `[Fonte ${i + 1}] ${c.title}${c.article ? `, ${c.article}` : ""}\n${c.excerpt}`)
        .join("\n\n---\n\n");

      ctx.emit({
        agent: "norm-retriever",
        state: "done",
        durationMs: Date.now() - t0,
        output: `${chunks.length} norme trovate`,
      });

      return { ok: true, data: { chunks, ragContext } };
    } catch (err) {
      ctx.emit({
        agent: "norm-retriever",
        state: "error",
        durationMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
};
