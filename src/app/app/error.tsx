"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div
      style={{
        padding: "3rem 1.5rem",
        textAlign: "center",
        maxWidth: "540px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          fontSize: "2rem",
          marginBottom: "1rem",
        }}
        role="img"
        aria-label="warning"
      >
        ⚠️
      </div>
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          color: "var(--text-secondary, #a3a3a3)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        {error?.message && !error.message.includes("digest")
          ? error.message
          : "We encountered an issue loading your workspace. If you just logged in, your session may still be initializing."}
      </p>

      {error?.digest && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted, #737373)",
            fontFamily: "var(--font-mono, monospace)",
            marginBottom: "1.5rem",
          }}
        >
          Error digest: {error.digest}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
        <button
          onClick={() => reset()}
          className="btn btn-primary btn-sm"
        >
          Reload
        </button>
        <Link href="/auth/login" className="btn btn-secondary btn-sm">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}
