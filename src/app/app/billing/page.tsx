import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAgeEligibleUser } from "@/lib/auth-security";
import { getUserSubscription, PLAN_CONFIG } from "@/lib/subscriptions";
import { getCreditAccount } from "@/lib/credits";

export const metadata: Metadata = {
  title: "Subscription & Credits",
  robots: { index: false, follow: false },
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/app/billing");

  const [subscription, creditAccount] = await Promise.all([
    getUserSubscription(user.id),
    getCreditAccount(user.id),
  ]);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
          Subscription & Credit Usage
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
          View your remaining generation credits, current plan, and billing settings.
        </p>
      </div>

      {/* Credit Summary Card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="card" style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Remaining Credits
          </p>
          <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)", marginTop: "0.25rem" }}>
            {creditAccount.hasUnlimitedCredits ? "∞ Unlimited" : creditAccount.balance}
          </p>
          <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            1 credit = 1 reply set (3 suggestions)
          </p>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Total Used
          </p>
          <p style={{ fontSize: "2rem", fontWeight: 700, marginTop: "0.25rem" }}>
            {creditAccount.lifetimeUsed}
          </p>
          <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Lifetime replies generated
          </p>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Current Plan
          </p>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              textTransform: "capitalize",
              marginTop: "0.25rem",
            }}
          >
            {subscription.plan}
          </p>
          <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Status: <span style={{ color: "var(--success)" }}>{subscription.status}</span>
          </p>
        </div>
      </div>

      {/* Plans Comparison */}
      <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1rem" }}>
        Available Plans
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Free Plan */}
        <div
          className="card"
          style={{
            padding: "1.5rem",
            border: subscription.plan === "free" ? "2px solid var(--border)" : "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Free</h3>
            {subscription.plan === "free" && (
              <span className="reply-badge reply-badge-normal">Current Plan</span>
            )}
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.75rem 0" }}>
            $0 <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}>/ month</span>
          </p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            {PLAN_CONFIG.free.features.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "var(--success)" }}>✓</span> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro Plan */}
        <div
          className="card"
          style={{
            padding: "1.5rem",
            border: subscription.plan === "pro" ? "2px solid var(--accent)" : "1px solid var(--accent-dim)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)" }}>Pro</h3>
            {subscription.plan === "pro" && (
              <span className="reply-badge reply-badge-rizz">Current Plan</span>
            )}
          </div>
          <p style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.75rem 0" }}>
            $9.99 <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}>/ month</span>
          </p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            {PLAN_CONFIG.pro.features.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ color: "var(--accent)" }}>✓</span> {f}
              </li>
            ))}
          </ul>

          {subscription.plan !== "pro" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={() => {
                  alert(
                    "Payment Sandbox: Live payment gateway is in test mode. To activate, configure STRIPE_SECRET_KEY / RAZORPAY_KEY_ID in server environment."
                  );
                }}
              >
                Upgrade to Pro
              </button>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                Test mode active · No real charge
              </p>
            </div>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--success)", textAlign: "center" }}>
              ✓ You are subscribed to Pro
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <Link href="/app" className="btn btn-secondary">
          ← Back to Reply Generator
        </Link>
      </div>
    </div>
  );
}
