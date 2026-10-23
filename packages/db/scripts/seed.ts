/* Creates the sample workspaces. Safe to run more than once.
   - demo: the public sales demo (Summit Builders), on DEMO_HOSTS.
   - acme: a second tenant for development and the isolation tests
     (skipped in production unless SEED_TEST_TENANT=1).
   - ops@numarket.us: a Platform Admin for local dev sign-in (not production). */
import { fileURLToPath } from "node:url";
import { closePool, withProvisioner } from "../src/client";
import { ACME_SPEC, DEMO_SPEC, provisionSampleTenant, resetDemoTenant } from "../src/provision";

/* Neon gives a pooled URL for the app and a direct one for schema work. */
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

/* Which addresses open the demo. DEMO_HOSTS wins when set. On a Vercel
   production build with no DEMO_HOSTS, the demo answers on app.numarket.us and
   on the project's own production address, so nothing has to be typed in. */
export function defaultDemoHosts(env: Record<string, string | undefined>): string[] {
  const list = env.DEMO_HOSTS
    ? env.DEMO_HOSTS.split(",")
    : env.VERCEL_ENV === "production"
      ? ["app.numarket.us", env.VERCEL_PROJECT_PRODUCTION_URL ?? ""]
      : ["demo.localhost:3100"];
  return [...new Set(list.map((h) => h.trim().toLowerCase()).filter(Boolean))];
}

export async function seed(log = console.log) {
  const prod = process.env.NODE_ENV === "production";
  const demoHosts = defaultDemoHosts(process.env);
  const exists = await withProvisioner(async (db) => (await db.query("select 1 from tenants where slug = 'demo'")).rowCount === 1);
  if (!exists || process.argv.includes("--force")) {
    await provisionSampleTenant(DEMO_SPEC(demoHosts));
    log(`demo workspace ready on ${demoHosts.join(", ")}`);
  } else {
    const id = await withProvisioner(async (db) => {
      for (const h of demoHosts) await db.query("insert into tenant_hosts (host, tenant_id) select $1, id from tenants where slug = 'demo' on conflict (host) do nothing", [h]);
      return (await db.query<{ id: string }>("select id from tenants where slug = 'demo'")).rows[0].id;
    });
    /* each deploy brings the shared demo up to date with the sample content */
    await resetDemoTenant(id);
    log("demo workspace refreshed (hosts checked)");
  }
  if (!prod || process.env.SEED_TEST_TENANT === "1") {
    await provisionSampleTenant(ACME_SPEC([]));
    log("acme test workspace ready");
  }
  if (!prod) {
    await withProvisioner(async (db) => {
      await db.query("insert into users (email, name, title) values ('ops@numarket.us', 'numarket Ops', 'Platform admin') on conflict (email) do nothing");
      await db.query("insert into staff (user_id, platform_role) select id, 'platform_admin' from users where email = 'ops@numarket.us' on conflict do nothing");
    });
    log("dev staff user ops@numarket.us ready");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seed()
    .then(() => closePool())
    .catch(async (e) => {
      console.error(e);
      await closePool();
      process.exit(1);
    });
}
