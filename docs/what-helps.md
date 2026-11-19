# "What helps" page

https://ldnflame.com/what-helps asks **"What do you need when you're struggling?"**. It was made for a small club workshop.

- People write an answer (up to 500 characters) and either stay anonymous or share their name.
- Every answer appears straight away as a **bubble** on the page, newest first, showing the name or "Anonymous". There's no approval step.
- Each bubble has two reactions: **👍** and **🙋 Same**. Each device can give each reaction once per bubble; tapping again takes it back.
- The page refreshes the bubbles every 8 seconds, so everyone in the room sees new answers and reaction counts appear.

It's listed in the sidebar under **Committee**. It's hidden from Google (`noindex`) and isn't in the sitemap, so share the link directly.

## What's public

Anyone with the link sees every visible answer, the name if the person shared it, and the reaction counts. Hidden answers (see below) disappear from everyone's screen within a few seconds.

## How it works

```
site/what-helps.html          the page (form + bubbles)
site/what-helps.js            sends answers and reactions, draws and refreshes the bubbles
functions/api/what-helps.js   the /api/what-helps endpoint
db/schema.sql                 the database tables (for setting up from scratch)
db/migrations/                changes applied to the existing database, in order
wrangler.toml                 tells Cloudflare which database the endpoint uses
```

- Everything is stored in the Cloudflare **D1** database **`ldnflame-responses`**: answers in `responses`, reactions in `reactions`.
- Each browser gets a random id, saved on that device, which is used to keep reactions to one per person and to limit answers. No accounts or logins are involved.
- Spam protection: a hidden field bots fill in (those answers are discarded); at most **10 answers per device per hour**; and at most **150 per internet connection per hour**. That's generous because a whole workshop room on the same Wi-Fi shares one connection. The IP address itself is never stored, only a hash that changes daily.

## Read the answers

Cloudflare dashboard → **Storage & Databases → D1 SQL Database → `ldnflame-responses` → Console**, then run:

```sql
SELECT r.id, r.created_at, r.name, r.answer,
  (SELECT COUNT(*) FROM reactions x WHERE x.response_id = r.id AND x.kind = 'up')   AS thumbs_up,
  (SELECT COUNT(*) FROM reactions x WHERE x.response_id = r.id AND x.kind = 'same') AS same
FROM responses r
WHERE r.hidden = 0
ORDER BY same + thumbs_up DESC;
```

`name` is empty (NULL) for anonymous answers. Sorting by reactions shows what resonated most, which is handy for the end of a workshop.

Or from a terminal in this repository:

```bash
npx wrangler d1 execute ldnflame-responses --remote --command="SELECT id, created_at, name, answer FROM responses ORDER BY id DESC"
```

## Remove an answer

Hide it (keeps a record, removes it from everyone's screen within seconds):

```sql
UPDATE responses SET hidden = 1 WHERE id = 12;
```

To delete it and its reactions completely:

```sql
DELETE FROM reactions WHERE response_id = 12;
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

## If the database ever needs recreating

```bash
npx wrangler d1 create ldnflame-responses
npx wrangler d1 execute ldnflame-responses --remote --file=db/schema.sql
```

Then put the new `database_id` in `wrangler.toml` and deploy.
