import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantCredits } from "@/lib/credits";

export type SubscriptionPlan = "free" | "pro";
export type SubscriptionBillingCycle = "monthly" | "yearly";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "expired";

export interface UserSubscription {
  userId: string;
  plan: SubscriptionPlan;
  billingCycle: SubscriptionBillingCycle;
  status: SubscriptionStatus;
  provider: "internal" | "stripe" | "razorpay";
  providerSubscriptionId?: string;
  currentPeriodEnd?: string;
}

export const PLAN_CONFIG = {
  free: {
    name: "Free",
    monthlyCredits: 10,
    priceMonthlyUsd: 0,
    priceYearlyUsd: 0,
    features: [
      "10 replies per month",
      "Normal, Rizz, and Flirty modes",
      "Standard response time",
      "Screenshot analysis",
    ],
  },
  pro: {
    name: "Pro",
    monthlyCredits: 250,
    priceMonthlyUsd: 9.99,
    priceYearlyUsd: 99.0, // 2 months free
    features: [
      "250 replies per month",
      "All modes + higher priority",
      "Unlimited manual editing",
      "Priority AI model routing",
      "Email support",
    ],
  },
} as const;

/**
 * Retrieves the current subscription for an authenticated user.
 * Defaults to "free" with "active" status if not found.
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const adminClient = createAdminClient();

  if (!adminClient) {
    return {
      userId,
      plan: "free",
      billingCycle: "monthly",
      status: "active",
      provider: "internal",
    };
  }

  const { data, error } = await adminClient
    .from("subscriptions")
    .select("plan, billing_cycle, status, provider, provider_subscription_id, current_period_end")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      userId,
      plan: "free",
      billingCycle: "monthly",
      status: "active",
      provider: "internal",
    };
  }

  return {
    userId,
    plan: data.plan as SubscriptionPlan,
    billingCycle: data.billing_cycle as SubscriptionBillingCycle,
    status: data.status as SubscriptionStatus,
    provider: data.provider as "internal" | "stripe" | "razorpay",
    providerSubscriptionId: data.provider_subscription_id,
    currentPeriodEnd: data.current_period_end,
  };
}

/**
 * Verifies if user has valid entitlements to generate replies.
 * Checks subscription status (active/trialing vs expired/past_due).
 */
export async function checkUserEntitlement(userId: string): Promise<{
  canGenerate: boolean;
  reason?: string;
  plan: SubscriptionPlan;
}> {
  const adminClient = createAdminClient();
  if (adminClient) {
    try {
      const { data: userData } = await adminClient.auth.admin.getUserById(userId);
      if (userData?.user?.app_metadata?.role === "owner") {
        return { canGenerate: true, plan: "pro" };
      }
    } catch {
      // Continue to subscription check
    }
  }

  const sub = await getUserSubscription(userId);

  if (sub.status === "expired") {
    return {
      canGenerate: false,
      reason: "Your subscription has expired. Please renew your plan to continue.",
      plan: sub.plan,
    };
  }

  if (sub.status === "past_due") {
    return {
      canGenerate: false,
      reason: "Your payment is past due. Please update your billing method.",
      plan: sub.plan,
    };
  }

  return {
    canGenerate: true,
    plan: sub.plan,
  };
}

/**
 * Handles subscription activation or renewal idempotently.
 * Grants plan credits upon successful billing cycle.
 */
export async function applySubscriptionCycle(params: {
  userId: string;
  plan: SubscriptionPlan;
  billingCycle: SubscriptionBillingCycle;
  provider: "stripe" | "razorpay" | "internal";
  providerSubscriptionId: string;
  providerCustomerId?: string;
  periodStart: string;
  periodEnd: string;
  eventId: string; // for idempotency
}): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  if (!adminClient) return { success: false, error: "Server admin client not configured" };

  // 1. Upsert subscription record
  const { error: subError } = await adminClient.from("subscriptions").upsert(
    {
      user_id: params.userId,
      plan: params.plan,
      billing_cycle: params.billingCycle,
      status: "active",
      provider: params.provider,
      provider_subscription_id: params.providerSubscriptionId,
      provider_customer_id: params.providerCustomerId ?? null,
      current_period_start: params.periodStart,
      current_period_end: params.periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (subError) {
    return { success: false, error: subError.message };
  }

  // 2. Grant credits for the cycle idempotently
  const creditAmount =
    params.plan === "pro"
      ? params.billingCycle === "yearly"
        ? PLAN_CONFIG.pro.monthlyCredits * 12
        : PLAN_CONFIG.pro.monthlyCredits
      : PLAN_CONFIG.free.monthlyCredits;

  await grantCredits({
    userId: params.userId,
    amount: creditAmount,
    type: "subscription_grant",
    description: `Subscription ${params.plan} (${params.billingCycle}) credit grant`,
    idempotencyKey: `sub-grant-${params.eventId}`,
    metadata: {
      provider: params.provider,
      providerSubscriptionId: params.providerSubscriptionId,
    },
  });

  return { success: true };
}

/**
 * Cancels or expires subscription.
 */
export async function updateSubscriptionStatus(params: {
  userId: string;
  status: SubscriptionStatus;
  canceledAt?: string;
}): Promise<boolean> {
  const adminClient = createAdminClient();
  if (!adminClient) return false;

  const { error } = await adminClient
    .from("subscriptions")
    .update({
      status: params.status,
      canceled_at: params.canceledAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId);

  return !error;
}
