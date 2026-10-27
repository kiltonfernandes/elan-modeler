CREATE TABLE IF NOT EXISTS elan_models (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  diagram_count INTEGER NOT NULL CHECK (diagram_count BETWEEN 1 AND 100),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS elan_models_active_updated
  ON elan_models(archived_at, updated_at DESC, id DESC);
