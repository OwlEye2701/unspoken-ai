import type { Metadata } from "next";
import { ReplyGenerator } from "@/components/ReplyGenerator";

export const metadata: Metadata = {
  title: "Generate Replies",
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            marginBottom: "0.375rem",
          }}
        >
          Generate a reply
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Upload a screenshot or paste the conversation. Add context if you want a better result.
        </p>
      </div>

      <div
        role="note"
        aria-label="Age Advisory Warning"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.6rem 0.85rem",
          background: "rgba(234, 179, 8, 0.08)",
          border: "1px solid rgba(234, 179, 8, 0.25)",
          borderRadius: "8px",
          fontSize: "0.8rem",
          color: "#fde047",
          marginBottom: "1.5rem",
        }}
      >
        <span aria-hidden>⚠️</span>
        <span>
          <strong>Notice:</strong> Unspoken AI is intended for users aged 16 and older. By using this service, you confirm you are at least 16.
        </span>
      </div>

      <ReplyGenerator />
    </div>
  );
}
