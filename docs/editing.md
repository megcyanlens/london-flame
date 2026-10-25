# Editing the website

Every page is a plain HTML file in `site/`. Open it in any text editor (VS Code is a good free one), change the text, save, then [deploy](deploying.md). There's nothing to build or install.

## Which file is which page

| Page | File | Address |
|---|---|---|
| Club (home): about, join, fees, payment, tournaments, resources, governing documents | `site/index.html` | `/` |
| WFFL Team: season, JustGo, expectations, **roster**, kit, membership regulation | `site/team.html` | `/team` |
| Committee: members, open roles, captains, coaches, pitch booking | `site/committee.html` | `/committee` |
| Calendars | `site/calendars.html` | `/calendars` |
| Referee cheat sheet | `site/referee.html` | `/referee` |
| Reffing tracker | `site/ref-tracker.html` | `/ref-tracker` |
| Constitution / Safeguarding / Anti-bullying | `site/constitution.html`, `site/safeguarding.html`, `site/anti-bullying.html` | `/constitution` etc. |
| Page not found | `site/404.html` | shown for any wrong address |

Shared files: `site/site.css` (all styling), `site/site.js` (the sidebar menu and copy-link buttons), `site/images/` (screenshots, kit photos, logo).

## Update the roster

In `site/team.html`, find `<section id="roster">`. Each player is one row:

```html
<tr><td class="num">7</td><td>Caitlin Brown</td><td>Flame ’26–’27</td></tr>
```

- **Add a player:** copy a row, change the number, name and team. Rows are sorted by number, then players without numbers, then coaches.
- **No number yet:** `<td class="num empty">–</td>` instead of `<td class="num">7</td>`.
- **Remove a player:** delete their whole `<tr>…</tr>` line.
- **New season:** update the team text (e.g. `Flame ’27–’28`) on each row.

## Update the reffing tracker

In `site/ref-tracker.html`, each person is one row. The columns are name, level, then how many times they've done head ref, line of scrimmage, blitz and deep judge:

```html
<tr><td>Kate</td><td class="num">3</td><td class="tally"><span class="muted">·</span></td><td class="tally">1</td><td class="tally"><span class="muted">·</span></td><td class="tally"><span class="muted">·</span></td></tr>
```

- A count goes in as a plain number: `<td class="tally">2</td>`.
- Zero is shown as a dot: `<td class="tally"><span class="muted">·</span></td>`.
- The `<tr class="split">` row is the divider between the two groups of players.

## Update committee members, captains or coaches

In `site/committee.html`. Each role is a block like this:

```html
<div class="role">
  <h4>Social Chair</h4>
  <p class="muted">Held by Natalie Aghajanian</p>
  <p><strong>Responsibilities:</strong> …</p>
</div>
```

Change the "Held by" line when someone takes over a role. To fill an open role, move its block from `<section id="open-roles">` into `<section id="roles">`. Captains are a simple list under `<h3 id="flame-captains">`.

## Change fees or payment links

In `site/index.html`:
- **Fees:** `<section id="fees">`. Each fee has a name, a `price`, and a description containing its Monzo link.
- **Payment details and links:** `<section id="payment">`. The bank details have Copy buttons, which copy whatever is in their `data-copy="…"` attribute. Update both the visible text and `data-copy`.

## Season dates, kit, expectations

All in `site/team.html`, under `<section id="season">`, `id="kit"` and `id="expectations"`.

## The sidebar menu

Built from a single list at the top of `site/site.js` (`var NAV = { … }`), so changing it there changes it on every page.
- `['Label', 'section-id']` links to a section of that page.
- `['Label', 'page.html']` links to a separate page; these show under the dashed line with an arrow.
- **Quick links** are the list under `quick:`.

## Add a new page

1. Copy an existing simple page (e.g. `site/referee.html`) to a new name, such as `site/socials.html`.
2. In the new file, update the `<title>`, `<meta name="description">`, `og:title`, `og:description`, the **canonical** link (`https://ldnflame.com/socials`), `og:url`, and `<body data-page="socials">`.
3. Replace the content inside `<main>`.
4. Add it to the sidebar in `site/site.js`.
5. Add it to `site/sitemap.xml` so Google finds it.

## Linking to a section

Any element with an `id` can be linked to directly: `ldnflame.com/team#kit`, `ldnflame.com/#payment`. Headings on the site have a "# copy link" button that copies the link for you. If you rename an `id`, update any links to it, including the sidebar list in `site.js`.

## Images

- Put images in `site/images/` and refer to them as `images/name.jpg`.
- Always give `<img>` tags their real `width` and `height`. Without them the page jumps while images load, and section links land in the wrong place.
- Keep photos reasonably small (under ~500 KB) so the site stays fast on phones.

## Logo and favicon

The header logo is `site/images/logo.svg`, and the favicon is `site/favicon.svg`; the originals are in `brand/`. If the logo changes, replace those two files, then regenerate the PNG icons and the link-preview image:

```bash
cd tools
npm install
node icons.js
```

## Before you deploy: quick checks

- Open the changed page in your browser straight from the file (double-click it) and check that it looks right.
- If you added or renamed a page or section, click its sidebar link.
