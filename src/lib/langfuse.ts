/**
 * Langfuse tracing for NormaAI RAG pipeline.
 *
 * Env vars required:
 *   LANGFUSE_PUBLIC_KEY
 *   LANGFUSE_SECRET_KEY
 *   LANGFUSE_HOST  (defaults to https://cloud.langfuse.com)
 *
 * If env vars are missing, every helper becomes a no-op that logs to console.
 */

import { Langfuse } from "langfuse";

// ── Singleton client ────────────────────────────────────────────────────────

let _client: Langfuse | null = null;

function getClient(): Langfuse | null {
  if (_client) return _client;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    console.warn("[langfuse] LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY missing — tracing disabled");
    return null;
  }

  _client = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: process.env.LANGFUSE_HOST || "https://cloud.langfuse.com",
    // Flush in background — never block the response
    flushAt: 5,
    flushInterval: 1000,
  });

  return _client;
}

// ── Public helpers ──────────────────────────────────────────────────────────

export interface TraceRAGParams {
  /** Unique trace name (defaults to "rag-query") */
  name?: string;
  /** Supabase user_id (null for anonymous) */
  userId?: string | null;
  /** Session id from the client */
  sessionId?: string;
  /** The user question */
  input?: string;
  /** Metadata bag */
  metadata?: Record<string, unknown>;
}

export interface LangfuseTraceHandle {
  traceId: string;
}

/**
 * Create a new Langfuse trace for a full RAG query.
 * Returns traceId to correlate child spans.
 */
export function traceRAGQuery(params: TraceRAGParams): LangfuseTraceHandle {
  const client = getClient();
  if (!client) {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[langfuse:noop] traceRAGQuery id=${id}`);
    return { traceId: id };
  }

  const trace = client.trace({
    name: params.name ?? "rag-query",
    userId: params.userId ?? undefined,
    sessionId: params.sessionId,
    input: params.input,
    metadata: params.metadata,
  });

  return { traceId: trace.id };
}

/**
 * Log embedding generation step.
 */
export function traceEmbedding(
  traceId: string,
  input: string,
  embeddingDim: number | null,
  latencyMs: number,
): void {
  const client = getClient();
  if (!client) {
    console.log(`[langfuse:noop] traceEmbedding traceId=${traceId} dim=${embeddingDim} ${latencyMs}ms`);
    return;
  }

  client.span({
    traceId,
    name: "embedding",
    input: input.slice(0, 500),
    output: embeddingDim ? { dimensions: embeddingDim } : { error: "no embedding" },
    startTime: new Date(Date.now() - latencyMs),
    endTime: new Date(),
    metadata: { latencyMs, model: "text-embedding-3-small" },
  });
}

/**
 * Log retrieval (vector search) step.
 */
export function traceRetrieval(
  traceId: string,
  query: string,
  chunks: Array<{ id: string; titolo?: string; fonte?: string; similarity?: number }>,
  latencyMs: number,
): void {
  const client = getClient();
  if (!client) {
    console.log(`[langfuse:noop] traceRetrieval traceId=${traceId} chunks=${chunks.length} ${latencyMs}ms`);
    return;
  }

  client.span({
    traceId,
    name: "retrieval",
    input: query.slice(0, 500),
    output: {
      chunkCount: chunks.length,
      chunks: chunks.map((c) => ({
        id: c.id,
        titolo: c.titolo,
        fonte: c.fonte,
        similarity: c.similarity,
      })),
    },
    startTime: new Date(Date.now() - latencyMs),
    endTime: new Date(),
    metadata: { latencyMs },
  });
}

/**
 * Log LLM generation step (Claude call).
 */
export function traceGeneration(
  traceId: string,
  systemPrompt: string,
  userMessage: string,
  response: string,
  model: string,
  latencyMs: number,
  tokens?: { input?: number; output?: number; total?: number },
): void {
  const client = getClient();
  if (!client) {
    console.log(`[langfuse:noop] traceGeneration traceId=${traceId} model=${model} ${latencyMs}ms`);
    return;
  }

  client.generation({
    traceId,
    name: "llm-generation",
    model,
    input: [
      { role: "system", content: systemPrompt.slice(0, 2000) },
      { role: "user", content: userMessage.slice(0, 2000) },
    ],
    output: response.slice(0, 4000),
    startTime: new Date(Date.now() - latencyMs),
    endTime: new Date(),
    usage: tokens
      ? {
          input: tokens.input,
          output: tokens.output,
          total: tokens.total,
        }
      : undefined,
    metadata: { latencyMs },
  });
}

/**
 * Add an evaluation score to a trace.
 */
export function scoreTrace(
  traceId: string,
  name: string,
  value: number,
  comment?: string,
): void {
  const client = getClient();
  if (!client) {
    console.log(`[langfuse:noop] scoreTrace traceId=${traceId} ${name}=${value}`);
    return;
  }

  client.score({
    traceId,
    name,
    value,
    comment,
  });
}

/**
 * Update the trace output after streaming is complete.
 */
export function updateTraceOutput(
  traceId: string,
  output: string,
  metadata?: Record<string, unknown>,
): void {
  const client = getClient();
  if (!client) return;

  client.trace({
    id: traceId,
    output: output.slice(0, 4000),
    metadata,
  });
}

/**
 * Flush pending events. Call at the end of the request if possible.
 * Returns a promise but should be treated as fire-and-forget.
 */
export async function flushLangfuse(): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.flushAsync();
  } catch (e) {
    console.error("[langfuse] flush error:", String(e).slice(0, 120));
  }
}
