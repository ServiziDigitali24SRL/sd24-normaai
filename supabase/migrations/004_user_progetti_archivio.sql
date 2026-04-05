-- 004_user_progetti_archivio.sql
-- Tabelle per Progetti e Archivio utente

-- =============================================
-- 1. PROGETTI
-- =============================================
CREATE TABLE IF NOT EXISTS user_progetti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descrizione TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_progetti_user ON user_progetti(user_id);

ALTER TABLE user_progetti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente vede solo i propri progetti"
  ON user_progetti FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utente crea i propri progetti"
  ON user_progetti FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utente aggiorna i propri progetti"
  ON user_progetti FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Utente elimina i propri progetti"
  ON user_progetti FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 2. ARCHIVIO
-- =============================================
CREATE TABLE IF NOT EXISTS user_archivio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titolo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'multe',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_archivio_user ON user_archivio(user_id);
CREATE INDEX idx_user_archivio_tipo ON user_archivio(user_id, tipo);

ALTER TABLE user_archivio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utente vede solo il proprio archivio"
  ON user_archivio FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Utente crea nel proprio archivio"
  ON user_archivio FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utente aggiorna il proprio archivio"
  ON user_archivio FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Utente elimina dal proprio archivio"
  ON user_archivio FOR DELETE
  USING (auth.uid() = user_id);
