import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Unspoken AI collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  const lastUpdated = "October 2026";
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <Link
        href="/"
        style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "underline", marginBottom: "2rem", display: "inline-block" }}
      >
        ← Back to home
      </Link>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
        Privacy Policy
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2.5rem" }}>
        Last updated: {lastUpdated}
      </p>

      {[
        {
          title: "What we collect",
          body: `When you create an account, we collect your email address and date of birth. We use your date of birth only to verify that you are 16 or older. We do not store it permanently after verification. Your email is used for authentication and account management only.

When you use the reply generator, the screenshot or conversation text you provide is analyzed securely in real time. We do not store screenshots or conversation text on our servers after the request is complete. We do not log message contents.`,
        },
        {
          title: "AI Inference & Third-Party Processing",
          body: `Unspoken AI uses dedicated AI inference endpoints to analyse screenshots and generate reply suggestions. When you submit a screenshot or conversation, that content is transmitted directly and securely to the model infrastructure for real-time inference.

Unspoken AI processes uploaded screenshots and conversation text strictly in memory and does not write them to disk, save them in public cloud storage buckets, or log conversation transcripts.

All processing is ephemeral and designed strictly to return your reply suggestions. Unspoken AI does not train models on your private communications.`,
        },
        {
          title: "Authentication",
          body: `Authentication is handled by Supabase. Your password is never stored in plain text. Supabase uses industry-standard encryption for passwords and sessions. You can review Supabase's privacy practices at supabase.com/privacy.`,
        },
        {
          title: "Cookies and sessions",
          body: `We use secure, httpOnly session cookies to keep you logged in. We do not use tracking cookies, advertising pixels, or third-party analytics. We do not use Google Analytics or any other analytics service.`,
        },
        {
          title: "Data retention and deletion",
          body: `Your account email is retained while your account is active. To delete your account and all associated data, contact us at the email below. Screenshots and conversation text are not stored after processing. Session data is cleared when you log out.`,
        },
        {
          title: "Age requirement",
          body: `Unspoken AI is only available to users aged 16 and older. Age is verified server-side using the date of birth you provide during registration. We do not knowingly collect data from anyone under 16. If you believe a user under 16 has created an account, please contact us.`,
        },
        {
          title: "Contact",
          body: `For privacy-related questions or account deletion requests, contact us at: privacy@unspokenai.app (placeholder — configure with your actual support email before launch).`,
        },
      ].map((section) => (
        <section key={section.title} style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, letterSpacing: "-0.015em", marginBottom: "0.625rem" }}>
            {section.title}
          </h2>
          {section.body.split("\n\n").map((para, i) => (
            <p key={i} style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "0.75rem" }}>
              {para}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
