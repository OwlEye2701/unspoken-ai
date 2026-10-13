import Link from "next/link";
import type { Metadata } from "next";
import { CouponNavButton } from "@/components/CouponNavButton";

export const metadata: Metadata = {
  title: "Unspoken AI — Smart Conversation Replies",
  description:
    "Upload a chat screenshot or paste a conversation and get three natural reply suggestions powered by Unspoken AI. For users aged 16+.",
};

export default function HomePage() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "0 1.5rem",
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: "rgba(15,15,15,0.85)",
          backdropFilter: "blur(8px)",
          zIndex: 50,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "1.1rem",
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
          }}
        >
          Unspoken<span style={{ color: "var(--accent)" }}>AI</span>
        </span>
        <nav style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <CouponNavButton />
          <Link
            href="/auth/login"
            className="btn btn-ghost btn-sm"
          >
            Log in
          </Link>
          <Link href="/auth/register" className="btn btn-primary btn-sm">
            Get started
          </Link>
        </nav>
      </header>

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <section
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            padding: "5rem 1.5rem 4rem",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(2.2rem, 6vw, 3.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--text-primary)",
              marginBottom: "1.25rem",
            }}
          >
            Reply with confidence.
            <br />
            <span style={{ color: "var(--accent)" }}>Every time.</span>
          </h1>
          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              maxWidth: "520px",
              margin: "0 auto 2.5rem",
            }}
          >
            Upload a screenshot or paste a conversation. Unspoken AI reads the
            context and gives you three replies — one that sounds natural, one
            with personality, and one that plays it a little flirty.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth/register" className="btn btn-primary btn-lg">
              Try it free
            </Link>
            <Link href="#how-it-works" className="btn btn-secondary btn-lg">
              See how it works
            </Link>
          </div>
          <p
            style={{
              marginTop: "1.25rem",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            For users aged 16 and older · No credit card required
          </p>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          style={{
            borderTop: "1px solid var(--border)",
            padding: "4rem 1.5rem",
            maxWidth: "960px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: "0.5rem",
              textAlign: "center",
            }}
          >
            How it works
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              textAlign: "center",
              marginBottom: "3rem",
              fontSize: "0.95rem",
            }}
          >
            Three steps. Under thirty seconds.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {[
              {
                step: "01",
                title: "Upload or paste",
                body: "Drop in a screenshot from any messaging app, or just paste the conversation as text.",
              },
              {
                step: "02",
                title: "Add context (optional)",
                body: "Tell us who sent the message and what vibe you're going for. The more you say, the better the replies.",
              },
              {
                step: "03",
                title: "Pick your reply",
                body: "Get three distinct suggestions — Normal, Rizz, and Flirty. Copy the one you like and send it yourself.",
              },
            ].map((item) => (
              <div key={item.step} className="card">
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    color: "var(--accent)",
                    fontWeight: 500,
                    display: "block",
                    marginBottom: "0.75rem",
                  }}
                >
                  {item.step}
                </span>
                <h3
                  style={{
                    fontWeight: 600,
                    fontSize: "1rem",
                    marginBottom: "0.5rem",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.title}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Reply modes */}
        <section
          style={{
            borderTop: "1px solid var(--border)",
            padding: "4rem 1.5rem",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                marginBottom: "0.5rem",
                textAlign: "center",
              }}
            >
              Three modes, one message
            </h2>
            <p
              style={{
                color: "var(--text-secondary)",
                textAlign: "center",
                marginBottom: "2.5rem",
                fontSize: "0.95rem",
              }}
            >
              Each reply is genuinely different, not the same sentence rearranged.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                {
                  badge: "Normal",
                  badgeClass: "reply-badge-normal",
                  desc: "Relaxed, human, and direct. Sounds exactly like you texting back.",
                  example: '"haha yeah honestly same — you eating yet?"',
                },
                {
                  badge: "Rizz",
                  badgeClass: "reply-badge-rizz",
                  desc: "Confident and charming with actual personality. Not a pickup line.",
                  example: '"okay now I\'m curious about this story"',
                },
                {
                  badge: "Flirty",
                  badgeClass: "reply-badge-flirty",
                  desc: "Playful and a little bold. Respects boundaries, keeps it fun.",
                  example: '"sounds like you need better company"',
                },
              ].map((mode) => (
                <div key={mode.badge} className="reply-card">
                  <div className="reply-card-header">
                    <span className={`reply-badge ${mode.badgeClass}`}>
                      {mode.badge}
                    </span>
                  </div>
                  <div style={{ padding: "1rem" }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.625rem" }}>
                      {mode.desc}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.875rem",
                        color: "var(--text-primary)",
                        background: "var(--bg-elevated)",
                        padding: "0.625rem 0.875rem",
                        borderRadius: "6px",
                      }}
                    >
                      {mode.example}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section
          style={{
            borderTop: "1px solid var(--border)",
            padding: "4rem 1.5rem",
            maxWidth: "720px",
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: "0.5rem",
              textAlign: "center",
            }}
          >
            What happens to your screenshots
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              textAlign: "center",
              marginBottom: "2rem",
              fontSize: "0.95rem",
            }}
          >
            Screenshots contain private conversations. Here&apos;s exactly what we do with them.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {[
              "Images are analyzed securely in-memory by Unspoken AI. They are not stored on our servers after processing.",
              "We never log message text, image contents, or personal details from conversations.",
              "Unspoken AI does not retain your screenshots or sell conversation data.",
              "All processing is ephemeral and designed strictly to return your reply suggestions.",
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                  padding: "0.875rem 1rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
                <span
                  style={{
                    color: "var(--success)",
                    fontSize: "0.9rem",
                    marginTop: "1px",
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                <p
                  style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}
                  dangerouslySetInnerHTML={{ __html: item }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section
          style={{
            borderTop: "1px solid var(--border)",
            padding: "4rem 1.5rem",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                marginBottom: "2rem",
                textAlign: "center",
              }}
            >
              Common questions
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {[
                {
                  q: "Why do I need to be 16 or older?",
                  a: "Unspoken AI generates flirtatious conversation replies. We verify your age during registration using your date of birth, checked on our servers. Anyone under 16 cannot create an account.",
                },
                {
                  q: "Does the AI read my screenshot automatically?",
                  a: "Yes — when you upload an image, Unspoken AI analyses the visible conversation and identifies the latest incoming message. If any text is unclear or the image is too blurry, it will say so rather than invent what it cannot read.",
                },
                {
                  q: "Will Unspoken AI send a reply on my behalf?",
                  a: "No. You always stay in control. The app only generates suggestions. You copy the reply you want and send it yourself through whatever app you're using.",
                },
                {
                  q: "What happens to my screenshot after I upload it?",
                  a: "Your image is processed strictly for analysis and then discarded. We do not store screenshots or conversation content permanently.",
                },
                {
                  q: "Is my account information secure?",
                  a: "Authentication is handled by Supabase Auth using industry-standard encryption. Passwords are never stored in plain text. Sessions use secure, httpOnly cookies.",
                },
              ].map((item, i) => (
                <div key={i} style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1.25rem" }}>
                  <h3
                    style={{
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      marginBottom: "0.5rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {item.q}
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            borderTop: "1px solid var(--border)",
            padding: "5rem 1.5rem",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "1rem",
            }}
          >
            Stop staring at the screen.
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "1rem" }}>
            Get three replies in under ten seconds.
          </p>
          <Link href="/auth/register" className="btn btn-primary btn-lg">
            Create an account
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "1.75rem 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Unspoken<span style={{ color: "var(--accent)" }}>AI</span>
          </span>
          <nav
            style={{
              display: "flex",
              gap: "1.25rem",
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "FAQ", href: "/#how-it-works" },
              { label: "Support", href: "/support" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="footer-link"
                style={{
                  fontSize: "0.825rem",
                  color: "var(--text-muted)",
                  transition: "color 0.15s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} Unspoken AI. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
