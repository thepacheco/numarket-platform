import { withTenant } from "@numarket/db";
import { getScreen } from "@numarket/db/repo/workspace";
import { csvLine } from "@/lib/csv";
import { jobsInScope, todayIn, workspace } from "@/lib/data";
import { tenantOrThrow } from "@/lib/guard";
import { exampleValue } from "@/lib/upload";

/* The CSV template for an input screen: its headings and one example row. */
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  let auth;
  try {
    auth = await tenantOrThrow("input.submit");
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const { ctx } = auth;
  const { slug } = await params;
  const screen = await withTenant(ctx.tenant.id, (db) => getScreen(db, slug));
  if (!screen) return new Response("Not found", { status: 404 });
  const ws = await workspace(ctx);
  const jobs = jobsInScope(ws.snapshot?.datasets, ctx);
  const today = todayIn(ctx.tenant.timezone);
  const body = [csvLine(screen.fields.map((f) => f.label)), csvLine(screen.fields.map((f) => exampleValue(f, { jobs, today })))].join("\r\n") + "\r\n";
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${slug}-template.csv"`, "cache-control": "no-store" } });
}
