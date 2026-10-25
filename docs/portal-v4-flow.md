# numarket Portal v4: one flow, from a number to a decision

**Version 2 · October 25, 2026 · Owner: Brandon.** Internal. Written from
Brandon's walkthrough of the live demo (Summit Builders) on October 24. It
builds on `numarket-product-and-pricing.md` (v3), which stays the source of
truth for the products, prices, and who does what. Where this file and v3
disagree, v3 wins and this file gets fixed. Pass both to anyone working on the
Portal.

---

## 0. What Brandon saw, and what we do about it

| What Brandon saw in the demo | Decision |
|---|---|
| A banner at the bottom: "fictional company with sample data, resets every night, book a readiness session" | **Remove it.** The product never sells. The sign-in page (persona picker) is the only place that says "sample company". A small "Sample data" chip stays in the top bar. |
| The menu's Foundation, Workspace, Insight Review, Engineering look alike; the website gives each product its own color | **Color the menu by product**, same colors and shapes as the website (§2). Engineering is **purple**. |
| The menu is long | **Each product group collapses.** Each person's menu shows only what their role uses. |
| Dashboards are "data overload" and could scare people | **Calm first, deep on demand** (§4): one sentence, a few tiles, only the exceptions, then the full table below. |
| "We went over by 200. Click on that. This is the issue." | **Every number is clickable** and opens a **Why** panel: the breakdown, then the rows behind it, then where it comes from, then what to do (§4.2). |
| "I want to see the raw data" in Explore | **Any summary row opens the rows behind it** (§5). |
| "Build me this dashboard, boom" | Clients **describe** it; **we build it**. A **Request a change** flow shows a rough sketch from our building blocks and tracks the request to live (§4.3). No self-serve builder (v3 §4). |
| Action items: "What is this for? How do you assign? Why not just email? Is this our own Kanban?" | **One owner, a due date, and the number it came from.** The owner is emailed from here. It's a short list, not a board (§7). |
| The QBR pack's gray backgrounds and the gray "Risk" block don't look finished | **Redesign it as a finished document**: white page, cover, comparisons, risk cards (§9). |
| Apps should show a frontline person entering data and a manager seeing it | **Every app page shows the handoff**: who enters it, what happens by itself, and who sees it (§10). |
| "You don't understand it? We'll read it for you." | **Ask your analyst** on any number. It's a thread with a reply time set by the plan (§8). This is what makes us the middle layer. |
| Branding | **Upload a logo and pick a brand color** (§11). |
| "Add an alert, email me too": good | **Keep it.** Add history, snooze, and "send to someone" (§12). |
| The lowest person on a phone and the executive with five screens | **Phone layout for the field, wall-screen mode for leaders** (§13). |

---

## 1. The idea: one loop

Every screen exists to move one person one step around this loop. If a
feature doesn't serve a step, it doesn't belong (no cheese grater at the
pancake station).

1. **It comes in.** Data arrives from the client's systems, or from someone
   in the field through Enter data.
2. **It needs you.** Home and the bell show the one to three things that need
   *this* person today.
3. **See why.** Click the number. See the breakdown, then the rows behind it.
4. **Act.** Send it to someone (an action item with an owner and a date), ask
   your analyst, or set an alert.
5. **Done.** The owner closes it with one line, and the number shows whether
   it recovered. The next review confirms it.

**Who does each step:** numarket runs step 1 and builds everything in steps
2–3. The client acts in step 4. The analyst helps with steps 3–5. This matches
v3 §3 ("Who does what").

---

## 2. Navigation

### The menu

```
Home
FOUNDATION · your data            (navy   #22577a, cube)
  Explore
  Enter data
  Data health
WORKSPACE · dashboards & reports   (teal   #2a8f91, dodecahedron)
  Dashboards
  Reports
  Ask Your Data
INSIGHT REVIEW · your analyst      (green  #2e9e6b, octahedron)
  Reviews
  Action items
  QBR pack                         (Mid and Large)
ENGINEERING · apps built for you   (purple #6c5dd3, icosahedron, dashed)
  Apps
```

- **Color by product.** Each group header has its product shape and color. The
  item you're on shows a 3px bar in that color. The colors and shapes are the
  website's, so what clients saw in the sales process is what they see now.
  On the website the Engineering shape is now purple as well.
- **Collapsible groups.** Click a group header to fold it. The Portal remembers
  this for each person. With the whole menu folded, it shows only icons.
- **Products not in the plan** stay in the menu, dimmed with a lock. Clicking
  one shows a short "What this adds" card. No price, no sales button.
- **Menus by role.** People see only what they can use:

| Role (example) | Sees |
|---|---|
| Owner (COO) | Everything, plus Admin |
| Editor (project manager) | Home, Foundation, Workspace, Action items, Apps for their jobs |
| Contributor (superintendent) | Home, Enter data, their own action items |
| Viewer (CFO) | Home, Dashboards, Reports, Reviews, QBR pack, their own alerts |

### The top bar

Left to right:
- the client's logo (§11);
- **Find**, which searches jobs, people, saved views, reports, and definitions;
- **Ask**, which opens the Ask Your Data side panel;
- the **bell**, which holds alerts and anything assigned to you;
- the "Sample data" chip (demo only);
- your profile.

---

## 3. Home: "what needs you"

Home is built for one person, and it's short. From top to bottom:

1. **Greeting, and what needs you.** "Good morning, Dana. 3 things need you."
   Each item comes from an alert, an action item, or a data flag, and has one
   button (Review, Approve, Open).
2. **Your numbers.** Up to four tiles the person pinned. Each role has a
   sensible default set.
3. **Your analyst's latest read.** Three lines and a link to the review.
4. **Ask a question.** One box.

**Move off Home:** the "What's where" map. Show it for the first two weeks as
onboarding, then move it to Help. After that it's clutter.

---

## 4. Dashboards (Workspace): calm first, deep on demand

### 4.1 What every dashboard page looks like

Each dashboard page answers one question ("Are my jobs on budget?").

1. **One sentence written from the data.** "2 of 18 jobs are over budget, by
   $206K together. Everything else is on plan."
2. **Up to four tiles.** Each shows the value and the change from last period.
   A tile turns red or amber **only** when it crosses a threshold. Color means
   something, or it isn't there.
3. **Needs attention.** At most three cards, and only the exceptions: "Main St
   Retail Fit-Out: $206K over for the work done. Design-error change orders
   are 40% of it."
4. **One or two charts.**
5. **The full table, below the fold.** Every job × the key measures, sortable,
   colored only where something is off. This is the "matrix that shows it all".
6. **More** holds the secondary charts, folded by default.

Defaults: last 12 months, all jobs. Filters sit in one row and can be saved.

### 4.2 The Why panel (the drill-down)

Clicking any tile, bar, card, or table cell opens a side panel. The dashboard
stays in view behind it.

1. **The breakdown.** The number split by its biggest drivers (cost code,
   vendor, month). The largest one is highlighted.
2. **See the rows.** Opens Explore, filtered to exactly the records behind the
   number. Each row shows its source system and when it was last updated.
3. **Where this comes from.** The business definition, its sources, the last
   update, and the checks it passed. This answers "can I trust this?".
4. **Act:**
   - **Send to someone.** Creates an action item with this number attached
     (§7). The person is emailed.
   - **Ask your analyst.** Opens a thread with this number attached (§8).
   - **Alert me when this changes.**
   - **Copy as a picture.**

Esc closes the panel. The panel has its own address, so it can be shared as a
link.

### 4.3 Request a change (clients describe, we build)

Clients don't build dashboards from scratch, on purpose (v3 §2). They ask, and
we build.

- A **Request a change** button sits on every dashboard and on the Dashboards
  list.
- The client writes what they want in plain English: "a page for the
  warehouse team showing late shipments by carrier."
- The Portal shows a **rough sketch** built from our standard blocks (tiles,
  bar, line, table), labeled "Sketch, not final". The client can add or remove
  blocks. This is the "boom, it builds it" moment, kept within the blocks we
  support.
- When they submit, the request shows its status (Received → Building → Ready
  for you to review → Live), an estimate in change hours, and the hours left
  this month (Small 2, Mid 6, extra $175/h in blocks of 5).
- The analyst gets it in their queue with the sketch attached.

Later (v3 §4): an AI "describe the chart" helper, limited to our blocks and
counted against the question allowance.

---

## 5. Explore (Foundation): from a view to the raw rows

- **Start from a view** (Job cost by month, Open RFIs, Receivables aging…).
- **Every summary row opens the rows behind it**, inline. "Open as a table"
  shows the full set. This is "click it and see the raw data".
- Each column shows where it comes from (QuickBooks, Procore, Daily field
  report).
- You can filter by any column, find text, group rows, save the view for
  yourself or the team, and download it as CSV or PDF.
- **Alert me** works on any filtered view, as in v3.
- Admins also see **All tables**.

### Data health: how the data flows

Data health gets a **flow map**: sources → checks → clean tables → the
dashboards and reports that use them. Click any box to see its status, its last
update, and its flags. This is "see how all the data is working", in one
picture.

---

## 6. Enter data (Foundation): built for the phone

**For the person in the field (Contributor):**
- They open the Portal on a phone and see only their forms and their jobs.
- The forms use big inputs, are checked as they type, allow a photo, and save
  a draft if the signal drops.
- After they submit, the confirmation says what the entry updates: "Updates
  the Job cost dashboard and Friday's status report at the next update."

**For the manager:**
- A **Today** list shows who submitted and who didn't ("2 reports missing from
  Harbor Lot"), each with a one-tap **Remind**.
- If an entry looks off (hours far over plan), the manager is told.

**Upload a spreadsheet:** drop the file, see a preview with the same checks,
fix the flagged rows, and submit.

---

## 7. Action items (Insight Review), made clear

**What they are:** the decisions that come out of each review, plus anything
someone sends from a dashboard. **They are not a task manager.** We don't
manage tasks (v3 §1). This is a short list of decisions tied to numbers.

**Every item has:**
- **one owner**, a person on the client's team;
- **a due date**;
- **the number it came from** (a link back to the Why panel);
- **what done looks like** ("Main St back under 3% over budget").

**How people hear about it:**
- The owner gets an email the moment it's assigned, with a one-click link.
- A reminder goes out two days before the due date.
- A Monday digest lists everything open.

**Why not just send an email?** The Portal does send the email. Keeping the
item here also keeps the record: who owns it, by when, and whether the number
moved. The next review and the QBR pack are built from that record.

**Status** is Open, In progress, or Done. Marking it Done asks for one line on
what was done. If the item is tied to a number, it also shows whether the
number recovered.

**Who can assign:** Owners, Editors, and the analyst. Contributors see only
their own items.

**Layout:** a list grouped as Overdue, This week, and Later, with a
Mine/Everyone switch. No board.

---

## 8. Your analyst (Insight Review): the people layer

This is what we sell that software alone can't do. The client doesn't have to
read their own data. We read it with them.

- **Reviews.** Every review has the same five parts: What changed · Why ·
  What's at risk · What to do (the action items) · A note on data health.
- **Ask your analyst.** A thread for each question, with any number or chart
  attached ("Explain this"). It's answered within the plan's reply time:
  1 business day on Small, 4 business hours on Mid, 2 hours on Large (the
  same as the website).
- **The next meeting.** The date, plus an agenda built from the open action
  items.

---

## 9. QBR pack: a finished document

The pack must look done. That means a white page shaped like printed paper
(Letter or A4), the client's logo on the cover, and no gray fills.

1. **Cover:** the client's logo, the quarter, and "Prepared by numarket".
2. **The quarter at a glance:** four numbers. Each shows the change from last
   quarter and the gap to plan, with a small trend line.
3. **What changed:** a comparison table with this quarter, last quarter, plan,
   and variance. A variance cell is colored only when it's off. A switch at
   the top changes the comparison: vs. last quarter, vs. the same quarter last
   year, or vs. plan.
4. **Wins.**
5. **Risks.** Each risk is a white card with a red or amber bar on the left.
   The card shows the number, the owner, and the plan to fix it. This replaces
   the gray "Risk" block.
6. **Decisions needed.**
7. **Next quarter's focus.**
8. **Appendix:** the definitions of every number used.

The pack exports as a branded PDF. It's included on Mid and Large, per the
website. Small gets the monthly review.

---

## 10. Apps (Engineering): show the handoff

Every app page tells the same three-step story: **who enters it → what happens
by itself → who sees it.**

| App | In the field | By itself | In the office |
|---|---|---|---|
| Scan a paper form | The superintendent photographs the daily log | It's read, checked, and added to the data | The PM sees it on the Job cost dashboard. Missing logs are flagged. |
| Change order approvals | The super submits a change from the site | It's routed to the PM. Once approved, it's added to the change order log. | The dashboard and QBR pack update. The owner sees the approved total. |
| Estimate builder | The estimator enters the size and scope | Prices are built from what similar past jobs really cost | Once approved, the estimate becomes the job's budget in Foundation |

Apps outside the client's plan show as examples with **Ask for a quote**.

---

## 11. Branding (Admin → Branding)

Owners can upload a logo (SVG or PNG), pick a brand color, and set the company
name, with a live preview. The branding appears in:
- the top-left of the Portal;
- status reports;
- the QBR pack;
- emails.

---

## 12. Alerts

- **Keep:** "Alert me" on any view, "Email me too", and the Monday summary.
- **Add:**
  - **history**: when each alert fired and at what value;
  - **snooze**;
  - **send to someone**, which turns an alert into an action item in one step.

---

## 13. Phones and big screens

- **Phone (field):** Home shows only my forms and my items. A bottom bar has
  Home, Enter data, Items, and Ask. One task per screen.
- **Desktop:** the same pages, responsive.
- **Wall screen:** a mode for leaders' screens. It rotates through pinned
  dashboards every 30 seconds in large type, needs no clicks, and shows only
  the sentence, the tiles, and the exceptions.

---

## 14. Visual rules (the "Snowflake" bar)

- **White surfaces.** Use one light gray, and only for the page background.
  No gray fills inside cards.
- **Color carries meaning, and nothing else.** Product colors are for
  navigation only. Red and amber are for exceptions only. Green appears only
  when something got better.
- **Tables:** thin dividers, figures right-aligned in fixed-width digits, a
  header row that stays in view, and no stripes.
- **One accent per card.** One main button per screen.
- **Spacing on an 8px grid.** Type: DM Sans, the same as the website.
- Every chart has a title that says what it shows, plus units and a source
  line.

---

## 15. The demo

- **The sign-in page** is the persona picker, for example Owner, Project
  manager, Superintendent, and CFO. It's the only page that says this is a
  sample company that resets nightly.
- **No banners or sales buttons** inside the Portal.
- Each persona lands on their Home with a short **"Try this"** guide that can
  be dismissed. For the Owner: click the red number → see the rows → send it
  to the PM.
- **The demo is the product.** No demo-only screens. If we change the product,
  the demo changes the same day, so what a prospect saw is what they get.

---

## 16. What we won't build, and why

| Not building | Why |
|---|---|
| A dashboard builder for clients | Results vary, and trust depends on everyone seeing the same numbers. We build dashboards; clients request them (v3 §2, §4). They can change *how* a chart is shown (line, bars, table, heat map) but not what it measures. |
| A task manager for the client's own work (projects, subtasks, everyone's to-dos) | We're not a work-management tool (v3 §1). Action items are decisions tied to numbers. The one board we keep is **Requests**: what numarket is doing for the client (§19). |
| Team chat | Questions go to the analyst, with the number attached. People already chat in their own tools. Sending a chart to a teammate (§19) is a notice and an email, not a conversation. |

---

## 17. Build order

| Phase | What | Rough size |
|---|---|---|
| 1. Quick wins | Remove the demo banner; product colors and collapsible groups in the menu; menus by role; QBR pack visual pass; action items with owner, email, source, and "what done looks like" | 2–3 days |
| 2. The drill-down | The Why panel (breakdown → rows → where it comes from → act); summary rows open their raw rows in Explore; Request a change with sketches | 1–2 weeks |
| 3. The people layer | Ask your analyst threads; the Data health flow map; branding upload | 1 week |
| 4. Field and wall | Phone layout for Contributors, the manager's Today list with Remind, wall-screen mode | 1 week |

**Done means:** a superintendent can submit a daily report on a phone in
under a minute; the PM sees it at the next update; the owner can go from a red
number to the rows behind it to an assigned action item in four clicks; and
the QBR pack prints like something we'd hand a board.

---

## 19. October 25 additions (Brandon), and what's built

Brandon read v1 and added these. All of them are built in the Portal
(`thepacheco/numarket-platform`, branch `claude/pensive-meitner-g01fkc`),
tested, and waiting to be merged to `main`, which deploys
app.numarket.us.

| Brandon asked | Built as |
|---|---|
| One Kanban for everything numarket works on for the client: app ideas, help desk issues, improvements, change requests. Filterable, so they can see exactly where we are. | **Requests** (top of the menu). Columns Submitted → Planned → In progress → Ready for your review → Done. Filter by kind (changes, app ideas, issues, improvements), by product, or "only mine". Each card has its history; numarket's replies show on the card; the person who asked (or an admin) approves it or sends it back. Shows change hours used this month and the plan's reply time. "Request a change" on every dashboard and "Suggest an app" on Apps open the same form; dashboard changes include a sketch from our blocks. |
| Owners decide what each role can see, maybe only one or two dashboards. | **Settings → Roles → Dashboards each role sees.** Owners always see everything; data scopes still apply. Enforced on the dashboards list, each page, CSV export, Home pins, report design, and sending. |
| Pin parts of the QBR (with its history) to Home. | **"Add to my Home"** on the QBR's "What changed" table; Home shows the latest quarter at a glance. |
| Pinning a drilled-down chart should ask: this view, or the whole thing? | The pin asks **"As you see it now (Route 9 Bridge · Last 3 months · Table)"** or **"The full view"**. Home redraws the pinned view with a label, rechecked against what the person may see. |
| Let people look at a chart another way, like a heat map. Not reinventing Power BI. | **See it as**: line, bars, table, or heat map, on every chart, from the same blocks. |
| "Up X vs the prior 6 months": let them compare other ways. | Periods (this month to 12 months, year to date, custom) plus **Compare with: the period before, or the same time last year.** The QBR compares with the quarter before or the same quarter last year. |
| A P&L-style matrix you can click down into and roll back up. | The P&L is a **matrix**: sections rolled up to totals; click a section to open its accounts, "Open every account" / "Roll up"; each account opens its rows. |
| Click on a number and see the rows behind it. | **Rows** on every number and chart opens Explore with the same period and job. In tables, a job opens the dashboard for that job; a customer, vendor, or cause opens its own rows. |
| Track changes over time; click an alert and see what changed. | **What changed** on Home: your pinned numbers last month vs. the month before, then alerts, numarket's replies, data questions, entries, new reviews, and action items moved, over a day, 7 days, or 30 days. |
| Quickly send a chart to someone by email, with the details attached. | **Send** on every chart: pick a teammate (only people who may see that view), add a note; it lands on their bell with a link to the same view, and by email with a picture of the chart and the rows as a CSV once email is set up. The demo never sends email. |

Also built from v1: product colors and foldable groups in the menu
(Engineering purple), no sales lines in the demo, action items as one
list (owner, due, done-when, the number behind it, remind the owner),
and the QBR pack as one finished document with risk cards.

**Not built yet** (next round): the Why side panel as one place (today
the drill is spread across Rows links, the matrix, and tables), Ask your
analyst threads on any number, the Data health flow map, the phone-first
Contributor layout and the manager's Today list, wall-screen mode,
branding logo upload, alert history and snooze.
