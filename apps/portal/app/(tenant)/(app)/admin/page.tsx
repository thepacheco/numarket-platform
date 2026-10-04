import { notFound, redirect } from "next/navigation";
import { requireTenant } from "@/lib/guard";
import { settingsLinks } from "@/lib/nav";

export default async function Settings() {
  const ctx = await requireTenant();
  const first = settingsLinks(ctx)[0];
  if (!first) notFound();
  redirect(first.href);
}
