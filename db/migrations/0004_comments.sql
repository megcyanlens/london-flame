-- Short comments (up to 50 words) on What helps answers.
-- Applied once on 2026-11-19 with:
--   npx wrangler d1 execute ldnflame-responses --remote --file=db/migrations/0004_comments.sql
CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  response_id INTEGER NOT NULL REFERENCES responses (id) ON DELETE CASCADE,
  body        TEXT    NOT NULL,
  name        TEXT,                                   -- NULL shows as "Anonymous"
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  hidden      INTEGER NOT NULL DEFAULT 0,             -- set to 1 to take a comment off the page
  client_hash TEXT,                                   -- daily-salted hash of the sender's IP, only used for rate limiting
  client_id   TEXT                                    -- random id kept in the sender's browser, only used for rate limiting
);
CREATE INDEX IF NOT EXISTS idx_comments_response ON comments (response_id, hidden);
CREATE INDEX IF NOT EXISTS idx_comments_client_id ON comments (client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_client ON comments (client_hash, created_at);
