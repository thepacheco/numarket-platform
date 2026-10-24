# numarket: what we sell, who does what, and whether the prices work

**Version 1 · October 24, 2026 · Owner: Brandon.** Internal. Written to settle
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

| | **Foundation** | **Workspace** | **Insight Review** | **Engineering** |
|---|---|---|---|---|
| In one word | The plumbing | The software | The person | The custom build |
| What it is | Connect, clean, check, and store the client's data, with written definitions | The numarket Portal: dashboards, reports, forms, Ask Your Data | A named numarket analyst on a schedule | Apps and automations made for one client |
| Who uses it | Nobody day to day (admins see its health) | Everyone at the client | The client's leaders | Whoever the app is for |
| Who builds it | numarket | numarket configures; clients arrange and use | numarket analyst | numarket engineer |
| Ends? | No, monthly | No, monthly | No, monthly | Yes, a project |
| Required? | Yes, always | Optional | Optional | Optional |

### Foundation: your clean data
**Includes:** read-only connections to each source (the client clicks "Allow"),
cleaning and matching rules, checks on every update, flags when the source
data is wrong, business definitions (what every number means), the client's
own private Snowflake database, backups, and the exit package.

**Can the client query their own database?** Yes. Through the Portal they see
every clean table, preview it, and download it. For Excel, Power BI, or Tableau,
we set up a read-only login to the clean tables (add-on on Small and Mid,
included on Large). Their queries run on their own allowance.

**Doesn't include:** hand-fixing the same source errors every month (we flag
them; the client fixes them in their system), turning paper into data
(Engineering), or unlimited data volume (see §6).

### Workspace: the software your team uses
**Includes:** dashboards, the weekly status report and other reports (in the
client's branding, as PDFs), Run a report (filter, group, save, download),
forms ("input screens") for information that isn't in any system, Ask Your
Data (with a monthly question allowance), each person's Home page, roles and
permissions, and a monthly allowance of change hours.

**Who builds dashboards?** numarket does. Clients don't build dashboards from
scratch, on purpose: the value is that the numbers are right and everyone sees
the same ones. Clients **arrange and use**: pick what's on their Home, pin
charts, filter, save report views, design status reports from the existing
charts and tables, and ask questions. A new dashboard page or a new metric is a
change request (uses change hours). A brand-new kind of chart or an app is
Engineering.

**What are forms ("input screens")?** For information that isn't in any system
yet: the superintendent's paper daily log, the change order spreadsheet emailed
around at month end, timesheets kept in Excel. Each form replaces one specific
paper form or spreadsheet. What people enter flows into the same clean data and
dashboards at the next update. Most clients use zero to three. If the
information is already in a system, we connect the system instead.
- *Daily field report:* the superintendent's daily log (crew hours, percent complete, notes), done on a phone.
- *Change order log:* a record of approved changes to a job's scope and price, which most contractors keep in a spreadsheet.
- *Time entry (services):* hours per project per day.

**Ask Your Data** is part of Workspace. It runs on Snowflake's AI (Cortex) inside
the client's own database, on small summary tables, using the business
definitions. A monthly question allowance (200 on Small, 1,000 on Mid) keeps the
cost fixed; a question costs cents.

**Also in Workspace (built October 24):** alerts each person sets for
themselves ("tell me when a job goes over budget", "when a customer is more than
$100K late"), a Monday summary email of every job, a bell for new alerts, copy
any chart as a picture, saved views and a find box in Run a report, and a
history of your Ask questions. Alert emails start once an email service
(Resend) is connected; until then alerts show in the Portal. **Still to come:**
scheduling the branded status report itself as an email.

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
| Arrange Home, pin, filter, save views | ✅ | | | |
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
- Use the product lines in §2 word for word where possible: Foundation = your clean data; Workspace = the software your team uses (dashboards, reports, forms, Ask Your Data); Insight Review = your analyst (reviews, action items tracked to done, QBR packs); Engineering = built for you.
- Add the "What we are not" table (§1) to the Platform or About page.
- Explain forms (input screens) with the daily field report and change order log examples (§2).
- Say clearly that numarket builds the dashboards and clients arrange and use them (§2).
- State the Ask Your Data allowance (200 / 1,000 questions a month).
- **Don't change prices until Brandon approves §5.** When approved, update `content/tiers.ts` (product prices, bundles, change hours) and the pricing FAQ.

**Portal (done October 24, in the demo now):**
- "Input screens" are now **Forms**, and each one says what it replaces and what it feeds.
- Hover tooltips on every menu item explain what it is.
- **Ask** is a button at the top of each dashboard and opens a side panel; Ask Your Data keeps your question history.
- **Your analyst** explains the five things the analyst does, and has **Action items** (open, in progress, done) and the **QBR pack** (print or save as PDF).
- **Engineering → Apps** has three examples: scan a paper form, estimate builder, change order approvals (approved ones go into the change order log by themselves).
- **Alerts and emails** under Reports, with the bell in the top bar and a preview of each email.
- Any chart can be copied or saved as a picture.
- Run a report has a find box and saved views (yours or shared with the team).
- Viewers can now set their own alerts (so a CFO can get the Monday summary).
