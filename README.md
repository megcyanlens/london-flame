# London Flame website

The club website at **https://ldnflame.com**: a plain HTML site (no build step) hosted on Cloudflare Pages.

## Where to find things

| I want to… | Read |
|---|---|
| Know which account or service runs what (domain, Cloudflare, Google, Instagram, payments) | [docs/services.md](docs/services.md) |
| Fix or change club email (`committee@ldnflame.com`) | [docs/email.md](docs/email.md) |
| Update the roster, reffing tracker, committee, fees or any page | [docs/editing.md](docs/editing.md) |
| Put my changes live on ldnflame.com | [docs/deploying.md](docs/deploying.md) |

## What's in this repository

```
site/      The website. Everything in here is published to ldnflame.com.
docs/      These instructions. Never published.
brand/     Original London Flame logo files (from the "Flame Logos" Google Drive folder).
tools/     Helper script that regenerates the favicon and link-preview images from the logos.
```

Keep anything private (notes, drafts, passwords) **out of `site/`**: every file in that folder becomes public.

## The 30-second version

1. Edit the HTML file for the page you want to change, in `site/`.
2. Deploy: `npx wrangler pages deploy site --project-name=ldnflame --branch=main` (details in [docs/deploying.md](docs/deploying.md)).
3. Check https://ldnflame.com, then commit and push your change to GitHub.
