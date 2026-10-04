import SubNav from "@/components/SubNav";
import { requireTenant } from "@/lib/guard";
import { settingsLinks } from "@/lib/nav";

/* Settings: one place for everything an admin manages. Display only; each
   settings page checks its own permission. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  return (
    <>
      <div className="page-head" style={{ marginBottom: 12 }}>
        <div>
          <p className="eyebrow">Settings</p>
        </div>
      </div>
      <SubNav label="Settings" links={settingsLinks(ctx)} />
      {children}
    </>
  );
}
