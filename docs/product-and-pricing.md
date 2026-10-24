# numarket: what we sell, who does what, and whether the prices work

**Version 2 · October 24, 2026 · Owner: Brandon.** Internal. Written to settle
the product lines for both the website and the Portal. Pass this file to any
chat or person working on either; they should treat it as the source of truth.
Sections marked **[DECISION]** need Brandon's yes before anything public changes.

---

## 1. What numarket is

**One sentence:** numarket takes the numbers a company already has, scattered
across accounting, project tools, and spreadsheets, makes them clean and
trustworthy in one private database, and gives the team dashboards and reports
that keep themselves up to date, plus an analyst who reads them with you.

**What we are:** a data company. A managed analytics team you subscribe to.
Our software reads from the client's systems; people rarely type into it.

**What we are not:**
| Not this | Why it's different |
|---|---|
| Monday, Asana, Smartsheet (work management) | Those are where people manage tasks and type in status. We don't manage tasks. We pull the numbers from the tools they already use and report on them. |
| Power BI, Tableau (self-serve BI) | Those are blank canvases; the client does the cleanup and builds everything. We do the cleanup and build it for them. (If they want Power BI, they can point it at the clean data we keep.) |
| A consulting firm | We don't do a one-time study and leave. The data stays clean and the reports keep running every month. |

**The PMO angle:** a PMO spends most of its time chasing updates and rebuilding
the same reports. numarket automates the reporting half of a PMO: pull the
data, check it, publish the dashboards and weekly status report, and flag what's
wrong. It does not replace the project managers or the tools they work in.

---

## 2. The four products

**The one-line version (changed October 24, v2):** Foundation is **your data**.
Workspace is **what we build on it**. Insight Review is **your analyst**.
Engineering is **apps made for you**. The Portal menu is organized exactly
this way, so what a client sees matches what they pay for.

| | **Foundation** | **Workspace** | **Insight Review** | **Engineering** |
|---|---|---|---|---|
| In a few words | Your data | Your dashboards and reports | Your analyst | Apps built for you |
| What it is | Every system's data connected, cleaned, checked, and stored; plus the tools to look through it, add to it, and get alerts on it | What numarket builds on the data: dashboards, branded status reports, Ask Your Data | A named numarket analyst on a schedule | Apps and automations made for one client |
| In the Portal menu | **Explore**, **Enter data**, **Data health** | **Dashboards**, **Reports**, **Ask Your Data** | **Your analyst** | **Apps** |
| Who uses it | Everyone (looks through data, enters data, gets alerts); admins watch data health | Everyone | The client's leaders | Whoever the app is for |
| Who builds it | numarket (connections, cleaning, checks, forms) | numarket builds; clients arrange and use | numarket analyst | numarket engineer |
| Ends? | No, monthly | No, monthly | No, monthly | Yes, a project |
| Required? | Yes, always | Optional | Optional | Optional |

### Foundation: your data
**Behind the scenes:** read-only connections to each source (the client clicks
"Allow"), cleaning and matching rules, checks on every update, the client's own
private Snowflake database, backups, and the exit package.

**What the client gets in the Portal:**
- **Explore**: look through any of their data. Start from a view (open RFIs,
  change order log, job cost by month, receivables aging, revenue by customer…),
  then filter by period, job, or any column, find any word or number, group it,
  save the view (for themselves or the team), and download it as CSV or PDF.
  Admins also see **All tables** (every clean table, with what each row means).
- **Alerts**: "tell me when a job goes over budget", "when customers owe more
  than $100K past 60 days", "when cash drops below $500K", a **Monday summary
  email** of every job, and **"Alert me" on any filtered view in Explore**
  ("tell me when a new RFI waits more than 30 days"). Shown on a bell; emailed
  if they turn email on.
- **Enter data**: forms and uploads for information that isn't in any system
  (see below).
- **Data health**: each connection's status, the checks on every update, flags
  (questions about the data that a person must answer), and the **business
  definitions** (what every number means and where it comes from).

**Can the client query their own database?** Yes: Explore and All tables in the
Portal, and for Excel, Power BI, or Tableau a read-only login to the clean
tables (add-on on Small and Mid, included on Large). Their queries run on their
own allowance.

**What is "Enter data" (forms)?** Yes, it's an input straight into the data.
It's for information that isn't in any system yet: the superintendent's paper
daily log, the change order spreadsheet emailed around at month end, timesheets
kept in Excel. Each form replaces one specific paper form or spreadsheet; it's
checked as people type (only real jobs, real dates, sensible numbers); what
they enter joins the clean data and shows on dashboards at the next update. A
spreadsheet can be uploaded instead, with the same checks. Most clients use
zero to three forms, and the forms count as one of the plan's data sources. If
the information is already in a system, we connect the system instead.
- *Daily field report:* the superintendent's daily log (crew hours, percent complete, notes), done on a phone.
- *Change order log:* approved changes to a job's scope and price, which most contractors keep in a spreadsheet.
- *Time entry (services):* hours per project per day.

**Why Foundation includes Explore and alerts:** it makes Foundation useful on
its own (a client with their own BI or their own CFO can buy just Foundation
and still look through clean data and get alerts), and it costs us little:
it's the same software for every client, with no per-client build.

**Doesn't include:** hand-fixing the same source errors every month (we flag
them; the client fixes them in their system), turning paper into data
automatically (that's the Engineering scan app), or unlimited data volume (§5).

### Workspace: your dashboards and reports
**Includes:** dashboards numarket builds for the business (financials, jobs or
projects, cash), status reports in the client's branding (numbers fill in, the
team writes the commentary, publish as PDF), **Ask Your Data** (with a monthly
question allowance), each person's Home page, copy any chart as a picture, and
a monthly allowance of change hours.

**Who builds dashboards?** numarket does. Clients don't build dashboards from
scratch, on purpose: the value is that the numbers are right and everyone sees
the same ones. Clients **arrange and use**: pick what's on their Home, pin
charts, filter, design status reports from the existing charts and tables, and
ask questions. A new dashboard page or a new metric is a change request (uses
change hours). A brand-new kind of chart or an app is Engineering.

**Ask Your Data** runs on Snowflake's AI (Cortex) inside the client's own
database, on small summary tables, using the business definitions. A monthly
question allowance (200 on Small, 1,000 on Mid) keeps the cost fixed; a
question costs cents. Each person sees their own question history.

**Why Ask is in Workspace, not Foundation:** it has a real per-question cost
(AI), and it's only as good as the summary tables and definitions we set up
for the dashboards.

**Still to come:** scheduling the branded status report itself as an email.

### Insight Review: your analyst
Workspace tells you **what** the numbers are and flags automatic changes.
Insight Review tells you **why** they moved and **what to do**, from a person
who knows your business.

**Each cycle (monthly on Small, every two weeks on Mid, weekly on Large):**
1. **The review**: what changed and why, what's at risk, 3–5 action items with an owner and a due date, published in the Portal.
2. **The meeting**: 30–45 minutes to walk through it.
3. **Action items tracked to done** in the Portal (status: open, in progress, done).
4. **Data and usage check**: volume against the allowance, data quality trend.
5. **Every quarter: the QBR or board pack**, built from the same numbers.
6. **Between reviews**: the analyst watches the alerts and flags anything urgent.

**Doesn't include:** daily status chasing of project managers (that's PMO
labor, priced separately if offered), building new dashboards (change hours),
or custom analysis projects (Engineering).

A client with their own CFO or analyst can skip Insight Review and buy
Foundation + Workspace.

### Engineering: built for you
Custom apps and automations for one client: paper-to-digital intake (scan a
form, it becomes data), estimate builders, approval workflows, write-backs into
their systems, migrations off old software, and later things like meeting
notes. Quoted as a project, then optional support.

---

## 3. Who does what

| Task | Client | numarket analyst | numarket engineer | Automatic |
|---|---|---|---|---|
| Approve access to a source | ✅ clicks "Allow" | sets it up | | |
| Clean, match, check the data | | builds the rules once | | ✅ every update |
| Fix a wrong number in the source system | ✅ in their system | flags it | | flag raised |
| Write the business definitions | approves | ✅ drafts | | |
| Build dashboards and report templates | | ✅ from building blocks | | |
| Look through data, filter, save views, download (Explore) | ✅ | | | |
| Set alerts, get the Monday summary | ✅ | | | ✅ checked every update |
| Enter data not in any system (forms, uploads) | ✅ | sets up the form once | | ✅ checks every entry |
| Arrange Home, pin charts | ✅ | | | |
| Design a status report from existing charts | ✅ | can help | | |
| Write the report commentary | ✅ (or analyst in Insight Review) | | | numbers fill in |
| Ask questions | ✅ | | | answers |
| New dashboard page or metric | requests | ✅ (change hours) | | |
| Monthly review, action items, QBR pack | owns the actions | ✅ | | |
| A new app or automation | approves the quote | | ✅ | |

---

## 4. Where AI is, and where it isn't

- **Ask Your Data** (client-facing): Snowflake Cortex, inside the client's own
  database, on summary tables, with a question allowance. The answer shows
  where it came from.
- **Inside numarket** (our team): AI drafts the first version of mappings,
  definitions, and the monthly review; a person always checks it. This is how
  we keep our hours per client low, which is what makes the prices work (§5).
- **Not in v1: AI that builds dashboards for clients.** It's expensive per
  request, the results vary, and trust depends on the numbers being consistent.
  Later: a "describe the chart you want" helper limited to our building blocks,
  with the same question allowance.

**Is Snowflake and Cortex a legitimate setup?** Yes. Many companies run client
databases on Snowflake. We apply to the Snowflake Partner Network and run one
account per client under our organization. Costs are per second of compute and
per Cortex message, inside the client's platform allowance, with a hard cap per
account.

---

## 5. Do the prices work? (the honest math)

**Current prices (website):** Small (Insight plan) $7,500 setup + $2,500/month.
Mid (Operate) $15,000 + $4,000/month ($63,000 in year one). Large (Command) from
$40,000 + $10,000/month. Engineering from $5,000 or $175/hour.

**What a delivery person costs:** an analyst at $110,000 salary costs about
**$143,000 a year loaded** (payroll taxes, benefits, laptop, software, about
×1.3), or **$11,900 a month**. They have about **110 client hours a month**
(the rest is admin, sales support, learning). That's **about $108 per client
hour.**

**What a client costs us each month (after setup):**

| | Small, as we work today | Small, target | Mid, as we work today | Mid, target |
|---|---|---|---|---|
| Foundation monitoring and fixes | 5 h | 2 h | 8 h | 4 h |
| Workspace changes and support | 5 h | 3 h | 11 h | 6 h |
| Insight Review | 6 h | 3 h | 12 h | 6 h |
| Account management | 1 h | 1 h | 2 h | 1 h |
| **People hours** | **17 h** | **9 h** | **33 h** | **17 h** |
| People cost ($108/h) | $1,836 | $972 | $3,564 | $1,836 |
| Platform (Snowflake, connectors, hosting) | $350 | $350 | $750 | $750 |
| **Cost to serve** | **$2,186** | **$1,322** | **$4,314** | **$2,586** |
| Price today | $2,500 | $2,500 | $4,000 | $4,000 |
| **Gross margin** | **13%** | **47%** | **−8%** | **35%** |

**Conclusion: you're right.** At today's prices and today's way of working, a Mid
client loses money and a Small client barely covers the analyst. Even with the
target hours, Mid is thin. A healthy business like this runs at **55–65% gross
margin** after setup, so there's money for growth, tools, overages, and a
second hire.

### Three fixes, together

**1. Cut the hours per client (product, not heroics).** This is the biggest
lever, and it's why the Portal is built the way it is:
- industry packs (construction, professional services) so a new client is mostly the same setup;
- automatic checks and "What changed" callouts instead of manual monitoring;
- AI-drafted reviews the analyst edits (1 hour instead of 3);
- fewer custom requests, because clients can arrange and pin things themselves.

**2. [DECISION] Reprice the people-heavy parts.** Proposed:

| | Today | Proposed |
|---|---|---|
| Foundation monthly, Small / Mid | $1,100 / $1,900 | **$1,250 / $2,250** |
| Workspace monthly, Small / Mid | $850 / $1,300 | same |
| Workspace change hours included, Small / Mid | 4 / 10 | **2 / 6**, extra in blocks of 5 at $175/h |
| Insight Review monthly, Small / Mid | $850 / $1,300 | **$1,250 / $2,400** |
| Bundle (about 10% off), Small / Mid | $2,500 / $4,000 | **$3,000 / $5,400** |
| Setup, Small / Mid | $7,500 / $15,000 | same (priced on real hours: about 55 h / 110 h) |

With target hours, margin becomes **56% on Small** and **52% on Mid**, and rises as
hours keep falling. A client who doesn't want the analyst buys Foundation +
Workspace (Mid $3,550), which is high margin because it's mostly software.

**3. [DECISION] Guardrails, so one client can't sink the month:**
- **Data volume bands:** Small up to about 5 million rows, Mid up to about 50 million. Above that, the next size or a volume add-on.
- **"They broke it again":** the contract says the client keeps entering data in their systems the agreed way; we flag breaks automatically. Fixing breakage from changes in their systems comes out of change hours; repeated hand-cleanup is never included.
- **Platform overage:** beyond the allowance, passed through at cost + 15%, with a warning at 70% and 85%.
- **Change hours don't roll over**; requests over the remaining hours wait for next month or a quote.

### Capacity, and when to hire
At target hours, one analyst carries about **6 Mid or 12 Small clients.** Six Mid
clients at the proposed price bring about $32,400 a month against about $16,400 of
cost (analyst plus platform), roughly a 49% margin, plus setup and Engineering
on top. **Hire analyst #1 at about 4 Mid-sized clients** (or 8 Small), or when
delivery passes 25 hours of Brandon's week. Until then Brandon delivers, but the
prices must assume a paid analyst, or the business can't grow past one person.

**Engineering** is priced at $175/hour blended, quoted with 20% contingency,
targeting 60%+ margin.

---

## 6. What changes where

**Website (for the website chat):**
- **The product lines changed (v2, October 24).** Use these, word for word where possible:
  - **Foundation · your data:** every system connected, cleaned, checked, and kept in your private database. Explore it (filter, find, save views, download), get alerts and a Monday summary email, enter what isn't in any system (forms and uploads), and see its health and definitions.
  - **Workspace · your dashboards and reports:** dashboards built for your business, status reports in your branding, Ask Your Data.
  - **Insight Review · your analyst:** reviews that explain why the numbers moved, action items tracked to done, the QBR and board pack.
  - **Engineering · apps built for you:** custom apps and automations, quoted as a project.
- In `content/tiers.ts`, move "alerts" and "forms" out of Workspace's `what` line and into Foundation's; Workspace becomes "Dashboards, status reports, Ask Your Data, and change hours".
- Add the "What we are not" table (§1) to the Platform or About page.
- Explain Enter data (forms) with the daily field report and change order log examples (§2).
- Say clearly that numarket builds the dashboards and clients arrange and use them (§2).
- State the Ask Your Data allowance (200 / 1,000 questions a month).
- **Don't change prices until Brandon approves §5.** When approved, update `content/tiers.ts` (product prices, bundles, change hours) and the pricing FAQ.

**Portal (done October 24, in the demo now):**
- The menu follows the products: **Foundation** (Explore, Enter data, Data health), **Workspace** (Dashboards, Reports, Ask Your Data), **Insight Review** (Your analyst), **Engineering** (Apps). Hover any item for what it's for.
- **Explore** replaces "Run a report" and "Tables": filter by any column, find, save views, download, and **Alert me** on any filtered view. Old links redirect.
- **Alerts** live under Explore, with the bell in the top bar, the Monday summary, and a preview of each email. Viewers can set their own alerts (so a CFO can get the Monday summary).
- **Enter data** holds the forms and the spreadsheet upload; each form says what it replaces and what it feeds.
- **Home** is calmer: a greeting with what needs you, Ask, your numbers and charts, the analyst's latest read, and a **What's where** map of the four products (including any not in the plan).
- **Ask** is a button at the top of each dashboard (side panel), with question history on Ask Your Data.
- **Your analyst**: the five things the analyst does, Action items (open, in progress, done), and the QBR pack (print or save as PDF).
- **Apps** has three examples: scan a paper form, estimate builder, change order approvals (approved ones go into the change order log by themselves).
- Any chart can be copied or saved as a picture.
