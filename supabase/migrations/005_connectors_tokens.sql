-- 005_connectors_tokens.sql
-- Tabelle token per tutti i connettori (9 servizi)
-- OAuth states + token storage con RLS per user_id

-- =============================================
-- OAUTH STATES (CSRF protection)
-- =============================================

-- Google Drive
CREATE TABLE IF NOT EXISTS gdrive_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dropbox
CREATE TABLE IF NOT EXISTS dropbox_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Microsoft (OneDrive + Outlook condividono la stessa tabella)
CREATE TABLE IF NOT EXISTS microsoft_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('onedrive', 'outlook')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- DocuSign
CREATE TABLE IF NOT EXISTS docusign_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Adobe Sign
CREATE TABLE IF NOT EXISTS adobesign_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TOKEN TABLES
-- =============================================

-- Google Drive
CREATE TABLE IF NOT EXISTS user_gdrive_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scope TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_gdrive_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gdrive_select" ON user_gdrive_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gdrive_insert" ON user_gdrive_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gdrive_update" ON user_gdrive_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gdrive_delete" ON user_gdrive_tokens FOR DELETE USING (auth.uid() = user_id);

-- Dropbox
CREATE TABLE IF NOT EXISTS user_dropbox_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scope TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_dropbox_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dropbox_select" ON user_dropbox_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dropbox_insert" ON user_dropbox_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dropbox_update" ON user_dropbox_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "dropbox_delete" ON user_dropbox_tokens FOR DELETE USING (auth.uid() = user_id);

-- OneDrive
CREATE TABLE IF NOT EXISTS user_onedrive_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_onedrive_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onedrive_select" ON user_onedrive_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "onedrive_insert" ON user_onedrive_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "onedrive_update" ON user_onedrive_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "onedrive_delete" ON user_onedrive_tokens FOR DELETE USING (auth.uid() = user_id);

-- Outlook
CREATE TABLE IF NOT EXISTS user_outlook_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_outlook_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outlook_select" ON user_outlook_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "outlook_insert" ON user_outlook_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "outlook_update" ON user_outlook_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "outlook_delete" ON user_outlook_tokens FOR DELETE USING (auth.uid() = user_id);

-- DocuSign
CREATE TABLE IF NOT EXISTS user_docusign_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  account_id TEXT,
  account_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_docusign_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docusign_select" ON user_docusign_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "docusign_insert" ON user_docusign_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "docusign_update" ON user_docusign_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "docusign_delete" ON user_docusign_tokens FOR DELETE USING (auth.uid() = user_id);

-- Adobe Sign
CREATE TABLE IF NOT EXISTS user_adobesign_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  email TEXT,
  api_access_point TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_adobesign_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "adobesign_select" ON user_adobesign_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "adobesign_insert" ON user_adobesign_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "adobesign_update" ON user_adobesign_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "adobesign_delete" ON user_adobesign_tokens FOR DELETE USING (auth.uid() = user_id);

-- WhatsApp
CREATE TABLE IF NOT EXISTS user_whatsapp_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_whatsapp_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_select" ON user_whatsapp_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "whatsapp_insert" ON user_whatsapp_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "whatsapp_update" ON user_whatsapp_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "whatsapp_delete" ON user_whatsapp_tokens FOR DELETE USING (auth.uid() = user_id);

-- Telegram
CREATE TABLE IF NOT EXISTS user_telegram_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_token TEXT NOT NULL,
  bot_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_telegram_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telegram_select" ON user_telegram_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "telegram_insert" ON user_telegram_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "telegram_update" ON user_telegram_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "telegram_delete" ON user_telegram_tokens FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- CLEANUP: auto-delete expired OAuth states (>1h)
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM gdrive_oauth_states WHERE created_at < now() - interval '1 hour';
  DELETE FROM dropbox_oauth_states WHERE created_at < now() - interval '1 hour';
  DELETE FROM microsoft_oauth_states WHERE created_at < now() - interval '1 hour';
  DELETE FROM docusign_oauth_states WHERE created_at < now() - interval '1 hour';
  DELETE FROM adobesign_oauth_states WHERE created_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
