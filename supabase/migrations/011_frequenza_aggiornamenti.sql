-- Migration 011 — Aggiungi frequenza_aggiornamenti a profiles
-- Allinea onboarding desktop con mobile: stessa raccolta preferenze

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS frequenza_aggiornamenti TEXT
    CHECK (frequenza_aggiornamenti IN ('daily', 'weekly', 'monthly', 'silent'))
    DEFAULT NULL;

COMMENT ON COLUMN profiles.frequenza_aggiornamenti IS
  'Preferenza frequenza notifiche normative: daily | weekly | monthly | silent';
