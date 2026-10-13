"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function CouponModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    // Check if visitor is visiting for the first time
    const timer = setTimeout(() => {
      const hasSeenModal = localStorage.getItem("unspoken_coupon_modal_seen");
      if (!hasSeenModal) {
        setIsOpen(true);
      }
    }, 400);

    function handleOpenEvent() {
      setMessage(null);
      setIsOpen(true);
    }

    window.addEventListener("open-coupon-modal", handleOpenEvent);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("open-coupon-modal", handleOpenEvent);
    };
  }, []);

  function handleClose() {
    localStorage.setItem("unspoken_coupon_modal_seen", "true");
    setIsOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/redeem-coupon", {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ code: couponCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.error || "Invalid coupon code.", isError: true });
      } else {
        setMessage({ text: data.message || `Redeemed! Added ${data.tokens} tokens.`, isError: false });
        localStorage.setItem("unspoken_coupon_modal_seen", "true");
        setTimeout(() => {
          setIsOpen(false);
          // Reload page to reflect new token count if in app
          if (window.location.pathname.startsWith("/app")) {
            window.location.reload();
          }
        }, 1500);
      }
    } catch {
      setMessage({ text: "Network error. Please try again.", isError: true });
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        zIndex: 9999,
      }}
    >
      <div
        className="card animate-fadeUp"
        style={{
          width: "100%",
          maxWidth: "420px",
          position: "relative",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          padding: "1.75rem",
        }}
      >
        <button
          onClick={handleClose}
          type="button"
          aria-label="Close coupon modal"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "1.25rem",
            cursor: "pointer",
            lineHeight: 1,
            padding: "0.25rem",
          }}
        >
          ✕
        </button>

        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div
            style={{
              fontSize: "2.2rem",
              marginBottom: "0.5rem",
            }}
          >
            🎁
          </div>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              marginBottom: "0.35rem",
            }}
          >
            Do you have any coupon?
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>
            Welcome to Unspoken AI! Enter your promo or welcome code to unlock bonus reply tokens.
          </p>
        </div>

        {message && (
          <div
            className={`alert ${message.isError ? "alert-error" : "alert-success"}`}
            style={{ marginBottom: "1rem", fontSize: "0.85rem" }}
          >
            <span>{message.isError ? "⚠" : "✓"}</span>
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div className="field">
            <input
              type="text"
              className="input"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon code"
              autoFocus
              disabled={loading}
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
                textAlign: "center",
              }}
            />
            <span className="field-hint" style={{ textAlign: "center" }}>
              Enter your promo or gift code to claim bonus tokens
            </span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              Skip
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1.5 }}
              disabled={loading || !couponCode.trim()}
            >
              {loading ? "Checking…" : "Redeem Tokens"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
