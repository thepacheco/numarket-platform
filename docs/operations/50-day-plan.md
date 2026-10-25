# 50 days to the first client

**Day 1: Friday, October 23, 2026. Day 50: Friday, December 11, 2026.**
**Goal: one client signed (paid or pilot) and kicked off by Day 50.**

## The business in one paragraph (in case you've been away)

numarket is the data team a company doesn't have to hire. We connect the tools
they already use (QuickBooks, Procore, spreadsheets) into **their own private
database** (one Snowflake account per client), clean and check the data, and
give them the **Portal**: dashboards that update on their own, status reports
as PDFs in their branding, input screens that replace paper, and Ask Your
Data. An analyst reviews the numbers with them on a schedule. Custom builds are
quoted separately. Four products: Foundation (the clean data), Workspace (the
Portal), Insight Review (the analyst), Engineering (custom builds). Smallest
size with all three products: $9,500 setup, $3,000 a month (prices as of
October 25; the website's Pricing page shows every line).

## The one thing to understand

**You don't need the finished software to start selling.** The website and the
demo *are* the skeleton you promote with: they show exactly what a client gets.
What has to be finished is the plumbing for **one** client's data, and only
after they say yes, for **their** sources. So the two tracks run side by side:

| Sales track (you) | Build track (Claude Code, with accounts from you) |
|---|---|
| Talk to people, run Readiness Checks, send proposals, sign one. | Real sign-in, then the data connection for whatever systems the first client uses. |

Selling starts on Day 1. It does not wait for the build.

---

## Today (Day 1): what I need from you, in order (about 2 hours)

1. **Vercel access.** Either approve the access link I send you, so I create both projects, settings, and domains, or do it yourself from the platform README §1 and operations README §2-A. If Vercel says it can't see the repos, give its GitHub app access to `numarket-website` and `numarket-platform`.
2. **Vercel → upgrade the team to Pro** (billing; only you can). The free plan isn't allowed for commercial use.
3. **Vercel → Storage → Create Database → Neon** (Free, Washington D.C.), connected to `numarket-portal` for Production. This accepts Neon's terms, so only you can.
4. **Vercel → numarket-portal → Settings → Environment Variables:** add `CRON_SECRET` (run `openssl rand -hex 32` in Terminal, paste the result, mark it Sensitive). Don't send it to me.
5. **IONOS → numarket.us → DNS** (use the exact values Vercel shows if they differ):

   | Do | Type | Host | Value |
   |---|---|---|---|
   | Delete | A | @ | 185.199.108.153, .109.153, .110.153, .111.153 (old GitHub site) |
   | Add | A | @ | 76.76.21.21 |
   | Change | CNAME | www | cname.vercel-dns.com |
   | Add | CNAME | app | cname.vercel-dns.com |
   | Add | TXT | @ | `v=spf1 include:_spf-us.ionos.com ~all` |

   Leave the MX, DKIM, and DMARC records alone.
6. **IONOS → email:** create support@, security@, billing@, admin@, brandon@ (aliases into your inbox are fine).
7. **When both sites load:** send yourself one test lead from numarket.us/contact; check it lands in the Google Sheet and that you get an email about it.
8. **LinkedIn company page.** Send me the link and I'll put it on the website.
9. **Learn the product (40 minutes):** click through app.numarket.us as Dana, then Marcus, then Luis on your phone. Then read SOP-01 to SOP-04 in `sops.md`.

---

## Week by week

### Week 1 (Oct 23–29): live and ready to call
**You**
- [ ] Today's list above.
- [ ] Decide the pilot offer (see "The offer" below) and the first industry: **construction** matches the demo.
- [ ] Conflicts check: confirm your Evergreen/Safeguard agreements allow contacting anyone tied to them.
- [ ] Build the list: **40 names** from your own network (owners, CFOs, controllers, operations/project leads at 20–250 person companies) and **8 referral partners** (CPA firms, fractional CFOs, IT providers).
- [ ] Ask an attorney for a quote on the contract set (MSA, order form, DPA, pilot agreement, privacy policy): roughly $2,000–5,000.
- [ ] Ask an insurance broker for E&O + cyber quotes.
- [ ] Apply: **Snowflake Partner Network**, **Intuit Developer** (start the production review now; it takes weeks), **Procore Developer**.
- [ ] Practice the 15-minute demo three times (script in `../selling-checklist.md` §C), out loud.

**Build (Claude Code)**
- [ ] Both sites live and connected; uptime monitor; error alerts (Sentry, needs a free account from you).
- [ ] Rate limits on the demo sign-in and forms.

**Done when:** numarket.us shows the new site, app.numarket.us works on your phone, a test lead reached you, and you have 40 names and a written offer.

### Week 2 (Oct 30–Nov 5): start the conversations
**You**
- [ ] **8–10 personal messages a day** to your list (templates below). Not a mass email: one person at a time.
- [ ] **3 partner conversations** this week.
- [ ] Every reply goes through SOP-01 the same day.
- [ ] Target by Friday: **5 Readiness Checks booked.**

**Build** (needs a WorkOS account and a Postmark account from you, created under admin@; put their keys straight into Vercel's settings)
- [ ] Real sign-in: Microsoft, Google, email + MFA.
- [ ] Invitations by email.

### Week 3 (Nov 6–12): Readiness Checks and demos
**You**
- [ ] Run Readiness Checks (SOP-02): readiness score and 3 findings, recap the same day.
- [ ] Demo the Portal (SOP-03).
- [ ] Keep 8–10 messages a day going. Target: **8–10 Readiness Checks done by Day 21.**
- [ ] **Book a penetration test** (they schedule 2–4 weeks out) for the week the first client's data would arrive.
- [ ] Attorney engaged; insurance chosen.

**Build**
- [ ] Ops console: create a client workspace, set its address (`{client}.numarket.us`), invite its Owner.
- [ ] Snowflake organization and the script that creates one client's private account (spending cap on).

### Week 4 (Nov 13–19): proposals
**You**
- [ ] Proposals within 2 business days of each Readiness Check (SOP-04). Target: **3–4 proposals out.**
- [ ] Pick the best pilot candidate: digital data (not mostly paper), 1–3 sources, an owner who'll use the weekly report.
- [ ] Contracts back from the attorney.

**Build**
- [ ] Start the data connection for the **likely pilot's** sources (see "The data decision" below).

### Week 5 (Nov 20–26, Thanksgiving week): close
**You**
- [ ] Follow up every open proposal (SOP-04 step 6). Offer a 15-minute call for questions.
- [ ] Ask for the decision before the holiday. Target: **one yes.**
- [ ] Insurance bound.

### Week 6 (Nov 27–Dec 3): sign and kick off
**You**
- [ ] Signature on the pilot agreement or order form + DPA. First invoice if paid (SOP-14).
- [ ] Welcome email and kickoff booked (SOP-05).

**Build**
- [ ] Their workspace created; their Owner signs in at their own address.
- [ ] Penetration test runs; fix anything high.

### Week 7 (Dec 4–11, Day 50): kickoff done
- [ ] **Kickoff held (1 hour):** goals, sources, people, the report to rebuild (get their current PDF or spreadsheet).
- [ ] They approve read-only access to their first source (SOP-07). First copy lands in their private database once the gate is met (pen test fixed, contract and insurance in place).
- [ ] Start the hours log. Second client conversations keep going.

**Day 50 is a win if:** one client is signed and kicked off. Their first dashboard on real data follows in weeks 8–10.

---

## The numbers that get you one client

| Step | Target by Day 35 |
|---|---|
| Personal messages sent | 150+ (8–10 a weekday) |
| Real conversations | 30–40 |
| Readiness Checks | 10 |
| Proposals | 4 |
| Signed | 1 |

If Readiness Checks are below 5 by Day 21, change the message or the list, not the product.

---

## The offer (your decision)

Your operating decisions say one **free pilot in exchange for a case study**. Two ways to run it:

| | Free pilot | Discounted paid pilot (my suggestion) |
|---|---|---|
| Terms | 90 days free; case study and permission to show it | Setup waived; 90 days at half the monthly; case study |
| Pros | Easiest yes | They show up to meetings; proves someone pays |
| Cons | Less commitment | Slightly harder yes |

Either way: put it on one page with what they get (sources connected, the
Portal, their weekly report rebuilt from their current one, monthly review),
what they do (approve access, an owner, 1-hour kickoff, 30 minutes a week
during setup), and the case-study ask.

## The data decision (Week 4)

Real connections need to exist only for the first client's sources. Options:

| Option | Speed | Notes |
|---|---|---|
| Build our own connector (the plan in the spec) | Slowest for QuickBooks: Intuit's production review takes weeks | Best long term; start the Intuit application in Week 1 either way |
| Use a managed connector service into their Snowflake account for the pilot | Days | Monthly fee per source; already approved by QuickBooks, Procore, etc. Revisit build-vs-buy after the pilot |
| Start from their exports (Excel/CSV, a shared folder) | Fastest | Good for the first few weeks while a connector is approved |

Decide once you know which systems the pilot uses.

---

## Money to expect in the 50 days (estimates)

| Item | About |
|---|---|
| Vercel Pro | $20/month |
| Attorney (contract set) | $2,000–5,000 once |
| Insurance (E&O + cyber) | $1,500–4,000/year |
| Penetration test | $5,000–15,000 once; needed before real client data |
| WorkOS, Sentry, Neon, uptime monitor | free tiers to start |
| Postmark | about $15/month |
| Snowflake | trial credits, then usage within the client's allowance |

---

## Message templates (edit into your own words)

**To someone you know**
> Hi [name], hope you're well. I started numarket: we connect a company's
> tools (QuickBooks, Procore, spreadsheets) into one clean database and give
> the team dashboards and a weekly report that build themselves. I'm picking
> one or two companies for a pilot this quarter. Would a 30-minute call make
> sense to see if [company] is a fit? Here's what it looks like:
> https://app.numarket.us. Pick a person and click around.

**To a referral partner (CPA, fractional CFO, IT provider)**
> Hi [name], I run numarket. We clean up and connect clients' data (QuickBooks,
> project tools, spreadsheets) and give owners dashboards and a monthly review
> with an analyst. A lot of your clients probably rebuild the same reports by
> hand every month. Could we grab 20 minutes? I'd like to learn who you work
> with and see if referring each other makes sense.

**Follow-up (3 business days later)**
> Following up in case this got buried. Happy to show you in 15 minutes, or
> you can click through the demo yourself: https://app.numarket.us.
