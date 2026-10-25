# The numarket handbook

Every company document lives here, in `numarket-platform/docs/`. The website
repo keeps only website notes. If a document isn't listed below, it's either
in `archive/` (kept for history) or it doesn't exist.

## Read in this order

| # | File | What it answers | Who it's for |
|---|---|---|---|
| 1 | [`START-HERE.md`](START-HERE.md) | What's real today, how the business works, every promise the website makes and whether it's true yet | Brandon |
| 2 | [`ACCOUNTS.md`](ACCOUNTS.md) | Every account to create, in order, and what to hand Claude Code | **Brandon's task list** |
| 3 | [`BUILD-PLAN.md`](BUILD-PLAN.md) | What gets built next, in order, with a "Done when" test for each step | **Claude Code's task list** |
| 4 | [`operations/50-day-plan.md`](operations/50-day-plan.md) | Selling: week by week to the first client | Brandon |

## Reference

| File | What it is |
|---|---|
| [`product-and-pricing.md`](product-and-pricing.md) | **The source of truth** for the four products, who does what, prices, and the margin math. The website's prices (`numarket-website/content/tiers.ts`) must match it. |
| [`platform-build-spec.md`](platform-build-spec.md) | The full technical spec: architecture, sign-in, isolation, Snowflake, connectors, security |
| [`portal-v4-flow.md`](portal-v4-flow.md) | How the Portal is laid out and why (the v4 redesign), and the ideas queued for later |
| [`operations/README.md`](operations/README.md) | Running the business: go-live steps, addresses, the weekly rhythm, when to hire |
| [`operations/sops.md`](operations/sops.md) | 18 step-by-step procedures, from a new lead to a client leaving |
| [`operations/selling-checklist.md`](operations/selling-checklist.md) | The sales kit, contracts, and insurance list, and the 15-minute demo script |
| [`archive/`](archive/) | Old documents kept for history. Don't work from them. |

## Rules for keeping this tidy

- **One topic, one file.** Update the file instead of starting a new one.
- **Date the top line** when you change a document ("October 25, 2026").
- **Prices change in two places together:** `product-and-pricing.md` and the
  website's `content/tiers.ts`.
- **Move superseded files to `archive/`.** Don't delete them.
