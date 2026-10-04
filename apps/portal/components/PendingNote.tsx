import type { TenantContext } from "@numarket/auth";
import { fmtTime } from "@/lib/data";
import UpdateNow from "./UpdateNow";
import { updateNow } from "@/app/(tenant)/actions";

/* "Entries save instantly and appear in dashboards at the next update"
   (Spec §3.5), with Update now for people allowed to trigger it. */
export default function PendingNote({ ctx, pending, nextUpdate }: { ctx: TenantContext; pending: number; nextUpdate: Date }) {
  const at = fmtTime(nextUpdate, ctx.tenant.timezone);
  return (
    <div className={`notice ${pending ? "warn" : ""} row`} style={{ justifyContent: "space-between" }}>
      <span>
        {pending
          ? `${pending} new ${pending === 1 ? "entry" : "entries"} will appear in dashboards at the ${at} update.`
          : `Dashboards are up to date. The next scheduled update is at ${at}.`}
        {!ctx.can("refresh.trigger") && pending ? " An admin can update sooner." : ""}
      </span>
      {ctx.can("refresh.trigger") && pending > 0 && <UpdateNow action={updateNow} />}
    </div>
  );
}
