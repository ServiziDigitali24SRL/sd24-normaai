// Norm Retriever Agent — RAG hybrid (dense + FTS) over normaai_chunks (8.3M rows).
// SER-157 / SER-162 (9 maggio 2026): re-enabled dense path via hybrid_search_chunks_v2
// RPC (uses embedding_bgem3 1024d, linear weighted sim*0.7 + fts*0.3 server-side).
// Fallback: corpus_simple_fts (FTS-only, sub-second on 8.3M rows) when embed unavailable.

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
 * Custom error class — distinguishes embedding failures from generic errors so
 * the orchestrator can degrade gracefully (LLM-only) instead of returning
 * random chunks via a zero-vector cosine search.
 */
export class EmbeddingUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "EmbeddingUnavailableError";
  }
}

/**
 * Embed the user query with the same model used for normaai_chunks.embedding.
 * Returns a 384-dim vector (or 1024-dim after Phase 2 RPC switch).
 *
 * IMPORTANT — anti-hallucination guard:
 * Previous implementation returned `[0, 0, ..., 0]` on any failure, which made
 * pgvector cosine similarity rank every chunk by raw norm → effectively
 * random results presented as authoritative legal answers.
 *
 * New behaviour: throw EmbeddingUnavailableError so the agent skips RAG
 * entirely. Caller decides what to do (graceful LLM-only fallback, or 503).
 */
async function embedQuery(query: string): Promise<number[]> {
  // Provider priority:
  //   1. Ollama on GEX44 via Tailscale  (OLLAMA_EMBED_URL, e.g. http://100.x.x.x:11434)
  //      → free, fast, GPU-accelerated, no audit-trail outside our network
  //   2. Legacy embedding endpoint     (EMBED_VPS_URL — bge-small VPS or Infinity bge-m3)
  //
  // Switch to Ollama when re-embedding corpus completes; until then both must
  // produce dimension-compatible vectors with normaai_chunks.embedding.
  const ollamaUrl = process.env.OLLAMA_EMBED_URL;
  const ollamaModel = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
  const endpoint = process.env.EMBED_VPS_URL ?? process.env.EMBED_ENDPOINT_URL;
  const apiKey = process.env.NORMAAI_INTERNAL_API_KEY;
  // 1024 = bge-m3 native dim. `_v2` RPCs query `embedding_bgem3` column.
  // Re-embed status tracked: SER-122.
  const targetDim = parseInt(process.env.EMBED_DIM ?? "1024", 10);

  if (!ollamaUrl && !endpoint) {
    throw new EmbeddingUnavailableError(
      "No embedding endpoint configured (set OLLAMA_EMBED_URL or EMBED_VPS_URL) — refusing zero-vector fallback.",
    );
  }

  // Select provider
  type Provider = "ollama" | "infinity" | "tei" | "legacy";
  let provider: Provider;
  let url: string;
  let body: string;
  if (ollamaUrl) {
    provider = "ollama";
    url = `${ollamaUrl}/api/embeddings`;
    body = JSON.stringify({ model: ollamaModel, prompt: query });
  } else if (endpoint!.includes("embed.normaai.it")) {
    provider = "infinity";
    url = `${endpoint}/embeddings`;
    // bge-m3 native 1024 to match `embedding_bgem3` column queried by `_v2` RPCs.
    body = JSON.stringify({
      input: [query],
      model: "BAAI/bge-m3",
    });
  } else if (endpoint!.includes("/v1")) {
    provider = "tei";
    url = `${endpoint}/embed`;
    body = JSON.stringify({ inputs: [query] });
  } else {
    provider = "legacy";
    url = `${endpoint}/embed`;
    body = JSON.stringify({ texts: [query] });
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new EmbeddingUnavailableError(`embed ${res.status} ${res.statusText}`);
    }
    const j = (await res.json()) as
      | number[][]
      | { data?: Array<{ embedding: number[] }>; embeddings?: number[][] }
      | { embedding: number[] };

    let vec: number[] | undefined;
    if (provider === "ollama") {
      // Ollama native shape: { embedding: [...] }
      vec = (j as { embedding: number[] }).embedding;
    } else if (Array.isArray(j)) {
      vec = j[0];
    } else {
      const obj = j as { data?: Array<{ embedding: number[] }>; embeddings?: number[][] };
      vec = obj.data?.[0]?.embedding ?? obj.embeddings?.[0];
    }

    if (!vec || vec.length === 0) {
      throw new EmbeddingUnavailableError("Embedding endpoint returned empty vector");
    }
    // For Ollama nomic-embed-text we accept whatever dim the model produces
    // (768 native). When the corpus is re-embedded with the same model the
    // dim will match the column. For now, only enforce on legacy providers.
    if (provider !== "ollama" && vec.length !== targetDim) {
      throw new EmbeddingUnavailableError(
        `Embedding dim mismatch: got ${vec.length}, expected ${targetDim}`,
      );
    }
    // Defensive: a vector of all zeros is useless for cosine search
    const isZeroVec = vec.every((x) => x === 0);
    if (isZeroVec) {
      throw new EmbeddingUnavailableError("Embedding endpoint returned zero vector");
    }
    return vec;
  } catch (err) {
    if (err instanceof EmbeddingUnavailableError) throw err;
    throw new EmbeddingUnavailableError(
      err instanceof Error ? err.message : String(err),
      err,
    );
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

      // Hybrid retrieval: try embed with hard timeout; on success call
      // hybrid_search_chunks_v2 (dense+FTS fused inside Postgres). On any
      // failure, fall back gracefully to corpus_simple_fts (FTS-only).
      // No zero-vector fallback — see EmbeddingUnavailableError above.
      const sb = createAdminClient();
      const dimEnv = parseInt(process.env.EMBED_DIM ?? "1024", 10);

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

      let allRows: ChunkRow[] = [];
      let lastError: { code?: string; message?: string } | null = null;
      let path: "hybrid" | "fts_only" = "fts_only";

      let embedding: number[] | null = null;
      try {
        embedding = await Promise.race([
          embedQuery(input.query),
          new Promise<number[]>((_, rej) =>
            setTimeout(() => rej(new EmbeddingUnavailableError("embed timeout 2500ms")), 2500),
          ),
        ]);
      } catch (err) {
        console.warn(
          "[norm-retriever] embed unavailable, falling back to FTS:",
          err instanceof Error ? err.message : String(err),
        );
        embedding = null;
      }

      if (embedding && embedding.length === dimEnv) {
        const { data, error } = await sb.rpc("hybrid_search_chunks_v2", {
          query_embedding: embedding,
          query_text: input.query,
          match_vertical: input.vertical ?? null,
          match_count: retrievalCount,
          candidate_count: Math.max(retrievalCount * 3, 30),
        });
        if (error) {
          console.warn("[norm-retriever] hybrid RPC failed, falling back to FTS:", error.message);
        } else if (data && (data as unknown[]).length > 0) {
          type HybridRow = {
            id: string; chunk: string; fonte: string; tipo: string; titolo: string;
            url: string | null; verticale: string | null;
            similarity: number; hybrid_score: number;
          };
          allRows = (data as HybridRow[]).map((r) => ({
            id: r.id, fonte: r.fonte, tipo: r.tipo, titolo: r.titolo,
            chunk: r.chunk, url: r.url, verticale: r.verticale, data: null,
            similarity: r.hybrid_score,
          }));
          path = "hybrid";
        }
      }

      if (allRows.length === 0) {
        const { data, error } = await sb.rpc("corpus_simple_fts", {
          query_text: input.query,
          match_count: retrievalCount,
        });
        allRows = (data ?? []) as ChunkRow[];
        lastError = error
          ? { code: (error as { code?: string }).code, message: error.message }
          : null;
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
        output: `${chunks.length} norme trovate (path=${path})`,
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
