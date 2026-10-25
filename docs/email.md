# Club email: `committee@ldnflame.com`

There's no separate mailbox. Mail to the club address is **forwarded by Cloudflare** to the committee Gmail, and replies are **sent from Gmail** using the club address.

```
someone ──▶ committee@ldnflame.com ──(Cloudflare Email Routing)──▶ committee.ldnflame@gmail.com
committee.ldnflame@gmail.com ──(Gmail "Send mail as", smtp.gmail.com)──▶ recipient sees committee@ldnflame.com
```

It costs nothing: no Google Workspace subscription is needed.

## Receiving

Set up in Cloudflare → ldnflame.com → **Email → Email Routing**.

- **Destination addresses:** `committee.ldnflame@gmail.com` (must show *Verified*).
- **Routing rules:** custom address `committee@ldnflame.com` → *Send to an email* → `committee.ldnflame@gmail.com`.
- Optional **catch-all** rule: forwards anything else `@ldnflame.com` (including typos) to the same inbox.

**Add a new address** (e.g. `kit@ldnflame.com`): Routing rules → **Create address** → enter `kit` → send to the right Gmail. If it should go to a different person's inbox, add their address under *Destination addresses* first; they must click Cloudflare's verification email before forwarding works.

## Sending as committee@ldnflame.com

Set up in Gmail → ⚙️ **See all settings → Accounts and Import → Send mail as**:

| Field | Value |
|---|---|
| Name / Email | London Flame / `committee@ldnflame.com` |
| SMTP server | `smtp.gmail.com`, port `587`, TLS |
| Username | the full Gmail address of the account doing the sending |
| Password | a Google **App Password** for that account (myaccount.google.com/apppasswords; needs 2-Step Verification) |

When writing an email, pick `committee@ldnflame.com` in the **From** field. To make it the default: Send mail as → **make default**.

If the App Password is revoked, or the Google password changes, sending stops with an authentication error. Create a new App Password and update it under Send mail as → **edit info**.

## The DNS records that make it work

All in Cloudflare → DNS → Records. Don't change these unless you know why:

| Record | Value | Why |
|---|---|---|
| MX (×3) | `route1/2/3.mx.cloudflare.net` | Delivers incoming mail to Cloudflare |
| TXT `ldnflame.com` (SPF) | `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all` | Allows Cloudflare **and Gmail** to send as ldnflame.com. Remove Google and your sent mail lands in spam |
| TXT `_dmarc` | `v=DMARC1; p=none; ...` | Must stay `p=none`. Squarespace set it to `p=reject`, which makes other servers **reject** email sent from Gmail as the club address |
| TXT `cf2024-1._domainkey` | `v=DKIM1; ...` | Cloudflare's signing key for forwarded mail |

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Bounce: `550 5.1.1 Address does not exist` | No active routing rule for that address, or the destination isn't verified. Check Email Routing → Routing rules and Destination addresses |
| Mail to the club address never arrives | Check Gmail's Spam folder. Check that Email Routing is **Enabled** and the MX records still exist |
| Sent mail goes to recipients' spam | SPF must include `_spf.google.com`. Recipients may see "via gmail.com", which is expected with this setup |
| Sent mail bounces with a DMARC or policy error | `_dmarc` was set back to `p=reject`. Change it to `p=none` |
| Gmail says SMTP authentication failed | App Password revoked or Google password changed. Make a new App Password |

## If we outgrow this

For separate mailboxes per committee member, or to stop the "via gmail.com" label, move to a paid provider (e.g. Google Workspace Business Starter, about £6–7 per user per month). That means replacing the MX records, SPF and DKIM with the provider's, and turning off Cloudflare Email Routing.
