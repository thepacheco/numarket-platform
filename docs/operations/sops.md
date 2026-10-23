# numarket SOPs

**As of October 10, 2026.** Owner: Brandon. Internal.

Standard operating procedures: how each recurring job is done, so it's done the
same way every time and can be handed to someone else. Each SOP says what
starts it, who does it, how fast, the steps, and how you know it's done.

Promises these SOPs keep (they're on the website): proposal within 2 business
days; support first response by plan (Insight: 1 business day, urgent same
day · Operate: 4 business hours, urgent 4 hours · Command: 2 hours, urgent
1 hour; weekdays, Eastern); security incident notice within 72 hours;
exit package within 30 days.

| # | SOP | Starts when |
|---|---|---|
| 01 | [New lead](#sop-01-new-lead) | A form, email, call, or referral arrives |
| 02 | [Readiness Check](#sop-02-readiness-check-30-minutes) | A lead books a call |
| 03 | [Demo](#sop-03-demo-15-minutes) | A qualified prospect wants to see it |
| 04 | [Proposal](#sop-04-proposal-within-2-business-days) | After the Readiness Check |
| 05 | [Signing to go-live](#sop-05-signing-to-go-live) | The proposal is accepted |
| 06 | [Setting up a client workspace](#sop-06-setting-up-a-client-workspace) | Kickoff is booked |
| 07 | [Connecting a client's source](#sop-07-connecting-a-clients-source) | Kickoff, or a new source is added |
| 08 | [Daily data check](#sop-08-daily-data-check) | Every business morning |
| 09 | [Insight Review](#sop-09-insight-review) | Each client's review date |
| 10 | [Change requests and Engineering quotes](#sop-10-change-requests-and-engineering-quotes) | A client asks for something new |
| 11 | [Support requests](#sop-11-support-requests) | Something is broken or confusing |
| 12 | [Access and security incidents](#sop-12-access-and-security-incidents) | Someone joins or leaves; anything suspicious |
| 13 | [Releases, the demo, backups](#sop-13-releases-the-demo-and-backups) | Shipping a change; quarterly restore test |
| 14 | [Billing and collections](#sop-14-billing-and-collections) | Signing, go-live, and the 1st of each month |
| 15 | [Referral partners](#sop-15-referral-partners) | Weekly |
| 16 | [Client exit](#sop-16-client-exit) | A client gives notice |
| 17 | [Case studies and referrals](#sop-17-case-studies-and-referrals) | 60–90 days after go-live |
| 18 | [Prospect sandbox](#sop-18-prospect-sandbox) | A prospect wants to try it themselves |

---

## SOP-01 New lead

**Starts:** a Contact form row in the Google Sheet, an email to hello@, a call, a LinkedIn message, a referral.
**Who:** Brandon (later: whoever owns sales).
**How fast:** reply within 1 business day; same day is better.

1. Put it in the lead list (Sheet now, HubSpot later): name, company, role, phone, email, source (form / referral: who / LinkedIn / event), industry, what they said.
2. Look them up for 2 minutes: company size, industry, what systems they likely use, anyone you know there.
3. Reply personally from brandon@ (not a template blast): thank them, one line showing you read what they wrote, and the Calendly link for a Readiness Check.
4. If they referred by a partner: thank the partner the same day (SOP-15).
5. No reply after 3 business days: one follow-up. After 7 more: a last note ("I'll close this out; reply anytime"). Then mark it Closed: no response.
6. Not a fit (wrong size, wants staff augmentation, only wants daily status chasing): say so kindly, suggest what would fit, mark it Not a fit with the reason.

**Done when:** every lead has a status (New, Contacted, Readiness Check booked, Proposal sent, Won, Lost, Not a fit, No response) and a next step with a date.

---

## SOP-02 Readiness Check (30 minutes)

**Starts:** a Calendly booking.
**Who:** Brandon.
**Goal:** decide fit and size, and give them a readiness score and 3 findings (the website promises this).

Before the call (10 minutes): read their form answers and website; have the pricing page open.

On the call:
1. Their goal in one sentence: "What decision are you trying to make, or what report are you tired of building?"
2. The five questions (operating decisions §2):
   1. Where does most of your data live today? (a system / spreadsheets / mostly paper)
   2. Which systems do you use? (count them: this sets the size)
   3. Does someone enter data consistently, or is it pieced together after the fact?
   4. How many rows in your largest table? (under 1M / 1–10M / 10M+)
   5. Do any customers or employees live outside the US?
3. Who needs to see what: owner, PMs by job, field, finance, their customers.
4. Sensitive data: card numbers, Social Security numbers, health records? (If yes, those need the right contract and controls first; don't take them in by default.)
5. Their current report: ask them to email the PDF or spreadsheet they build today. It becomes the spec.
6. Show 5 minutes of the demo if useful (SOP-03), otherwise book the demo.

Routing (operating decisions §2):
| What you heard | What to do |
|---|---|
| Mostly systems or spreadsheets | Quote Foundation by source count (+ Workspace, Insight Review) |
| Mixed with some paper | Quote the digital part; paper-to-digital is a separate Engineering quote |
| Mostly paper | Don't quote Foundation yet. Offer Engineering first, or "come back once it's in a system" |
| 10M+ rows in a table, or deep history | Scoping call; likely Large or an Engineering review |
| People outside the US | Note it for the DPA (GDPR terms on request) |

After the call (same day): send a short recap email with their readiness level
(1 Scattered · 2 Siloed · 3 Connected but messy · 4 Organized · 5 AI-ready),
3 findings, and when the proposal will arrive. Update the lead list.

**Done when:** recap sent, size decided (Small ≤3 sources, Mid ≤8, Large 9+), proposal due date set.

---

## SOP-03 Demo (15 minutes)

**Starts:** in a Readiness Check, or as its own call.
**Who:** Brandon.
**Where:** https://app.numarket.us/sign-in (once live). Use a desktop browser, plus your phone for step 8.

Before: open the sign-in page in a fresh window. The demo resets nightly; if a
previous visitor changed something, it's back by morning. Never show a
Snowflake or Cortex screen.

The script is in `../selling-checklist.md` §C (10 steps: Dana's Home →
Receivables → Route 9 over budget with a definition → Flags → weekly report
PDF → design a report → Marcus sees only his job → Luis on a phone → Ask Your
Data → Data tables). Say plainly that the company is fictional and that their
own workspace is set up during onboarding.

After: send the demo link so they can click around themselves, or, for a
serious prospect, create them a private sandbox with their name on it
(SOP-18). Note what caught their attention in the lead list. That's what the
proposal leads with.

---

## SOP-04 Proposal (within 2 business days)

**Starts:** the Readiness Check recap.
**Who:** Brandon.

1. Size: count sources (Small ≤3, Mid ≤8, Large 9+). Check rows (Small up to about 5M, Mid up to about 50M: proposed bands).
2. Products: Foundation (required) + Workspace and/or Insight Review. Paper-to-digital, write-backs, custom apps, and new report layouts no building block covers = Engineering, quoted separately ($5,000+ or $175/hour).
3. Prices straight from the website's pricing page (per product by size, or the bundle). Don't discount the monthly; discount the setup or offer the pilot terms if needed.
4. The proposal (one document): their goal in their words; what they get (sources, dashboards, the weekly report rebuilt from their current one, input screens, review cadence); what they do (approve read-only access, name an owner, 1 hour kickoff, a weekly 30-minute check-in during setup); timeline (Small: first dashboard in 2–3 weeks; Mid 4–6; Large 6–10); fixed setup price, fixed monthly price, the platform allowance; what's not included (daily status chasing, hand-cleaning their source errors, paper to digital); start date.
5. Send by e-signature with the order form and MSA (once attorney-reviewed). Pilot: use the pilot agreement.
6. Follow up in 3 business days if unsigned: offer a 15-minute call for questions.

**Done when:** sent within 2 business days of the Readiness Check, and logged with the amount.

---

## SOP-05 Signing to go-live

**Starts:** signed order form (and the setup invoice paid or scheduled, SOP-14).
**Who:** Brandon (later: the assigned analyst).
**How long:** Small 2–3 weeks to the first dashboard; Mid 4–6; Large 6–10. Then 1 week to launch.

| When | Step |
|---|---|
| Day 0 | Welcome email: what happens next, who to contact, kickoff booked, the list of sources and who can approve access. Create the client's onboarding board (project tracker) and a client folder. Start the hours log. |
| Week 1 | **Kickoff (1 hour):** confirm goals, sources, people and their access (owner, PMs by job, field, finance), the report to rebuild, and the review date. Set up the workspace (SOP-06). Client approves read-only access to each source (SOP-07). |
| Weeks 1–3 | First copies land. Match and clean. Write the business definitions with the client's owner (what counts as "over budget," "late," "revenue"). Flags they need to answer go to them. Weekly 30-minute check-in: show progress on real data. |
| Weeks 2–4 | Configure dashboards from the building blocks, input screens, and the weekly report in their branding. Invite users by role and job scope. |
| Launch week | 30-minute training per group (owners, PMs, field). Turn on the update schedule. First Insight Review (SOP-09). |
| Day 30 | Check-in: are they using it? Which report replaced which spreadsheet? Hours you spent vs. the plan. |

Keep a simple log every week: hours spent, by task. This is how you learn
whether the price is right (production plan, risk 3).

**Done when:** users signed in, the weekly report published once from real data, updates running on schedule for 7 days with no manual fixes, first Insight Review held.

---

## SOP-06 Setting up a client workspace

**Starts:** kickoff is booked.
**Who:** Brandon / engineer.

**Today (until plan Phase 2 ships):** real client workspaces can't be created
from the screen yet. Real sign-in (WorkOS), invitations, and the ops console
"create workspace" are plan Phase 2; the data pipeline is Phases 3–4. Don't
promise a go-live date before those are done for the sources the client uses.

**Once Phase 2–4 are built:**
1. Ops console → New workspace: name, short address (`{client}.numarket.app`), size, products, update schedule.
2. Create their private Snowflake account with the provisioning script (spending cap and auto-suspend on by default).
3. Security policy with the client: sign-in methods (Microsoft/Google/email), MFA required, allowed email domains, IP allowlist if they want one, export roles.
4. Branding: their logo, colors (the Portal checks contrast), and their customer's name on owner reports if needed.
5. Invite the client's Owner. They invite the rest, or you do it from the kickoff list with roles and job scopes.
6. Confirm in the audit log that every staff action shows up for the client.

**Done when:** the client's Owner signs in at their own address with MFA and sees their (empty) workspace.

---

## SOP-07 Connecting a client's source

**Who:** the client approves; numarket checks.
**Rule:** never ask for, accept, or store a client's password. Every connection is read-only. If someone emails you a password, ask them to change it and delete the email.

| Source type | How |
|---|---|
| Standard (QuickBooks Online, Xero, Procore, Gusto, HubSpot…) | The client's admin opens Connect a source in the Portal, signs in to the tool, and clicks Allow. |
| Folder (SharePoint/OneDrive, Google Drive) | The client shares one folder, read-only. |
| Files | Upload page with the template; or a scheduled export to the folder. |
| Setup required (QuickBooks Desktop, Viewpoint, SQL) | 30-minute call with their IT: read-only database user or scheduled export, from numarket's fixed IP. |
| Custom | Engineering quote first (SOP-10). |

After connecting: wait for the first copy, check row counts against what the
client sees in the tool, note anything odd as a Flag, and record the source
on the Sources page with what it syncs.

**Done when:** the source shows Healthy with a first copy, and the counts match.

---

## SOP-08 Daily data check

**Starts:** every business morning, before 10:00 Eastern.
**Who:** the analyst on each client (Brandon for now). About 2–5 minutes per client.

For each client:
1. **Freshness:** did last night's update run? (Data health page.) If not, open a support ticket to yourself as urgent (SOP-11) and tell the client before they notice.
2. **Sources:** any "Reconnect needed"? Email the client's admin with the one-click reconnect steps.
3. **Flags:** new ones. Answer the ones only numarket can answer; send the ones only the client can answer, in one batched email, not one per flag.
4. **Usage:** Snowflake spend vs. allowance. Above 70%: note it for the review. Above 85%: tell Brandon today.

**Done when:** every client checked, nothing urgent left unowned, open flags older than 3 days chased.

---

## SOP-09 Insight Review

**Starts:** each client's review date (Small monthly, Mid every two weeks, Large weekly).
**Who:** the client's analyst.

1. **Prepare (about 1 hour):** what changed since the last review, what's at risk, 3–5 action items each with an owner and a due date. Use their own numbers and definitions. Check last review's action items.
2. **Usage check (5 minutes):** data volume and Snowflake spend against the allowance. If it's growing fast, say so now ("this needs a larger tier or an Engineering review").
3. **Meet (30 minutes):** walk the review, agree on the action items, note any change requests (SOP-10).
4. **Publish** the review in the Portal the same day.
5. **Boundary:** Insight Review is a standing review, not daily status chasing. If they ask for chasing, it's a separately priced add-on.

**Done when:** published, action items have owners and dates, change requests logged.

---

## SOP-10 Change requests and Engineering quotes

**Starts:** a client asks for something new (a dashboard, field, source, report, automation).
**Who:** the client's analyst; Brandon approves quotes.

1. Log it in the change queue with the date and who asked.
2. Classify it:
   - **Broken, or not what we agreed?** It's support (SOP-11). Always included.
   - **Configure from existing building blocks** (a new dashboard page, KPI, report section, input screen from a template, alert rule)? It's a change, using their monthly change hours (Insight 4, Operate 10, Command a dedicated analyst).
   - **Build something new** (custom app, write-back into their system, paper intake/OCR, a new report layout, a non-standard connector)? It's **Engineering**: quote it.
3. Estimate it and tell them before starting. If the estimate is more than the hours left this month, they choose: wait for next month, or approve a quote.
4. Do it, show them, close it, record the hours.

**Done when:** every request is classified within 2 business days and nothing is started without an approved estimate.

---

## SOP-11 Support requests

**Starts:** an email to support@, a call, the Support page form, or a message in a shared channel.
**Who:** the client's analyst (Brandon for now).

| Level | Meaning | First response |
|---|---|---|
| Urgent | The Portal is down, or a number the team relies on today is clearly wrong | by plan: Insight same business day · Operate 4 hours · Command 1 hour |
| Normal | Something's broken or confusing but they can work | by plan: Insight 1 business day · Operate 4 business hours · Command 2 hours |
| Question | How do I…? | Normal, plus answer it in /docs if two people ask |

1. Acknowledge with a person's name and what happens next.
2. Reproduce it. If it's a data problem, find which source and which update.
3. Fix or work around it; tell them when it's done and what caused it in one paragraph.
4. Urgent for more than an hour, or affecting several clients: post on the status page and email affected clients.
5. If you find the problem before they do, tell them first.

**Done when:** the client confirms it's fixed, and the cause is written down.

---

## SOP-12 Access and security incidents

**Joining (staff or contractor):** contractor agreement signed (confidentiality, IP, security rules); password manager seat; MFA on every account; access only to their assigned clients; no client data on personal devices.

**Leaving:** the same day, remove them from every account in §4 of the operations README, rotate any shared secret they could see, and record it.

**Quarterly access review:** list who can reach which client and which system; remove anything not needed. Keep the list.

**Suspected incident** (a lost laptop, a leaked password, a client's data visible to the wrong person, unknown sign-ins):
1. Contain it now: revoke sessions and tokens, disable the account, rotate secrets.
2. Write down the time, what you saw, and what you did, as you go.
3. Work out whose data was affected, if any.
4. If a client's data was affected: tell them without undue delay and **within 72 hours of confirming it** (the DPA promise): what happened, what data, what you've done, what they should do.
5. Call your cyber insurer early; they often supply incident help.
6. Afterwards: one-page write-up and the fix that stops it happening again.

---

## SOP-13 Releases, the demo, and backups

**Shipping a change to the Portal or the website:**
1. Push to a branch; Vercel builds a preview. Click through what changed.
2. Merge to `main`. CI must pass. Vercel deploys production.
3. Check the live site: sign-in, one dashboard, one PDF (Portal); home, pricing, contact form (website).
4. Something wrong: Vercel → Deployments → Instant Rollback to the last good one, then fix.

**Before a demo:** open app.numarket.us/sign-in. If anything looks off, redeploy (it refreshes the demo).

**Quarterly restore test:** restore the Portal database to a Neon branch from yesterday; check a client's (or the demo's) data is there; time it; write the date and time taken in this log. Once Stage B runs, do the same for one client's Snowflake data.

| Date | What was restored | Time taken | By |
|---|---|---|---|
| | | | |

---

## SOP-14 Billing and collections

**Who:** Brandon (billing@).

| When | Invoice |
|---|---|
| Signing | 50% of the setup fee (suggested terms; match the contract) |
| Go-live | The other 50% of setup |
| 1st of each month | Monthly fee in advance |
| Monthly, if any | Approved Engineering hours or projects; platform overage at cost + 15% (Large) |

1. Invoice from QuickBooks (or Stripe), net 15, card or ACH.
2. Day 1 overdue: friendly reminder. Day 15: call. Day 30: written notice per the contract. Pause only what the contract allows.
3. Close your own books monthly; track revenue per client against hours per client.

---

## SOP-15 Referral partners

**Who:** Brandon. **Rhythm:** one partner conversation a week (Wednesday).

Partners: CPA firms, fractional CFOs, IT managed service providers, software
resellers (QuickBooks, Sage, Procore), industry consultants.

1. Keep a partner list: firm, contact, type, clients they serve, last talked, referrals sent.
2. First meeting: what numarket does in two minutes, who's a good fit (from SOP-02 routing), the demo link, the partner page terms.
3. When they refer: thank them the same day, tell them the outcome either way, pay what the partner terms say, on time.
4. Every quarter: send active partners one useful thing (a short anonymized example of what a client found in their numbers).

---

## SOP-16 Client exit

**Starts:** a client gives notice, or the contract ends.
**Promise:** the exit package within 30 days of the contract end, at no charge.

1. Confirm the end date and who receives the package.
2. Deliver (per the website's exit promise): their data in open files (Parquet and CSV) to their cloud storage; the structure (every table and field); the cleaning rules; the code for their dashboards and input screens and anything Engineering built; the business definitions. Or, once Snowflake confirms it, transfer the database account to them.
3. Revoke numarket's access to their sources; ask them to remove the numarket app from each tool.
4. After they confirm receipt: delete numarket's copies, and confirm in writing with the date.
5. Exit conversation: why they're leaving. Write it down.

**Done when:** package delivered, receipt confirmed, deletion confirmed in writing.

---

## SOP-17 Case studies and referrals

**Starts:** 60–90 days after a client goes live, if they're using it weekly.

1. Ask: "Would you be willing to share what changed?" (The pilot agreement already includes this.)
2. Gather: hours per week before vs. after on their report, one decision they made faster, a quote, permission to use their name or an anonymized version.
3. Write one page; they approve it before it's used anywhere.
4. Ask who else they know with the same problem. Thank them for every introduction.

---

## SOP-18 Prospect sandbox

**Starts:** after a Readiness Check or demo, when a prospect wants to try it themselves or show their team.
**Who:** Brandon.
**How fast:** same day as the meeting.

1. GitHub → `numarket-platform` → **Actions** → **Sandbox** → **Run workflow**.
2. Action `create`; the prospect's company name; days (14 is right for most; 30 at most); optionally 2–3 logo letters and their brand color. Run.
3. Open the finished run → **Summary**: the address, the access code, and an email to send. Send it from brandon@, personally, with one line about what to look at first (their weekly report, the PM's view, the field report on a phone).
4. Day 3: run `list`. "Last sign-in" and "Entries" tell you whether they used it. Follow up either way.
5. They ask for more time: `extend` (gives a new code; send it).
6. They sign, or go quiet after the follow-ups: `delete`, or let it close on its date.

**Rules:** sample data only; uploads are off on purpose. Never load a prospect's real data into a sandbox: real data starts after the contract, in their real workspace. One sandbox per prospect. At most 25 open at once.

**Done when:** the prospect has the address and code, and the follow-up date is in the lead list.
