# Operating numarket: start here

**As of October 10, 2026.** Owner: Brandon. Internal. Don't share outside numarket.

**Just back, or starting fresh? Open [`50-day-plan.md`](50-day-plan.md) first:** today's
checklist and the week-by-week path to the first client.

This is the one page for running the business: what to switch on, where
everything lives, which accounts you need, and the weekly rhythm. The
step-by-step procedures are in [`sops.md`](sops.md). The build plan is in
[`../production-plan.md`](../production-plan.md); the sales kit and contracts
list are in [`../selling-checklist.md`](../selling-checklist.md).

---

## 1. Where things stand today (checked October 10; unchanged on October 23)

| What | Status | What it means |
|---|---|---|
| **numarket.us** | ⚠️ Shows the **old** single-page site from April 29 (repo `numarket-technologies/website`, GitHub Pages). | None of the new pages are live: pricing, products, solutions and industries, demos, security, contact, legal. The new site (`thepacheco/numarket-website`) builds cleanly but has never been published. |
| **app.numarket.us** (Portal demo) | ❌ Not live. No DNS record, no Vercel project yet. | README §1 of this repo. |
| Lead capture | ✅ The new site's Contact and Support forms send to a Google Sheet (Google Apps Script). Calendly link works. | Only once the new site is live. Today's live site doesn't have them. |
| Email (hello@numarket.us) | ⚠️ IONOS mail works (MX, DKIM, DMARC set). **No SPF record.** | Sales emails are more likely to land in spam until SPF is added. |
| LinkedIn | ❌ No company page linked from the site. | `content/site.ts` → `linkedin` is empty. |
| Security updates | ✅ October 23: both sites on Next.js 16.4.3 (fixes a critical advisory); `npm audit` clean. | Deploy from the latest `main`. |
| Website ↔ demo | ✅ October 23: website Demos page links to the Portal demo; the demo links back to numarket.us and the Readiness Check. | Works once both are live. |

---

## 2. Go-live checklist (do these in order)

### Day 1: get both sites live (about 2 hours)

**A. Publish the new website on Vercel** (same team as the Portal, so one place for both)
1. Vercel → Add New → Project → import **thepacheco/numarket-website**. Name it `numarket-website`. Framework Next.js; no settings to change.
2. Deploy and check the `.vercel.app` address: Home, Pricing, Contact (send yourself one test through the form and confirm it lands in the Google Sheet), Demos, Legal pages.
3. Project → Settings → Domains → add `numarket.us` and `www.numarket.us` (set www to redirect to numarket.us).
4. At IONOS → numarket.us → DNS, **replace** the GitHub Pages records with the ones Vercel shows:
   - `@` A records `185.199.108–111.153` → delete; add `A @ 76.76.21.21` (or the value Vercel shows).
   - `www` CNAME `numarket-technologies.github.io` → change to `cname.vercel-dns.com` (or the value Vercel shows).
   - Leave the MX, DKIM, DMARC records alone.
5. When Vercel shows Valid Configuration, open numarket.us on your phone and computer.
6. Then archive the old repo `numarket-technologies/website` (GitHub → Settings → Archive) and turn off its GitHub Pages, so it can't come back by accident. It's public, so also check that it holds nothing you don't want public.

**B. Publish the Portal demo** at app.numarket.us: follow this repo's README §1
(import, Neon database, two settings, CNAME `app`).

**C. Upgrade Vercel to Pro** before using either site for sales. The free plan is for non-commercial use.

### Day 2: make sure leads reach you (about 1 hour)
1. **SPF record** at IONOS: `TXT @ v=spf1 include:_spf-us.ionos.com ~all`. When you add another sender (Postmark, HubSpot, Google), add it to this same record; never create a second SPF record.
2. **Mailboxes or aliases** at IONOS, all delivering to you for now:
   `hello@` (on the site), `support@`, `security@`, `billing@`, `admin@` (owner of every vendor account), `brandon@`.
3. **Lead notifications:** in the Google Sheet's Apps Script, make sure each new row also emails `hello@`. Send one test lead from the live Contact page and time how long it takes to reach your phone.
4. **Calendly:** connect your calendar, 30-minute Readiness Check, 15-minute buffers, the five Readiness Check questions as booking questions (sops.md SOP-02).
5. **LinkedIn company page**, then put its link in the website's `content/site.ts` (`linkedin`) and redeploy.
6. **Website "Open the live demo"** link → `https://app.numarket.us/sign-in` (once the Portal is live; small change in the website repo).

### Week 1: be findable
1. Google Search Console and Bing Webmaster Tools for numarket.us; submit the sitemap.
2. Google Business Profile (service-area business, Atlanta).
3. Vercel Web Analytics on the website (which pages prospects read).
4. Uptime monitor (Better Stack or UptimeRobot, free) on `https://numarket.us` and `https://app.numarket.us/sign-in`, alerting your phone.
5. Password manager (1Password or Bitwarden) with every login from §4, MFA on all of them.

---

## 3. Addresses

### Public
| Address | What it is | Status |
|---|---|---|
| https://numarket.us | Marketing website | Old site live; new site to publish (§2-A) |
| https://www.numarket.us | Redirects to numarket.us | Point at Vercel with the apex |
| https://numarket.us/contact | Readiness Check form → Google Sheet; Calendly booking | After §2-A |
| https://numarket.us/pricing, /products/foundation (and workspace, insight-review, engineering), /solutions (industries are under /solutions/…), /demos, /getting-started | Sales pages | After §2-A |
| https://numarket.us/security, /legal/terms, /legal/privacy, /legal/dpa | Trust and legal pages (have an attorney review before first contract) | After §2-A |
| https://numarket.us/support, /docs, /status | Client help, docs, service status | After §2-A |
| https://numarket.us/partners | Referral partner program | After §2-A |
| https://app.numarket.us | **Portal demo** (Summit Builders, fictional) | After README §1 |
| https://calendly.com/nu-market/30min | Book a Readiness Check | Live |

### Later (when `numarket.app` is bought, plan Phase 2)
| Address | What it is |
|---|---|
| `https://{client}.numarket.app` | Each client's own Portal address |
| `https://demo.numarket.app` | The demo moves here; app.numarket.us redirects |
| `https://ops.numarket.app` | numarket staff console (MFA, staff only) |
| `https://status.numarket.app` | Status page service, if you outgrow the website's /status |

### Email
| Address | Use |
|---|---|
| hello@numarket.us | Public. Leads and general questions. |
| support@numarket.us | Client support (SOP-11). |
| security@numarket.us | Security reports and client security questionnaires (SOP-12). |
| billing@numarket.us | Invoices and payments (SOP-14). |
| admin@numarket.us | Owner of every vendor account. Never used for sales. |
| brandon@numarket.us | Your own name, for sales conversations. |

### Where you manage things (bookmark these)
| What | Where |
|---|---|
| Portal code | https://github.com/thepacheco/numarket-platform (private) |
| Website code | https://github.com/thepacheco/numarket-website (private) |
| Hosting (both sites) | https://vercel.com/thepachecos-projects |
| Portal database | Vercel → Storage → Neon (or https://console.neon.tech) |
| DNS and email | IONOS (my.ionos.com) → numarket.us |
| Leads | The Google Sheet behind the Contact form |
| Bookings | Calendly |
| Business docs | Operating decisions, site revisions, website brief (the numarket-ops folder) |

---

## 4. Accounts

Create every account under **admin@numarket.us**, with MFA, saved in the
password manager. Costs are estimates; check when signing up.

### Now: to sell (this week)
| Account | Why | Cost |
|---|---|---|
| Vercel **Pro** | Hosts the website and the Portal | about $20/month per member |
| Neon (through Vercel) | Portal database | free to start |
| IONOS | DNS and email (have it) | have it |
| Google account for the lead Sheet and Apps Script (have it) | Lead capture | free |
| Calendly (have it) | Readiness Check bookings | free or about $10/month |
| Password manager | Every login, shared later with staff | about $3–8/month |
| Uptime monitor | Alerts if a site goes down | free tier |
| LinkedIn company page, Google Business Profile, Search Console | Being found | free |
| **CRM** | Track every lead from first touch to signed. Start with the Google Sheet; move to **HubSpot Free** at about 20 open leads. | free |
| E-signature (Dropbox Sign, DocuSign, or PandaDoc) | Sign proposals, MSAs, order forms | about $15–25/month |

### Before the first client signs or sends data
| Account | Why | Cost |
|---|---|---|
| Business bank account | Keep client money separate | usually free |
| QuickBooks Online (numarket's own books) | Your own clean numbers; invoicing | about $35+/month |
| Stripe | Card/ACH payments on invoices | per transaction |
| Insurance broker | Professional liability (E&O) and cyber | roughly $1,500–4,000/year |
| Attorney | MSA, order form, DPA, privacy policy, pilot agreement | roughly $2,000–5,000 one time |
| Sentry | Error alerts from the Portal | free, then about $26/month |
| WorkOS | Real sign-in, MFA, SSO for clients | free for regular sign-ins at this size |
| Postmark or Resend | Invitations, alerts, report emails from the Portal | about $15–20/month |
| `numarket.app` domain | Client addresses | about $15–20/year |
| AWS | Worker, secrets, fixed IP (Stage B) | about $50–150/month |
| Snowflake organization + **Partner Network** application | Each client's private database | per client, within the plan's allowance |
| Intuit Developer (QuickBooks), Procore Developer | Official connectors. Intuit's production review takes weeks: apply early. | free |
| Microsoft Entra app, Google Cloud project | "Sign in with Microsoft/Google", SharePoint and Drive sync | free |

### To scale (3+ clients)
| Account | Why |
|---|---|
| Help desk (Help Scout, Zendesk, or a shared inbox) | support@ tickets with response times you can measure |
| Project tracker (Linear, Asana, or Notion) | One board per client onboarding (SOP-05) and a change-request queue (SOP-10) |
| Meeting notes (Fireflies or similar) | Readiness Checks and reviews recorded and summarized, with consent |
| Gusto | Payroll and contractors when you add people |
| SOC 2 readiness tool (Vanta, Drata, Secureframe) | When clients' IT teams start asking for it |
| Status page service | When the website's /status isn't enough |

---

## 5. The operating rhythm

| When | What | Time |
|---|---|---|
| **Every morning** | Leads sheet / CRM: reply to anything new (SOP-01). Clients: open flags and freshness (SOP-08). support@ inbox. | 20–30 min |
| **Monday** | Pipeline review: every open lead has a next step and a date. Plan the week's demos and follow-ups. | 30 min |
| **Wednesday** | Partner touch: one referral partner conversation (SOP-15). | 30 min |
| **Friday** | Metrics (below) into one sheet. Invoices out if due. Close open change requests. | 30 min |
| **Monthly** | Insight Reviews (SOP-09), usage vs. allowance per client, invoices (SOP-14), your own books closed. | per client |
| **Quarterly** | Restore test (SOP-13), access review (SOP-12), price check against hours actually spent, update this page. | half a day |

### The numbers to watch
| Metric | Why | Early target |
|---|---|---|
| New leads per week | Is the top of the funnel working? | 3+ |
| Lead → Readiness Check | Are the right people coming? | 50% |
| Readiness Check → proposal | Are they a fit? | 50% |
| Proposal → signed | Is the offer right? | 30%+ |
| Days from first contact to signed | Sales cycle | under 45 |
| Days from signed to go-live | Delivery speed | Small: under 30 |
| Hours per client per month, by size | **Your margin.** Compare with the price. | Small: under 10 |
| Snowflake cost vs. allowance, per client | Cost control | under 80% |
| Open flags older than 3 days | Data quality | 0 |
| First response to support | Service | within 1 business day (the website promise) |
| Monthly recurring revenue | The business | — |

---

## 6. When to add people (planning assumptions: check them against the pilot)

- Write down your hours on the pilot every week (SOP-05). Everything below depends on that number.
- If a Small client takes about 8 hours a month after go-live, one analyst can carry about 12–15 Small clients alongside Insight Reviews.
- **First hire (contractor analyst):** when you pass about 5 clients, or when delivery takes more than 25 hours of your week. Give them SOP-08, SOP-09, and SOP-11 first.
- **First engineering contractor:** when Engineering quotes (SOP-10) are waiting more than two weeks to start.
- Everyone you add: contractor agreement, password manager, MFA, access only to their assigned clients, removal on their last day (SOP-12).
