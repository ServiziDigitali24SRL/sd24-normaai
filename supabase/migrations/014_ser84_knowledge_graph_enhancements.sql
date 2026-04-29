-- SER-84: Knowledge graph normativo — enhancement relazioni + indici
-- Le tabelle norma_relazioni e norma_versioni già esistono, aggiungiamo:
-- tipo_relazione, indici, CHECK constraints, funzione traversal

-- ── 1. Aggiungi colonne enhancement a norma_relazioni ────────────────────────
ALTER TABLE norma_relazioni
  ADD COLUMN IF NOT EXISTS bidirezionale BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS urn_articolo_da TEXT,
  ADD COLUMN IF NOT EXISTS urn_articolo_a  TEXT;

-- ── 2. Indici per navigazione grafo ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_norma_relazioni_da ON norma_relazioni(norma_da);
CREATE INDEX IF NOT EXISTS idx_norma_relazioni_a  ON norma_relazioni(norma_a);
CREATE INDEX IF NOT EXISTS idx_norma_relazioni_tipo ON norma_relazioni(tipo);

-- ── 3. Funzione: trova tutte le relazioni di una norma (1 hop) ────────────────
CREATE OR REPLACE FUNCTION get_norma_relations(p_urn TEXT)
RETURNS TABLE(
  norma_da TEXT, norma_a TEXT, tipo TEXT,
  descrizione TEXT, confidence FLOAT, bidirezionale BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  SELECT norma_da, norma_a, tipo, descrizione, confidence, bidirezionale
    FROM norma_relazioni
   WHERE norma_da = p_urn OR (bidirezionale AND norma_a = p_urn)
   ORDER BY confidence DESC NULLS LAST;
$$;

-- ── 4. Tabella corpus_versions: versioning corpus as code ─────────────────────
CREATE TABLE IF NOT EXISTS corpus_versions (
  id           BIGSERIAL PRIMARY KEY,
  version_tag  TEXT        NOT NULL UNIQUE,
  description  TEXT,
  chunk_count  INT         NOT NULL DEFAULT 0,
  norma_count  INT         NOT NULL DEFAULT 0,
  checksum     TEXT,
  deployed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_by  TEXT,
  notes        TEXT
);

INSERT INTO corpus_versions (version_tag, description, deployed_by)
VALUES ('2026-Q2-baseline', 'Baseline corpus da migrazione SER-84', 'system')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE corpus_versions IS 'SER-84: Versioning del corpus normativo — corpus-as-code';
COMMENT ON TABLE norma_relazioni IS 'SER-84: Knowledge graph relazioni normative (modifica, abroga, integra, rinvia, implementa)';
