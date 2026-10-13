import { redeemCoupon, VALID_COUPONS, MAX_COUPON_GLOBAL_USES, MAX_USER_REDEMPTIONS } from "../src/lib/coupons";

describe("Coupon Redemption System", () => {
  it("defines the expected coupon codes and token amounts", () => {
    expect(MAX_COUPON_GLOBAL_USES).toBe(10);
    expect(MAX_USER_REDEMPTIONS).toBe(2);
    expect(VALID_COUPONS["UNSPOKEN10"]).toBe(10);
    expect(VALID_COUPONS["VIBE20"]).toBe(20);
    expect(VALID_COUPONS["RIZZ30"]).toBe(30);
    expect(VALID_COUPONS["CHAT40"]).toBe(40);
    expect(VALID_COUPONS["FLIRT50"]).toBe(50);
    expect(VALID_COUPONS["SAUCE60"]).toBe(60);
    expect(VALID_COUPONS["SMOOTH70"]).toBe(70);
    expect(VALID_COUPONS["WIT80"]).toBe(80);
    expect(VALID_COUPONS["UNSPOKEN90"]).toBe(90);
    expect(VALID_COUPONS["SECRET100"]).toBe(100);
  });

  it("rejects invalid coupon codes", async () => {
    const res = await redeemCoupon("user-test-1", "INVALID_CODE");
    expect(res.success).toBe(false);
    expect(res.error).toBe("Invalid coupon code.");
  });

  it("redeems valid coupons and limits user to 2 redemptions maximum", async () => {
    const testUserId = "user-limit-check-" + Date.now();

    // 1st redemption: OK
    const res1 = await redeemCoupon(testUserId, "UNSPOKEN10");
    expect(res1.success).toBe(true);
    expect(res1.tokens).toBe(10);

    // Cannot redeem the same coupon twice
    const resDuplicate = await redeemCoupon(testUserId, "UNSPOKEN10");
    expect(resDuplicate.success).toBe(false);
    expect(resDuplicate.error).toContain("already redeemed");

    // 2nd redemption: OK
    const res2 = await redeemCoupon(testUserId, "VIBE20");
    expect(res2.success).toBe(true);
    expect(res2.tokens).toBe(20);

    // 3rd redemption: Exceeds limit of 2
    const res3 = await redeemCoupon(testUserId, "RIZZ30");
    expect(res3.success).toBe(false);
    expect(res3.error).toContain("no longer available");
  });
});
