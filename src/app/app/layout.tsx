import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";

export const metadata: Metadata = {
  title: "App",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error("[AppLayout] Failed to get user session:", err);
  }

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <AppNav user={user} />
      <main style={{ flex: 1, padding: "1.5rem", maxWidth: "860px", margin: "0 auto", width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
