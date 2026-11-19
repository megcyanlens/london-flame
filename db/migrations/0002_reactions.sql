-- Adds per-device ids and 👍 / 🙋 "same" reactions to the What helps answers.
-- Applied once on 2026-11-19 with:
--   npx wrangler d1 execute ldnflame-responses --remote --file=db/migrations/0002_reactions.sql
ALTER TABLE responses ADD COLUMN client_id TEXT;
CREATE INDEX IF NOT EXISTS idx_responses_client_id ON responses (client_id, created_at);

CREATE TABLE IF NOT EXISTS reactions (
  response_id INTEGER NOT NULL REFERENCES responses (id) ON DELETE CASCADE,
  kind        TEXT    NOT NULL CHECK (kind IN ('up', 'same')),
  client_id   TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (response_id, kind, client_id)
);
