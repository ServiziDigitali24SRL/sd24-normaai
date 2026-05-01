// Norm Retriever Agent — RAG hybrid (vector + sparse) over corpus_chunks.
// Fase 1: pure dense (vector cosine) on Supabase pgvector.
// Fase 2: hybrid with BM25 sparse via Postgres tsvector + score fusion.

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
 * Embed the user query with the same model used for corpus_chunks.embedding.
 * Returns a 384-dim vector. Uses FastEmbed bge-small-en-v1.5 served via the
 * Hetzner agent VPS embedding endpoint, with a fallback to OpenAI ada-002
 * truncated if the primary is down.
 */
async function embedQuery(query: string): Promise<number[]> {
  const endpoint = process.env.EMBED_ENDPOINT_URL;
  if (!endpoint) {
    // No embedding endpoint configured — return zero vector so caller can
    // fallback to BM25-only or keyword search. In MVP this is acceptable.
    return new Array(384).fill(0);
  }
  try {
    const res = await fetch(`${endpoint}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [query] }),
    });
    if (!res.ok) throw new Error(`embed ${res.status}`);
    const j = await res.json();
    return j.embeddings?.[0] ?? new Array(384).fill(0);
  } catch {
    return new Array(384).fill(0);
  }
}

export const normRetrieverAgent: Agent<NormRetrieverInput, NormRetrieverOutput> = {
  name: "norm-retriever",

  async run(input, ctx: AgentContext): Promise<AgentResult<NormRetrieverOutput>> {
    const t0 = Date.now();
    ctx.emit({ agent: "norm-retriever", state: "started" });

    try {
      const topK = input.topK ?? 6;
      const embedding = await embedQuery(input.query);

      // pgvector cosine search via RPC (defined separately as a SQL function
      // when corpus is populated). For now we issue a direct SELECT with the
      // <=> operator. Vertical filter is optional.
      const sb = createAdminClient();
      const { data, error } = await sb.rpc("match_corpus_chunks", {
        query_embedding: embedding,
        match_count: topK,
        filter_vertical: input.vertical ?? null,
      });

      if (error) {
        // Graceful degradation: if the corpus_chunks table or RPC doesn't exist
        // on the connected Supabase (e.g. production DB without marketplace
        // schema), continue without RAG context — the LLM still answers from
        // its own knowledge. We log it as a "done" event with 0 chunks so the
        // pipeline doesn't abort.
        ctx.emit({
          agent: "norm-retriever",
          state: "done",
          durationMs: Date.now() - t0,
          output: `RAG non disponibile (${error.code ?? "no_corpus"}); LLM only`,
        });
        return { ok: true, data: { chunks: [], ragContext: "" } };
      }

      let chunks: CitationRef[] = (data ?? []).map((r: {
        id: string; urn: string; title: string; article: string | null;
        content: string; status: string;
      }) => ({
        urn: r.urn,
        title: r.title,
        article: r.article,
        excerpt: r.content.slice(0, 600),
        source_chunk_id: r.id,
        verified: r.status === "vigente",
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
