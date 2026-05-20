-- NormaAI Marketplace — Migration 002 (PIVOT)
-- Aggiunge: wallet avvocato (top-up 250+ multipli), audit transactions, verifica
-- albo (storico + provider lookup), daily quota 10 msg/24h (anon+auth), user
-- preferences (lingua sito, lingua voice, colore orb, tipo cittadino).
--
-- Apply on Supabase NA staging branch (project rjwaegzdfsdlnbijkark) — NEVER on prod.
-- Idempotent: ogni CREATE è IF NOT EXISTS / DO $$ ... $$ guard.

-- =============================================================================
-- 1. USERS — colonne preference (lingua sito + voice + orb + tipo cittadino)
-- =============================================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name         TEXT,
  ADD COLUMN IF NOT EXISTS last_name          TEXT,
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cap                TEXT,
  ADD COLUMN IF NOT EXISTS citta              TEXT,
  ADD COLUMN IF NOT EXISTS comune             TEXT,
  ADD COLUMN IF NOT EXISTS regione            TEXT,
  ADD COLUMN IF NOT EXISTS citizenship_type   TEXT
    CHECK (citizenship_type IN ('italiano', 'turista', 'straniero_residente', NULL)),
  ADD COLUMN IF NOT EXISTS preferred_lang     TEXT NOT NULL DEFAULT 'it'
    CHECK (preferred_lang IN ('it', 'en')),
  ADD COLUMN IF NOT EXISTS preferred_voice_lang TEXT NOT NULL DEFAULT 'it'
    CHECK (preferred_voice_lang IN ('it','en','es','ar','ro','zh','uk','bn','de','fr','ja')),
  ADD COLUMN IF NOT EXISTS preferred_orb_color TEXT NOT NULL DEFAULT 'vermiglio'
    CHECK (preferred_orb_color IN ('vermiglio', 'alloro', 'ambra', 'blu'));

CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone) WHERE deleted_at IS NULL;

-- =============================================================================
-- 2. LAWYERS — nuovo status enum + colonna verification_status
-- =============================================================================
ALTER TABLE lawyers
  ADD COLUMN IF NOT EXISTS iscrizione_num     TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- Backfill verification_status from old "verified" boolean
UPDATE lawyers
SET verification_status = CASE WHEN verified = TRUE THEN 'verified' ELSE 'unverified' END
WHERE verification_status = 'unverified';

-- =============================================================================
-- 3. LAWYER_VERIFICATIONS — storico tentativi di verifica albo (CNF, Cassa)
-- Provider può essere stub (dev), cnf, cassa_forense, infocamere, manual_admin.
-- =============================================================================
CREATE TABLE IF NOT EXISTS lawyer_verifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL
                   CHECK (provider IN ('stub_dev', 'cnf', 'cassa_forense', 'infocamere', 'manual_admin')),
  piva             TEXT NOT NULL,
  foro             TEXT NOT NULL,
  iscrizione_num   TEXT,
  status           TEXT NOT NULL
                   CHECK (status IN ('pending', 'verified', 'rejected', 'error')),
  response_raw     JSONB,                          -- payload risposta provider (audit)
  error_message    TEXT,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lawyer_verifications_user_idx
  ON lawyer_verifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lawyer_verifications_status_idx
  ON lawyer_verifications(status, created_at DESC);

-- =============================================================================
-- 4. LAWYER_WALLET — saldo corrente avvocato (UN record per lawyer)
-- Aggiornato SOLO da service_role via /api/wallet/* + webhook Stripe.
-- =============================================================================
CREATE TABLE IF NOT EXISTS lawyer_wallet (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_cents  BIGINT NOT NULL DEFAULT 0
                 CHECK (balance_cents >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER lawyer_wallet_updated_at BEFORE UPDATE ON lawyer_wallet
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 5. WALLET_TRANSACTIONS — audit ledger di ogni movimento (top-up, debit refund)
-- Append-only: nessun UPDATE/DELETE consentito da RLS.
-- =============================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind                TEXT NOT NULL
                      CHECK (kind IN ('topup', 'debit_lead', 'refund', 'adjust_admin')),
  amount_cents        BIGINT NOT NULL,                -- positivo per credit, negativo per debit
  balance_after_cents BIGINT NOT NULL CHECK (balance_after_cents >= 0),
  stripe_session_id   TEXT UNIQUE,                    -- presente per kind='topup'
  lead_id             UUID REFERENCES leads(id),      -- presente per kind='debit_lead'
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx
  ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_transactions_lead_idx
  ON wallet_transactions(lead_id) WHERE lead_id IS NOT NULL;

-- Helper: top-up atomico (Stripe webhook lo chiama dopo successful payment).
-- Garantisce: balance_cents += amount, transaction insertita, idempotent su stripe_session_id.
CREATE OR REPLACE FUNCTION wallet_topup(
  p_user_id          UUID,
  p_amount_cents     BIGINT,
  p_stripe_session   TEXT,
  p_metadata         JSONB DEFAULT NULL
) RETURNS BIGINT  -- new balance
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'wallet_topup: amount must be > 0';
  END IF;

  -- Idempotent: se la transazione esiste già, ritorna balance corrente
  IF EXISTS (SELECT 1 FROM wallet_transactions WHERE stripe_session_id = p_stripe_session) THEN
    SELECT balance_cents INTO v_new_balance FROM lawyer_wallet WHERE user_id = p_user_id;
    RETURN COALESCE(v_new_balance, 0);
  END IF;

  -- Upsert wallet + accumula
  INSERT INTO lawyer_wallet (user_id, balance_cents)
  VALUES (p_user_id, p_amount_cents)
  ON CONFLICT (user_id) DO UPDATE
    SET balance_cents = lawyer_wallet.balance_cents + p_amount_cents,
        updated_at = NOW()
  RETURNING balance_cents INTO v_new_balance;

  -- Audit
  INSERT INTO wallet_transactions
    (user_id, kind, amount_cents, balance_after_cents, stripe_session_id, metadata)
  VALUES
    (p_user_id, 'topup', p_amount_cents, v_new_balance, p_stripe_session, p_metadata);

  RETURN v_new_balance;
END;
$$;

-- Helper: debit atomico per acquisto lead. Blocca se saldo insufficiente.
CREATE OR REPLACE FUNCTION wallet_debit_lead(
  p_user_id      UUID,
  p_amount_cents BIGINT,
  p_lead_id      UUID,
  p_metadata     JSONB DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance BIGINT;
  v_new_balance     BIGINT;
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'wallet_debit_lead: amount must be > 0';
  END IF;

  -- Lock row + read balance
  SELECT balance_cents INTO v_current_balance
    FROM lawyer_wallet WHERE user_id = p_user_id FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'wallet_debit_lead: wallet not initialized for user %', p_user_id;
  END IF;

  IF v_current_balance < p_amount_cents THEN
    RAISE EXCEPTION 'wallet_debit_lead: insufficient_funds (have %, need %)',
      v_current_balance, p_amount_cents
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE lawyer_wallet
    SET balance_cents = balance_cents - p_amount_cents, updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance_cents INTO v_new_balance;

  INSERT INTO wallet_transactions
    (user_id, kind, amount_cents, balance_after_cents, lead_id, metadata)
  VALUES
    (p_user_id, 'debit_lead', -p_amount_cents, v_new_balance, p_lead_id, p_metadata);

  RETURN v_new_balance;
END;
$$;

-- =============================================================================
-- 6. DAILY_QUOTA_USAGE — 10 msg/24h reset midnight Europe/Rome
-- identifier = user_id (UUID stringified) OR sha256(ip + salt) per anon.
-- usage_date salvato in TZ Europe/Rome.
-- =============================================================================
CREATE TABLE IF NOT EXISTS daily_quota_usage (
  identifier        TEXT NOT NULL,
  identifier_type   TEXT NOT NULL CHECK (identifier_type IN ('user', 'ip_hash')),
  usage_date        DATE NOT NULL,
  count             INT NOT NULL DEFAULT 0 CHECK (count >= 0),
  first_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identifier, usage_date)
);

CREATE INDEX IF NOT EXISTS daily_quota_date_idx ON daily_quota_usage(usage_date);

-- Increment atomico con limite. Ritorna nuovo count.
-- Se count > max_count, NON incrementa e ritorna count corrente (caller blocca).
CREATE OR REPLACE FUNCTION quota_check_and_increment(
  p_identifier      TEXT,
  p_identifier_type TEXT,
  p_max_count       INT DEFAULT 10
) RETURNS TABLE(new_count INT, allowed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today        DATE := (NOW() AT TIME ZONE 'Europe/Rome')::DATE;
  v_current      INT;
BEGIN
  INSERT INTO daily_quota_usage (identifier, identifier_type, usage_date, count, first_at, last_at)
  VALUES (p_identifier, p_identifier_type, v_today, 0, NOW(), NOW())
  ON CONFLICT (identifier, usage_date) DO NOTHING;

  SELECT count INTO v_current
    FROM daily_quota_usage
    WHERE identifier = p_identifier AND usage_date = v_today
    FOR UPDATE;

  IF v_current >= p_max_count THEN
    RETURN QUERY SELECT v_current, FALSE;
    RETURN;
  END IF;

  UPDATE daily_quota_usage
    SET count = count + 1, last_at = NOW()
    WHERE identifier = p_identifier AND usage_date = v_today
    RETURNING count INTO v_current;

  RETURN QUERY SELECT v_current, TRUE;
END;
$$;

-- =============================================================================
-- 7. ROW LEVEL SECURITY — wallet + transactions + verifications
-- =============================================================================
ALTER TABLE lawyer_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quota_usage ENABLE ROW LEVEL SECURITY;

-- Lawyer reads own wallet
DROP POLICY IF EXISTS lawyer_wallet_owner_read ON lawyer_wallet;
CREATE POLICY lawyer_wallet_owner_read ON lawyer_wallet
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Lawyer reads own transactions
DROP POLICY IF EXISTS wallet_tx_owner_read ON wallet_transactions;
CREATE POLICY wallet_tx_owner_read ON wallet_transactions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Lawyer reads own verifications
DROP POLICY IF EXISTS lawyer_verif_owner_read ON lawyer_verifications;
CREATE POLICY lawyer_verif_owner_read ON lawyer_verifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Daily quota: NESSUNA policy authenticated. Solo service_role.

-- Service-role bypassa RLS by default su tutte le tabelle (Supabase managed).

-- =============================================================================
-- 8. AUTH_OTP_CODES — SMS OTP storage (5 min TTL, max 5 attempts)
-- Phone normalized to E.164. Code stored hashed (sha256). Rate-limited via
-- daily_quota table indirectly (max 3 OTP requests per phone per hour).
-- =============================================================================
CREATE TABLE IF NOT EXISTS auth_otp_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT NOT NULL,                  -- E.164 +39...
  code_hash       TEXT NOT NULL,                  -- sha256(code + salt)
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE, -- nullable: signup may precede user row
  purpose         TEXT NOT NULL DEFAULT 'signup'
                  CHECK (purpose IN ('signup', 'login', 'phone_change')),
  attempts        INT NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_otp_phone_idx ON auth_otp_codes(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_otp_expires_idx ON auth_otp_codes(expires_at) WHERE verified_at IS NULL;

-- Cleanup function (cron): remove expired & verified > 7 days
CREATE OR REPLACE FUNCTION cleanup_old_otp_codes()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted INT;
BEGIN
  DELETE FROM auth_otp_codes
    WHERE (expires_at < NOW() - INTERVAL '1 day')
       OR (verified_at IS NOT NULL AND verified_at < NOW() - INTERVAL '7 days');
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

ALTER TABLE auth_otp_codes ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated — only service_role accesses (anon signup flow).
