import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Ops console", template: "%s · numarket ops" } };

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", background: "var(--bg)" }}>{children}</div>;
}
