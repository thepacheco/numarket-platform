import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/guard";

export default async function Admin() {
  await requireTenant("users.manage");
  redirect("/admin/users");
}
