-- SER-77: Audit log immutabile WORM + hash chain
-- Aggiunge row_hash/prev_hash ad audit_risposte + trigger WORM + hash chain

-- ── 1. Aggiungi colonne hash chain ad audit_risposte ──────────────────────────
ALTER TABLE audit_risposte
  ADD COLUMN IF NOT EXISTS row_hash  TEXT,
  ADD COLUMN IF NOT EXISTS prev_hash TEXT;

-- ── 2. Funzione calcolo hash SHA-256 della riga ────────────────────────────────
-- Hash = SHA256(id||user_id||sessione_id||query||risposta||created_at||prev_hash)
CREATE OR REPLACE FUNCTION compute_audit_row_hash(
  p_id         UUID,
  p_user_id    UUID,
  p_sessione   TEXT,
  p_query      TEXT,
  p_risposta   TEXT,
  p_created_at TIMESTAMPTZ,
  p_prev_hash  TEXT
) RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      COALESCE(p_id::TEXT, '') || '|' ||
      COALESCE(p_user_id::TEXT, '') || '|' ||
      COALESCE(p_sessione, '') || '|' ||
      COALESCE(p_query, '') || '|' ||
      COALESCE(p_risposta, '') || '|' ||
      COALESCE(p_created_at::TEXT, '') || '|' ||
      COALESCE(p_prev_hash, 'GENESIS'),
      'sha256'
    ),
    'hex'
  )
$$;

-- ── 3. Trigger BEFORE INSERT: calcola prev_hash + row_hash ────────────────────
CREATE OR REPLACE FUNCTION audit_risposte_set_hash()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_hash TEXT;
BEGIN
  -- Recupera l'hash dell'ultimo record inserito
  SELECT COALESCE(row_hash, 'GENESIS')
    INTO v_prev_hash
    FROM audit_risposte
   ORDER BY created_at DESC
   LIMIT 1;

  NEW.prev_hash := COALESCE(v_prev_hash, 'GENESIS');
  NEW.row_hash  := compute_audit_row_hash(
    NEW.id, NEW.user_id, NEW.sessione_id,
    NEW.query, NEW.risposta, NEW.created_at,
    NEW.prev_hash
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_risposte_hash_chain ON audit_risposte;
CREATE TRIGGER audit_risposte_hash_chain
  BEFORE INSERT ON audit_risposte
  FOR EACH ROW EXECUTE FUNCTION audit_risposte_set_hash();

-- ── 4. Trigger WORM: blocca UPDATE e DELETE ───────────────────────────────────
CREATE OR REPLACE FUNCTION audit_risposte_worm_enforce()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'SER-77 WORM violation: audit_risposte is immutable. '
    'UPDATE and DELETE are forbidden. (operation=%, id=%)',
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_risposte_worm ON audit_risposte;
CREATE TRIGGER audit_risposte_worm
  BEFORE UPDATE OR DELETE ON audit_risposte
  FOR EACH ROW EXECUTE FUNCTION audit_risposte_worm_enforce();

-- ── 5. Funzione di verifica integrità hash chain ──────────────────────────────
-- Ritorna le righe con hash non valido (tampering detection)
CREATE OR REPLACE FUNCTION verify_audit_chain()
RETURNS TABLE(id UUID, expected_hash TEXT, stored_hash TEXT, valid BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    id,
    compute_audit_row_hash(id, user_id, sessione_id, query, risposta, created_at, prev_hash) AS expected_hash,
    row_hash AS stored_hash,
    compute_audit_row_hash(id, user_id, sessione_id, query, risposta, created_at, prev_hash) = row_hash AS valid
  FROM audit_risposte
  WHERE row_hash IS NOT NULL
  ORDER BY created_at;
$$;

GRANT EXECUTE ON FUNCTION verify_audit_chain() TO service_role;

COMMENT ON COLUMN audit_risposte.row_hash  IS 'SER-77: SHA-256 hash immutabile della riga (WORM)';
COMMENT ON COLUMN audit_risposte.prev_hash IS 'SER-77: Hash della riga precedente (chain integrity)';
