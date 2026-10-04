import Link from "next/link";

export default function NotFound() {
  return (
    <main className="signin">
      <div className="signin-card" style={{ maxWidth: 520 }}>
        <p className="eyebrow">Not found</p>
        <h1 style={{ fontSize: 26, margin: "8px 0" }}>There&apos;s nothing here.</h1>
        <p className="muted">The page doesn&apos;t exist, or you don&apos;t have access to it.</p>
        <p style={{ marginTop: 16 }}>
          <Link href="/" className="btn btn-secondary">
            Go to your workspace
          </Link>
        </p>
      </div>
    </main>
  );
}
