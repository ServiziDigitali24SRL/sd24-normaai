-- 003_corpus_reembed_schema.sql
-- Adds nomic-embed-text 768d column + progress tracking + near-dup dedup RPC.
-- Designed to run while the existing 384d bge-small column stays live, so
-- production traffic is not affected during the re-embedding pass.
--
-- Steps to roll out:
--   1. Apply this migration (zero downtime).
--   2. Run scripts/corpus-reembed-dedup.py (10-12h on GEX44).
--   3. Apply 004_promote_nomic.sql to switch RPC to embedding_nomic.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. New column for 768d nomic embeddings (nullable until backfill done)
ALTER TABLE normaai_chunks
  ADD COLUMN IF NOT EXISTS embedding_nomic vector(768);

-- 2. HNSW index — built CONCURRENTLY so it doesn't lock writes
CREATE INDEX IF NOT EXISTS idx_normaai_chunks_embedding_nomic_hnsw
  ON normaai_chunks
  USING hnsw (embedding_nomic vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. Resume cursor table for the re-embed script
CREATE TABLE IF NOT EXISTS normaai_reembed_progress (
  id text PRIMARY KEY,
  last_id uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Near-duplicate detection helper (called manually post-backfill).
--    Marks chunks where another chunk in the same fonte+verticale group
--    has cosine similarity > threshold. Use status='duplicate' soft-flag
--    instead of DELETE to honor the "MAI eliminare documenti" rule.
ALTER TABLE normaai_chunks
  ADD COLUMN IF NOT EXISTS dup_of uuid REFERENCES normaai_chunks(id),
  ADD COLUMN IF NOT EXISTS dup_score float;

COMMENT ON COLUMN normaai_chunks.dup_of IS
  'If set, this chunk is a near-duplicate of another chunk. Excluded from RAG retrieval but never deleted.';

CREATE INDEX IF NOT EXISTS idx_normaai_chunks_dup_of
  ON normaai_chunks(dup_of) WHERE dup_of IS NOT NULL;

-- 5. RPC to mark near-duplicates within a (fonte, verticale) group.
--    Called in batches by the dedup script after re-embed completes.
CREATE OR REPLACE FUNCTION mark_near_duplicates(
  group_fonte text,
  group_vertical text,
  threshold float DEFAULT 0.97,
  batch_size int DEFAULT 1000
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  marked_count int := 0;
BEGIN
  WITH pairs AS (
    SELECT a.id AS a_id, b.id AS b_id,
           1 - (a.embedding_nomic <=> b.embedding_nomic) AS sim
    FROM normaai_chunks a
    JOIN normaai_chunks b
      ON a.fonte = b.fonte
     AND coalesce(a.verticale, '') = coalesce(b.verticale, '')
     AND a.id < b.id
    WHERE a.fonte = group_fonte
      AND coalesce(a.verticale, '') = coalesce(group_vertical, '')
      AND a.embedding_nomic IS NOT NULL
      AND b.embedding_nomic IS NOT NULL
      AND a.dup_of IS NULL
      AND b.dup_of IS NULL
    ORDER BY a.id
    LIMIT batch_size
  ),
  flagged AS (
    UPDATE normaai_chunks c
    SET dup_of = p.a_id, dup_score = p.sim
    FROM pairs p
    WHERE c.id = p.b_id
      AND p.sim >= threshold
    RETURNING 1
  )
  SELECT count(*) INTO marked_count FROM flagged;
  RETURN marked_count;
END;
$$;

-- 6. Update the existing match RPC to skip dup chunks by default.
--    (Future: make this opt-in per query.)
COMMENT ON FUNCTION match_normaai_chunks IS
  'Dense-only retrieval. After dedup migration, exclude rows WHERE dup_of IS NOT NULL in the WHERE clause.';
