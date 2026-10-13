import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/auth-security";

export const metadata: Metadata = {
  title: "Owner Console",
  robots: { index: false, follow: false },
};

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/owner");
  if (!isOwnerUser(user)) redirect("/app");

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0 1.5rem",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-surface)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/owner"
            style={{
              fontWeight: 700,
              fontSize: "1.05rem",
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
            }}
          >
            Unspoken<span style={{ color: "var(--accent)" }}>AI</span>
            <span
              style={{
                marginLeft: "0.5rem",
                fontSize: "0.7rem",
                background: "rgba(192, 132, 252, 0.15)",
                color: "var(--accent)",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}
            >
              Owner Console
            </span>
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/app" className="btn btn-secondary btn-sm">
            ← Back to App
          </Link>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{user.email}</span>
        </div>
      </header>

      <main style={{ flex: 1, padding: "2rem 1.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
