-- 004_fts_gin_index.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Acceleratore reale per hybrid_search_chunks (già in produzione).
--
-- Il body della funzione calcola FTS LIVE ad ogni query:
--   to_tsvector('italian', coalesce(chunk,'') || ' ' || coalesce(titolo,''))
--     @@ plainto_tsquery('italian', query_text)
--
-- Su 8.3M righe senza indice questa espressione richiede SEQ SCAN ⇒ secondi.
-- Con un indice GIN funzionale sull'espressione esatta diventa ms.
--
-- IMPORTANTE: l'espressione dell'indice DEVE corrispondere ESATTAMENTE a
-- quella usata in hybrid_search_chunks() — altrimenti il planner non lo usa.
--
-- Build size atteso: ~600-900MB. Build time: ~30-60min (CONCURRENTLY).
-- ─────────────────────────────────────────────────────────────────────────

-- Build CONCURRENTLY in modo da NON bloccare la tabella mentre l'indice si crea.
-- Nota: CONCURRENTLY non è permesso dentro una transaction, quindi questa
-- migration deve essere applicata via supabase MCP `apply_migration` o direttamente.
CREATE INDEX CONCURRENTLY IF NOT EXISTS normaai_chunks_fts_italian_gin
  ON normaai_chunks
  USING gin (to_tsvector('italian', coalesce(chunk, '') || ' ' || coalesce(titolo, '')));

-- Indice ausiliario: trigram su titolo per query con citazioni esatte
-- ("art. 2118 c.c.", "D.Lgs. 81/2008"). similarity() / ILIKE diventano fast.
CREATE INDEX CONCURRENTLY IF NOT EXISTS normaai_chunks_titolo_trgm
  ON normaai_chunks
  USING gin (titolo gin_trgm_ops)
  WHERE titolo IS NOT NULL;

-- pg_trgm dovrebbe già essere abilitata; idempotent.
-- (CREATE EXTENSION non si può mettere prima di CREATE INDEX CONCURRENTLY se in tx;
--  qui assumiamo già presente.)
