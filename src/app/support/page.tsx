import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Unspoken AI.",
};

export default function SupportPage() {
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <Link href="/" style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "underline", marginBottom: "2rem", display: "inline-block" }}>
        ← Back to home
      </Link>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
        Support
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "2rem" }}>
        Having trouble with Unspoken AI? Here are a few things that might help.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {[
          {
            q: "I cannot log in",
            a: "Make sure you have verified your email address after registering. Check your spam folder for the verification email. If you have forgotten your password, use the forgot password link on the login page.",
          },
          {
            q: "My screenshot is not being read correctly",
            a: "Try using a higher-resolution screenshot with clear, readable text. Avoid cropping out important parts of the conversation. If the image quality is low, paste the conversation as text instead using the Paste text tab.",
          },
          {
            q: "The reply generator is not working",
            a: "The Unspoken AI service requires active model inference configuration. If you are experiencing a delay, please try again in a moment as the AI engine may be temporarily busy.",
          },
          {
            q: "I want to delete my account",
            a: "To delete your account and remove your data, email privacy@unspokenai.app (placeholder — configure your support address before launch). We will process your request within 7 days.",
          },
        ].map((item, i) => (
          <div key={i} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1.5rem" }}>
            <h2 style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.5rem" }}>{item.q}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.65 }}>{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
