-- SER-85: Monitor Gazzetta Ufficiale — tabella log pubblicazioni rilevate

CREATE TABLE IF NOT EXISTS gu_monitor_log (
  id                  BIGSERIAL    PRIMARY KEY,
  gu_id               TEXT         NOT NULL UNIQUE,
  titolo              TEXT         NOT NULL,
  tipo_atto           TEXT         NOT NULL,
  data_pubblicazione  DATE         NOT NULL,
  url_gu              TEXT,
  rilevanza_score     INT          NOT NULL DEFAULT 0,
  verticali_coinvolti TEXT[]       NOT NULL DEFAULT '{}',
  status              TEXT         NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'skipped', 'corpus_updated')),
  raw_data            JSONB,
  processed_at        TIMESTAMPTZ,
  corpus_version_tag  TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gu_monitor_log_date    ON gu_monitor_log(data_pubblicazione DESC);
CREATE INDEX IF NOT EXISTS idx_gu_monitor_log_status  ON gu_monitor_log(status);
CREATE INDEX IF NOT EXISTS idx_gu_monitor_log_score   ON gu_monitor_log(rilevanza_score DESC);

ALTER TABLE gu_monitor_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gu_monitor_service_only" ON gu_monitor_log
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE gu_monitor_log IS
  'SER-85: Log pubblicazioni GU rilevanti per aggiornamento corpus NormaAI';
