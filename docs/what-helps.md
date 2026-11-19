# "What helps" page

https://ldnflame.com/what-helps asks **"What do you need when you're struggling?"**. It was made for a small club workshop.

- People write an answer (up to 500 characters). There's an optional name box on the same line as **Share**; leave it blank to post as "Anonymous". The name stays filled in after sharing, for anyone posting more than one answer.
- After **Share**, the page scrolls down to "What our team said". Every answer appears straight away as a **bubble** there, newest first, showing the name or "Anonymous". There's no approval step.
- Each bubble has four reactions, in this order: **❤️‍🔥** (heart on fire), **⭐**, **🙋 Same** and **📝 Noted**, then **💬 Comment**. (👍 was removed from the page; any old 👍 reactions stay in the database but aren't shown.) Each device can give each reaction once per bubble; tapping again takes it back.
- **💬 Comment** opens the bubble's comments and a box to add one: up to **50 words**, with an optional name (blank shows "Anonymous").
- The page refreshes every 8 seconds, so everyone in the room sees new answers, reactions and comments appear. An open comment box keeps its text through refreshes.

It's listed in the sidebar under **Committee**. It's hidden from Google (`noindex`) and isn't in the sitemap, so share the link directly.

## What's public

Anyone with the link sees every visible answer and comment, names where people shared them, and reaction counts. Hidden answers and comments (see below) disappear from everyone's screen within a few seconds.

## How it works

```
site/what-helps.html          the page (form + bubbles)
site/what-helps.js            sends answers, reactions and comments; draws and refreshes the bubbles
functions/api/what-helps.js   the /api/what-helps endpoint
db/schema.sql                 the database tables (for setting up from scratch)
db/migrations/                changes applied to the existing database, in order
wrangler.toml                 tells Cloudflare which database the endpoint uses
```

- Everything is stored in the Cloudflare **D1** database **`ldnflame-responses`**: answers in `responses`, reactions in `reactions` (kinds `up`, `same`, `note`, `heart`, `star`), comments in `comments`.
- Each browser gets a random id, saved on that device, which is used to keep reactions to one per person and to limit posting. No accounts or logins are involved.
- Spam protection: a hidden field bots fill in (those answers are discarded). Per hour, each device can post at most **10 answers** and **30 comments**; each internet connection can post at most 150 answers and 400 comments. Those caps are generous because a whole workshop room on the same Wi-Fi shares one connection. The IP address itself is never stored, only a hash that changes daily.

## Read the answers

Cloudflare dashboard → **Storage & Databases → D1 SQL Database → `ldnflame-responses` → Console**, then run:

```sql
SELECT r.id, r.created_at, r.name, r.answer,
  (SELECT COUNT(*) FROM reactions x WHERE x.response_id = r.id) AS reactions,
  (SELECT COUNT(*) FROM comments c WHERE c.response_id = r.id AND c.hidden = 0) AS comments
FROM responses r
WHERE r.hidden = 0
ORDER BY reactions DESC;
```

`name` is empty (NULL) for anonymous answers. Sorting by reactions shows what resonated most, which is handy for the end of a workshop.

Reactions broken down by type:

```sql
SELECT response_id, kind, COUNT(*) AS n FROM reactions GROUP BY response_id, kind ORDER BY response_id, kind;
```

All comments, with the answer they belong to:

```sql
SELECT c.id, c.response_id, c.created_at, c.name, c.body FROM comments c ORDER BY c.response_id, c.id;
```

## Remove an answer or comment

Hide it (keeps a record, removes it from everyone's screen within seconds):

```sql
UPDATE responses SET hidden = 1 WHERE id = 12;   -- an answer (its comments disappear with it)
UPDATE comments  SET hidden = 1 WHERE id = 34;   -- a single comment
```

To delete an answer completely, with its reactions and comments:

```sql
DELETE FROM reactions WHERE response_id = 12;
DELETE FROM comments  WHERE response_id = 12;
DELETE FROM responses WHERE id = 12;
```

To clear the board before the next workshop, hide everything:

```sql
UPDATE responses SET hidden = 1 WHERE question = 'struggling';
```

## Ask a different question

1. In `site/what-helps.html`, change the `<h1>`, the placeholder text in the answer box, and the `<title>` and description tags at the top.
2. In `functions/api/what-helps.js`, change `const QUESTION = 'struggling';` to a new short label (e.g. `'proud'`), so the new question starts with an empty board and the old answers are kept separately.
3. Deploy (see [deploying.md](deploying.md)).

## Add or change a reaction

1. Add it to `REACTIONS` in `site/what-helps.js` and `KINDS` in `functions/api/what-helps.js`, using a short lowercase name.
2. The database only accepts the listed kinds, so add a migration in `db/migrations/` that rebuilds the `reactions` table with the new name in its `CHECK (kind IN (...))` list (copy `0003_more_reactions.sql`), apply it with `npx wrangler d1 execute ldnflame-responses --remote --file=...`, and update `db/schema.sql` to match.
3. Deploy.

## If the database ever needs recreating

```bash
npx wrangler d1 create ldnflame-responses
npx wrangler d1 execute ldnflame-responses --remote --file=db/schema.sql
```

Then put the new `database_id` in `wrangler.toml` and deploy.
