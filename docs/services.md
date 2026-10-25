# Accounts and services

Everything the website and club email depend on, and who controls it. No passwords live here: sign-ins belong to the account owners.

## At a glance

| Thing | Where it lives | Signed in as |
|---|---|---|
| Domain registration (`ldnflame.com`) | Squarespace Domains | Club Squarespace account |
| DNS (where the domain points) | Cloudflare | `Meg@cyanlens.com's Account` |
| Website hosting | Cloudflare Pages, project **`ldnflame`** | `Meg@cyanlens.com's Account` |
| Club email forwarding | Cloudflare Email Routing | `Meg@cyanlens.com's Account` |
| Club inbox, calendar, Drive | Google: `committee.ldnflame@gmail.com` | Committee Google account |
| Google Search | Google Search Console, property **ldnflame.com** (Domain) | The Google account that added it |
| Website code and docs | This GitHub repository | Meghann MacDonald |
| Instagram | [@ldnflame](https://www.instagram.com/ldnflame/) (bio links to ldnflame.com) | Club Instagram |
| Payments | Monzo payment links (listed on the Club page) | Club Monzo |

## Domain: Squarespace

- `ldnflame.com` is **registered** with Squarespace Domains. Renewal and billing happen there.
- Squarespace no longer controls where the domain points: its **nameservers are set to Cloudflare** (`ignacio.ns.cloudflare.com`, `lana.ns.cloudflare.com`).
- ⚠️ Squarespace's own DNS page still shows old records. **Ignore it: changes there do nothing.** All DNS edits happen in Cloudflare.
- Don't let the domain lapse. If it expires, the website and email both stop.

## Cloudflare

Dashboard: https://dash.cloudflare.com → **ldnflame.com** (Free plan).

**DNS records** (Cloudflare → ldnflame.com → DNS → Records):

| Type | Name | Content | What it's for |
|---|---|---|---|
| CNAME | `ldnflame.com` | `ldnflame.pages.dev` (proxied) | Website |
| CNAME | `www` | `ldnflame.pages.dev` (proxied) | Website |
| MX ×3 | `ldnflame.com` | `route1/2/3.mx.cloudflare.net` | Receiving email, managed by Email Routing |
| TXT | `ldnflame.com` | `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all` | Which servers may send our email (SPF) |
| TXT | `_dmarc` | `v=DMARC1; p=none; ...` | Email policy (DMARC). Must stay `p=none` while sending through Gmail |
| TXT | `cf2024-1._domainkey` | `v=DKIM1; ...` | Cloudflare's email signing key, managed by Email Routing |
| TXT | `ldnflame.com` | `google-site-verification=...` | Proves to Google Search Console that we own the domain. Don't delete |
| CNAME | `_domainconnect` | `...squarespace.com` | Left over from Squarespace; harmless |
| TXT | `_domainkey` | `v=DKIM1; p=` | Left over from Squarespace; harmless |

**Pages** (Cloudflare → Workers & Pages → `ldnflame`):
- The site is uploaded straight from this repo's `site/` folder (see [deploying.md](deploying.md)). It is *not* connected to GitHub, so pushing to GitHub doesn't deploy by itself.
- Custom domains: `ldnflame.com` and `www.ldnflame.com`.
- Backup address: https://ldnflame.pages.dev. It's hidden from search engines by `site/_headers`, so only ldnflame.com shows up in Google.
- The Deployments tab keeps every past version. To undo a bad deploy, open an older one and choose **Rollback**.

**Email Routing** (Cloudflare → ldnflame.com → Email → Email Routing): see [email.md](email.md).

## Google: `committee.ldnflame@gmail.com`

- **Inbox:** all mail to `committee@ldnflame.com` is forwarded here.
- **Club calendar:** owned by this account. Its public addresses are used on the Calendars page (`site/calendars.html`). If the calendar ever moves to another account, update those links.
- **Google Drive folders linked from the site:**
  - London Flame Club Resources: `1-sQuJgCy4o0lIE-V8nxb54xwNygMSAr6`
    - Governing documents (Player Agreement PDF): `18t0uvw8ZMyZsyBXd5OQucGImI46AkrTw`
    - Flame Logos: `1-Y078RIPDSEijYuN4IPHkCOGDim7W2KB`
  - WFFL Team Folder: `1Bmp1IxPQZMZNbpJbwMni476nJgDv3pu2`
  - Coach-only Drive: `1wJOPdlDRIdsi4Wm5a5qjLjM8QLOun1Fm`
  - Open any of them at `https://drive.google.com/drive/folders/<id>`.
- **Search Console:** https://search.google.com/search-console, property `ldnflame.com`. The sitemap submitted there is `https://ldnflame.com/sitemap.xml`.

## Old Notion site

The previous site, https://ldnflame.notion.site, is still public. The new site's governing documents (constitution, safeguarding and anti-bullying policies) were copied from it in October 2026. **Edits made in Notion don't reach the website.** Edit `site/` instead. Consider unpublishing the Notion site so people don't land on old information.
