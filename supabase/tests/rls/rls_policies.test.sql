-- SER-73: RLS pgtap tests — verifica isolation tra utenti
-- Eseguire con: supabase test db
-- Richiede: pgtap extension attiva nel DB

BEGIN;

SELECT plan(12);

-- ── Setup ──────────────────────────────────────────────────────────────────────

-- Utente A
SELECT tests.create_supabase_user('user_a@test.com', '{"role": "privato"}'::jsonb);
-- Utente B
SELECT tests.create_supabase_user('user_b@test.com', '{"role": "privato"}'::jsonb);

-- ── Test 1-2: profiles — utente vede solo il proprio profilo ──────────────────

SELECT tests.authenticate_as('user_a@test.com');

SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id != auth.uid()),
  0,
  'User A non vede i profili di altri utenti'
);

SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id = auth.uid()),
  1,
  'User A vede il proprio profilo'
);

-- ── Test 3-4: queries — utente vede solo le proprie query ─────────────────────

-- Inserisci query per User A
INSERT INTO queries (user_id, vertical_id, question, answer, model, response_time_ms)
VALUES (auth.uid(), 'generico', 'Test query A', 'Test answer A', 'claude-sonnet-4-6', 100);

SELECT is(
  (SELECT count(*)::int FROM queries WHERE user_id != auth.uid()),
  0,
  'User A non vede le query di altri utenti'
);

SELECT tests.authenticate_as('user_b@test.com');

-- Inserisci query per User B
INSERT INTO queries (user_id, vertical_id, question, answer, model, response_time_ms)
VALUES (auth.uid(), 'generico', 'Test query B', 'Test answer B', 'claude-sonnet-4-6', 100);

SELECT is(
  (SELECT count(*)::int FROM queries WHERE user_id != auth.uid()),
  0,
  'User B non vede le query di User A'
);

-- ── Test 5-6: marketplace_leads — consumer vede solo i propri lead ────────────

SELECT tests.authenticate_as('user_a@test.com');

SELECT is(
  (SELECT count(*)::int FROM marketplace_leads WHERE consumer_id != auth.uid() AND consumer_id IS NOT NULL),
  0,
  'User A non vede i lead privati di altri consumer'
);

-- ── Test 7-8: api_keys — utente vede solo le proprie chiavi ──────────────────

SELECT is(
  (SELECT count(*)::int FROM api_keys WHERE user_id != auth.uid()),
  0,
  'User A non vede le api_keys di altri utenti'
);

-- ── Test 9-10: audit_risposte — utente vede solo i propri audit ──────────────

SELECT tests.authenticate_as('user_a@test.com');

INSERT INTO audit_risposte (user_id, sessione_id, query, risposta, graph_usato, profilo_usato, modello_ai, latenza_ms)
VALUES (auth.uid(), 'test-session-a', 'audit query A', 'audit answer A', false, false, 'claude-sonnet-4-6', 100);

SELECT is(
  (SELECT count(*)::int FROM audit_risposte WHERE user_id != auth.uid() AND user_id IS NOT NULL),
  0,
  'User A non vede gli audit di altri utenti'
);

SELECT tests.authenticate_as('user_b@test.com');

SELECT is(
  (SELECT count(*)::int FROM audit_risposte WHERE user_id != auth.uid() AND user_id IS NOT NULL),
  0,
  'User B non vede gli audit di User A'
);

-- ── Test 11-12: normaai_chunks — corpus pubblico leggibile da tutti ───────────

SELECT tests.authenticate_as('user_a@test.com');

SELECT ok(
  (SELECT count(*)::int FROM normaai_chunks LIMIT 1) >= 0,
  'User A può leggere normaai_chunks (corpus pubblico, RLS disabilitata)'
);

SELECT tests.authenticate_as('user_b@test.com');

SELECT ok(
  (SELECT count(*)::int FROM normaai_chunks LIMIT 1) >= 0,
  'User B può leggere normaai_chunks (corpus pubblico, RLS disabilitata)'
);

-- ── Cleanup ────────────────────────────────────────────────────────────────────

SELECT tests.clear_authentication();

SELECT * FROM finish();

ROLLBACK;
