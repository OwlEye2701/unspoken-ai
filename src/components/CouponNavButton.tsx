"use client";

export function CouponNavButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-coupon-modal"))}
      style={{
        background: "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.2))",
        border: "1px solid rgba(236, 72, 153, 0.35)",
        color: "#f472b6",
        fontSize: "0.85rem",
        fontWeight: 600,
        padding: "0.3rem 0.65rem",
        borderRadius: "6px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        transition: "all 0.15s ease",
      }}
      title="Redeem Coupon"
    >
      <span style={{ fontSize: "1rem" }} role="img" aria-label="gift">🎁</span>
      <span>Redeem Code</span>
    </button>
  );
}
