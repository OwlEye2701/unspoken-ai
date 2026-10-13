import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface CreditAccount {
  userId: string;
  balance: number;
  lifetimeGranted: number;
  lifetimeUsed: number;
  hasUnlimitedCredits: boolean;
}

export interface CreditDeductionResult {
  success: boolean;
  balance: number;
  unlimited?: boolean;
  error?: string;
  alreadyProcessed?: boolean;
  transactionId?: string;
}

/**
 * Retrieves credit account balance and details for an authenticated user.
 * Initializes default account (10 credits) if not already created.
 */
export async function getCreditAccount(userId: string): Promise<CreditAccount> {
  const adminClient = createAdminClient();

  if (!adminClient) {
    // If Supabase service role is not configured (e.g. local test mode without db)
    return {
      userId,
      balance: 9999,
      lifetimeGranted: 9999,
      lifetimeUsed: 0,
      hasUnlimitedCredits: true,
    };
  }

  // Check if user is owner via app_metadata
  try {
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);
    if (userData?.user?.app_metadata?.role === "owner") {
      return {
        userId,
        balance: 999999,
        lifetimeGranted: 999999,
        lifetimeUsed: 0,
        hasUnlimitedCredits: true,
      };
    }
  } catch {
    // Ignore and proceed to credit_accounts lookup
  }

  const { data, error } = await adminClient
    .from("credit_accounts")
    .select("balance, lifetime_granted, lifetime_used, has_unlimited_credits")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    // Attempt to insert initial credit account
    const { data: inserted, error: insertError } = await adminClient
      .from("credit_accounts")
      .insert({
        user_id: userId,
        balance: 10,
        lifetime_granted: 10,
        lifetime_used: 0,
        has_unlimited_credits: false,
      })
      .select("balance, lifetime_granted, lifetime_used, has_unlimited_credits")
      .single();

    if (insertError || !inserted) {
      return {
        userId,
        balance: 10,
        lifetimeGranted: 10,
        lifetimeUsed: 0,
        hasUnlimitedCredits: false,
      };
    }

    return {
      userId,
      balance: inserted.balance,
      lifetimeGranted: inserted.lifetime_granted,
      lifetimeUsed: inserted.lifetime_used,
      hasUnlimitedCredits: inserted.has_unlimited_credits,
    };
  }

  return {
    userId,
    balance: data.balance,
    lifetimeGranted: data.lifetime_granted,
    lifetimeUsed: data.lifetime_used,
    hasUnlimitedCredits: data.has_unlimited_credits,
  };
}

/**
 * Atomically checks and deducts credits for an action (e.g., generation).
 * Prevents race conditions and duplicate deductions via idempotency key.
 */
export async function deductCredits(params: {
  userId: string;
  cost: number;
  idempotencyKey: string;
  description: string;
}): Promise<CreditDeductionResult> {
  const adminClient = createAdminClient();

  if (!adminClient) {
    // Fallback in local test mode if database is not active
    return { success: true, balance: 9, transactionId: "mock-tx-local" };
  }

  try {
    // Execute atomic stored procedure
    const { data, error } = await adminClient.rpc("deduct_credit_atomic", {
      p_user_id: params.userId,
      p_cost: params.cost,
      p_idempotency_key: params.idempotencyKey,
      p_description: params.description,
    });

    if (error) {
      console.error("[deductCredits] RPC error:", error.message);
      // Direct SQL fallback if function not yet applied in remote DB
      return await deductCreditsDirect(params);
    }

    return data as CreditDeductionResult;
  } catch (err) {
    console.error("[deductCredits] Exception:", err);
    return { success: false, error: "Failed to process credit deduction", balance: 0 };
  }
}

/**
 * Direct transaction fallback when RPC is unavailable.
 */
async function deductCreditsDirect(params: {
  userId: string;
  cost: number;
  idempotencyKey: string;
  description: string;
}): Promise<CreditDeductionResult> {
  const adminClient = createAdminClient()!;

  // 1. Check idempotency
  const { data: existingTx } = await adminClient
    .from("credit_transactions")
    .select("balance_after")
    .eq("idempotency_key", params.idempotencyKey)
    .single();

  if (existingTx) {
    return { success: true, balance: existingTx.balance_after, alreadyProcessed: true };
  }

  // 2. Fetch current balance
  const account = await getCreditAccount(params.userId);

  if (account.hasUnlimitedCredits) {
    await adminClient.from("credit_transactions").insert({
      user_id: params.userId,
      amount: 0,
      balance_after: account.balance,
      type: "generation_deduction",
      description: params.description,
      idempotency_key: params.idempotencyKey,
      metadata: { unlimited: true },
    });
    return { success: true, balance: account.balance, unlimited: true };
  }

  if (account.balance < params.cost) {
    return {
      success: false,
      error: "Insufficient credits. Please upgrade to Pro or replenish credits.",
      balance: account.balance,
    };
  }

  const newBalance = account.balance - params.cost;

  // 3. Update account balance
  const { error: updateError } = await adminClient
    .from("credit_accounts")
    .update({
      balance: newBalance,
      lifetime_used: account.lifetimeUsed + params.cost,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId);

  if (updateError) {
    return { success: false, error: "Could not update credit balance", balance: account.balance };
  }

  // 4. Log transaction
  const { data: tx } = await adminClient
    .from("credit_transactions")
    .insert({
      user_id: params.userId,
      amount: -params.cost,
      balance_after: newBalance,
      type: "generation_deduction",
      description: params.description,
      idempotency_key: params.idempotencyKey,
    })
    .select("id")
    .single();

  return { success: true, balance: newBalance, transactionId: tx?.id };
}

/**
 * Grants credits to a user account with audit ledger tracking.
 */
export async function grantCredits(params: {
  userId: string;
  amount: number;
  type: "subscription_grant" | "owner_grant" | "tester_grant" | "refund";
  description: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const adminClient = createAdminClient();

  if (!adminClient) {
    return { success: true, newBalance: 10 + params.amount };
  }

  if (params.idempotencyKey) {
    const { data: existing } = await adminClient
      .from("credit_transactions")
      .select("balance_after")
      .eq("idempotency_key", params.idempotencyKey)
      .single();

    if (existing) {
      return { success: true, newBalance: existing.balance_after };
    }
  }

  const account = await getCreditAccount(params.userId);
  const newBalance = account.balance + params.amount;

  const { error: updateError } = await adminClient
    .from("credit_accounts")
    .update({
      balance: newBalance,
      lifetime_granted: account.lifetimeGranted + params.amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.userId);

  if (updateError) {
    return { success: false, newBalance: account.balance, error: updateError.message };
  }

  await adminClient.from("credit_transactions").insert({
    user_id: params.userId,
    amount: params.amount,
    balance_after: newBalance,
    type: params.type,
    description: params.description,
    idempotency_key: params.idempotencyKey ?? null,
    metadata: params.metadata ?? {},
  });

  return { success: true, newBalance };
}

/**
 * Refunds credits for a failed or cancelled generation.
 */
export async function refundCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  originalIdempotencyKey?: string;
}): Promise<boolean> {
  const result = await grantCredits({
    userId: params.userId,
    amount: params.amount,
    type: "refund",
    description: `Refund: ${params.reason}`,
    idempotencyKey: params.originalIdempotencyKey
      ? `refund-${params.originalIdempotencyKey}`
      : undefined,
  });

  return result.success;
}
