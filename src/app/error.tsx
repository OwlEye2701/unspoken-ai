"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client/server error details safely for debugging
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        textAlign: "center",
        background: "var(--bg, #0f0f0f)",
        color: "var(--text-primary, #f5f5f5)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.8rem",
          color: "var(--accent, #c084fc)",
          fontWeight: 600,
          marginBottom: "1rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Notice
      </p>
      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          letterSpacing: "-0.025em",
          marginBottom: "0.75rem",
        }}
      >
        Unable to load page
      </h1>
      <p
        style={{
          color: "var(--text-secondary, #a3a3a3)",
          marginBottom: "1.5rem",
          fontSize: "0.95rem",
          maxWidth: "480px",
          lineHeight: 1.5,
        }}
      >
        {error?.message && !error.message.includes("digest")
          ? error.message
          : "An unexpected error occurred while processing your request. Please try reloading or signing in again."}
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
          Reference ID: {error.digest}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => reset()}
          className="btn btn-primary"
          style={{
            background: "var(--text-primary, #fff)",
            color: "var(--bg, #000)",
            padding: "0.5rem 1.25rem",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/auth/login"
          className="btn btn-secondary"
          style={{
            border: "1px solid var(--border, #262626)",
            color: "var(--text-primary, #fff)",
            padding: "0.5rem 1.25rem",
            borderRadius: "6px",
            fontWeight: 500,
          }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
