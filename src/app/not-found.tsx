import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
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
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
          color: "var(--accent)",
          fontWeight: 500,
          marginBottom: "1rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        404
      </p>
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          letterSpacing: "-0.025em",
          marginBottom: "0.75rem",
        }}
      >
        Nothing here
      </h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem" }}>
        The page you were looking for does not exist.
      </p>
      <Link href="/" className="btn btn-secondary">
        Back to home
      </Link>
    </div>
  );
}
