-- Responses to questions on the site, e.g. "What do you need when you're struggling?"
-- Apply with: npx wrangler d1 execute ldnflame-responses --remote --file=db/schema.sql
CREATE TABLE IF NOT EXISTS responses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question    TEXT    NOT NULL,                       -- which question this answers, e.g. 'struggling'
  answer      TEXT    NOT NULL,
  name        TEXT,                                   -- NULL when the person stayed anonymous
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  hidden      INTEGER NOT NULL DEFAULT 0,             -- set to 1 to remove an answer from the word cloud
  client_hash TEXT                                    -- daily-salted hash of the sender's IP, only used for rate limiting
);

CREATE INDEX IF NOT EXISTS idx_responses_question ON responses (question, hidden);
CREATE INDEX IF NOT EXISTS idx_responses_client ON responses (client_hash, created_at);
