"use server";

import { revalidatePath } from "next/cache";
import { ipAllowed, isValidCidr, type SignInMethod } from "@numarket/auth";
import { withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import { getPolicy, updateBranding, updateMember, updatePolicy } from "@numarket/db/repo/admin";
import { latestSnapshot, manualRefreshesToday, publishSimulated, simulationAllowed } from "@numarket/db/repo/snapshots";
import { addSource, getHomeLayout, createReport, listActionItems, setActionStatus, deletePendingEntry, deleteReport, getFlag, getReport, getScreen, insertEntry, listDashboards, publishReport, resolveFlag, saveDraft, saveHomeLayout, suggestDefinition, updateReportDesign, validateEntry, type ReportLayout } from "@numarket/db/repo/workspace";
import { REPORT_TEMPLATES } from "@numarket/db/demo/config";
import { addRequestUpdate, getRequest, insertRequest, REQUEST_KINDS, REQUEST_PRODUCTS, type RequestKind, type RequestProduct, type SketchBlock } from "@numarket/db/repo/requests";
import { TIER_LIMITS } from "@numarket/metering";
import { companyDatasets, toLayout } from "@/lib/reportDesign";
import { updateNowLimit } from "@numarket/metering";
import { parseHex } from "@numarket/ui";
import { ActionError, assertNotDemo, tenantOrThrow } from "@/lib/guard";
import { fmtDateTime, jobsInScope, localLink, todayIn, workspace } from "@/lib/data";
import { checkUpload, type UploadResult } from "@/lib/upload";
import type { AskState } from "@/lib/ask";

/* Every action: check the session and permission first (tenantOrThrow), do
   the work inside withTenant (row-level security), write the audit log, and
   return a short message. Server Actions also verify Origin against Host. */

export type ActionResult = { ok: boolean; message: string; errors?: Record<string, string>; redirect?: string };

async function run(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const actorKind = (demo: boolean) => (demo ? ("demo" as const) : ("user" as const));

/* ---------- input screens ---------- */

export async function submitEntry(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("input.submit");
    const slug = str(form, "screen");
    return withTenant(ctx.tenant.id, async (db) => {
      const screen = await getScreen(db, slug);
      if (!screen) throw new ActionError("That form doesn't exist.");
      const snap = await latestSnapshot(db);
      const jobs = jobsInScope(snap?.datasets, ctx).map((j) => j.code);
      const raw = Object.fromEntries(screen.fields.map((f) => [f.key, str(form, f.key)]));
      const v = validateEntry(screen.fields, raw, { jobs, today: todayIn(ctx.tenant.timezone) });
      if (!v.ok) return { ok: false, message: "Please fix the highlighted fields.", errors: v.errors };
      /* entries read from a scanned paper form say so, for the record */
      const via = str(form, "via") === "scan" ? { via: "scan" } : {};
      const id = await insertEntry(db, slug, { ...v.data, ...via }, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "input.submit", target: slug, detail: { entry: id, ...via }, ip: meta.ip });
      revalidatePath("/", "layout");
      return { ok: true, message: "Saved. It's in your entries now and will appear in dashboards at the next update." };
    }, { userId: ctx.user.id });
  });
}

/** Check an uploaded CSV against a screen's template, or import its valid rows. */
export async function uploadFile(_: UploadResult | null, form: FormData): Promise<UploadResult> {
  try {
    const { ctx, meta } = await tenantOrThrow("input.submit");
    /* sandboxes hold a prospect's name but must never hold their real files */
    if (ctx.tenant.sandboxUntil) return { ok: false, message: "Uploads are turned off in sandboxes, so real files stay out of it. Try the forms instead; uploads open in your own workspace." };
    const slug = str(form, "screen");
    const intent = str(form, "intent") === "import" ? "import" : "check";
    const text = String(form.get("csv") ?? "");
    return await withTenant(ctx.tenant.id, async (db) => {
      const screen = await getScreen(db, slug);
      if (!screen) throw new ActionError("Choose a template.");
      const snap = await latestSnapshot(db);
      const c = checkUpload(text, screen.fields, { jobs: jobsInScope(snap?.datasets, ctx), today: todayIn(ctx.tenant.timezone) });
      if ("error" in c) return { ok: false, message: c.error };
      if (intent === "check") {
        return { ok: true, message: "Checked.", check: { ...c, rows: c.rows.slice(0, 50).map(({ data: _d, ...r }) => r) } };
      }
      const good = c.rows.filter((r) => r.ok);
      if (!good.length) return { ok: false, message: "No rows passed the check, so nothing was imported." };
      for (const r of good) await insertEntry(db, slug, { ...r.data, via: "upload" }, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "input.upload", target: slug, detail: { imported: good.length, skipped: c.invalid }, ip: meta.ip });
      revalidatePath("/", "layout");
      return { ok: true, imported: good.length, message: `Imported ${good.length} ${good.length === 1 ? "row" : "rows"}${c.invalid ? `, skipped ${c.invalid}` : ""}. They reach dashboards at the next update.` };
    }, { userId: ctx.user.id });
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export async function deleteEntry(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("input.edit_own");
    return withTenant(ctx.tenant.id, async (db) => {
      const ok = await deletePendingEntry(db, str(form, "id"), ctx.user.id, ctx.can("input.edit_any"));
      if (!ok) throw new ActionError("Only your own entries can be removed, and only before they're published.");
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "input.delete", target: str(form, "id"), ip: meta.ip });
      revalidatePath("/", "layout");
      return { ok: true, message: "Entry removed." };
    }, { userId: ctx.user.id });
  });
}

/* "Update now": publish pending entries immediately, within the daily limit. */
export async function updateNow(_: ActionResult | null): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx } = await tenantOrThrow("refresh.trigger");
    if (!simulationAllowed(ctx.tenant.isDemo)) throw new ActionError("Updates for this workspace run through the data pipeline.");
    return withTenant(ctx.tenant.id, async (db) => {
      const used = await manualRefreshesToday(db, ctx.tenant.timezone);
      const limit = updateNowLimit(ctx.tenant.tier, ctx.tenant.isDemo);
      if (used >= limit) throw new ActionError(`You've used all ${limit} manual updates for today. The next scheduled update will pick up new entries.`);
      const r = await publishSimulated(db, ctx.tenant, "manual", ctx.user.id);
      revalidatePath("/", "layout");
      return { ok: true, message: r.entriesApplied ? `Updated. ${r.entriesApplied} new ${r.entriesApplied === 1 ? "entry is" : "entries are"} now in your dashboards.` : "Updated. There were no new entries to add." };
    }, { userId: ctx.user.id });
  });
}

/* ---------- reports ---------- */

function commentaryFrom(form: FormData, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = String(form.get(`c_${k}`) ?? "").slice(0, 4000);
    out[k] = v;
  }
  return out;
}

export async function saveReport(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const intent = str(form, "intent");
    const { ctx, meta } = await tenantOrThrow(intent === "publish" ? "report.publish" : "report.edit");
    const slug = str(form, "slug");
    return withTenant(ctx.tenant.id, async (db) => {
      const report = await getReport(db, slug);
      if (!report) throw new ActionError("That report doesn't exist.");
      const keys = report.layout.sections.flatMap((s) => (s.type === "commentary" ? [s.key] : []));
      const commentary = commentaryFrom(form, keys);
      await saveDraft(db, slug, commentary, ctx.user.id);
      if (intent !== "publish") {
        await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "report.save_draft", target: slug, ip: meta.ip });
        revalidatePath(`/reports/${slug}`);
        return { ok: true, message: "Draft saved." };
      }
      const snap = await latestSnapshot(db);
      if (!snap) throw new ActionError("There's no published data to build the report from yet.");
      const version = await publishReport(db, slug, commentary, snap.version, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "report.publish", target: slug, detail: { version, data_version: snap.version }, ip: meta.ip });
      revalidatePath(`/reports/${slug}`);
      revalidatePath("/reports");
      return { ok: true, message: `Published as version ${version}.` };
    }, { userId: ctx.user.id });
  });
}

/* ---------- Ask Your Data ---------- */

export async function askQuestion(prev: AskState | null, form: FormData): Promise<AskState> {
  const items = (prev?.items ?? []).slice(0, 5);
  try {
    const { ctx, meta } = await tenantOrThrow("ask.use");
    const question = str(form, "q").slice(0, 300);
    if (question.length < 3) return { items, error: "Type a question first." };
    const { answer } = await import("@/lib/ask");
    const { asOfMonth } = await import("@/components/Dashboard");
    const { vocabFor } = await import("@numarket/db/demo/vocab");
    const { TIER_LIMITS } = await import("@numarket/metering");
    /* a monthly allowance keeps the cost of questions predictable (the shared demo is exempt) */
    const quota = TIER_LIMITS[ctx.tenant.tier].askQuestionsPerMonth;
    if (quota !== null && !ctx.tenant.isDemo) {
      const used = await withTenant(ctx.tenant.id, async (db) => (await db.query<{ n: number }>("select count(*)::int as n from audit_log where action = 'ask.question' and at >= date_trunc('month', now())")).rows[0].n, { userId: ctx.user.id });
      if (used >= quota) return { items, error: `Your plan's ${quota.toLocaleString("en-US")} questions for this month are used up. They reset on the 1st; your admin can see usage under Settings → Usage & plan.` };
    }
    const ws = await workspace(ctx);
    if (!ws.snapshot) return { items, error: "Your data hasn't had its first update yet." };
    const names = Object.fromEntries(jobsInScope(ws.snapshot.datasets, ctx).map((j) => [j.code, j.name]));
    const scopeNames = ctx.scope ? ctx.scope.values.map((v) => names[v] ?? `job ${v}`).join(", ") : "";
    /* in the shared demo, history is per browser session (see lib/askHistory) */
    const tag = ctx.tenant.isDemo ? { tag: (await import("@/lib/askHistory")).sessionTag(ctx) } : {};
    const a = answer(question, { datasets: ws.snapshot.datasets, scope: ctx.scope, asOf: asOfMonth(ws.snapshot.published_at, ctx.tenant.timezone) }, scopeNames, vocabFor(ctx.tenant.industry));
    await withTenant(ctx.tenant.id, (db) => audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "ask.question", target: question.slice(0, 200), detail: { answered: a.ok, ...tag }, ip: meta.ip }), { userId: ctx.user.id });
    return { items: [{ question, answer: a, updated: fmtDateTime(ws.snapshot.published_at, ctx.tenant.timezone) }, ...items] };
  } catch (e) {
    if (e instanceof ActionError) return { items, error: e.message };
    console.error(e);
    return { items, error: "Something went wrong. Please try again." };
  }
}

/* ---------- connecting a source ---------- */

export async function connectSource(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("sources.connect");
    const { connectorById, HOW_LABEL } = await import("@/lib/connectors");
    const c = connectorById(str(form, "id"));
    if (!c || c.tier !== "A" || (c.how !== "oauth" && c.how !== "folder")) throw new ActionError("That source is set up with your analyst.");
    /* Real connections go through each tool's own sign-in (Stage B). The demo
       records the source as if the client had clicked Allow. */
    if (!ctx.tenant.isDemo) throw new ActionError("Connections open once the data pipeline is live for your workspace.");
    await withTenant(ctx.tenant.id, async (db) => {
      await addSource(db, { provider: c.id, name: c.name, tier: c.tier, connection: c.how === "oauth" ? "Official connection (read-only)" : "Folder sync (read-only)", streams: c.streams });
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: "demo", action: "source.connect", target: c.name, detail: { how: HOW_LABEL[c.how] }, ip: meta.ip });
    }, { userId: ctx.user.id });
    revalidatePath("/sources");
    return { ok: true, message: "Connected. Opening Sources…", redirect: "/sources" };
  });
}

/* ---------- report design (built from existing building blocks) ---------- */

export async function saveReportDesign(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("report.edit");
    const slug = str(form, "slug");
    return withTenant(ctx.tenant.id, async (db) => {
      const report = await getReport(db, slug);
      if (!report) throw new ActionError("That report doesn't exist.");
      const snap = await latestSnapshot(db);
      const dashboards = await listDashboards(db);
      const r = toLayout(String(form.get("design") ?? ""), ctx, { datasets: new Set(Object.keys(snap?.datasets ?? {})), company: companyDatasets(dashboards), jobs: jobsInScope(snap?.datasets, ctx).map((j) => j.code) });
      if (!r.ok) return { ok: false, message: r.message };
      await updateReportDesign(db, slug, r);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "report.design", target: slug, detail: { sections: r.layout.sections.length }, ip: meta.ip });
      revalidatePath(`/reports/${slug}`);
      revalidatePath("/reports");
      return { ok: true, message: "Saved. The report uses this layout from now on, including its PDF." };
    }, { userId: ctx.user.id });
  });
}

export async function createReportAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("report.edit");
    const t = REPORT_TEMPLATES.find((x) => x.key === str(form, "template"));
    if (!t) return { ok: false, message: "Pick a template." };
    const title = str(form, "title").slice(0, 80);
    if (!title) return { ok: false, message: "Give the report a title.", errors: { title: "Required." } };
    return withTenant(ctx.tenant.id, async (db) => {
      const snap = await latestSnapshot(db);
      const jobs = jobsInScope(snap?.datasets, ctx).map((j) => j.code);
      const job = str(form, "job");
      if (job && !jobs.includes(job)) throw new ActionError("Pick a job you can see.");
      if (ctx.scope && !job) return { ok: false, message: "Pick one of your jobs for this report.", errors: { job: "Required." } };
      const company = companyDatasets(await listDashboards(db));
      const base = t.layout as unknown as ReportLayout;
      /* people with a limited scope get the template without company-wide numbers */
      const sections = base.sections
        .map((sec) => (sec.type === "kpis" && ctx.scope ? { ...sec, blocks: sec.blocks.filter((b) => !company.has(String((b as { dataset: string }).dataset))) } : sec))
        .filter((sec) => !(ctx.scope && ((sec.type === "kpis" && !sec.blocks.length) || (sec.type === "block" && company.has(String((sec.block as { dataset: string }).dataset))))));
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "report"}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        await createReport(db, { slug, title, description: t.about, layout: { ...base, sections, prepared_for: str(form, "prepared_for").slice(0, 80) || null, job: job || null, wholeCompany: !ctx.scope && !!base.wholeCompany }, userId: ctx.user.id });
      } catch (e) {
        throw new ActionError((e as Error).message);
      }
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "report.create", target: slug, detail: { template: t.key }, ip: meta.ip });
      return { ok: true, message: "Created. Opening the designer…", redirect: `/reports/${slug}/design` };
    }, { userId: ctx.user.id });
  });
}

export async function deleteReportAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("report.publish");
    const slug = str(form, "slug");
    return withTenant(ctx.tenant.id, async (db) => {
      if (!(await deleteReport(db, slug))) throw new ActionError("That report doesn't exist.");
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "report.delete", target: slug, ip: meta.ip });
      return { ok: true, message: "Deleted.", redirect: "/reports" };
    }, { userId: ctx.user.id });
  });
}

/* ---------- flags ---------- */

export async function flagAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("flags.resolve");
    const id = str(form, "id");
    const intent = str(form, "intent");
    return withTenant(ctx.tenant.id, async (db) => {
      const flag = await getFlag(db, id);
      if (!flag) throw new ActionError("That flag doesn't exist.");
      if (ctx.scope && flag.job && !ctx.scope.values.includes(flag.job)) throw new ActionError("That flag is outside your data scope.");
      if (intent === "resolve") {
        const option = str(form, "option");
        if (flag.options && !flag.options.includes(option)) throw new ActionError("Pick one of the answers.");
        await resolveFlag(db, id, "resolved", option || "Resolved", ctx.user.id);
      } else if (intent === "correct") {
        await resolveFlag(db, id, "correct", "Marked as correct", ctx.user.id);
      } else if (intent === "reopen") {
        await resolveFlag(db, id, "open", null, ctx.user.id);
      } else throw new ActionError("Unknown action.");
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: `flag.${intent}`, target: flag.title.slice(0, 120), ip: meta.ip });
      revalidatePath("/flags");
      revalidatePath("/", "layout");
      return { ok: true, message: intent === "reopen" ? "Reopened." : "Settled. The answer is recorded with the data." };
    }, { userId: ctx.user.id });
  });
}

/* ---------- definitions ---------- */

export async function suggestDefinitionChange(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("definitions.suggest");
    const body = str(form, "body");
    if (body.length < 5 || body.length > 1000) return { ok: false, message: "Describe the change in 5 to 1,000 characters." };
    return withTenant(ctx.tenant.id, async (db) => {
      const key = str(form, "key");
      const exists = await db.query("select 1 from definitions where key = $1", [key]);
      if (!exists.rowCount) throw new ActionError("That definition doesn't exist.");
      await suggestDefinition(db, key, body, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "definition.suggest", target: key, ip: meta.ip });
      revalidatePath("/definitions");
      return { ok: true, message: "Sent to your numarket analyst." };
    }, { userId: ctx.user.id });
  });
}

/* ---------- Insight Review action items ---------- */

/** Move an action item from a review along: open, in progress, done.
    Admins and owners move any; editors move the ones assigned to them. */
export async function setActionItem(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("actions.view");
    const status = str(form, "status");
    if (status !== "open" && status !== "in_progress" && status !== "done") throw new ActionError("Unknown status.");
    const reviewId = str(form, "review");
    const idx = Number(str(form, "idx"));
    return withTenant(ctx.tenant.id, async (db) => {
      const item = (await listActionItems(db)).find((a) => a.reviewId === reviewId && a.idx === idx);
      if (!item) throw new ActionError("That action item doesn't exist.");
      const mine = item.owner.trim().toLowerCase() === ctx.user.name.trim().toLowerCase();
      if (!ctx.can("actions.manage") && !(mine && ctx.can("actions.update_own"))) throw new ActionError(mine ? "Your role can't update action items." : `Only ${item.owner} or an admin can update this one.`);
      await setActionStatus(db, reviewId, idx, status, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "action.status", target: item.title.slice(0, 120), detail: { status }, ip: meta.ip });
      revalidatePath("/reviews", "layout");
      revalidatePath("/");
      return { ok: true, message: status === "done" ? "Marked done. Your analyst will see it." : status === "in_progress" ? "Marked in progress." : "Reopened." };
    }, { userId: ctx.user.id });
  });
}

/** Remind an action item's owner: a notice on their bell, and an email when email is set up. */
export async function remindActionItem(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("actions.manage");
    const reviewId = str(form, "review");
    const idx = Number(str(form, "idx"));
    const { listMembers } = await import("@numarket/db/repo/admin");
    const { notifyUser, setEmailStatus } = await import("@numarket/db/repo/workspace");
    const { emailConfigured, sendEmail } = await import("@/lib/email");
    return withTenant(ctx.tenant.id, async (db) => {
      const item = (await listActionItems(db)).find((a) => a.reviewId === reviewId && a.idx === idx);
      if (!item) throw new ActionError("That action item doesn't exist.");
      if (item.status === "done") throw new ActionError("It's already done.");
      const owner = (await listMembers(db)).find((m) => m.status === "active" && m.name.trim().toLowerCase() === item.owner.trim().toLowerCase());
      if (!owner) throw new ActionError(`${item.owner} doesn't have a Portal sign-in, so remind them directly.`);
      const first = owner.name.split(" ")[0];
      const id = await notifyUser(db, owner.user_id, {
        key: `remind:${reviewId}:${idx}:${todayIn(ctx.tenant.timezone)}`,
        title: `Reminder: ${item.title}`,
        body: `Due ${item.due}. From the ${item.reviewTitle}.${item.doneWhen ? ` Done when: ${item.doneWhen}` : ""} Sent by ${ctx.user.name}.`,
        link: "/reviews/actions?who=me",
      });
      if (!id) return { ok: true, message: `${first} was already reminded today.` };
      let how = "on their bell";
      /* the demo's people aren't real, so it never sends email */
      if (!ctx.tenant.isDemo && emailConfigured()) {
        const text = `${ctx.user.name} sent a reminder about an action item from your numarket review.\n\n${item.title}\nDue ${item.due}.${item.doneWhen ? `\nDone when: ${item.doneWhen}` : ""}\n\nOpen your action items: https://${meta.host}/reviews/actions?who=me`;
        const status = await sendEmail({ to: owner.email, subject: `Reminder: ${item.title}`, text, html: text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>") });
        await setEmailStatus(db, [id], status);
        if (status === "sent") how = "by email and on their bell";
      }
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "action.remind", target: item.title.slice(0, 120), detail: { owner: item.owner }, ip: meta.ip });
      return { ok: true, message: `Reminded ${first} ${how}.${ctx.tenant.isDemo ? " (The demo never sends email.)" : ""}` };
    }, { userId: ctx.user.id });
  });
}

/* ---------- Home (each person's own) ---------- */

export async function saveHome(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx } = await tenantOrThrow("definitions.view");
    const { catalog, cleanLayout } = await import("@/lib/home");
    return withTenant(ctx.tenant.id, async (db) => {
      const cat = catalog(await listDashboards(db), ctx);
      const layout = cleanLayout({ kpis: form.getAll("kpi").map(String), charts: form.getAll("chart").map(String), panels: form.getAll("panel").map(String) }, ctx, cat);
      await saveHomeLayout(db, ctx.user.id, layout);
      revalidatePath("/");
      return { ok: true, message: "Saved. Opening your Home page…", redirect: "/" };
    }, { userId: ctx.user.id });
  });
}

/** Pin a key number or chart from a dashboard to your Home page, or unpin it. */
export async function pinToHome(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx } = await tenantOrThrow("dashboard.view");
    const id = str(form, "id");
    const { catalog, cleanLayout, defaultLayout } = await import("@/lib/home");
    return withTenant(ctx.tenant.id, async (db) => {
      const cat = catalog(await listDashboards(db), ctx);
      const saved = await getHomeLayout(db, ctx.user.id);
      const layout = saved ? cleanLayout(saved, ctx, cat) : defaultLayout(ctx, cat);
      const kind = cat.kpis.some((w) => w.id === id) ? "kpis" : cat.charts.some((w) => w.id === id) ? "charts" : null;
      if (!kind) throw new ActionError("That can't be pinned.");
      const list = layout[kind];
      if (list.includes(id)) {
        layout[kind] = list.filter((x) => x !== id);
        await saveHomeLayout(db, ctx.user.id, layout);
        revalidatePath("/");
        return { ok: true, message: "Removed from Home." };
      }
      const max = kind === "kpis" ? 8 : 6;
      if (list.length >= max) throw new ActionError(`Your Home already has ${max} ${kind === "kpis" ? "key numbers" : "charts"}. Remove one under Customize first.`);
      layout[kind] = [...list, id];
      await saveHomeLayout(db, ctx.user.id, layout);
      revalidatePath("/");
      return { ok: true, message: "Pinned to Home." };
    }, { userId: ctx.user.id });
  });
}

export async function resetHome(_: ActionResult | null): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx } = await tenantOrThrow("definitions.view");
    await withTenant(ctx.tenant.id, (db) => saveHomeLayout(db, ctx.user.id, null), { userId: ctx.user.id });
    revalidatePath("/");
    return { ok: true, message: "Back to the default for your role. Opening Home…", redirect: "/" };
  });
}

/* ---------- admin ---------- */

export async function updateMemberAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("users.manage");
    assertNotDemo(ctx);
    const userId = str(form, "user");
    const role = str(form, "role");
    if (!["owner", "admin", "editor", "contributor", "viewer"].includes(role)) throw new ActionError("Pick a role.");
    if (role === "owner" && ctx.role !== "owner") throw new ActionError("Only an Owner can make someone an Owner.");
    const scope = form.getAll("scope").map(String).filter(Boolean);
    return withTenant(ctx.tenant.id, async (db) => {
      try {
        await updateMember(db, userId, { role, scopeValues: scope.length ? scope : null, status: str(form, "status") || undefined });
      } catch (e) {
        throw new ActionError((e as Error).message);
      }
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: "user", action: "admin.member_update", target: userId, detail: { role, scope }, ip: meta.ip });
      revalidatePath("/admin/users");
      return { ok: true, message: "Saved." };
    }, { userId: ctx.user.id });
  });
}

const METHODS: SignInMethod[] = ["microsoft", "google", "password", "sso"];

export async function savePolicy(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("security.manage");
    assertNotDemo(ctx);
    const methods = form.getAll("methods").map(String).filter((m): m is SignInMethod => METHODS.includes(m as SignInMethod));
    if (!methods.length) return { ok: false, message: "Allow at least one sign-in method.", errors: { methods: "Pick at least one." } };
    const ips = str(form, "ip_allowlist").split(/[\s,]+/).filter(Boolean);
    const bad = ips.filter((c) => !isValidCidr(c));
    if (bad.length) return { ok: false, message: "Some network ranges aren't valid.", errors: { ip_allowlist: `Not valid: ${bad.join(", ")}` } };
    /* lockout safety: never save an allowlist that excludes the person saving it */
    if (ips.length && !ipAllowed(meta.ip, ips)) return { ok: false, message: "That list would lock you out.", errors: { ip_allowlist: `Your current address (${meta.ip ?? "unknown"}) isn't in the list. Add it first.` } };
    const domains = str(form, "domains").split(/[\s,]+/).map((d) => d.replace(/^@/, "").toLowerCase()).filter(Boolean);
    if (domains.some((d) => !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))) return { ok: false, message: "Some email domains aren't valid.", errors: { domains: "Use domains like clientco.com." } };
    const sessionHours = Math.min(24, Math.max(1, Number(str(form, "session_hours")) || 12));
    const idle = Math.min(240, Math.max(5, Number(str(form, "idle_minutes")) || 60));
    const exportRoles = form.getAll("export_roles").map(String).filter((r) => ["owner", "admin", "editor", "viewer"].includes(r));
    return withTenant(ctx.tenant.id, async (db) => {
      const before = await getPolicy(db);
      await updatePolicy(db, {
        allowed_methods: methods,
        require_mfa: true,
        allowed_email_domains: domains,
        ip_allowlist: ips,
        session_hours: sessionHours,
        idle_minutes: idle,
        export_roles: exportRoles,
        require_approval: form.get("require_approval") === "on",
      });
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: "user", action: "admin.security_policy", detail: { before, after: { methods, domains, ips, sessionHours, idle, exportRoles } }, ip: meta.ip });
      revalidatePath("/admin/security");
      return { ok: true, message: "Security policy saved. It applies to every request from now on." };
    }, { userId: ctx.user.id });
  });
}

export async function saveBranding(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("branding.manage");
    assertNotDemo(ctx);
    const primary = str(form, "primary_color").toUpperCase();
    const accent = str(form, "accent_color").toUpperCase();
    if (!parseHex(primary) || !parseHex(accent)) return { ok: false, message: "Colors must be hex values like #22577A." };
    const name = str(form, "display_name").slice(0, 60);
    if (!name) return { ok: false, message: "Enter a display name.", errors: { display_name: "Required." } };
    return withTenant(ctx.tenant.id, async (db) => {
      await updateBranding(db, {
        display_name: name,
        primary_color: primary,
        accent_color: accent,
        logo_text: str(form, "logo_text").slice(0, 3).toUpperCase() || null,
        signin_message: str(form, "signin_message").slice(0, 200) || null,
        report_footer: str(form, "report_footer").slice(0, 120) || null,
      });
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: "user", action: "admin.branding", detail: { primary, accent, name }, ip: meta.ip });
      revalidatePath("/", "layout");
      return { ok: true, message: "Branding saved." };
    }, { userId: ctx.user.id });
  });
}

/* ---------- Engineering apps ---------- */

function assertEngineering(ctx: { tenant: { products: string[] } }) {
  if (!ctx.tenant.products.includes("engineering")) throw new ActionError("Apps come with Engineering, which isn't in your plan.");
}
const num = (s: string) => (s === "" ? NaN : Number(s));

/** Save an estimate (new, or an update to one you can edit). */
export async function saveEstimate(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("input.submit");
    assertEngineering(ctx);
    const { ESTIMATE_SECTIONS, estimateTotals } = await import("@numarket/db/demo/apps");
    const sections = ESTIMATE_SECTIONS[ctx.tenant.industry];
    const name = str(form, "name").slice(0, 120);
    const customer = str(form, "customer").slice(0, 120);
    const errors: Record<string, string> = {};
    if (name.length < 3) errors.name = "Give the estimate a name.";
    if (customer.length < 2) errors.customer = `Who is it for?`;
    const pct = (k: string, max: number) => {
      const x = num(str(form, k));
      if (!(x >= 0 && x <= max)) errors[k] = `Between 0 and ${max}%.`;
      return Math.round((x || 0) * 10) / 10;
    };
    const overheadPct = pct("overheadPct", 30), contingencyPct = pct("contingencyPct", 25), profitPct = pct("profitPct", 40);
    let lines: { section: string; description: string; qty: number; unit: string; unitCost: number }[] = [];
    try {
      const raw = JSON.parse(str(form, "lines") || "[]") as unknown[];
      lines = raw.slice(0, 60).map((l) => {
        const x = l as Record<string, unknown>;
        return { section: String(x.section ?? ""), description: String(x.description ?? "").trim().slice(0, 140), qty: Number(x.qty), unit: String(x.unit ?? "").trim().slice(0, 20), unitCost: Number(x.unitCost) };
      });
    } catch {
      throw new ActionError("The line items didn't come through. Please try again.");
    }
    lines = lines.filter((l) => l.description || l.qty || l.unitCost);
    if (!lines.length) errors.lines = "Add at least one line.";
    if (lines.some((l) => !sections.includes(l.section) || !l.description || !(l.qty > 0 && l.qty <= 1_000_000) || !(l.unitCost >= 0 && l.unitCost <= 50_000_000))) errors.lines = "Every line needs a section, a description, a quantity above zero, and a unit cost.";
    if (Object.keys(errors).length) return { ok: false, message: "Please fix the highlighted fields.", errors };
    const data = { name, customer, lines, overheadPct, contingencyPct, profitPct, note: str(form, "note").slice(0, 500) || undefined };
    const total = estimateTotals(data).total;
    if (total > 500_000_000) return { ok: false, message: "That total is over $500 million. Check the quantities." };
    const id = str(form, "id");
    return withTenant(ctx.tenant.id, async (db) => {
      const { getAppRecord, insertAppRecord, updateAppRecord } = await import("@numarket/db/repo/workspace");
      let recordId = id;
      if (id) {
        const rec = await getAppRecord(db, "estimates", id);
        if (!rec) throw new ActionError("That estimate doesn't exist.");
        if (rec.created_by !== ctx.user.id && !ctx.can("input.edit_any")) throw new ActionError("Only the person who started this estimate or an admin can change it.");
        await updateAppRecord(db, id, rec.status, data, ctx.user.id);
      } else recordId = await insertAppRecord(db, "estimates", "draft", data, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: id ? "app.estimate.update" : "app.estimate.create", target: name, detail: { total: Math.round(total) }, ip: meta.ip });
      revalidatePath("/apps", "layout");
      return { ok: true, message: "Saved.", redirect: `/apps/estimates/${recordId}` };
    }, { userId: ctx.user.id });
  });
}

/** Draft → sent → won or lost. */
export async function setEstimateStatus(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("input.submit");
    assertEngineering(ctx);
    const status = str(form, "status");
    if (!["draft", "sent", "won", "lost"].includes(status)) throw new ActionError("Unknown status.");
    return withTenant(ctx.tenant.id, async (db) => {
      const { getAppRecord, updateAppRecord } = await import("@numarket/db/repo/workspace");
      const rec = await getAppRecord(db, "estimates", str(form, "id"));
      if (!rec) throw new ActionError("That estimate doesn't exist.");
      if (rec.created_by !== ctx.user.id && !ctx.can("input.edit_any")) throw new ActionError("Only the person who started this estimate or an admin can change it.");
      await updateAppRecord(db, rec.id, status, null, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "app.estimate.status", target: String(rec.data.name ?? "").slice(0, 120), detail: { status }, ip: meta.ip });
      revalidatePath("/apps", "layout");
      return { ok: true, message: status === "won" ? "Marked won." : status === "lost" ? "Marked lost." : status === "sent" ? "Marked sent." : "Back to draft." };
    }, { userId: ctx.user.id });
  });
}

/** Ask for a change order (or scope change) to be approved. */
export async function requestApproval(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("input.submit");
    assertEngineering(ctx);
    const { packFor } = await import("@numarket/db/demo/packs");
    const pack = packFor(ctx.tenant.industry);
    return withTenant(ctx.tenant.id, async (db) => {
      const screen = await getScreen(db, pack.screenSlugs.co);
      if (!screen) throw new ActionError(`The ${pack.vocab.changeOrder} log isn't set up.`);
      const snap = await latestSnapshot(db);
      const jobs = jobsInScope(snap?.datasets, ctx).map((j) => j.code);
      const raw = { job: str(form, "job"), cause: str(form, "cause"), amount: str(form, "amount"), description: str(form, "title") };
      const v = validateEntry(screen.fields, raw, { jobs, today: todayIn(ctx.tenant.timezone) });
      const reason = str(form, "reason").slice(0, 600);
      const errors: Record<string, string> = { ...(v.ok ? {} : Object.fromEntries(Object.entries(v.errors).map(([k, e]) => [k === "description" ? "title" : k, e]))) };
      if (reason.length < 5) errors.reason = "Say why, in a sentence.";
      if (Object.keys(errors).length || !v.ok) return { ok: false, message: "Please fix the highlighted fields.", errors };
      const { insertAppRecord } = await import("@numarket/db/repo/workspace");
      const data = { job: raw.job, title: raw.description, cause: raw.cause, amount: Number(v.data.amount), reason };
      await insertAppRecord(db, "approvals", "pending", data, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "app.approval.request", target: data.title.slice(0, 120), detail: { job: data.job, amount: data.amount }, ip: meta.ip });
      revalidatePath("/apps", "layout");
      revalidatePath("/");
      return { ok: true, message: "Sent for approval." };
    }, { userId: ctx.user.id });
  });
}

/** Approve or reject. Approved ones go into the change order log, which feeds the dashboards. */
export async function decideApproval(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("input.approve");
    assertEngineering(ctx);
    const decision = str(form, "decision");
    if (decision !== "approved" && decision !== "rejected") throw new ActionError("Approve or reject.");
    const note = str(form, "note").slice(0, 400);
    const { packFor } = await import("@numarket/db/demo/packs");
    const pack = packFor(ctx.tenant.industry);
    return withTenant(ctx.tenant.id, async (db) => {
      const { getAppRecord, updateAppRecord } = await import("@numarket/db/repo/workspace");
      const rec = await getAppRecord(db, "approvals", str(form, "id"));
      if (!rec) throw new ActionError("That request doesn't exist.");
      if (rec.status !== "pending") throw new ActionError("That one has already been decided.");
      const d = rec.data as { job: string; title: string; cause: string; amount: number };
      if (ctx.scope && !ctx.scope.values.includes(d.job)) throw new ActionError("That request is outside your data scope.");
      await updateAppRecord(db, rec.id, decision, { ...rec.data, decision_note: note || undefined, decided_by_name: ctx.user.name }, ctx.user.id);
      if (decision === "approved") await insertEntry(db, pack.screenSlugs.co, { job: d.job, cause: d.cause, amount: d.amount, description: d.title.slice(0, 200), via: "approval" }, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: `app.approval.${decision}`, target: d.title.slice(0, 120), detail: { job: d.job, amount: d.amount }, ip: meta.ip });
      revalidatePath("/", "layout");
      return { ok: true, message: decision === "approved" ? `Approved. It's in the ${pack.vocab.changeOrder} log and will show on dashboards at the next update.` : "Rejected. The requester will see your note." };
    }, { userId: ctx.user.id });
  });
}

/* ---------- saved report views ---------- */

const VIEW_KEYS = ["group", "range", "from", "to", "job", "find", "w"] as const;

/** Save the filters on a Run-a-report page under a name, for yourself or the team. */
export async function saveView(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("dashboard.view");
    const name = str(form, "name").slice(0, 80);
    if (name.length < 2) return { ok: false, message: "Give the view a name.", errors: { name: "Required." } };
    const slug = str(form, "slug");
    const shared = str(form, "shared") === "on" && ctx.can("report.edit");
    const params = Object.fromEntries(VIEW_KEYS.map((k) => [k, str(form, k).slice(0, k === "w" ? 300 : 60)]).filter(([, v]) => v));
    return withTenant(ctx.tenant.id, async (db) => {
      const { getDataReport, insertSavedView, listSavedViews } = await import("@numarket/db/repo/workspace");
      if (!(await getDataReport(db, slug))) throw new ActionError("That report doesn't exist.");
      if ((await listSavedViews(db, ctx.user.id)).filter((v) => v.user_id === ctx.user.id).length >= 50) throw new ActionError("You have 50 saved views. Delete one first.");
      await insertSavedView(db, ctx.user.id, slug, name, params, shared);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "view.save", target: `explore/${slug}`, detail: { name, shared }, ip: meta.ip });
      revalidatePath("/explore", "layout");
      return { ok: true, message: shared ? "Saved and shared with your team." : "Saved. It's under Saved views." };
    }, { userId: ctx.user.id });
  });
}

export async function deleteView(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("dashboard.view");
    return withTenant(ctx.tenant.id, async (db) => {
      const { deleteSavedView } = await import("@numarket/db/repo/workspace");
      const ok = await deleteSavedView(db, str(form, "id"), ctx.user.id, ctx.can("report.edit") && ctx.can("users.manage"));
      if (!ok) throw new ActionError("You can delete only your own views.");
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "view.delete", ip: meta.ip });
      revalidatePath("/explore", "layout");
      return { ok: true, message: "Deleted." };
    }, { userId: ctx.user.id });
  });
}

/* ---------- alerts ---------- */

export async function addAlert(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("alert.manage_own");
    const { kindInfo } = await import("@/lib/alerts");
    const { whoFor } = await import("@/lib/alertsSync");
    const info = kindInfo(str(form, "kind"));
    if (!info || !info.allowed(whoFor(ctx))) throw new ActionError("Pick one of the alerts on the list.");
    const params: Record<string, number> = {};
    if (info.param) {
      const x = Number(str(form, info.param.key));
      if (!(x >= info.param.min && x <= info.param.max)) return { ok: false, message: `${info.param.label}: between ${info.param.min.toLocaleString("en-US")} and ${info.param.max.toLocaleString("en-US")}.`, errors: { [info.param.key]: "Out of range." } };
      params[info.param.key] = Math.round(x);
    }
    const email = str(form, "email") === "on";
    return withTenant(ctx.tenant.id, async (db) => {
      const { insertAlertRule, listAlertRules } = await import("@numarket/db/repo/workspace");
      const mine = await listAlertRules(db, ctx.user.id);
      if (mine.length >= 20) throw new ActionError("You have 20 alerts. Remove one first.");
      if (info.kind === "weekly_summary" && mine.some((r) => r.kind === "weekly_summary")) throw new ActionError("You already get the Monday summary.");
      await insertAlertRule(db, ctx.user.id, info.kind, params, email);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "alert.create", target: info.kind, detail: { ...params, email }, ip: meta.ip });
      revalidatePath("/", "layout");
      return { ok: true, message: "Alert added." };
    }, { userId: ctx.user.id });
  });
}

/** Turn an alert on or off, turn its email on or off, or remove it. */
export async function changeAlert(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("alert.manage_own");
    const id = str(form, "id");
    const intent = str(form, "intent");
    return withTenant(ctx.tenant.id, async (db) => {
      const { deleteAlertRule, updateAlertRule } = await import("@numarket/db/repo/workspace");
      const ok =
        intent === "remove" ? await deleteAlertRule(db, id, ctx.user.id)
        : intent === "pause" || intent === "resume" ? await updateAlertRule(db, id, ctx.user.id, { active: intent === "resume" })
        : intent === "email-on" || intent === "email-off" ? await updateAlertRule(db, id, ctx.user.id, { email: intent === "email-on" })
        : false;
      if (!ok) throw new ActionError("That alert isn't yours, or it's gone.");
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: `alert.${intent}`, ip: meta.ip });
      revalidatePath("/", "layout");
      return { ok: true, message: intent === "remove" ? "Removed." : "Saved." };
    }, { userId: ctx.user.id });
  });
}

export async function markAlertsRead(_: ActionResult | null): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx } = await tenantOrThrow("alert.manage_own");
    const { markNotificationsRead } = await import("@numarket/db/repo/workspace");
    await withTenant(ctx.tenant.id, (db) => markNotificationsRead(db, ctx.user.id), { userId: ctx.user.id });
    revalidatePath("/", "layout");
    return { ok: true, message: "All caught up." };
  });
}

/** "Alert me" on a view in Explore: new rows that match its filters, or a total crossing a line. */
export async function addViewAlert(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("alert.manage_own");
    const slug = str(form, "slug");
    const cond = str(form, "cond") === "total" ? "total" : "rows";
    const name = str(form, "name").slice(0, 80) || "From a view";
    const email = str(form, "email") === "on";
    /* keep only the view's own settings from the address */
    const raw = new URLSearchParams(str(form, "q").slice(0, 600));
    const q = new URLSearchParams();
    for (const k of VIEW_KEYS) if (raw.get(k)) q.set(k, raw.get(k)!.slice(0, k === "w" ? 300 : 60));
    const { runState, isNumeric } = await import("@/lib/explore");
    const { viewBaseline } = await import("@/lib/alerts");
    const { asOfMonth } = await import("@/components/Dashboard");
    const ws = await workspace(ctx);
    if (!ws.snapshot) throw new ActionError("Your data hasn't had its first update yet.");
    return withTenant(ctx.tenant.id, async (db) => {
      const { getDataReport, insertAlertRule, listAlertRules } = await import("@numarket/db/repo/workspace");
      const r = await getDataReport(db, slug);
      if (!r) throw new ActionError("That view doesn't exist.");
      const def = r.definition as import("@numarket/blocks").DataReportDef;
      if (ctx.scope && def.wholeCompany) throw new ActionError("That view is outside your data scope.");
      if ((await listAlertRules(db, ctx.user.id)).length >= 20) throw new ActionError("You have 20 alerts. Remove one first.");
      const asOf = asOfMonth(ws.snapshot!.published_at, ctx.tenant.timezone);
      const st = runState(def, ws.snapshot!.datasets, ctx.scope, Object.fromEntries(q), asOf);
      const params: Record<string, unknown> = { slug, q: q.toString(), name, cond };
      if (cond === "total") {
        const col = st.grouping.columns.find((c) => c.field === str(form, "column"));
        const amount = Number(str(form, "amount"));
        if (!col || !isNumeric(col)) return { ok: false, message: "Pick a number column." };
        if (!Number.isFinite(amount)) return { ok: false, message: "Enter the number to watch for." };
        Object.assign(params, { column: col.field, colLabel: col.label, op: str(form, "op") === "below" ? "below" : "above", amount });
      } else {
        /* what's already there doesn't count as new */
        params.seen = viewBaseline(def, ws.snapshot!.datasets, ctx.scope, q.toString(), asOf);
      }
      await insertAlertRule(db, ctx.user.id, "view", params, email);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "alert.create", target: `explore/${slug}`, detail: { cond, email }, ip: meta.ip });
      revalidatePath("/", "layout");
      return { ok: true, message: cond === "rows" ? `Set. You'll hear about anything new here (${(params.seen as string[]).length} rows already here don't count).` : "Set. You'll hear when the total crosses your line." };
    }, { userId: ctx.user.id });
  });
}


/* ---------- Requests board (everything numarket is working on for you) ---------- */

const SKETCH_BLOCKS: SketchBlock[] = ["kpis", "line", "bars", "table", "matrix", "heatmap"];

/** Add a request: a dashboard change, an app idea, an issue, or an improvement. */
export async function createRequestAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("requests.submit");
    const kind = str(form, "kind") as RequestKind;
    const product = str(form, "product") as RequestProduct;
    const title = str(form, "title").slice(0, 140);
    const detail = str(form, "detail").slice(0, 4000);
    const priority = str(form, "priority") === "high" ? "high" : str(form, "priority") === "low" ? "low" : "normal";
    const link = localLink(str(form, "link"));
    const sketch = form.getAll("sketch").map(String).filter((b): b is SketchBlock => SKETCH_BLOCKS.includes(b as SketchBlock));
    const errors: Record<string, string> = {};
    if (!REQUEST_KINDS.includes(kind)) errors.kind = "Pick what kind of request this is.";
    if (!REQUEST_PRODUCTS.includes(product)) errors.product = "Pick what it's about.";
    if (title.length < 3) errors.title = "Give it a short title.";
    if (Object.keys(errors).length) return { ok: false, message: "Please fix the highlighted fields.", errors };
    return withTenant(ctx.tenant.id, async (db) => {
      const id = await insertRequest(db, { kind, product, title, detail, priority, link, sketch: kind === "change" && sketch.length ? sketch : null, userId: ctx.user.id });
      await addRequestUpdate(db, id, { author: ctx.user.name, userId: ctx.user.id, body: detail || title, status: "submitted" });
      /* an automatic receipt, so people know it landed and when to expect a reply */
      await addRequestUpdate(db, id, { author: "numarket", userId: null, body: `Received. Your analyst replies within ${TIER_LIMITS[ctx.tenant.tier].replyTime}.` });
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "request.create", target: title.slice(0, 120), detail: { kind, product }, ip: meta.ip });
      revalidatePath("/requests", "layout");
      return { ok: true, message: "Added to the board. Your analyst will reply here.", redirect: `/requests/${id}` };
    }, { userId: ctx.user.id });
  });
}

/** Comment on a request, or (when it's ready for review) sign off or send it back. */
export async function requestUpdateAction(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("requests.submit");
    const id = str(form, "id");
    const intent = str(form, "intent");
    const body = str(form, "body").slice(0, 4000);
    return withTenant(ctx.tenant.id, async (db) => {
      const r = await getRequest(db, id);
      if (!r) throw new ActionError("That request doesn't exist.");
      if (intent === "approve" || intent === "send_back") {
        if (r.status !== "review") throw new ActionError("Only requests that are ready for your review can be signed off.");
        const mine = r.requested_by === ctx.user.id;
        if (!mine && !ctx.can("requests.approve")) throw new ActionError(`Only ${r.by_name ?? "the person who asked"} or an admin can sign this off.`);
        if (intent === "send_back" && body.length < 3) return { ok: false, message: "Say what should change.", errors: { body: "Say what should change." } };
        await addRequestUpdate(db, id, { author: ctx.user.name, userId: ctx.user.id, body: intent === "approve" ? body || "Approved. Thanks." : body, status: intent === "approve" ? "done" : "in_progress" });
        await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: `request.${intent}`, target: r.title.slice(0, 120), detail: {}, ip: meta.ip });
        revalidatePath("/requests", "layout");
        return { ok: true, message: intent === "approve" ? "Signed off. It's done." : "Sent back with your note." };
      }
      if (body.length < 1) return { ok: false, message: "Write a comment first.", errors: { body: "Write a comment first." } };
      if (r.status === "done") throw new ActionError("This one is done. Add a new request instead.");
      await addRequestUpdate(db, id, { author: ctx.user.name, userId: ctx.user.id, body });
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "request.comment", target: r.title.slice(0, 120), detail: {}, ip: meta.ip });
      revalidatePath("/requests", "layout");
      return { ok: true, message: "Added. Your analyst will see it." };
    }, { userId: ctx.user.id });
  });
}
