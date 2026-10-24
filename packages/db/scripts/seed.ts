/* Creates the sample workspaces. Safe to run more than once.
   - demo: the public construction demo (Summit Builders), on DEMO_HOSTS.
   - services: the public professional services demo (Brightline Partners),
     on SERVICES_DEMO_HOSTS, or services.<APP_DOMAIN>.
   - acme: a second tenant for development and the isolation tests
     (skipped in production unless SEED_TEST_TENANT=1).
   - ops@numarket.us: a Platform Admin for local dev sign-in (not production). */
import { fileURLToPath } from "node:url";
import { closePool, withProvisioner } from "../src/client";
import { ACME_SPEC, provisionSampleTenant, resetDemoTenant, SAMPLE_SPEC } from "../src/provision";

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

/* The professional services demo: SERVICES_DEMO_HOSTS, or services.numarket.us
   on Vercel production. Locally it opens at services.localhost:3100 through
   APP_DOMAIN, so no host is needed. */
export function defaultServicesHosts(env: Record<string, string | undefined>): string[] {
  const list = env.SERVICES_DEMO_HOSTS ? env.SERVICES_DEMO_HOSTS.split(",") : env.VERCEL_ENV === "production" ? ["services.numarket.us"] : [];
  return [...new Set(list.map((h) => h.trim().toLowerCase()).filter(Boolean))];
}

async function ensureSample(industry: "construction" | "services", hosts: string[], log: (m: string) => void) {
  const spec = SAMPLE_SPEC(industry, hosts);
  const exists = await withProvisioner(async (db) => (await db.query("select 1 from tenants where slug = $1", [spec.slug])).rowCount === 1);
  if (!exists || process.argv.includes("--force")) {
    await provisionSampleTenant(spec);
    log(`${spec.slug} workspace ready${hosts.length ? ` on ${hosts.join(", ")}` : ""}`);
    return;
  }
  const id = await withProvisioner(async (db) => {
    for (const h of hosts) await db.query("insert into tenant_hosts (host, tenant_id) select $1, id from tenants where slug = $2 on conflict (host) do nothing", [h, spec.slug]);
    await db.query("update tenants set products = $2, industry = $3 where slug = $1", [spec.slug, spec.products, industry]);
    return (await db.query<{ id: string }>("select id from tenants where slug = $1", [spec.slug])).rows[0].id;
  });
  /* each deploy brings the shared demo up to date with the sample content */
  await resetDemoTenant(id);
  log(`${spec.slug} workspace refreshed (hosts checked)`);
}

export async function seed(log = console.log) {
  const prod = process.env.NODE_ENV === "production";
  await ensureSample("construction", defaultDemoHosts(process.env), log);
  await ensureSample("services", defaultServicesHosts(process.env), log);
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
