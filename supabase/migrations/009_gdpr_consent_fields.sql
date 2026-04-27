-- ⚠️  FILE RINOMINATO — usare 009b_gdpr_consent_fields.sql
-- Questo file è mantenuto per compatibilità storica locale.
-- La versione canonica su Supabase Cloud è timestamped: 20260408175451
-- Migration 009b: GDPR Consent Fields + DSAR Table
-- Art. 7 GDPR — Prova del consenso
-- Art. 17 GDPR — Diritto all'oblio
-- Art. 20 GDPR — Portabilità
-- Data: 2026-04-08

-- 1. Add consent fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_privacy_policy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_terms boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_marketing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_analytics boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_lead_marketplace boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip_address text,
  ADD COLUMN IF NOT EXISTS declaration_legal_age boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Index on consent fields for GDPR audit queries
CREATE INDEX IF NOT EXISTS idx_profiles_consent_privacy ON public.profiles(consent_privacy_policy);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. DSAR requests table (Data Subject Access Requests — art. 15-22 GDPR)
CREATE TABLE IF NOT EXISTS public.dsar_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type IN ('access', 'rectify', 'delete', 'restrict', 'export', 'oppose')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  ip_address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. RLS for dsar_requests
ALTER TABLE public.dsar_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DSAR requests"
  ON public.dsar_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all DSAR requests
CREATE POLICY "Service role manages DSAR"
  ON public.dsar_requests FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Audit log for data lifecycle (retention enforcement)
CREATE TABLE IF NOT EXISTS public.audit_data_lifecycle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  table_name text NOT NULL,
  record_count integer DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb
);

-- Grant access
GRANT SELECT ON public.dsar_requests TO authenticated;
GRANT ALL ON public.dsar_requests TO service_role;
GRANT ALL ON public.audit_data_lifecycle TO service_role;
