"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { User } from "@supabase/supabase-js";
import { logout } from "@/app/auth/actions";

export function AppNav({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => {
      logout();
    });
  }

  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        padding: "0 1.5rem",
        height: "52px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <Link
        href="/app"
        style={{
          fontWeight: 700,
          fontSize: "1.05rem",
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
        }}
      >
        Unspoken<span style={{ color: "var(--accent)" }}>AI</span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-coupon-modal"))}
          style={{
            background: "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.2))",
            border: "1px solid rgba(236, 72, 153, 0.35)",
            color: "#f472b6",
            fontSize: "0.85rem",
            fontWeight: 600,
            padding: "0.3rem 0.65rem",
            borderRadius: "6px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            transition: "all 0.15s ease",
          }}
          title="Redeem Coupon"
        >
          <span style={{ fontSize: "1rem" }} role="img" aria-label="gift">🎁</span>
          <span>Redeem</span>
        </button>


        <Link
          href="/app/billing"
          style={{
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            transition: "color 0.15s ease",
          }}
        >
          Credits & Plans
        </Link>

        {user.app_metadata?.role === "owner" && (
          <Link
            href="/owner"
            style={{
              fontSize: "0.8rem",
              background: "rgba(192, 132, 252, 0.15)",
              color: "var(--accent)",
              padding: "0.25rem 0.6rem",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            Owner Console
          </Link>
        )}

        {user.app_metadata?.role === "tester" && (
          <span
            style={{
              fontSize: "0.75rem",
              background: "rgba(251, 191, 36, 0.15)",
              color: "var(--warning)",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            Tester
          </span>
        )}

        <span
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            maxWidth: "150px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={user.email}
        >
          {user.email}
        </span>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="btn btn-ghost btn-sm"
          aria-label="Log out"
        >
          {isPending ? <span className="spinner" aria-hidden /> : "Log out"}
        </button>
      </div>
    </header>
  );
}
