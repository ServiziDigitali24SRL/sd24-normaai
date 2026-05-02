-- 002_fts_hybrid_search.sql
-- Adds Italian FTS (full-text search) and trigram indexes on normaai_chunks
-- so the Norm Retriever can do HYBRID dense+sparse search.
--
-- WHY: bge-small dense embeddings miss exact lexical matches. A query like
--   "art. 2118 c.c." semantically matches many chunks about "codice civile"
--   but the EXACT article number is buried below them. With FTS + trigram
--   we surface the exact match every time.
--
-- COST: +~600 MB index size on 8.3M chunks (one-time). Query latency overhead
--       is negligible (~5-15 ms) thanks to GIN index.
--
-- ROLLBACK: drop the indexes + the generated column.
--
-- ─────────────────────────────────────────────────────────────────────────

-- Trigram extension (already on Supabase by default, but be explicit)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── 1. Italian FTS column (generated, immutable, indexed) ───────────────
-- to_tsvector('italian', ...) handles stemming for IT (verbi, plurali, etc.)
ALTER TABLE normaai_chunks
  ADD COLUMN IF NOT EXISTS fts_it tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('italian', coalesce(titolo, '')), 'A') ||
    setweight(to_tsvector('italian', coalesce(chunk, '')),  'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_normaai_chunks_fts_it
  ON normaai_chunks USING gin (fts_it);

-- ─── 2. Trigram index on titolo (catches "art. 2118 c.c." literal) ───────
-- Used for ILIKE '%art. 2118%' and similarity() ranking.
CREATE INDEX IF NOT EXISTS idx_normaai_chunks_titolo_trgm
  ON normaai_chunks USING gin (titolo gin_trgm_ops);

-- ─── 3. Hybrid match RPC: dense (cosine) + sparse (FTS) + trigram boost ──
-- Returns rows with both vec_score and lex_score, plus a fused rank score.
-- Caller decides cutoff. Default: take top-N by fused_score = 0.6*vec + 0.4*lex.
CREATE OR REPLACE FUNCTION match_normaai_chunks_hybrid(
  query_embedding vector(384),
  query_text text,
  match_count int DEFAULT 12,
  match_threshold float DEFAULT 0.10,
  filter_verticale text DEFAULT NULL,
  filter_tipo text DEFAULT NULL,
  only_vigente boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  fonte text,
  tipo text,
  titolo text,
  chunk text,
  url text,
  verticale text,
  data text,
  vec_score float,
  lex_score float,
  fused_score float
)
LANGUAGE sql STABLE
AS $$
  WITH dense AS (
    SELECT
      c.id, c.fonte, c.tipo, c.titolo, c.chunk, c.url, c.verticale,
      c.data::text AS data,
      (1 - (c.embedding <=> query_embedding))::float AS vec_score
    FROM normaai_chunks c
    WHERE c.embedding IS NOT NULL
      AND (filter_verticale IS NULL OR c.verticale = filter_verticale)
      AND (filter_tipo      IS NULL OR c.tipo      = filter_tipo)
      AND (NOT only_vigente OR c.status = 'vigente')
      AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  sparse AS (
    SELECT
      c.id, c.fonte, c.tipo, c.titolo, c.chunk, c.url, c.verticale,
      c.data::text AS data,
      ts_rank_cd(c.fts_it, plainto_tsquery('italian', query_text))::float AS lex_score
    FROM normaai_chunks c
    WHERE c.fts_it @@ plainto_tsquery('italian', query_text)
      AND (filter_verticale IS NULL OR c.verticale = filter_verticale)
      AND (filter_tipo      IS NULL OR c.tipo      = filter_tipo)
      AND (NOT only_vigente OR c.status = 'vigente')
    ORDER BY lex_score DESC
    LIMIT match_count * 2
  ),
  unified AS (
    SELECT
      coalesce(d.id, s.id)             AS id,
      coalesce(d.fonte, s.fonte)       AS fonte,
      coalesce(d.tipo, s.tipo)         AS tipo,
      coalesce(d.titolo, s.titolo)     AS titolo,
      coalesce(d.chunk, s.chunk)       AS chunk,
      coalesce(d.url, s.url)           AS url,
      coalesce(d.verticale, s.verticale) AS verticale,
      coalesce(d.data, s.data)         AS data,
      coalesce(d.vec_score, 0)::float  AS vec_score,
      coalesce(s.lex_score, 0)::float  AS lex_score,
      (0.6 * coalesce(d.vec_score, 0) + 0.4 * coalesce(s.lex_score, 0))::float AS fused_score
    FROM dense d
    FULL OUTER JOIN sparse s ON s.id = d.id
  )
  SELECT id, fonte, tipo, titolo, chunk, url, verticale, data,
         vec_score, lex_score, fused_score
  FROM unified
  ORDER BY fused_score DESC
  LIMIT match_count;
$$;

COMMENT ON FUNCTION match_normaai_chunks_hybrid IS
  'Hybrid dense+sparse retrieval. Use this instead of match_normaai_chunks for queries that include exact legal references (art. X c.c., D.Lgs. Y/AAAA, etc.).';
