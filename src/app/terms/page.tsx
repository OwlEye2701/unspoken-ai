import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Unspoken AI terms of service and usage rules.",
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <Link
        href="/"
        style={{ fontSize: "0.875rem", color: "var(--text-muted)", textDecoration: "underline", marginBottom: "2rem", display: "inline-block" }}
      >
        ← Back to home
      </Link>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
        Terms of Service
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "2.5rem" }}>
        Last updated: October 2026
      </p>

      {[
        {
          title: "Eligibility",
          body: "You must be 16 or older to use Unspoken AI. By creating an account, you confirm that you meet this requirement. We verify age during registration using the date of birth you provide. Providing a false date of birth to circumvent this requirement is a violation of these terms.",
        },
        {
          title: "Acceptable use",
          body: "Unspoken AI is designed to help you draft natural, respectful conversation replies. You may not use the service to generate or send messages that are threatening, harassing, coercive, manipulative, or that target someone who has clearly communicated they are not interested. You are responsible for any message you choose to send.",
        },
        {
          title: "Content and screenshots",
          body: "Screenshots you upload may contain private information belonging to other people. You are responsible for ensuring that your use of this service respects the privacy of others. Do not upload content you do not have the right to share. Unspoken AI is not responsible for how you use the generated replies.",
        },
        {
          title: "No guarantees",
          body: 'Unspoken AI provides AI-generated suggestions "as is." We make no guarantees about the quality, accuracy, or appropriateness of generated replies for any specific situation. The AI may misread conversations or generate replies that are not suitable. You should review every reply before sending it.',
        },
        {
          title: "Account security",
          body: "You are responsible for maintaining the security of your account credentials. Do not share your password. Log out of shared devices. Contact us promptly if you believe your account has been compromised.",
        },
        {
          title: "Termination",
          body: "We may terminate or suspend accounts that violate these terms. You may delete your account at any time by contacting us.",
        },
        {
          title: "Changes",
          body: "We may update these terms over time. Continued use of the service after changes are posted constitutes acceptance of the revised terms.",
        },
      ].map((section) => (
        <section key={section.title} style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, letterSpacing: "-0.015em", marginBottom: "0.625rem" }}>
            {section.title}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.7 }}>
            {section.body}
          </p>
        </section>
      ))}
    </div>
  );
}
