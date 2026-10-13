import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantCredits } from "@/lib/credits";

export interface AuditLogEntry {
  id: string;
  actorEmail?: string;
  action: string;
  targetUserEmail?: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface OwnerUserSummary {
  id: string;
  email: string;
  role: "owner" | "tester" | "user";
  ageEligible: boolean;
  creditBalance: number;
  hasUnlimitedCredits: boolean;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
}

/**
 * Logs an administrative action to the immutable audit_logs table.
 */
export async function logAuditEvent(params: {
  actorId: string;
  actorEmail: string;
  action: string;
  targetUserId?: string;
  targetUserEmail?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  const adminClient = createAdminClient();
  if (!adminClient) return;

  try {
    await adminClient.from("audit_logs").insert({
      actor_id: params.actorId,
      actor_email: params.actorEmail,
      action: params.action,
      target_user_id: params.targetUserId ?? null,
      target_user_email: params.targetUserEmail ?? null,
      details: params.details ?? {},
      ip_address: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error("[audit_logs] Failed to log event:", err);
  }
}

/**
 * Grants tester permissions to a target user.
 * STRICT: Only callable by authenticated owner; verifies target is 16+ eligible.
 */
export async function grantTesterRole(params: {
  ownerId: string;
  ownerEmail: string;
  targetUserId: string;
  initialCredits?: number;
}): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  if (!adminClient) return { success: false, error: "Admin client unavailable" };

  // 1. Fetch target user
  const { data: userResponse, error: getUserError } = await adminClient.auth.admin.getUserById(
    params.targetUserId
  );

  if (getUserError || !userResponse?.user) {
    return { success: false, error: "Target user not found" };
  }

  const target = userResponse.user;

  // 2. Security invariant: Target user MUST already have passed 16+ age verification
  if (target.app_metadata?.age_eligible !== true) {
    return {
      success: false,
      error: "Target user has not completed 16+ server age verification. Permission denied.",
    };
  }

  // 3. Update target app_metadata
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    params.targetUserId,
    {
      app_metadata: {
        ...target.app_metadata,
        role: "tester",
      },
    }
  );

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 4. Update profile record
  await adminClient
    .from("profiles")
    .update({ role: "tester", updated_at: new Date().toISOString() })
    .eq("id", params.targetUserId);

  // 5. Optionally grant test credits
  if (params.initialCredits && params.initialCredits > 0) {
    await grantCredits({
      userId: params.targetUserId,
      amount: params.initialCredits,
      type: "tester_grant",
      description: `Tester onboarding grant by ${params.ownerEmail}`,
      idempotencyKey: `tester-onboard-${params.targetUserId}-${Date.now()}`,
    });
  }

  // 6. Record in immutable audit log
  await logAuditEvent({
    actorId: params.ownerId,
    actorEmail: params.ownerEmail,
    action: "grant_tester_role",
    targetUserId: params.targetUserId,
    targetUserEmail: target.email,
    details: { initialCreditsGranted: params.initialCredits ?? 0 },
  });

  return { success: true };
}

/**
 * Revokes tester permissions from a target user, restoring default user role.
 */
export async function revokeTesterRole(params: {
  ownerId: string;
  ownerEmail: string;
  targetUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  if (!adminClient) return { success: false, error: "Admin client unavailable" };

  const { data: userResponse, error: getUserError } = await adminClient.auth.admin.getUserById(
    params.targetUserId
  );

  if (getUserError || !userResponse?.user) {
    return { success: false, error: "Target user not found" };
  }

  const target = userResponse.user;

  // Cannot revoke an owner role through tester revocation
  if (target.app_metadata?.role === "owner") {
    return { success: false, error: "Cannot revoke owner permissions via tester revocation" };
  }

  // Update app_metadata
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    params.targetUserId,
    {
      app_metadata: {
        ...target.app_metadata,
        role: "user",
      },
    }
  );

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await adminClient
    .from("profiles")
    .update({ role: "user", updated_at: new Date().toISOString() })
    .eq("id", params.targetUserId);

  await logAuditEvent({
    actorId: params.ownerId,
    actorEmail: params.ownerEmail,
    action: "revoke_tester_role",
    targetUserId: params.targetUserId,
    targetUserEmail: target.email,
  });

  return { success: true };
}

/**
 * Owner credit grant with explicit reason and audit log.
 */
export async function grantCreditsByOwner(params: {
  ownerId: string;
  ownerEmail: string;
  targetUserId: string;
  amount: number;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  if (!adminClient) return { success: false, error: "Admin client unavailable" };

  const { data: userResponse, error: getUserError } = await adminClient.auth.admin.getUserById(
    params.targetUserId
  );

  if (getUserError || !userResponse?.user) {
    return { success: false, error: "Target user not found" };
  }

  const target = userResponse.user;

  if (target.app_metadata?.age_eligible !== true) {
    return { success: false, error: "Target user is not 16+ verified" };
  }

  const grantResult = await grantCredits({
    userId: params.targetUserId,
    amount: params.amount,
    type: "owner_grant",
    description: `Owner grant by ${params.ownerEmail}: ${params.reason}`,
    idempotencyKey: `owner-grant-${params.targetUserId}-${Date.now()}`,
    metadata: { reason: params.reason, ownerEmail: params.ownerEmail },
  });

  if (!grantResult.success) {
    return { success: false, error: grantResult.error };
  }

  await logAuditEvent({
    actorId: params.ownerId,
    actorEmail: params.ownerEmail,
    action: "grant_credits_manual",
    targetUserId: params.targetUserId,
    targetUserEmail: target.email,
    details: { amount: params.amount, reason: params.reason },
  });

  return { success: true };
}
