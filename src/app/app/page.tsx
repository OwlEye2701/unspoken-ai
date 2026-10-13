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
      <ReplyGenerator />
    </div>
  );
}
