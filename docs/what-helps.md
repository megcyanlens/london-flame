# "What helps" page

https://ldnflame.com/what-helps asks **"What do you need when you're struggling?"**. It was made for a small club workshop. People type a short answer (up to 200 characters) and either stay anonymous or share their name. Every answer goes straight into the word cloud on the page, with no approval step.

It's listed in the sidebar under **Committee**. It's hidden from Google (`noindex`) and isn't in the sitemap, so share the link directly.

## What's public and what isn't

| Who sees it | What |
|---|---|
| Anyone with the link | The word cloud and the number of answers. Never the full answers or names |
| Whoever has access to the Cloudflare account | Every full answer, the time it was sent, and the name **only if the person chose to share it** |

## How it works

```
site/what-helps.html   the page (form + cloud)
site/what-helps.js     sends answers, draws the cloud
functions/api/what-helps.js   the /api/what-helps endpoint (save an answer, return word counts)
db/schema.sql          the database table
wrangler.toml          tells Cloudflare which database the endpoint uses
```

- Answers are stored in the Cloudflare **D1** database **`ldnflame-responses`**, table `responses`.
- The word cloud counts each word once per answer, so one long answer can't dominate. Common words ("and", "the", "need", "when", "struggling" and so on) are left out; the list is `STOPWORDS` in `functions/api/what-helps.js`.
- Spam protection: a hidden field bots fill in (those answers are discarded), and at most **5 answers per hour** from the same connection. The IP address itself is never stored, only a hash that changes daily, used for that limit.

## Read the answers

Cloudflare dashboard → **Storage & Databases → D1 SQL Database → `ldnflame-responses` → Console**, then run:

```sql
SELECT id, created_at, name, answer FROM responses WHERE hidden = 0 ORDER BY created_at DESC;
```

`name` is empty (NULL) for anonymous answers.

Or from a terminal in this repository:

```bash
npx wrangler d1 execute ldnflame-responses --remote --command="SELECT id, created_at, name, answer FROM responses ORDER BY created_at DESC"
```

## Remove an answer from the cloud

Hide it (keeps a record, removes it from the cloud straight away):

```sql
UPDATE responses SET hidden = 1 WHERE id = 12;
```

To delete it completely: `DELETE FROM responses WHERE id = 12;`

To start the cloud fresh (for example, each season), hide everything:

```sql
UPDATE responses SET hidden = 1 WHERE question = 'struggling';
```

## Ask a different question

1. In `site/what-helps.html`, change the `<h1>`, the lede below it, and the placeholder text in the answer box.
2. In `functions/api/what-helps.js`, change `const QUESTION = 'struggling';` to a new short label (e.g. `'proud'`), so the new cloud starts empty and the old answers are kept separately.
3. Update `<title>` and the description tags at the top of the page if the page's name changes.
4. Deploy (see [deploying.md](deploying.md)).

## If the database ever needs recreating

```bash
npx wrangler d1 create ldnflame-responses
npx wrangler d1 execute ldnflame-responses --remote --file=db/schema.sql
```

Then put the new `database_id` in `wrangler.toml` and deploy.
