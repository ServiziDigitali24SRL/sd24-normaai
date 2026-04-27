-- Migration 012: Fix RLS service_full policies
-- Security review 2026-04-27: all "service_full" policies were incorrectly
-- scoped to TO public (all users) instead of TO service_role.
-- With qual=true this allowed any anonymous user with the anon key to
-- SELECT/INSERT/UPDATE/DELETE all rows on leads, documents, outbound_log,
-- normaai_chunks, usage_limits, and all OAuth state tables.
-- The backend already uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so restricting to service_role has no impact on application behaviour.

-- leads (PII) — already applied manually 2026-04-27
DROP POLICY IF EXISTS "service_full" ON leads;
CREATE POLICY "service_full" ON leads TO service_role USING (true) WITH CHECK (true);

-- documents
DROP POLICY IF EXISTS "service_full" ON documents;
CREATE POLICY "service_full" ON documents TO service_role USING (true) WITH CHECK (true);

-- outbound_log
DROP POLICY IF EXISTS "service_full" ON outbound_log;
CREATE POLICY "service_full" ON outbound_log TO service_role USING (true) WITH CHECK (true);

-- usage_limits
DROP POLICY IF EXISTS "service_full" ON usage_limits;
CREATE POLICY "service_full" ON usage_limits TO service_role USING (true) WITH CHECK (true);

-- normaai_chunks (RAG corpus — write access not needed for anon users)
DROP POLICY IF EXISTS "service_full" ON normaai_chunks;
CREATE POLICY "service_full" ON normaai_chunks TO service_role USING (true) WITH CHECK (true);

-- api_usage: anyone could insert usage records for arbitrary user_id
DROP POLICY IF EXISTS "service can insert api usage" ON api_usage;
CREATE POLICY "service can insert api usage" ON api_usage TO service_role USING (true) WITH CHECK (true);

-- OAuth state tables (ephemeral, but should not be world-readable/writable)
DROP POLICY IF EXISTS "service_full" ON adobesign_oauth_states;
CREATE POLICY "service_full" ON adobesign_oauth_states TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_full" ON docusign_oauth_states;
CREATE POLICY "service_full" ON docusign_oauth_states TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_full" ON dropbox_oauth_states;
CREATE POLICY "service_full" ON dropbox_oauth_states TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_full" ON gdrive_oauth_states;
CREATE POLICY "service_full" ON gdrive_oauth_states TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_full" ON gmail_oauth_states;
CREATE POLICY "service_full" ON gmail_oauth_states TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_full" ON microsoft_oauth_states;
CREATE POLICY "service_full" ON microsoft_oauth_states TO service_role USING (true) WITH CHECK (true);
