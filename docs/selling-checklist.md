# What you need to sell numarket

**As of October 4, 2026.** Three lists, in the order you need them. The
technical side is in `docs/production-plan.md`.

- **A. To start selling now:** demos and pilot conversations. The demo is enough.
- **B. Before a client signs or sends real data:** contracts, insurance, security.
- **C. The sales kit:** what you hand people.

---

## A. To start selling now (this week)

| | Item | Notes |
|---|---|---|
| [ ] | Demo live at **app.numarket.us** | README §1. About an hour. |
| [ ] | Vercel on the **Pro** plan | The free plan is for non-commercial use. |
| [ ] | Website "See a live demo" → `app.numarket.us/sign-in` | One link change in the website repo. |
| [ ] | **Conflicts check** | Confirm your Evergreen/Safeguard agreements allow outreach before contacting anyone tied to them (operating decisions §8). |
| [ ] | A **15-minute demo script** | Below in section C. Practice it three times. |
| [ ] | A booking link | Calendly or Google appointment schedule, on the website Contact page. |
| [ ] | Business email signature and LinkedIn page | "numarket — the data team you don't have to hire." |
| [ ] | Target list of 30 names | Own network first, then 3–5 referral partners (CPA firms, fractional CFOs, IT service providers). |
| [ ] | The pilot offer, in writing | One page: what they get, 90 days, free or discounted, in exchange for a case study and permission to show it. |

What you can honestly say today: "This is the Portal your team would use. The
numbers here are a fictional construction company. For a pilot, we connect
your systems and set up your workspace over the first few weeks."

What not to say yet: that you hold SOC 2 or HIPAA certification, that data is
"live" (it updates on a schedule), or that the exit account transfer is
guaranteed (Snowflake confirmation pending).

---

## B. Before a client signs or sends real data

### Company and money
| | Item | Notes |
|---|---|---|
| [ ] | numarket LLC in good standing (Georgia), EIN | |
| [ ] | Business bank account | Keep client money out of personal accounts. |
| [ ] | Invoicing and payment terms | Stripe or QuickBooks invoicing. Suggested: setup fee 50% at signing and 50% at go-live; monthly fee in advance; net 15. |
| [ ] | Bookkeeping | So your own numbers are clean: you'll be asked. |

### Contracts (attorney review once, roughly $2,000–5,000)
| | Item | Notes |
|---|---|---|
| [ ] | **Master Services Agreement (MSA)** | Scope, fees, change hours, liability cap, data ownership, exit within 30 days. |
| [ ] | **Order Form / Statement of Work** | Plan, size, sources, setup price, monthly price, start date. One per client. |
| [ ] | **Data Processing Addendum (DPA)** | numarket as service provider/processor; 72-hour incident notice; subprocessors; GDPR line "available on request." |
| [ ] | **Pilot agreement** | Short version of the MSA for the free/discounted pilot, with case-study permission. |
| [ ] | **Terms of Service and Privacy Policy** | On the website; US-focused; no GDPR compliance claim. |
| [ ] | **Contractor agreement** | If anyone helps you: confidentiality, IP assignment, security rules. |
| [ ] | **Referral partner agreement** | What partners earn and when (website Partners page). |

### Insurance (confirm bound before the website says so)
| | Item | Notes |
|---|---|---|
| [ ] | Professional liability (E&O) | Covers mistakes in the work. |
| [ ] | Cyber liability | Covers a data incident, including notification costs. |
| [ ] | General liability | Often bundled. Ask a broker for a small tech-services package. |

### Security and trust (clients' IT people will ask)
| | Item | Notes |
|---|---|---|
| [ ] | **Penetration test** passed, highs fixed | Required before real data (plan, Gate). Keep the summary letter to share. |
| [ ] | **Security one-pager** | Private Snowflake account per client, read-only connections, row-level isolation, MFA, audit log the client can read, exit package. |
| [ ] | **Security questionnaire answers** | A ready-made answer set (SIG Lite or CAIQ style) saves days per deal. |
| [ ] | **Subprocessor list** | Vercel, Neon, Snowflake, AWS, WorkOS, email provider, Sentry. Published with the DPA. |
| [ ] | **Incident response runbook** | Rehearsed once. |
| [ ] | **Backup and restore test** | Done and dated. |
| [ ] | Password manager and MFA on every numarket account | Plus a break-glass admin account. |

### Product and partners
| | Item | Notes |
|---|---|---|
| [ ] | Real sign-in (WorkOS) and invitations | Plan Phase 2. |
| [ ] | Data pipeline for the client's sources | Plan Phases 3–4. Check the client's sources against what's built. |
| [ ] | **Snowflake Partner Network** application | Confirm resale billing and account transfer at exit before any contract promises it. |
| [ ] | **Intuit developer app** in production review | For QuickBooks Online. Takes weeks. Start early. |
| [ ] | **Procore developer app** | For Procore clients. |
| [ ] | Onboarding checklist | Readiness Check → kickoff → sources → definitions → dashboards → first weekly report → 30-day review. |
| [ ] | Support promise | Support email, business-hours response time, how urgent issues reach you. |

---

## C. The sales kit

| | Item | What's in it |
|---|---|---|
| [ ] | **Demo script (15 minutes)** | 1) Dana, the owner: Home, "the company at a glance." 2) Financial dashboard → Receivables: "who owes you, by age." 3) Projects → Route 9 Bridge over budget, hover a number for its definition. 4) Flags: the problems found in your data this week, each waiting for an answer. 5) Status reports → weekly report → Download PDF, in your branding. 6) Design a report from a template. 7) Switch to Marcus: he only sees his job. 8) Luis on a phone: the daily field report replaces paper. 9) Ask Your Data: "Who owes us money over 60 days?" 10) Data tables: "your database, yours to keep." |
| [ ] | **Pitch deck (8–10 slides)** | The problem (numbers you don't trust, reports rebuilt by hand), what numarket does (Foundation, Workspace, Insight Review, Engineering), the demo screenshots, how setup works, pricing, security, exit, the pilot offer. |
| [ ] | **One-page leave-behind per industry** | Construction first (it matches the demo). Then one more industry you know well. |
| [ ] | **Pricing sheet** | Straight from the website: per-product prices by size, bundles, what's included, add-ons. |
| [ ] | **ROI one-pager** | "Hours per week your team spends building the status report and chasing numbers" × loaded hourly cost vs. the monthly price. |
| [ ] | **Readiness Check** | The website quiz plus the five questions (paper vs. digital, sources, volume, sensitive data, EU/UK people). |
| [ ] | **Proposal template** | Fixed setup, fixed monthly, timeline, exactly what they get. Sent within 2 business days. |
| [ ] | **Referral partner kit** | One page for CPAs, fractional CFOs, and IT providers: who's a fit, how referrals work, what partners earn. |
| [ ] | **Case study** | After the pilot: before/after hours, the report they now use, a quote. |
| [ ] | **FAQ for objections** | "Do you edit my QuickBooks?" No: we build a clean copy beside it. "What if we leave?" You get everything in open files. "Is our data mixed with others?" No: your own private database. "Can we use Power BI?" Yes: read-only access to your tables. |

---

## Accounts you'll hold (create each under an admin@numarket.us mailbox, with MFA)

| Account | Needed for | When |
|---|---|---|
| GitHub (repos) | Code | Have it |
| Vercel (Pro) | Hosting the Portal | Now |
| Neon | Portal database | Now (through Vercel) |
| IONOS | DNS for numarket.us | Have it |
| Uptime monitor | Alerts if the demo goes down | Now |
| Sentry | Error alerts | Phase 1 |
| WorkOS | Sign-in, MFA, SSO | Phase 2 |
| Postmark or Resend | Invitations, alerts, report emails | Phase 2 |
| Microsoft Entra app, Google Cloud project | "Sign in with Microsoft/Google," SharePoint and Drive | Phase 2 |
| `numarket.app` domain | Client addresses | Phase 2 |
| AWS | Worker, secrets, fixed IP | Phase 3 |
| Snowflake organization + Partner Network | Client databases | Phase 3 |
| Intuit Developer, Procore Developer | Connectors | Phase 3–4 |
| Stripe | Invoicing | Before the first paid invoice |
| Password manager (1Password or Bitwarden) | Everything above | Now |

---

## The short version

1. **This week:** deploy the demo, upgrade Vercel, fix the demo link on the website, write the pilot offer, practice the demo, start calling your own network.
2. **Next 30 days:** attorney on the contracts, insurance quotes, Snowflake Partner Network and Intuit applications, real sign-in built.
3. **Before the pilot's real data:** pipeline for their sources, pen test, restore test, incident runbook.
4. **After 90 days:** the case study becomes your best sales tool.
