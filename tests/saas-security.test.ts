import {
  isAgeEligibleUser,
  isOwnerUser,
  isTesterUser,
  getUserRole,
} from "@/lib/auth-security";
import { verifyStripeSignature, verifyRazorpaySignature } from "@/lib/webhooks";
import { checkUserEntitlement, PLAN_CONFIG } from "@/lib/subscriptions";
import { isEligibleAge } from "@/lib/validation";
import crypto from "crypto";

describe("OAuth, Subscriptions, Credits & Owner Console Security Suite", () => {
  describe("1. Server-Enforced Role & Age Boundaries", () => {
    it("denies owner access to users who only self-declare role in user_metadata", () => {
      const spoofedUser = {
        app_metadata: { age_eligible: true },
        user_metadata: { role: "owner" },
      };

      expect(getUserRole(spoofedUser)).toBe("user");
      expect(isOwnerUser(spoofedUser)).toBe(false);
    });

    it("denies tester access to users who only self-declare role in user_metadata", () => {
      const spoofedTester = {
        app_metadata: { age_eligible: true },
        user_metadata: { role: "tester" },
      };

      expect(getUserRole(spoofedTester)).toBe("user");
      expect(isTesterUser(spoofedTester)).toBe(false);
    });

    it("denies owner access even if app_metadata.role is owner if age_eligible is missing or false", () => {
      const underAgeOwner = {
        app_metadata: { role: "owner", age_eligible: false },
        user_metadata: {},
      };

      expect(isAgeEligibleUser(underAgeOwner)).toBe(false);
      expect(isOwnerUser(underAgeOwner)).toBe(false);
    });

    it("denies tester access if age_eligible is missing or false", () => {
      const underAgeTester = {
        app_metadata: { role: "tester", age_eligible: false },
        user_metadata: {},
      };

      expect(isAgeEligibleUser(underAgeTester)).toBe(false);
      expect(isTesterUser(underAgeTester)).toBe(false);
    });

    it("verifies legitimate owner strictly via server-controlled app_metadata", () => {
      const realOwner = {
        app_metadata: { role: "owner", age_eligible: true },
      };

      expect(isOwnerUser(realOwner)).toBe(true);
      expect(isTesterUser(realOwner)).toBe(true); // owners inherit tester capabilities
      expect(getUserRole(realOwner)).toBe("owner");
    });

    it("verifies legitimate tester strictly via server-controlled app_metadata", () => {
      const realTester = {
        app_metadata: { role: "tester", age_eligible: true },
      };

      expect(isOwnerUser(realTester)).toBe(false);
      expect(isTesterUser(realTester)).toBe(true);
      expect(getUserRole(realTester)).toBe("tester");
    });

    it("enforces strict 16+ check for OAuth accounts completing DOB gate", () => {
      // 15 years old should be rejected
      const fifteenYearsAgo = new Date();
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15);
      expect(isEligibleAge(fifteenYearsAgo.toISOString().split("T")[0])).toBe(false);

      // 17 years old should be accepted
      const seventeenYearsAgo = new Date();
      seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17);
      expect(isEligibleAge(seventeenYearsAgo.toISOString().split("T")[0])).toBe(true);
    });
  });

  describe("2. Cryptographic Payment Webhook Verification", () => {
    const testSecret = "whsec_test_secret_1234567890abcdef";
    const testPayload = JSON.stringify({
      id: "evt_12345",
      type: "customer.subscription.created",
      data: { object: { id: "sub_123" } },
    });

    it("verifies valid Stripe signature with valid timestamp", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${testPayload}`;
      const validHmac = crypto
        .createHmac("sha256", testSecret)
        .update(signedPayload, "utf8")
        .digest("hex");

      const header = `t=${timestamp},v1=${validHmac}`;

      const result = verifyStripeSignature({
        payload: testPayload,
        signatureHeader: header,
        secret: testSecret,
      });

      expect(result.isValid).toBe(true);
    });

    it("rejects forged Stripe signature", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const fakeHmac = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
      const header = `t=${timestamp},v1=${fakeHmac}`;

      const result = verifyStripeSignature({
        payload: testPayload,
        signatureHeader: header,
        secret: testSecret,
      });

      expect(result.isValid).toBe(false);
    });

    it("rejects Stripe webhook when timestamp is expired (replay attack defense)", () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 1000; // 1000s ago
      const signedPayload = `${oldTimestamp}.${testPayload}`;
      const hmac = crypto
        .createHmac("sha256", testSecret)
        .update(signedPayload, "utf8")
        .digest("hex");

      const header = `t=${oldTimestamp},v1=${hmac}`;

      const result = verifyStripeSignature({
        payload: testPayload,
        signatureHeader: header,
        secret: testSecret,
        toleranceSeconds: 300,
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain("tolerance");
    });

    it("verifies valid Razorpay webhook signature", () => {
      const razorpaySecret = "razorpay_secret_key_abc";
      const razorpayPayload = JSON.stringify({ event: "subscription.charged" });
      const expectedSignature = crypto
        .createHmac("sha256", razorpaySecret)
        .update(razorpayPayload, "utf8")
        .digest("hex");

      const isValid = verifyRazorpaySignature({
        payload: razorpayPayload,
        signature: expectedSignature,
        secret: razorpaySecret,
      });

      expect(isValid).toBe(true);
    });

    it("rejects forged Razorpay webhook signature", () => {
      const razorpaySecret = "razorpay_secret_key_abc";
      const razorpayPayload = JSON.stringify({ event: "subscription.charged" });

      const isValid = verifyRazorpaySignature({
        payload: razorpayPayload,
        signature: "invalid_signature_hex",
        secret: razorpaySecret,
      });

      expect(isValid).toBe(false);
    });
  });

  describe("3. Subscription Entitlements & Pricing Configuration", () => {
    it("defines Free and Pro plan allowances correctly", () => {
      expect(PLAN_CONFIG.free.monthlyCredits).toBe(10);
      expect(PLAN_CONFIG.free.priceMonthlyUsd).toBe(0);

      expect(PLAN_CONFIG.pro.monthlyCredits).toBe(250);
      expect(PLAN_CONFIG.pro.priceMonthlyUsd).toBe(9.99);
      expect(PLAN_CONFIG.pro.priceYearlyUsd).toBe(99.0);
    });

    it("handles subscription entitlement fallback for active accounts", async () => {
      const entitlement = await checkUserEntitlement("test-user-active");
      expect(entitlement.canGenerate).toBe(true);
      expect(entitlement.plan).toBe("free");
    });
  });
});
