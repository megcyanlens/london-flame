-- Adds 📝 note, ❤️ heart and ⭐ star reactions alongside 👍 up and 🙋 same.
-- SQLite can't change a CHECK constraint in place, so the table is rebuilt and the existing reactions copied over.
-- Applied once on 2026-11-19 with:
--   npx wrangler d1 execute ldnflame-responses --remote --file=db/migrations/0003_more_reactions.sql
CREATE TABLE reactions_new (
  response_id INTEGER NOT NULL REFERENCES responses (id) ON DELETE CASCADE,
  kind        TEXT    NOT NULL CHECK (kind IN ('up', 'same', 'note', 'heart', 'star')),
  client_id   TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (response_id, kind, client_id)
);
INSERT INTO reactions_new (response_id, kind, client_id, created_at)
  SELECT response_id, kind, client_id, created_at FROM reactions;
DROP TABLE reactions;
ALTER TABLE reactions_new RENAME TO reactions;
