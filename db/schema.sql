-- Full schema for the ldnflame-responses database (for setting up from scratch).
-- Apply with: npx wrangler d1 execute ldnflame-responses --remote --file=db/schema.sql
-- An existing database is upgraded with the files in db/migrations/ instead.

-- Answers to questions on the site, e.g. "What do you need when you're struggling?"
CREATE TABLE IF NOT EXISTS responses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question    TEXT    NOT NULL,                       -- which question this answers, e.g. 'struggling'
  answer      TEXT    NOT NULL,
  name        TEXT,                                   -- NULL when the person stayed anonymous
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  hidden      INTEGER NOT NULL DEFAULT 0,             -- set to 1 to take an answer off the page
  client_hash TEXT,                                   -- daily-salted hash of the sender's IP, only used for rate limiting
  client_id   TEXT                                    -- random id kept in the sender's browser, only used for rate limiting
);

CREATE INDEX IF NOT EXISTS idx_responses_question ON responses (question, hidden);
CREATE INDEX IF NOT EXISTS idx_responses_client ON responses (client_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_responses_client_id ON responses (client_id, created_at);

-- 👍 and 🙋 "same" reactions: one of each per device per answer
CREATE TABLE IF NOT EXISTS reactions (
  response_id INTEGER NOT NULL REFERENCES responses (id) ON DELETE CASCADE,
  kind        TEXT    NOT NULL CHECK (kind IN ('up', 'same')),
  client_id   TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (response_id, kind, client_id)
);
