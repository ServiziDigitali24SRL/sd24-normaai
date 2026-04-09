-- Migration 009: Cittadino PRO
-- Tabelle: anonymous_usage, daily_usage, user_documents, lead_otp

-- ── Contatore query anonimi (IP + mese) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS anonymous_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip text NOT NULL,
  session_id text,
  month text NOT NULL, -- formato YYYY-MM
  count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ip, month)
);

-- Incremento atomico via upsert
CREATE OR REPLACE FUNCTION increment_anonymous_usage(p_ip text, p_session_id text, p_month text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO anonymous_usage (ip, session_id, month, count)
  VALUES (p_ip, p_session_id, p_month, 1)
  ON CONFLICT (ip, month)
  DO UPDATE SET count = anonymous_usage.count + 1, updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- ── Contatore query giornaliere free (userId + data) ─────────────────────────
CREATE TABLE IF NOT EXISTS daily_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL, -- formato YYYY-MM-DD (fuso orario italiano)
  count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE OR REPLACE FUNCTION increment_daily_usage(p_user_id uuid, p_date date)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO daily_usage (user_id, date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = daily_usage.count + 1, updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- ── Documenti utente ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria text NOT NULL,
  sottocategoria text,
  file_url text,
  nome_file text,
  size_bytes integer,
  scadenze_estratte jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_documents_own" ON user_documents
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_categoria ON user_documents(user_id, categoria);

-- ── OTP per conferma lead marketplace ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_otp (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  lead_context jsonb, -- contesto conversazione per generare il riassunto
  otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_otp_user ON lead_otp(user_id, used);
CREATE INDEX IF NOT EXISTS idx_lead_otp_expires ON lead_otp(expires_at);

-- ── Cleanup automatico OTP scaduti (chiamato da cron) ────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_otp()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM lead_otp WHERE expires_at < now() - interval '1 hour';
END;
$$;

-- ── RLS per daily_usage e anonymous_usage (solo service role) ────────────────
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_usage_service" ON daily_usage FOR ALL USING (true);

ALTER TABLE anonymous_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anonymous_usage_service" ON anonymous_usage FOR ALL USING (true);

ALTER TABLE lead_otp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_otp_service" ON lead_otp FOR ALL USING (true);
