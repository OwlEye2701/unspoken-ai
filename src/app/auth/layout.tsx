import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your Unspoken AI account.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "var(--bg)",
      }}
    >
      {/* Subtle background texture */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Logo */}
      <Link
        href="/"
        style={{
          fontWeight: 700,
          fontSize: "1.2rem",
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          marginBottom: "2rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        Unspoken<span style={{ color: "var(--accent)" }}>AI</span>
      </Link>

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </div>

      <p
        style={{
          marginTop: "2rem",
          fontSize: "0.775rem",
          color: "var(--text-muted)",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          maxWidth: "340px",
        }}
      >
        Unspoken AI is for people aged 16 and older. All screenshot analysis is
        ephemeral and private.{" "}
        <a href="/privacy" style={{ color: "var(--accent)", textDecoration: "underline" }}>
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
