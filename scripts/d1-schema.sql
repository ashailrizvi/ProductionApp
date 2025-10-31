-- D1 schema for generic JSON store used by Cloudflare Pages Function
-- This avoids per-table schemas and mirrors the local dev JSON files model.

CREATE TABLE IF NOT EXISTS kv (
  table_name TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (table_name, id)
);

CREATE INDEX IF NOT EXISTS idx_kv_table ON kv(table_name);

