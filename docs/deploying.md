# Putting changes live

The site is deployed by uploading the `site/` folder, plus the `functions/` endpoints, to the Cloudflare Pages project **`ldnflame`**. It takes about 10 seconds. Pushing to GitHub does **not** deploy by itself.

## One-time setup on a new computer

1. Install [Node.js](https://nodejs.org) (the LTS version).
2. Sign in to Cloudflare from a terminal in this repository's folder:
   ```bash
   npx wrangler login
   ```
   A Cloudflare page opens in your browser. Sign in with the account that owns the `ldnflame` project and click **Allow**. If no page opens, copy the link the terminal prints into your browser on the same computer.

   To give someone else access, invite them to the Cloudflare account (dashboard → Manage account → Members) rather than sharing a login.

## Deploy

From the repository's top folder:

```bash
node tools/bust-cache.js
npx wrangler pages deploy --branch=main
```

The first line stamps each page's links to `site.css` and the `.js` files with a version (e.g. `site.css?v=82e7e299`) that changes whenever the file changes. **Don't skip it after editing CSS or JavaScript.** Cloudflare lets browsers keep those files for 4 hours, so without new versions people can get a new page with an old script, and things break (for example, forms that won't send). It only touches pages whose files changed, and it's safe to run every time.

The second line reads `wrangler.toml`, which says to publish `site/`, include the `functions/` endpoints, and connect them to the `ldnflame-responses` database. Always run it from the top folder, so it finds that file.

To try a change before it goes live, deploy to a preview branch instead, e.g. `--branch=preview`. Cloudflare gives it its own `…ldnflame.pages.dev` address and leaves ldnflame.com untouched. Previews share the real database, so delete any test answers afterwards (see [what-helps.md](what-helps.md)).

When it prints `Deployment complete!`, the change is live on https://ldnflame.com, usually within a minute. Do a hard refresh (Ctrl+F5 / Cmd+Shift+R) if you still see the old version.

Then save the change to GitHub:

```bash
git add -A
git commit -m "Update roster for 2027 season"
git push
```

## Undo a bad deploy

Cloudflare dashboard → Workers & Pages → `ldnflame` → **Deployments** → find the last good version → ⋯ → **Rollback to this deployment**. Then fix the files and deploy again.

## Things the site relies on

| File | Purpose |
|---|---|
| `site/_headers` | Keeps `ldnflame.pages.dev` (the backup address) out of Google |
| `site/404.html` | The "page not found" page |
| `site/robots.txt`, `site/sitemap.xml` | Help Google find every page. Add new pages to the sitemap |
| Canonical tags in each page's `<head>` | Tell Google the official address of each page |

Cloudflare serves `team.html` at `/team` and so on, without the `.html`. Links between pages can use either form.
