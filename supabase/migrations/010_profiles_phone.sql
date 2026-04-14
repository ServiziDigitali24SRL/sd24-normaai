-- Migration 010: aggiunge campo phone a profiles per SMS/WhatsApp Twilio

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN profiles.phone IS 'Numero E.164 es. +393331234567 — usato per SMS OTP e WhatsApp notifiche lead';
