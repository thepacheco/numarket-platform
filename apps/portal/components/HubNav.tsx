import type { TenantContext } from "@numarket/auth";
import { workspace } from "@/lib/data";
import { hubTabs } from "@/lib/nav";
import HubTabs from "./HubTabs";

const LABEL = { data: "Your data", reports: "Reports", analyst: "Your analyst" } as const;

/* A hub's tabs, for the role signed in, with the open-flags count. */
export default async function HubNav({ hub, current, ctx }: { hub: "data" | "reports" | "analyst"; current: string; ctx: TenantContext }) {
  const flags = hub === "data" && ctx.can("flags.view") ? (await workspace(ctx)).openFlags : 0;
  return <HubTabs tabs={hubTabs(hub, ctx)} current={current} flags={flags} label={LABEL[hub]} />;
}
