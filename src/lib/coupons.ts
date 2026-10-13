import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CouponDef {
  code: string;
  tokens: number;
}

export const VALID_COUPONS: Record<string, number> = {
  UNSPOKEN10: 10,
  VIBE20: 20,
  RIZZ30: 30,
  CHAT40: 40,
  FLIRT50: 50,
  SAUCE60: 60,
  SMOOTH70: 70,
  WIT80: 80,
  UNSPOKEN90: 90,
  SECRET100: 100,
};

// Global max redemptions per single coupon code
export const MAX_COUPON_GLOBAL_USES = 10;
// Max coupons any single user can redeem
export const MAX_USER_REDEMPTIONS = 2;

// In-memory fallback tracking for local development / testing without active DB table
interface MemoryCouponState {
  globalUses: Record<string, number>;
  userRedemptions: Record<string, string[]>;
}

const memoryState: MemoryCouponState = {
  globalUses: {},
  userRedemptions: {},
};

export interface RedeemResult {
  success: boolean;
  tokens?: number;
  newBalance?: number;
  error?: string;
}

/**
 * Redeem a coupon code for a given user.
 * Rules:
 * 1. Must be a valid coupon code.
 * 2. User cannot redeem more than 2 coupons in total.
 * 3. User cannot redeem the exact same coupon twice.
 * 4. Each coupon code can only be redeemed 10 times in total across all users.
 */
export async function redeemCoupon(userId: string, rawCode: string): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase();

  const tokenAmount = VALID_COUPONS[code];
  if (!tokenAmount) {
    return { success: false, error: "Invalid coupon code." };
  }

  const adminClient = createAdminClient();

  if (!adminClient) {
    // In-memory fallback
    const userCodes = memoryState.userRedemptions[userId] || [];
    if (userCodes.length >= MAX_USER_REDEMPTIONS) {
      return { success: false, error: "Invalid coupon code or coupon is no longer available." };
    }
    if (userCodes.includes(code)) {
      return { success: false, error: "You have already redeemed this coupon." };
    }

    const currentUses = memoryState.globalUses[code] || 0;
    if (currentUses >= MAX_COUPON_GLOBAL_USES) {
      return { success: false, error: "Invalid coupon code or coupon is no longer available." };
    }

    // Apply redemption in-memory
    memoryState.globalUses[code] = currentUses + 1;
    memoryState.userRedemptions[userId] = [...userCodes, code];

    return {
      success: true,
      tokens: tokenAmount,
      newBalance: 10 + tokenAmount,
    };
  }

  try {
    // Check user's total redemptions
    const { data: userLogs, error: logError } = await adminClient
      .from("coupon_redemptions")
      .select("code")
      .eq("user_id", userId);

    if (logError && !logError.message.includes("does not exist")) {
      console.error("[redeemCoupon] Error checking user logs:", logError.message);
    }

    if (userLogs) {
      if (userLogs.length >= MAX_USER_REDEMPTIONS) {
        return { success: false, error: "Invalid coupon code or coupon is no longer available." };
      }
      if (userLogs.some((row) => row.code === code)) {
        return { success: false, error: "You have already redeemed this coupon." };
      }
    }

    // Check global coupon redemptions
    const { count: globalCount, error: countError } = await adminClient
      .from("coupon_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("code", code);

    if (!countError && typeof globalCount === "number" && globalCount >= MAX_COUPON_GLOBAL_USES) {
      return { success: false, error: "Invalid coupon code or coupon is no longer available." };
    }

    // Insert redemption record
    await adminClient.from("coupon_redemptions").insert({
      user_id: userId,
      code,
      tokens: tokenAmount,
      redeemed_at: new Date().toISOString(),
    });

    // Credit user's account
    const { data: acc } = await adminClient
      .from("credit_accounts")
      .select("balance, lifetime_granted")
      .eq("user_id", userId)
      .single();

    const currentBalance = acc?.balance ?? 10;
    const newBalance = currentBalance + tokenAmount;

    await adminClient.from("credit_accounts").upsert({
      user_id: userId,
      balance: newBalance,
      lifetime_granted: (acc?.lifetime_granted ?? 10) + tokenAmount,
      updated_at: new Date().toISOString(),
    });

    return {
      success: true,
      tokens: tokenAmount,
      newBalance,
    };
  } catch (err: unknown) {
    console.warn("[redeemCoupon] Database error, falling back to in-memory state:", err);
    // Fallback to memory
    const userCodes = memoryState.userRedemptions[userId] || [];
    if (userCodes.length >= MAX_USER_REDEMPTIONS) {
      return { success: false, error: "Invalid coupon code or coupon is no longer available." };
    }
    if (userCodes.includes(code)) {
      return { success: false, error: "You have already redeemed this coupon." };
    }
    const currentUses = memoryState.globalUses[code] || 0;
    if (currentUses >= MAX_COUPON_GLOBAL_USES) {
      return { success: false, error: "Invalid coupon code or coupon is no longer available." };
    }
    memoryState.globalUses[code] = currentUses + 1;
    memoryState.userRedemptions[userId] = [...userCodes, code];

    return {
      success: true,
      tokens: tokenAmount,
      newBalance: 10 + tokenAmount,
    };
  }
}
