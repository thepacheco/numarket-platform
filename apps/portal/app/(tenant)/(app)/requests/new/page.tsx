import type { Metadata } from "next";
import Link from "next/link";
import { withTenant } from "@numarket/db";
import { changeHoursUsed, listRequests, REQUEST_KINDS, REQUEST_PRODUCTS, type RequestKind, type RequestProduct } from "@numarket/db/repo/requests";
import { TIER_LIMITS } from "@numarket/metering";
import RequestForm from "@/components/RequestForm";
import { localLink, monthStartIn } from "@/lib/data";
import { requireTenant } from "@/lib/guard";
import { createRequestAction } from "../../../actions";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequest({ searchParams }: { searchParams: Promise<{ kind?: string; product?: string; title?: string; link?: string; from?: string }> }) {
  const ctx = await requireTenant("requests.submit");
  const q = await searchParams;
  const kind = REQUEST_KINDS.includes(q.kind as RequestKind) ? (q.kind as RequestKind) : "change";
  const product = REQUEST_PRODUCTS.includes(q.product as RequestProduct) ? (q.product as RequestProduct) : undefined;
  const link = localLink(q.link) ?? undefined;
  const limit = TIER_LIMITS[ctx.tenant.tier].changeHoursPerMonth;
  let left: number | null = null;
  if (limit !== null) {
    const rows = await withTenant(ctx.tenant.id, (db) => listRequests(db), { userId: ctx.user.id });
    left = Math.max(0, limit - changeHoursUsed(rows, monthStartIn(ctx.tenant.timezone)));
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">
            <Link href="/requests">Requests</Link>
          </p>
          <h1>New request</h1>
          <p>Describe it in your own words. We build it, fix it, or quote it, and you can follow it on the board.</p>
        </div>
      </div>
      <RequestForm action={createRequestAction} initial={{ kind, product, title: q.title?.slice(0, 140), link, from: q.from?.slice(0, 80) }} changeHoursLeft={left} />
    </>
  );
}
