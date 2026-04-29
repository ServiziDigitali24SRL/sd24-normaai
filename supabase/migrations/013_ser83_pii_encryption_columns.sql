-- SER-83: Field-level encryption PII
-- Aggiunge colonne _enc alle tabelle sensibili per migrazione progressiva
-- Encryption: AES-256-GCM a livello applicativo (Node.js crypto)
-- Key management: PII_ENCRYPTION_KEY env var + backup in Supabase Vault

-- ── 1. Supabase Vault: registra il secret slot (la chiave viene impostata esternamente) ──
-- Crea un slot vuoto nel vault — la chiave reale viene impostata via:
-- SELECT vault.create_secret('<hex32bytes>', 'pii_encryption_key', 'NormaAI PII AES-256-GCM');
-- NOTA: non inseriamo la chiave qui (la migrazione è nel repo git)

-- ── 2. Tabella metadata encryption per audit compliance ─────────────────────
CREATE TABLE IF NOT EXISTS pii_encryption_metadata (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  column_name TEXT NOT NULL,
  key_version TEXT NOT NULL DEFAULT 'v1',
  algorithm   TEXT NOT NULL DEFAULT 'AES-256-GCM',
  enabled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at  TIMESTAMPTZ,
  UNIQUE(table_name, column_name)
);

-- ── 3. Colonne cifrate per audit_risposte (query e risposta sono PII potenziale) ──
ALTER TABLE audit_risposte
  ADD COLUMN IF NOT EXISTS query_enc     TEXT,
  ADD COLUMN IF NOT EXISTS risposta_enc  TEXT;

INSERT INTO pii_encryption_metadata (table_name, column_name) VALUES
  ('audit_risposte', 'query_enc'),
  ('audit_risposte', 'risposta_enc')
ON CONFLICT DO NOTHING;

-- ── 4. Colonne cifrate per dsar_requests (diritti interessato — dati sensibili) ──
ALTER TABLE dsar_requests
  ADD COLUMN IF NOT EXISTS request_details_enc TEXT;

INSERT INTO pii_encryption_metadata (table_name, column_name) VALUES
  ('dsar_requests', 'request_details_enc')
ON CONFLICT DO NOTHING;

-- ── 5. RLS su pii_encryption_metadata (solo service_role) ────────────────────
ALTER TABLE pii_encryption_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pii_metadata_service_only" ON pii_encryption_metadata;
CREATE POLICY "pii_metadata_service_only" ON pii_encryption_metadata
  FOR ALL USING (auth.role() = 'service_role');

-- ── 6. Funzione verifica stato cifratura ─────────────────────────────────────
CREATE OR REPLACE FUNCTION get_pii_encryption_status()
RETURNS TABLE(table_name TEXT, column_name TEXT, key_version TEXT, enabled_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT table_name, column_name, key_version, enabled_at
  FROM pii_encryption_metadata
  ORDER BY table_name, column_name;
$$;

GRANT EXECUTE ON FUNCTION get_pii_encryption_status() TO service_role;

COMMENT ON TABLE pii_encryption_metadata IS 'SER-83: Registro colonne cifrate con AES-256-GCM a livello applicativo';
