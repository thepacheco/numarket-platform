# numarket: start here

**October 25, 2026.** Owner: Brandon. Internal.

This is the one page that answers "what is real, what did we promise, and what
has to happen before the first client." For the map of every document, see
[`README.md`](README.md) in this folder. What to create next is
[`ACCOUNTS.md`](ACCOUNTS.md); what gets built next is
[`BUILD-PLAN.md`](BUILD-PLAN.md).

---

## 1. The honest answer first

**What exists today**

- **The website.** Products, published prices, docs, and the client
  presentation. After the October 25 review, every price adds up line by line
  and the site no longer promises reply times.
- **The Portal.** This is real software, not a mock-up. Each company's data is
  locked off from every other company's inside the database. It has:
  - roles and job-level access checked on the server
  - an audit log, dashboards, PDFs, forms, uploads, alerts, the Requests board,
    action items and the QBR pack
  - 95 automated tests

  It runs on **sample data** (Summit Builders, Brightline).

**What does not exist yet**

1. **Real sign-in.** No invitations, passwords, multi-factor or password
   reset. Today the Portal has only the demo's "pick a person" screen.
2. **The data pipeline.** Nothing yet pulls a client's QuickBooks, Procore or
   Excel files into their own database on a schedule, cleans them, and
   publishes them to the Portal. This is the core of Foundation.
3. **Setting up a new client.** There is no screen yet to create a company's
   workspace and its first owner, and no first-sign-in walkthrough ("click
   here, then here").
4. **The business paperwork.** Contracts (MSA, DPA, order form), insurance,
   billing.

**What that means**

- You can honestly sell a **pilot** now: "This is the Portal your team would
  use. During setup we connect your systems and build your dashboards."
- You **cannot** take a client's real data until sign-in, the pipeline, and the
  "before real data" gate in §5 are done.

**This is not Theranos.** Theranos claimed a machine worked when it didn't.
Selling a service that has a setup period, and building that client's pipeline
during it, is how data consultancies work. The line not to cross is saying
something works today when it doesn't. §4 lists every promise and whether it's
true yet.

---

## 2. How the business works, in plain words

### The four products: who does the work

| Product | What the client gets | Who does the work | Who needs it |
|---|---|---|---|
| **Foundation** (required) | Their data: connected, cleaned, matched, checked, kept in their own private database. In the Portal: Explore (filter, find, download), alerts and the Monday email, forms and uploads for what isn't in any system, Data health, definitions. | We build the connections and cleaning rules once. After that it runs on its own every update. We watch the checks. | Everyone. Everything else is built on it. |
| **Workspace** | The screens: dashboards and status reports we build for their business, plus Ask Your Data. They don't build anything. They ask for changes on the Requests board, and we make them from their monthly change hours (2 on Small, 6 on Mid). | Us, from industry templates. | Anyone who wants to *see* the numbers. |
| **Insight Review** | A person, not software. The analyst reads the numbers on a schedule, meets with them, explains what changed and why, writes action items with owners and dates, follows up until each is done, and prepares the quarterly (QBR) pack. | You (later, an analyst you hire). | Companies with nobody who has time to turn numbers into decisions. A company with its own CFO or analyst skips it. |
| **Engineering** | Software that does work beyond reporting: a paper form becomes data, an estimate builder, approvals that write back to QuickBooks, a client portal. Quoted per project. | Us, as a project. | Only when they need something built. |

### Your questions, answered

**Are we replacing Power BI?**
No. We replace the *work*: cleaning the data, building the reports, and keeping
them right every month. Power BI is an empty tool that leaves all of that to
the client. A client who loves Power BI can point it at the clean data we keep,
through the read-only login add-on ($150/mo).

**Is Workspace a form tool?**
No. Forms ("Enter data") are part of **Foundation**, because they feed the data.
Workspace is what people *look at*: dashboards, status reports, Ask Your Data.

**Status reports vs. the QBR: what's the difference?**
- A **status report** (Workspace) is the weekly operational report. The numbers
  fill in on their own, the team adds a few comments, and it goes out as a PDF.
  It replaces the Friday spreadsheet.
- The **QBR** (Insight Review) is quarterly. The analyst prepares it and walks
  leadership through it: what changed, what's at risk, and decisions.

**When does a client need the analyst? Is it troubleshooting? Do they build things?**
The analyst is the client's one contact at numarket, but the client pays for
three different things:
- Something broken is **support**, always included.
- A new or changed dashboard comes from **Workspace change hours**.
- **Insight Review** pays for the *reading*: "your margin dropped because of
  these two change orders; bill them by Friday; Marcus owns it." Then the
  follow-up until it's done.

**Engineering vs. the automation the platform already does?**
The platform automates *reporting*: updates, checks, dashboards, reports, and
alerts all run on their own. Engineering builds automation that does *work in
other systems*, like an approved change order posting itself into QuickBooks.

**"Moving off an old system", is that for everyone?**
No. It's only for a client who is replacing software, such as new accounting
software or retiring an old database. We move the history into their database
first, check every row, and price it into their setup quote. Most clients
skip it.

**Excel budgets: how do they get in, and how does everything "agree"?**
Three ways, chosen per client:
1. **Keep using Excel.** They save the budget file in one shared SharePoint,
   OneDrive, or Google Drive folder, and we read it on every update. The
   template has to keep its layout; if someone changes it, a check fails and we
   see it before anything is published.
2. **Upload it** in the Portal (Enter data → Upload a spreadsheet). It's
   checked row by row before it's accepted.
3. **Replace it** with a Portal form.

"Agree" means automated checks run on every update. For example:
- job codes match between QuickBooks and Procore
- totals match QuickBooks to the cent
- no cost is posted without a budget line

A failed check becomes a flag on Data health, and the numbers behind it aren't
published until it's resolved. This is real work for each new client, which
is why setup costs what it does.

---

## 3. How it works technically (and the Snowflake questions)

**The flow, per client:**

1. **Their systems.** QuickBooks, Procore, Excel and others, through
   read-only connections.
2. **Their own Snowflake account.** We set up one account per client under the
   numarket Snowflake organization:
   - Raw tables hold an exact copy of what came in.
   - Cleaning rules (dbt) and checks turn them into clean, matched tables.
   - A failed check raises a flag and stops publishing.
3. **A published snapshot.** The Portal reads only this. It never talks to
   Snowflake directly.
4. **The Portal.** Dashboards, reports, Explore, alerts, forms.
5. **Ask Your Data.** Runs on Snowflake Cortex inside the client's own account,
   using the business definitions we wrote with them.

**One worker program** (a small server on AWS) runs the connections and the
cleaning rules for every client on their schedule. Each client's credentials
are stored separately. History is kept, so patterns over time are visible.

**Is Snowflake right? Is there something cheaper?**
- Snowflake has no fixed fee per account. You pay per second of compute
  (warehouses shut off after 60 seconds idle) and a spending cap per account
  stops a runaway bill. A small client typically fits inside the $400/mo usage
  allowance in their price.
- Cheaper engines exist (Postgres, BigQuery, DuckDB). They cost less at tiny
  scale, but you would give up three things the website promises:
  - one private account per client
  - Cortex for Ask Your Data
  - handing over the whole account when a client leaves
- **Recommendation: stay on Snowflake, one account per client.** A script
  makes adding a client one command (BUILD-PLAN Step 5).

**Does Cortex build the dashboards automatically?**
No, and don't promise it. Cortex answers plain-English questions (Ask Your
Data) from the definitions we write. We build the dashboards from industry
templates in the Portal; that's why setup takes weeks, not months.

**Industry templates today:** construction and professional services. The other
six industries on the website (manufacturing, food production, healthcare,
utilities, logistics, real estate) have website mock-ups but no Portal
templates. Building them is setup work for the first client in each industry,
and it's covered by the setup fee.

**Should we test on fake data first?** Yes. This is the most important
technical milestone. It's described as "Test Co" in §5.

---

## 4. Every promise the website makes, and whether it's true today

Legend:
- ✅ built: it works in the Portal today, on sample data.
- 🟡 partly built.
- ❌ not built.
- 👤 a person does it: your time, with an SOP.
- 📄 paperwork: a contract, an account, or insurance.

"Step" refers to [`BUILD-PLAN.md`](BUILD-PLAN.md).

### Data (Foundation)

| Promise | Where | Today | To make it true |
|---|---|---|---|
| Read-only connections; you click "Allow"; remove our access any time; every login recorded | Security, Docs | ❌ | Connectors (Step 6); SOP-07 |
| Your own private, encrypted database, a separate Snowflake account per client | Platform, Security | ❌ | Snowflake organization + setup script (Step 5) |
| Checks on every update; bad data flagged, not published | Foundation, Pricing | 🟡 Portal shows checks and flags (sample) | dbt tests feeding Data health (Step 6) |
| Updates daily (Small), up to hourly in business hours (Mid) | Pricing, Docs | ❌ | Worker schedules (Step 6) |
| About 10M / 50M rows of history | Pricing | ❌ | Comes with Snowflake (Step 5) |
| Explore: filter, find, save views, download CSV/PDF | Foundation | ✅ | Real data (Step 6) |
| Alerts and the Monday summary email | Foundation | 🟡 Alerts and the bell work; email code is ready | Email sending switched on (Step 3) |
| Forms and spreadsheet uploads | Foundation | ✅ | Feeding the real database (Step 6) |
| SharePoint / OneDrive / Google Drive folder sync | Steps, Platform | ❌ | Step 6 |
| Business definitions for every number | Foundation | ✅ screens · 👤 writing them | SOP-06 |
| Moving off an old system (only when replacing one) | Foundation | 👤 | Quoted in setup, case by case |
| Usage allowance ($400 / $800); warnings at 70% and 85%; Usage page; overage at cost + 15% | Pricing | 🟡 Usage page with sample numbers | Real metering and billing (Step 8) |

### Screens (Workspace)

| Promise | Where | Today | To make it true |
|---|---|---|---|
| Core dashboards for your industry; by role on Mid | Pricing, Workspace | 🟡 Construction and services templates | Build each new industry during that client's setup |
| Weekly status report in your branding, as a PDF | Workspace, Pricing | ✅ (branding = name and colors) | Logo upload (small Portal task) |
| Ask Your Data, 200 / 1,000 questions a month | Workspace, Pricing | 🟡 The demo answers a fixed set of question types; not real AI yet | Cortex in the client's account (Step 7). **Don't call the demo "AI".** |
| Up to 15 / 50 users, no per-user fees | Pricing | ✅ | — |
| Change hours: 2 / 6 a month, extra $175/h in blocks of 5 | Pricing, Docs | ✅ tracked on the Requests board | Billing (Step 8) |
| Works on a phone | Workspace FAQ | ✅ | — |
| Named accounts, invitations, multi-factor sign-in, password reset; removed users lose access immediately | Docs (sign-in, users), product FAQ | ❌ **demo sign-in only** | WorkOS sign-in (Step 2) |
| Each person sees only what their role allows | Docs, Security | ✅ enforced on the server and in the database, tested | — |
| Audit log | Security | ✅ | — |
| Read-only login for Power BI or Excel, $150/mo | Pricing | ❌ | Snowflake reader role (Step 5) |
| Enterprise single sign-on (Okta, Entra ID), $250/mo | Pricing | ❌ | WorkOS (after the pilot) |

### The analyst (Insight Review)

| Promise | Where | Today | To make it true |
|---|---|---|---|
| A named analyst; reviews monthly (Small), every two weeks (Mid), weekly plus a daily brief (Large), with a meeting | Insight Review, Pricing | 👤 You | SOP-09. Hand-off doc estimate: 3–6 h a month per Small client |
| Action items tracked to done in the Portal | Insight Review | ✅ | — |
| QBR pack (Mid and up); board packs (Large) | Pricing | ✅ QBR page · 👤 board pack | — |
| Questions to the analyst from any chart | Portal | ✅ in PR #2 (not merged yet) | Merge PR #2 |
| Monthly check on data volume and usage | Insight Review | 👤 | Part of each review |

### Engineering

| Promise | Where | Today | To make it true |
|---|---|---|---|
| From $5,000 per project, or $175/h | Engineering, Pricing | 📄 quote per project | SOP-10 |
| The example apps (scan a form, estimate builder, approvals) | Engineering, Portal | 🟡 demo versions | Built per client when sold |
| Your own cloud: **by request** on Large and in Engineering | Engineering, Security | 👤 (by request, decided Oct 25) | Quoted case by case, after a review with the client's IT |

### Service

| Promise | Where | Today | To make it true |
|---|---|---|---|
| Email and phone, business hours, Eastern Time | Support | 👤 | — |
| Shared Slack or Teams channel (Mid and Large) | Support | 👤 | Create one per client |
| Escalation: analyst, then founder | Support | 👤 | — |
| Status page | Status | ❌ (the page honestly says so) | After the pilot |
| No response-time promises | (removed Oct 25) | — | Put any service level in the contract only, once you can staff it |

### Contract and legal

| Promise | Where | Today | To make it true |
|---|---|---|---|
| 12 months, then month to month (Large 12–36) | Pricing, FAQ | 📄 | MSA with an attorney |
| Setup billed 50% at signing, 50% at launch; monthly in advance | Pricing, How it works | 📄 | MSA + invoicing |
| Setup takes about 3 / 6 / 10 weeks | How it works | 👤 unproven | The first pilot tells you |
| Leaving: full export in open files within 30 days, free; we delete our copies and confirm in writing | Platform, Docs, Legal | ❌ export script · 📄 | SOP-16 + an export script (Step 6) |
| Handing over the whole database account | Docs (now "where Snowflake allows it") | 📄 | Snowflake Partner Network confirmation |
| Healthcare (HIPAA): **by request**, reviewed first, then quoted, with a signed BAA | Pricing, FAQ, Security, Legal | 📄 (by request, decided Oct 25) | A HIPAA program before the first healthcare client: risk assessment, policies, BAA template, a higher-security Snowflake edition |
| "We don't claim certifications we don't hold" | Security | ✅ | Keep it true: no SOC 2 claim until the report exists |
| Free 30-minute Readiness Check | Everywhere | 👤 | SOP-02 |
| Savings figures are estimates | Home, industries | ✅ labeled as estimates | — |

---

## 5. Go-live: where the checklist lives now

There's one checklist, not two:

- **What you create:** [`ACCOUNTS.md`](ACCOUNTS.md), in four batches. It lists
  every account, what it's for, what it costs, and exactly what to hand
  Claude Code.
- **What gets built, in order:** [`BUILD-PLAN.md`](BUILD-PLAN.md), Steps 0 to
  10. Each step has a "Done when" test.
  - Sign-in and setting up a client come first (Steps 2–4).
  - Then "Test Co" on fake data (Steps 5–6).
  - Then the gate before real data (Step 9).
- **Selling in parallel:** [`operations/50-day-plan.md`](operations/50-day-plan.md).

---

## Is this being built the way a real company should?

**The website.** It's a Next.js application written in code (TypeScript and
React), hosted on Vercel. That's the same way most modern software companies
build their sites. Every website ends up as HTML in the browser; this one
isn't a template or a page builder.

**The Portal.** It's a full application:
- its own database, with each company's data walled off inside the database
  itself
- roles checked on the server
- an audit log
- automated tests that run before every change is accepted

The stack is standard for business software: Vercel, Postgres (Neon),
Snowflake, AWS, and WorkOS for sign-in.

**What a real company also does, and what's still missing:**
- the company owns every account
- multi-factor everywhere
- keys only in secret stores
- test kept separate from production
- backups that have been tested
- error alerts
- written agreements and insurance

All of these are in [`ACCOUNTS.md`](ACCOUNTS.md) (the rules at the top) and
[`BUILD-PLAN.md`](BUILD-PLAN.md) (Steps 0, 1, and 9). Nothing on the list is
unusual. It just has to be done, in that order.

**Your data stack.**
- **Neon** stays the Portal's own database.
- **Snowflake** holds each client's data, one private account per client.
- **AWS** runs the worker that moves data in on a schedule.

They do different jobs, and all sit in the same US East region. Details:
[`ACCOUNTS.md`](ACCOUNTS.md), "How the pieces fit."

---

## 6. Decisions (made October 25)

1. **No bundle discount.** Product prices add up exactly to the total:
   - Small: $7,000 + $2,500 + $0 setup = $9,500; $1,250 + $750 + $1,000 = $3,000 a month.
   - Mid: $14,000 + $5,000 = $19,000; $2,500 + $1,250 + $2,000 = $5,750.
   - Large: from $30,000 + $10,000 = $40,000; from $5,000 + $3,000 + $4,000 = $12,000.
2. **Healthcare (HIPAA): by request,** reviewed first, then quoted.
3. **"Your own cloud": by request.** It means building inside the client's own
   Snowflake or cloud account instead of ours, which some large companies'
   IT requires. Our standard is our own setup: Snowflake + AWS + Vercel.
4. **Repos go private** after the move into the `numarket-technologies` GitHub
   organization ([`ACCOUNTS.md`](ACCOUNTS.md) #3).
5. **Next build work:** sign-in, setting up a client, then Test Co
   ([`BUILD-PLAN.md`](BUILD-PLAN.md) Steps 1–6), before more Portal features.

Still open: the pilot terms, free or discounted
([`operations/50-day-plan.md`](operations/50-day-plan.md), "The offer").

---

## 7. Where everything lives

See [`README.md`](README.md) in this folder: the map of every document.
