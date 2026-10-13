import { createAdminClient } from "@/lib/supabase/admin";
import { OwnerConsoleClient } from "./OwnerConsoleClient";

export default async function OwnerPage() {
  const adminClient = createAdminClient();

  let userCount = 0;
  let activeSubscriptionsCount = 0;
  let totalCreditsUsed = 0;
  let usersList: Array<{
    id: string;
    email: string;
    role: string;
    ageEligible: boolean;
    balance: number;
    hasUnlimitedCredits: boolean;
    plan: string;
    status: string;
    createdAt: string;
  }> = [];
  let recentAuditLogs: Array<{
    id: string;
    action: string;
    actorEmail: string;
    targetUserEmail: string;
    details: Record<string, unknown>;
    createdAt: string;
  }> = [];

  if (adminClient) {
    try {
      // 1. Fetch users from Supabase Auth admin
      const { data: authData } = await adminClient.auth.admin.listUsers();
      const users = authData?.users ?? [];
      userCount = users.length;

      // 2. Fetch subscriptions
      const { data: subsData } = await adminClient
        .from("subscriptions")
        .select("user_id, plan, status");
      activeSubscriptionsCount =
        subsData?.filter((s) => s.status === "active" && s.plan === "pro").length ?? 0;

      // 3. Fetch credit accounts
      const { data: creditData } = await adminClient
        .from("credit_accounts")
        .select("user_id, balance, lifetime_used, has_unlimited_credits");

      totalCreditsUsed = creditData?.reduce((acc, curr) => acc + (curr.lifetime_used || 0), 0) ?? 0;

      // 4. Combine into searchable user table
      const subMap = new Map((subsData ?? []).map((s) => [s.user_id, s]));
      const creditMap = new Map((creditData ?? []).map((c) => [c.user_id, c]));

      usersList = users.map((u) => {
        const sub = subMap.get(u.id);
        const cred = creditMap.get(u.id);
        return {
          id: u.id,
          email: u.email ?? "no-email",
          role: (u.app_metadata?.role as string) || "user",
          ageEligible: u.app_metadata?.age_eligible === true,
          balance: cred?.balance ?? 10,
          hasUnlimitedCredits: cred?.has_unlimited_credits ?? false,
          plan: sub?.plan ?? "free",
          status: sub?.status ?? "active",
          createdAt: u.created_at,
        };
      });

      // 5. Fetch audit logs
      const { data: logs } = await adminClient
        .from("audit_logs")
        .select("id, action, actor_email, target_user_email, details, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      recentAuditLogs =
        logs?.map((l) => ({
          id: l.id,
          action: l.action,
          actorEmail: l.actor_email ?? "system",
          targetUserEmail: l.target_user_email ?? "n/a",
          details: l.details as Record<string, unknown>,
          createdAt: l.created_at,
        })) ?? [];
    } catch (err) {
      console.error("[OwnerPage] Database query warning:", err);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.03em" }}>
          Platform Overview & Management
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", marginTop: "0.25rem" }}>
          Real-time metrics, tester role authorization, and audit trail.
        </p>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <div className="card" style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Registered Users
          </p>
          <p style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.25rem" }}>{userCount}</p>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Active Pro Subscriptions
          </p>
          <p style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent)" }}>
            {activeSubscriptionsCount}
          </p>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Total Credits Spent
          </p>
          <p style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.25rem" }}>
            {totalCreditsUsed}
          </p>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Environment Mode
          </p>
          <p style={{ fontSize: "1.25rem", fontWeight: 600, marginTop: "0.5rem" }}>
            <span
              style={{
                display: "inline-block",
                padding: "0.25rem 0.5rem",
                borderRadius: "4px",
                background: "rgba(52, 211, 153, 0.15)",
                color: "var(--success)",
                fontSize: "0.85rem",
              }}
            >
              Sandbox / Secure
            </span>
          </p>
        </div>
      </div>

      <OwnerConsoleClient users={usersList} auditLogs={recentAuditLogs} />
    </div>
  );
}
