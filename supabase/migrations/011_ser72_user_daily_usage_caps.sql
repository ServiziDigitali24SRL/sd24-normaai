-- SER-72: Hard cap token/budget per utente per piano
-- Crea tabella user_daily_usage + RPC increment_daily_usage con limiti per-tier

-- ── 1. Tabella tracking usage giornaliero ────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_daily_usage (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date    DATE        NOT NULL,
  query_count   INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

-- Indice per lookup veloce (user + date)
CREATE INDEX IF NOT EXISTS idx_user_daily_usage_user_date
  ON user_daily_usage(user_id, usage_date);

-- RLS: ogni utente vede solo i propri record
ALTER TABLE user_daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_daily_usage_own" ON user_daily_usage;
CREATE POLICY "user_daily_usage_own" ON user_daily_usage
  FOR ALL USING (auth.uid() = user_id);

-- ── 2. Tabella limiti giornalieri per piano ───────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_daily_limits (
  plan        TEXT PRIMARY KEY,
  daily_limit INT  NOT NULL  -- -1 = illimitato
);

-- Popola limiti per piano
INSERT INTO plan_daily_limits (plan, daily_limit) VALUES
  ('free',           10),
  ('trial',          20),
  ('cittadino_pro',  -1),
  ('professionista', -1),
  ('impresa',        -1),
  ('api_developer',  -1),
  ('api_pro',        -1),
  ('paused',          5),
  ('cancelled',       3)
ON CONFLICT (plan) DO UPDATE SET daily_limit = EXCLUDED.daily_limit;

-- ── 3. RPC increment_daily_usage ─────────────────────────────────────────────
-- Ritorna JSON {count, limit} — upserta il contatore, legge il piano dal profilo
CREATE OR REPLACE FUNCTION increment_daily_usage(
  p_user_id UUID,
  p_date    DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count      INT;
  v_plan       TEXT;
  v_limit      INT;
BEGIN
  -- Recupera il piano dell'utente
  SELECT COALESCE(plan, 'free')
    INTO v_plan
    FROM profiles
   WHERE id = p_user_id;

  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;

  -- Recupera il limite giornaliero per il piano
  SELECT COALESCE(daily_limit, 10)
    INTO v_limit
    FROM plan_daily_limits
   WHERE plan = v_plan;

  IF v_limit IS NULL THEN
    v_limit := 10;
  END IF;

  -- Upsert contatore giornaliero
  INSERT INTO user_daily_usage(user_id, usage_date, query_count, updated_at)
    VALUES (p_user_id, p_date, 1, NOW())
  ON CONFLICT (user_id, usage_date) DO UPDATE
    SET query_count = user_daily_usage.query_count + 1,
        updated_at  = NOW()
  RETURNING query_count INTO v_count;

  RETURN json_build_object('count', v_count, 'limit', v_limit);
END;
$$;

-- Revoca accesso pubblico diretto, solo SECURITY DEFINER
REVOKE ALL ON FUNCTION increment_daily_usage(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_daily_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_daily_usage(UUID, DATE) TO service_role;

-- ── 4. Auto-update updated_at su user_daily_usage ────────────────────────────
CREATE OR REPLACE FUNCTION update_daily_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS daily_usage_updated_at ON user_daily_usage;
CREATE TRIGGER daily_usage_updated_at
  BEFORE UPDATE ON user_daily_usage
  FOR EACH ROW EXECUTE FUNCTION update_daily_usage_updated_at();

COMMENT ON TABLE user_daily_usage IS 'SER-72: Tracking query giornaliere per utente — hard cap per piano';
COMMENT ON TABLE plan_daily_limits IS 'SER-72: Limiti query giornalieri per piano (-1 = illimitato)';
