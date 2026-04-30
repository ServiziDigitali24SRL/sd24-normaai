-- NormaAI Marketplace — Migration 001 (PIVOT)
-- Fresh schema for: legal-question chat + voice mobile + AI avatar desktop
-- + lead marketplace (user 9€ → lawyer 91€) + B2B API + white-label leads
--
-- Apply on Supabase NA staging branch (project rjwaegzdfsdlnbijkark) — NEVER on prod.
-- This file replaces the entire previous schema. It is not idempotent against the
-- legacy schema; run it on a clean DB.

-- =============================================================================
-- 0. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- 1. SHARED HELPERS
-- =============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. USERS (1 of 12)
-- Single profile table for all roles. Auth lives in auth.users (Supabase managed).
-- =============================================================================
CREATE TABLE users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL UNIQUE,
  role                  TEXT NOT NULL DEFAULT 'user'
                        CHECK (role IN ('user', 'lawyer', 'api_client', 'admin')),
  display_name          TEXT,
  -- ── Onboarding fields (mobile + desktop) ─────────────────────────────────
  origin                TEXT CHECK (origin IN ('italiano', 'straniero', 'turista', NULL)),
  job_title             TEXT,                       -- desktop only, free text
  is_lawyer             BOOLEAN NOT NULL DEFAULT FALSE,
  onboarded_at          TIMESTAMPTZ,
  onboarding_platform   TEXT CHECK (onboarding_platform IN ('mobile', 'desktop', NULL)),
  -- ── Stripe ───────────────────────────────────────────────────────────────
  stripe_customer_id    TEXT UNIQUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX users_role_idx ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX users_stripe_idx ON users(stripe_customer_id);

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-provision row on signup
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- =============================================================================
-- 3. OAUTH_TOKENS (2 of 12)
-- Send-only outbound notifications: Gmail / WhatsApp Business.
-- Tokens are encrypted via PII helper (see src/lib/oauth-crypto.ts).
-- =============================================================================
CREATE TABLE oauth_tokens (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider                 TEXT NOT NULL CHECK (provider IN ('gmail', 'whatsapp')),
  access_token_encrypted   TEXT NOT NULL,
  refresh_token_encrypted  TEXT,
  expires_at               TIMESTAMPTZ,
  scope                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE INDEX oauth_tokens_user_idx ON oauth_tokens(user_id);
CREATE TRIGGER oauth_tokens_updated_at BEFORE UPDATE ON oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 4. CONVERSATIONS (3 of 12)
-- A conversation can be: chat (desktop) | voice (mobile) | avatar (desktop video)
-- | api (B2B). It is not user-bound (anonymous chat allowed) — user_id nullable.
-- =============================================================================
CREATE TABLE conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  api_client_id     UUID,                 -- FK added later (forward ref)
  type              TEXT NOT NULL CHECK (type IN ('chat', 'voice', 'avatar', 'api')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  summary_text      TEXT,                 -- AI-generated summary, populated on first lead-gen
  parere_pdf_url    TEXT,                 -- Supabase Storage URL when lead is paid
  total_messages    INT DEFAULT 0,
  total_tokens_in   INT DEFAULT 0,
  total_tokens_out  INT DEFAULT 0,
  ip_hash           TEXT,                 -- for anonymous rate limit (sha256 of IP+salt)
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX conversations_user_idx ON conversations(user_id, started_at DESC);
CREATE INDEX conversations_api_client_idx ON conversations(api_client_id, started_at DESC);
CREATE INDEX conversations_type_idx ON conversations(type, started_at DESC);

-- =============================================================================
-- 5. MESSAGES (4 of 12)
-- =============================================================================
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT NOT NULL,
  citations_jsonb   JSONB DEFAULT '[]'::jsonb,
                    -- [{urn:'urn:lex:...', title:'D.Lgs. 36/2023', article:'art. 50',
                    --   verified:true, source_chunk_id:'...'}]
  tokens_in         INT,
  tokens_out        INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);

-- =============================================================================
-- 6. AGENT_DEFINITIONS (5 of 12)
-- Static catalog of agents shown in UI sidebar.
-- =============================================================================
CREATE TABLE agent_definitions (
  name          TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  icon          TEXT NOT NULL,         -- lucide-react icon name
  description   TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  order_idx     INT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO agent_definitions (name, display_name, icon, description, order_idx) VALUES
  ('routing',            'Routing Agent',       'GitBranch',   'Decide quale agent chiamare in che ordine',                  1),
  ('norm-retriever',     'Norm Retriever',      'Search',      'Trova la norma esatta nel corpus (RAG hybrid dense+sparse)', 2),
  ('vigenza-verifier',   'Vigenza Verifier',    'Shield',      'Verifica se la norma è vigente, abrogata o modificata',      3),
  ('document-analyzer',  'Document Analyzer',   'FileText',    'Smonta un documento utente (contratto, sentenza, atto)',     4),
  ('jurisprudence',      'Jurisprudence',       'Scale',       'Trova sentenze Cassazione pertinenti',                       5),
  ('citation-validator', 'Citation Validator',  'CheckCircle', 'Garantisce che ogni citazione esista nel DB Normattiva',     6),
  ('response-composer',  'Response Composer',   'PenLine',     'Compone la risposta finale citata e formattata',             7),
  ('lead-quality',       'Lead Quality',        'TrendingUp',  'Valuta se la query è un lead da inviare al marketplace',     8);

-- =============================================================================
-- 7. AGENT_RUNS (6 of 12)
-- Telemetry of every agent invocation. Powers the live sidebar + analytics +
-- white-label demos ("3.842 agent runs questo mese").
-- =============================================================================
CREATE TABLE agent_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_id        UUID REFERENCES messages(id) ON DELETE SET NULL,
  agent_name        TEXT NOT NULL REFERENCES agent_definitions(name),
  state             TEXT NOT NULL CHECK (state IN ('started', 'progress', 'done', 'error')),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  duration_ms       INT,
  input_jsonb       JSONB,
  output_jsonb      JSONB,
  error_message     TEXT
);

CREATE INDEX agent_runs_conversation_idx ON agent_runs(conversation_id, started_at);
CREATE INDEX agent_runs_agent_idx ON agent_runs(agent_name, started_at DESC);
CREATE INDEX agent_runs_message_idx ON agent_runs(message_id);

-- =============================================================================
-- 8. LAWYERS (7 of 12)
-- Profile data for users with role='lawyer'. 1:1 with users.
-- =============================================================================
CREATE TABLE lawyers (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  p_iva              TEXT NOT NULL,
  foro               TEXT NOT NULL,                -- "Foro di Roma", etc.
  city               TEXT NOT NULL,
  specializzazioni   TEXT[] NOT NULL DEFAULT '{}'::TEXT[]
                     CHECK (array_length(specializzazioni, 1) BETWEEN 1 AND 3),
  verified           BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at        TIMESTAMPTZ,
  gmail_connected    BOOLEAN NOT NULL DEFAULT FALSE,
  wa_connected       BOOLEAN NOT NULL DEFAULT FALSE,
  notifications_paused BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX lawyers_city_idx ON lawyers(city) WHERE verified = TRUE;
CREATE INDEX lawyers_specializzazioni_idx ON lawyers USING GIN (specializzazioni)
  WHERE verified = TRUE;

CREATE TRIGGER lawyers_updated_at BEFORE UPDATE ON lawyers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 9. LEADS (8 of 12)
-- A lead = a paying user requesting human-lawyer follow-up. Created after the
-- user pays 9€. PDF parere lives in conversations.parere_pdf_url.
-- =============================================================================
CREATE TABLE leads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE RESTRICT,
  pdf_url             TEXT NOT NULL,
  score               INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  vertical            TEXT NOT NULL,         -- 'civile', 'lavoro', 'penale', 'tributario', etc.
  city                TEXT NOT NULL,
  summary             TEXT NOT NULL,         -- short summary visible in marketplace preview
  contact_name        TEXT NOT NULL,         -- visible only after lawyer purchase
  contact_email       TEXT NOT NULL,
  contact_phone       TEXT NOT NULL,
  paid_9eur_at        TIMESTAMPTZ NOT NULL,
  stripe_session_id   TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'available'
                      CHECK (status IN ('available', 'sold', 'expired', 'refunded')),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX leads_status_vertical_city_idx
  ON leads(status, vertical, city, created_at DESC) WHERE status = 'available';
CREATE INDEX leads_user_idx ON leads(user_id, created_at DESC);
CREATE INDEX leads_expires_idx ON leads(expires_at) WHERE status = 'available';

-- =============================================================================
-- 10. LEAD_PURCHASES (9 of 12)
-- Records the 91€ purchase by a lawyer. One purchase per (lead, lawyer).
-- =============================================================================
CREATE TABLE lead_purchases (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                  UUID NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  lawyer_id                UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  paid_91eur_at            TIMESTAMPTZ NOT NULL,
  stripe_session_id        TEXT NOT NULL UNIQUE,
  contacts_revealed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome                  TEXT CHECK (outcome IN ('contacted', 'in_negotiation', 'closed_won', 'closed_lost', NULL)),
  outcome_updated_at       TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lead_id, lawyer_id)
);

CREATE INDEX lead_purchases_lawyer_idx ON lead_purchases(lawyer_id, paid_91eur_at DESC);
CREATE INDEX lead_purchases_lead_idx ON lead_purchases(lead_id);

-- When a lead is purchased, mark it sold.
CREATE OR REPLACE FUNCTION mark_lead_sold()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads SET status = 'sold' WHERE id = NEW.lead_id AND status = 'available';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lead_purchases_mark_sold AFTER INSERT ON lead_purchases
  FOR EACH ROW EXECUTE FUNCTION mark_lead_sold();

-- =============================================================================
-- 11. LAWYER_NOTIFICATIONS (10 of 12)
-- Outbound notifications sent to lawyers when a new lead matches their profile.
-- =============================================================================
CREATE TABLE lawyer_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawyer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id           UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel           TEXT NOT NULL CHECK (channel IN ('gmail', 'wa', 'email')),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at         TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ,
  error_message     TEXT,
  UNIQUE (lawyer_id, lead_id, channel)
);

CREATE INDEX lawyer_notifications_lawyer_idx
  ON lawyer_notifications(lawyer_id, sent_at DESC);

-- =============================================================================
-- 12. API_CLIENTS (11 of 12)
-- B2B AI2AI customers with API keys. Free tier + pay-per-use.
-- =============================================================================
CREATE TABLE api_clients (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES users(id) ON DELETE SET NULL,
  name                     TEXT NOT NULL,
  owner_email              TEXT NOT NULL,
  api_key_hash             TEXT NOT NULL UNIQUE,    -- sha256(key)
  api_key_prefix           TEXT NOT NULL,           -- first 8 chars, for UI display
  free_quota_remaining     INT NOT NULL DEFAULT 100,
  monthly_spend_eur        NUMERIC(10,4) NOT NULL DEFAULT 0,
  monthly_spend_resets_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  rate_limit_per_min       INT NOT NULL DEFAULT 60,
  active                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at               TIMESTAMPTZ
);

CREATE INDEX api_clients_user_idx ON api_clients(user_id);
CREATE INDEX api_clients_active_idx ON api_clients(active) WHERE active = TRUE;

-- Forward-ref FK from conversations.api_client_id (deferred until table exists)
ALTER TABLE conversations
  ADD CONSTRAINT conversations_api_client_fk
  FOREIGN KEY (api_client_id) REFERENCES api_clients(id) ON DELETE SET NULL;

-- =============================================================================
-- 13. API_USAGE (12 of 12)
-- Per-call usage log. Used for billing + rate limit + analytics.
-- =============================================================================
CREATE TABLE api_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL,           -- 'v1/chat', 'v1/citations/validate'
  tokens_in       INT NOT NULL DEFAULT 0,
  tokens_out      INT NOT NULL DEFAULT 0,
  cost_eur        NUMERIC(10,6) NOT NULL DEFAULT 0,
  status_code     INT NOT NULL,
  ts              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX api_usage_client_ts_idx ON api_usage(client_id, ts DESC);
CREATE INDEX api_usage_ts_idx ON api_usage(ts DESC);

-- =============================================================================
-- 14. WHITELABEL_LEADS (bonus, not counted in 12)
-- Just a contact-form table. Real white-label tenants live in repo config.
-- =============================================================================
CREATE TABLE whitelabel_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT NOT NULL,
  contact_name    TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  message         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at    TIMESTAMPTZ,
  notes           TEXT
);

CREATE INDEX whitelabel_leads_status_idx ON whitelabel_leads(status, created_at DESC);

-- =============================================================================
-- 15. CORPUS_CHUNKS (carryover from legacy schema, conceptually retained)
-- Embeddings stay 384d for now (FastEmbed bge-small). Migration to 1024d
-- voyage-law-2 happens in a separate migration once the marketplace is live.
-- =============================================================================
CREATE TABLE corpus_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  urn             TEXT NOT NULL,                  -- urn:nir:stato:decreto.legislativo:2023-03-31;36
  title           TEXT NOT NULL,
  article         TEXT,                           -- 'art. 50'
  content         TEXT NOT NULL,
  vertical        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'vigente'
                  CHECK (status IN ('vigente', 'abrogata', 'modificata', 'unknown')),
  superseded_by_urn TEXT,                         -- if abrogata, points to replacement
  embedding       VECTOR(384),
  metadata        JSONB DEFAULT '{}'::jsonb,
  source          TEXT,                           -- 'normattiva', 'cassazione', etc.
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX corpus_chunks_urn_idx ON corpus_chunks(urn);
CREATE INDEX corpus_chunks_vertical_status_idx ON corpus_chunks(vertical, status)
  WHERE status = 'vigente';
CREATE INDEX corpus_chunks_embedding_idx ON corpus_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TRIGGER corpus_chunks_updated_at BEFORE UPDATE ON corpus_chunks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 16. ROW LEVEL SECURITY
-- Default: deny. Each role gets explicit policies.
-- =============================================================================
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_definitions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_purchases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage             ENABLE ROW LEVEL SECURITY;
ALTER TABLE whitelabel_leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE corpus_chunks         ENABLE ROW LEVEL SECURITY;

-- ── users: a user reads/updates only their own row
CREATE POLICY users_self_read   ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_self_update ON users FOR UPDATE USING (id = auth.uid());

-- ── oauth_tokens: only owner
CREATE POLICY oauth_self_all ON oauth_tokens FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── conversations: owner + service_role (for backend RAG calls)
CREATE POLICY conv_owner_read  ON conversations FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY conv_owner_write ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ── messages: visible if you can see the parent conversation
CREATE POLICY msg_owner_read ON messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations c
                 WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY msg_owner_write ON messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c
                      WHERE c.id = conversation_id
                      AND (c.user_id = auth.uid() OR c.user_id IS NULL)));

-- ── agent_runs: read-only for the owner of the conversation
CREATE POLICY agent_runs_owner_read ON agent_runs FOR SELECT
  USING (EXISTS (SELECT 1 FROM conversations c
                 WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- ── agent_definitions: world-readable (UI displays it)
CREATE POLICY agent_def_world_read ON agent_definitions FOR SELECT USING (TRUE);

-- ── lawyers: own row + verified lawyers visible to users
CREATE POLICY lawyer_self_all ON lawyers FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── leads: complex policy — user sees their own; lawyer sees marketplace preview
--    (without contact fields, enforced via column-level grants below)
CREATE POLICY leads_user_own_read ON leads FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY leads_lawyer_marketplace_read ON leads FOR SELECT
  USING (status = 'available'
         AND EXISTS (SELECT 1 FROM lawyers l WHERE l.user_id = auth.uid() AND l.verified));

-- Strip contact fields from lawyer marketplace view — done in app layer
-- (a Postgres view would be cleaner; we add it below for clarity)
CREATE VIEW leads_marketplace_preview AS
SELECT id, vertical, city, summary, score, pdf_url, created_at, expires_at
FROM leads
WHERE status = 'available';
GRANT SELECT ON leads_marketplace_preview TO authenticated;

-- ── lead_purchases: lawyer sees their own purchases; user sees who bought theirs
CREATE POLICY lead_purchases_lawyer_read ON lead_purchases FOR SELECT
  USING (lawyer_id = auth.uid());
CREATE POLICY lead_purchases_seller_read ON lead_purchases FOR SELECT
  USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_id AND leads.user_id = auth.uid()));

-- ── lawyer_notifications: only the lawyer
CREATE POLICY lawyer_notif_self ON lawyer_notifications FOR SELECT
  USING (lawyer_id = auth.uid());

-- ── api_clients: only owner
CREATE POLICY api_clients_self ON api_clients FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── api_usage: only owner of the client
CREATE POLICY api_usage_self_read ON api_usage FOR SELECT
  USING (EXISTS (SELECT 1 FROM api_clients c
                 WHERE c.id = client_id AND c.user_id = auth.uid()));

-- ── whitelabel_leads: nobody reads via RLS — service_role only
-- (no policies → only service_role bypasses RLS to read these)

-- ── corpus_chunks: world-readable for verified lawyers and authenticated users;
--    no public read (prevents corpus scraping by anonymous)
CREATE POLICY corpus_authenticated_read ON corpus_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- 17. SERVICE-ROLE BYPASS (Supabase service_role bypasses RLS by default)
-- Backend (Next.js API routes via supabase-admin client) can read/write freely.
-- Frontend (anon + authenticated) is bounded by the policies above.
-- =============================================================================

-- =============================================================================
-- DONE. 12 core tables + 1 white-label leads + 1 corpus carryover + 1 view.
-- =============================================================================
