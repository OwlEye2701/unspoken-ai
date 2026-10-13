import "server-only";
import crypto from "crypto";

/**
 * Verifies Stripe Webhook signature using HMAC-SHA256.
 * Adheres to Stripe standard signature construction without external SDK.
 */
export function verifyStripeSignature(params: {
  payload: string;
  signatureHeader: string;
  secret: string;
  toleranceSeconds?: number;
}): { isValid: boolean; timestamp?: number; error?: string } {
  try {
    const { payload, signatureHeader, secret, toleranceSeconds = 300 } = params;

    const parts = signatureHeader.split(",");
    let timestamp: number | null = null;
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.trim().split("=");
      if (key === "t") timestamp = parseInt(value, 10);
      if (key === "v1") signatures.push(value);
    }

    if (!timestamp || signatures.length === 0) {
      return { isValid: false, error: "Malformed Stripe signature header" };
    }

    // Verify timestamp tolerance against replay attacks
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
      return { isValid: false, error: "Webhook timestamp outside tolerance window" };
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

    const isValid = signatures.some((sig) => {
      try {
        return crypto.timingSafeEqual(
          Buffer.from(sig, "hex"),
          Buffer.from(expectedSignature, "hex")
        );
      } catch {
        return false;
      }
    });

    return { isValid, timestamp };
  } catch (err: unknown) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : "Signature verification failed",
    };
  }
}

/**
 * Verifies Razorpay Webhook signature using HMAC-SHA256.
 */
export function verifyRazorpaySignature(params: {
  payload: string;
  signature: string;
  secret: string;
}): boolean {
  try {
    const expectedSignature = crypto
      .createHmac("sha256", params.secret)
      .update(params.payload, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(params.signature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );
  } catch {
    return false;
  }
}
