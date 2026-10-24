import { fmt, visibleRows, type Datasets, type RangeSel } from "@numarket/blocks";
import type { Scope } from "@numarket/db/repo/snapshots";
import type { Vocab } from "@numarket/db/demo/vocab";

/* "What changed": three plain-language callouts at the top of a dashboard,
   computed from the same rows the charts use. This is Workspace software
   (automatic, every update); the analyst's judgment is Insight Review. */

export type Insight = { tone: "good" | "watch" | "risk" | "info"; icon: string; title: string; detail: string };

type Row = Record<string, unknown>;
const n = (v: unknown) => Number(v) || 0;
const sum = (rows: Row[], f: string) => rows.reduce((t, r) => t + n(r[f]), 0);
const money = (v: number) => fmt(v, "money");
const pctChange = (a: number, b: number) => (b ? (a - b) / Math.abs(b) : 0);
const dir = (x: number) => (x >= 0 ? "up" : "down");

export function insightsFor(kind: "financials" | "projects", ds: Datasets, scope: Scope, range: RangeSel | null, v: Vocab, job?: string): Insight[] {
  const out: Insight[] = [];
  const eq = job ? { job } : {};
  if (kind === "financials" && !scope) {
    const cur = range ? visibleRows(ds, "pnl", null, { range: range.current }) : [];
    const pri = range?.prior ? visibleRows(ds, "pnl", null, { range: range.prior }) : [];
    const sec = (rs: Row[], s: string) => sum(rs.filter((r) => r.section === s), "amount");
    const rev = sec(cur, "Revenue"), revP = sec(pri, "Revenue");
    const net = rev - sec(cur, "Cost of goods sold") - sec(cur, "Operating expenses");
    const netP = revP - sec(pri, "Cost of goods sold") - sec(pri, "Operating expenses");
    if (revP) {
      const ch = pctChange(rev, revP);
      out.push({ tone: ch >= 0 ? "good" : "watch", icon: "chart", title: `Revenue is ${dir(ch)} ${Math.abs(Math.round(ch * 100))}% ${range?.compareLabel ?? ""}`, detail: `${money(rev)} in ${range?.label}. Net income ${money(net)}, ${dir(net - netP)} from ${money(netP)}.` });
    }
    const ar = visibleRows(ds, "ar_aging", null).map((r) => ({ c: String(r.customer), late: n(r.d61_90) + n(r.d90p), total: n(r.total) })).sort((a, b) => b.late - a.late);
    const late = ar.reduce((t, r) => t + r.late, 0);
    if (ar[0]?.late) out.push({ tone: "risk", icon: "clock", title: `${money(late)} is more than 60 days late`, detail: `${ar[0].c} owes ${money(ar[0].late)} of it. ${ar.filter((r) => r.late > 0).length} ${v.customers} in all are past 60 days.` });
    const cash = visibleRows(ds, "cash", null);
    const last = cash[cash.length - 2], prev = cash[cash.length - 3];
    if (last && prev) out.push({ tone: n(last.balance) >= n(prev.balance) ? "good" : "watch", icon: "pulse", title: `Cash ${n(last.balance) >= n(prev.balance) ? "grew" : "fell"} to ${money(n(last.balance))}`, detail: `${money(Math.abs(n(last.balance) - n(prev.balance)))} ${n(last.balance) >= n(prev.balance) ? "more" : "less"} than the month before.` });
    return out.slice(0, 3);
  }
  if (kind === "projects") {
    const jobs = visibleRows(ds, "job_summary", scope, { eq });
    const over = jobs.filter((j) => n(j.over) > 0).sort((a, b) => n(b.over) - n(a.over));
    if (over[0]) {
      const cos = visibleRows(ds, "change_orders", scope, { eq: { job: String(over[0].job) }, range: range?.current ?? null });
      const byCause = new Map<string, number>();
      for (const r of cos) byCause.set(String(r.cause), (byCause.get(String(r.cause)) ?? 0) + n(r.amount));
      const top = [...byCause.entries()].sort((a, b) => b[1] - a[1])[0];
      out.push({ tone: "risk", icon: "flag", title: `${over[0].name} is ${money(n(over[0].over))} over budget for the work done`, detail: top ? `${top[0]} is the biggest cause of ${v.changeOrders} there (${money(top[1])} in ${range?.label ?? "the period"}).` : `Cost performance ${fmt(over[0].cpi, "dec2")}.` });
    } else if (jobs.length) {
      out.push({ tone: "good", icon: "check", title: `Every ${v.job} is on or under budget`, detail: `For the work done so far, across ${jobs.length} ${jobs.length === 1 ? v.job : v.jobs}.` });
    }
    const rfis = visibleRows(ds, "rfis", scope, { eq });
    if (rfis[0]) out.push({ tone: n(rfis[0].days_open) > 21 ? "watch" : "info", icon: "clock", title: `${rfis[0].number} has waited ${rfis[0].days_open} days`, detail: `${String(rfis[0].subject)} on ${String(rfis[0].job_name)}, waiting on ${String(rfis[0].ball_in_court)}. ${rfis.length} ${v.rfis} open in all.` });
    if (range?.prior) {
      const h = sum(visibleRows(ds, "crew_hours_monthly", scope, { eq, range: range.current }), "hours");
      const hp = sum(visibleRows(ds, "crew_hours_monthly", scope, { eq, range: range.prior }), "hours");
      if (hp) {
        const ch = pctChange(h, hp);
        out.push({ tone: "info", icon: "chart", title: `${v.Hours} ${dir(ch)} ${Math.abs(Math.round(ch * 100))}% ${range.compareLabel ?? ""}`, detail: `${fmt(h, "hours")} in ${range.label}.` });
      }
    }
    return out.slice(0, 3);
  }
  return out;
}
