/* Puts the demo workspace back to its starting state. */
import { fileURLToPath } from "node:url";
import { closePool, withProvisioner } from "../src/client";
import { resetDemoTenant } from "../src/provision";

export async function resetDemo() {
  const id = await withProvisioner(async (db) => (await db.query<{ id: string }>("select id from tenants where slug = 'demo' and is_demo")).rows[0]?.id);
  if (!id) throw new Error("no demo tenant");
  await resetDemoTenant(id);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  resetDemo()
    .then(() => console.log("demo reset"))
    .then(() => closePool())
    .catch(async (e) => {
      console.error(e);
      await closePool();
      process.exit(1);
    });
}
