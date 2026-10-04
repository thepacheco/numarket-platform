"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ipAllowed, isValidCidr, revokeSession, SESSION_COOKIE, type SignInMethod } from "@numarket/auth";
import { withTenant } from "@numarket/db";
import { audit } from "@numarket/db/repo/audit";
import { getPolicy, updateBranding, updateMember, updatePolicy } from "@numarket/db/repo/admin";
import { latestSnapshot, manualRefreshesToday, publishSimulated, simulationAllowed } from "@numarket/db/repo/snapshots";
import { assignFlag, commentFlag, deletePendingEntry, getFlag, getReport, getScreen, insertEntry, publishReport, resolveFlag, saveDraft, suggestDefinition, validateEntry } from "@numarket/db/repo/workspace";
import { updateNowLimit } from "@numarket/metering";
import { parseHex } from "@numarket/ui";
import { ActionError, assertNotDemo, tenantOrThrow } from "@/lib/guard";
import { jobsInScope, todayIn } from "@/lib/data";

/* Every action: check the session and permission first (tenantOrThrow), do
   the work inside withTenant (row-level security), write the audit log, and
   return a short message. Server Actions also verify Origin against Host. */

export type ActionResult = { ok: boolean; message: string; errors?: Record<string, string> };

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

/* ---------- sign-in ---------- */

export async function signOut() {
  const jar = await cookies();
  await revokeSession(jar.get(SESSION_COOKIE.tenant)?.value);
  jar.delete(SESSION_COOKIE.tenant);
  redirect("/sign-in");
}

/* ---------- input screens ---------- */

export async function submitEntry(_: ActionResult | null, form: FormData): Promise<ActionResult> {
  return run(async (): Promise<ActionResult> => {
    const { ctx, meta } = await tenantOrThrow("input.submit");
    const slug = str(form, "screen");
    return withTenant(ctx.tenant.id, async (db) => {
      const screen = await getScreen(db, slug);
      if (!screen) throw new ActionError("That input screen doesn't exist.");
      const snap = await latestSnapshot(db);
      const jobs = jobsInScope(snap?.datasets, ctx).map((j) => j.code);
      const raw = Object.fromEntries(screen.fields.map((f) => [f.key, str(form, f.key)]));
      const v = validateEntry(screen.fields, raw, { jobs, today: todayIn(ctx.tenant.timezone) });
      if (!v.ok) return { ok: false, message: "Please fix the highlighted fields.", errors: v.errors };
      const id = await insertEntry(db, slug, v.data, ctx.user.id);
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: "input.submit", target: slug, detail: { entry: id }, ip: meta.ip });
      revalidatePath("/", "layout");
      return { ok: true, message: "Saved. It's in your entries now and will appear in dashboards at the next update." };
    }, { userId: ctx.user.id });
  });
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
      } else if (intent === "comment") {
        const body = str(form, "body");
        if (!body || body.length > 1000) throw new ActionError("Write a comment of up to 1,000 characters.");
        await commentFlag(db, id, body, ctx.user.id);
      } else if (intent === "assign") {
        const to = str(form, "assignee");
        if (to) {
          const m = await db.query("select 1 from memberships where user_id = $1 and status = 'active'", [to]);
          if (!m.rowCount) throw new ActionError("Pick someone in this workspace.");
        }
        await assignFlag(db, id, to || null);
      } else throw new ActionError("Unknown action.");
      await audit(db, { tenantId: ctx.tenant.id, actorUserId: ctx.user.id, actorKind: actorKind(ctx.tenant.isDemo), action: `flag.${intent}`, target: flag.title.slice(0, 120), ip: meta.ip });
      revalidatePath("/flags");
      revalidatePath("/", "layout");
      return { ok: true, message: intent === "comment" ? "Comment added." : intent === "assign" ? "Assignment updated." : intent === "reopen" ? "Reopened." : "Settled. Thanks." };
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
