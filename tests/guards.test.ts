/* Every page, route handler, and server action must check access first
   (Spec §15: "server-side authorization on every route; deny by default"). */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(__dirname, "..", "apps", "portal", "app");
const SIGN_IN_ROUTES = ["(tenant)/sign-in/demo/route.ts", "(tenant)/sign-in/sandbox/route.ts", "(tenant)/sign-in/dev/route.ts", "ops/sign-in/dev/route.ts", "(tenant)/sign-out/route.ts", "ops/sign-out/route.ts"];
const PUBLIC = new Set([...SIGN_IN_ROUTES, "(tenant)/sign-in/page.tsx", "(tenant)/blocked/page.tsx", "ops/sign-in/page.tsx", "not-found.tsx", "layout.tsx", "ops/layout.tsx"]);
/* sign-in and sign-out are route handlers (above), so every action is guarded */
const PUBLIC_ACTIONS = new Set<string>();
const GUARD = /\b(requireTenant|requireStaff|tenantOrThrow|staffOrThrow)\(/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe("access checks", () => {
  const all = files(APP).map((p) => ({ path: p, rel: relative(APP, p) }));

  it("every page and route handler calls a guard", () => {
    const missing = all
      .filter((f) => /(page\.tsx|route\.ts)$/.test(f.rel) && !PUBLIC.has(f.rel))
      .filter((f) => !f.rel.startsWith("api/cron/"))
      .filter((f) => !GUARD.test(readFileSync(f.path, "utf8")));
    expect(missing.map((f) => f.rel)).toEqual([]);
  });

  it("sign-in endpoints refuse cross-site requests", () => {
    for (const r of SIGN_IN_ROUTES) expect(readFileSync(join(APP, r), "utf8")).toMatch(/sameOrigin\(req\)/);
  });

  it("the cron route checks its secret", () => {
    const src = readFileSync(join(APP, "api/cron/demo-reset/route.ts"), "utf8");
    expect(src).toMatch(/CRON_SECRET/);
    expect(src).toMatch(/timingSafeEqual/);
  });

  it("every server action calls a guard before doing anything", () => {
    const actionFiles = all.filter((f) => /actions\.ts$/.test(f.rel));
    expect(actionFiles.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const f of actionFiles) {
      const src = readFileSync(f.path, "utf8");
      const parts = src.split(/export async function /).slice(1);
      for (const part of parts) {
        const name = part.slice(0, part.indexOf("("));
        const body = part.split(/\nexport /)[0];
        if (!PUBLIC_ACTIONS.has(name) && !GUARD.test(body)) missing.push(`${f.rel}:${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("actions don't redirect on the server (the follow-up render loses the workspace host)", () => {
    for (const f of all.filter((x) => /actions\.ts$/.test(x.rel))) expect(readFileSync(f.path, "utf8"), f.rel).not.toMatch(/\bredirect\(/);
  });

  it("server pages pass plain elements, not render functions, to ActionForm", () => {
    const bad = all.filter((f) => f.rel.endsWith("page.tsx") && /<ActionForm[^>]*>\s*\{\s*\(/.test(readFileSync(f.path, "utf8"))).map((f) => f.rel);
    expect(bad).toEqual([]);
  });
});

describe("demo addresses", () => {
  it("uses DEMO_HOSTS when set, app.numarket.us plus the project address on Vercel, localhost otherwise", async () => {
    const { defaultDemoHosts } = await import("../packages/db/scripts/seed");
    expect(defaultDemoHosts({ DEMO_HOSTS: "a.example, B.example" })).toEqual(["a.example", "b.example"]);
    expect(defaultDemoHosts({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "numarket-portal.vercel.app" })).toEqual(["app.numarket.us", "numarket-portal.vercel.app"]);
    expect(defaultDemoHosts({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "app.numarket.us" })).toEqual(["app.numarket.us"]);
    expect(defaultDemoHosts({})).toEqual(["demo.localhost:3100"]);
  });
});
