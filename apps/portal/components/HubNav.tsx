import type { TenantContext } from "@numarket/auth";
import { workspace } from "@/lib/data";
import { hubTabs, type Hub } from "@/lib/nav";
import HubTabs from "./HubTabs";

const LABEL: Record<Hub, string> = { explore: "Explore", enter: "Enter data", health: "Data health", analyst: "Your analyst" };

/* A hub's tabs, for the role signed in, with the open-flags count. */
export default async function HubNav({ hub, current, ctx }: { hub: Hub; current: string; ctx: TenantContext }) {
  const flags = hub === "health" && ctx.can("flags.view") ? (await workspace(ctx)).openFlags : 0;
  return <HubTabs tabs={hubTabs(hub, ctx)} current={current} flags={flags} label={LABEL[hub]} />;
}
