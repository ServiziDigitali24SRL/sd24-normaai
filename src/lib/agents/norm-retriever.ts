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
  // Architettura embedding NormaAI (post-SER-118):
  // - Corpus attuale: 384-dim bge-small su normaai_chunks.embedding (rollback safe)
  // - Corpus nuovo: 1024-dim bge-m3 su normaai_chunks.embedding_bgem3 (Phase 2 in corso)
  // Strategy: usa Infinity bge-m3 OpenAI-compatible API con dimensions=384
  //   (Matryoshka truncation) per match con corpus attuale.
  //   Quando Phase 2 finita + nuovo RPC ready, switcha a 1024-dim full.
  const endpoint = process.env.EMBED_VPS_URL ?? process.env.EMBED_ENDPOINT_URL;
  const apiKey = process.env.NORMAAI_INTERNAL_API_KEY;
  const targetDim = parseInt(process.env.EMBED_DIM ?? "384", 10); // 384 ora, 1024 post-Phase2

  if (!endpoint) {
    return new Array(targetDim).fill(0);
  }
  // Endpoint detection:
  //   - Infinity OpenAI-compat: /embeddings + body {"input":[...], "model":..., "dimensions":N}
  //   - TEI HF: /embed + body {"inputs":[...]}
  //   - Legacy FastEmbed VPS attuale: /embed + body {"texts":[...]}
  const isInfinity = endpoint.includes("embed.normaai.it");
  const isTei = endpoint.includes("/v1") || isInfinity;
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    let url: string;
    let body: string;
    if (isInfinity) {
      // Infinity OpenAI-compatible
      url = `${endpoint}/embeddings`;
      body = JSON.stringify({
        input: [query],
        model: "BAAI/bge-m3",
        dimensions: targetDim,
      });
    } else if (isTei) {
      url = `${endpoint}/embed`;
      body = JSON.stringify({ inputs: [query] });
    } else {
      // Legacy FastEmbed
      url = `${endpoint}/embed`;
      body = JSON.stringify({ texts: [query] });
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`embed ${res.status}`);
    const j = await res.json() as
      | number[][]
      | { data?: Array<{ embedding: number[] }>; embeddings?: number[][] };
    // Infinity OpenAI: { data: [{embedding: [...]}] }
    // TEI: [[...]]
    // Legacy: { data: [...]} or { embeddings: [[...]] }
    if (Array.isArray(j)) return j[0] ?? new Array(targetDim).fill(0);
    return j.data?.[0]?.embedding ?? j.embeddings?.[0] ?? new Array(targetDim).fill(0);
  } catch {
    return new Array(targetDim).fill(0);
  }
}

/**
 * Reranker step: prende N candidate chunks dalla retrieval RPC e li riordina
 * via cross-encoder (bge-reranker-v2-m3) per scoring più accurato query↔chunk.
 *
 * Endpoint: https://rerank.normaai.it/rerank (TEI compat)
 *   POST body: {"query": "...", "texts": ["chunk1", ...]}
 *   Response: [{"index": N, "score": float}, ...] ordered by score desc
 *
 * NDCG@10 atteso post-reranker: ~0.91 vs ~0.78 senza (bench legal IT).
 * Latenza: ~50-150ms per 12 candidates.
 */
async function rerankChunks<T extends { excerpt: string }>(
  query: string,
  candidates: T[],
  topK: number,
): Promise<T[]> {
  const endpoint = process.env.RERANK_URL;
  const apiKey = process.env.NORMAAI_INTERNAL_API_KEY;
  if (!endpoint || candidates.length === 0) return candidates.slice(0, topK);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const res = await fetch(`${endpoint}/rerank`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        texts: candidates.map((c) => c.excerpt.slice(0, 2000)),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`rerank ${res.status}`);
    const ranked = await res.json() as Array<{ index: number; score: number }>;
    // Sort by score desc, take top-K, project back to original objects
    return ranked
      .slice(0, topK)
      .map((r) => candidates[r.index])
      .filter(Boolean);
  } catch {
    // Reranker offline → fallback to retrieval order
    return candidates.slice(0, topK);
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
      // Retrieve 2× topK candidates from RPC, then rerank to topK final.
      const retrievalCount = topK * 2;
      const embedding = await embedQuery(input.query);

      // pgvector cosine search via RPC match_normaai_chunks (production, 8.3M chunks).
      // HNSW PARTIAL per verticale → fan-out parallel se vertical=null.
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
          match_count: retrievalCount,
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
        // Sort by similarity desc and dedup by id (keep retrievalCount for reranking)
        const seen = new Set<string>();
        allRows = allRows
          .sort((a, b) => b.similarity - a.similarity)
          .filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          })
          .slice(0, retrievalCount);
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

      // Map normaai_chunks schema → CitationRef (retrievalCount candidates)
      const candidates: CitationRef[] = allRows.map((r) => ({
        urn: buildUrn(r.fonte),
        title: r.titolo || r.fonte,
        article: extractArticle(r.titolo ?? "", r.chunk ?? ""),
        excerpt: (r.chunk ?? "").slice(0, 600),
        source_chunk_id: r.id,
        verified: r.similarity >= 0.5,
      }));

      // Reranker step (bge-reranker-v2-m3 su GEX44 → https://rerank.normaai.it).
      // Riordina i 2× topK candidates in base alla cross-attention query↔chunk
      // e ritorna i topK più rilevanti. Boost atteso: +13 punti NDCG@10.
      // Fallback: se reranker offline, ritorna candidates[:topK] in ordine similarity.
      const chunks = await rerankChunks(input.query, candidates, topK);

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
