"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/auth-security";
import {
  grantTesterRole,
  revokeTesterRole,
  grantCreditsByOwner,
} from "@/lib/owner";

export type OwnerActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

/**
 * Ensures calling user is an authorized owner before performing actions.
 */
async function getAuthenticatedOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isOwnerUser(user)) {
    throw new Error("Unauthorized: Owner privileges required.");
  }

  return user;
}

export async function handleGrantTester(
  _prevState: OwnerActionResult,
  formData: FormData
): Promise<OwnerActionResult> {
  try {
    const owner = await getAuthenticatedOwner();
    const targetUserId = formData.get("targetUserId") as string;
    const initialCredits = parseInt((formData.get("initialCredits") as string) || "50", 10);

    if (!targetUserId) {
      return { success: false, error: "Target User ID is required" };
    }

    const result = await grantTesterRole({
      ownerId: owner.id,
      ownerEmail: owner.email ?? "unknown@owner",
      targetUserId: targetUserId.trim(),
      initialCredits: isNaN(initialCredits) ? 50 : initialCredits,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/owner");
    return { success: true, message: "Tester role and test credits granted successfully." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to grant tester role",
    };
  }
}

export async function handleRevokeTester(
  _prevState: OwnerActionResult,
  formData: FormData
): Promise<OwnerActionResult> {
  try {
    const owner = await getAuthenticatedOwner();
    const targetUserId = formData.get("targetUserId") as string;

    if (!targetUserId) {
      return { success: false, error: "Target User ID is required" };
    }

    const result = await revokeTesterRole({
      ownerId: owner.id,
      ownerEmail: owner.email ?? "unknown@owner",
      targetUserId: targetUserId.trim(),
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/owner");
    return { success: true, message: "Tester role revoked and standard permissions restored." };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to revoke tester role",
    };
  }
}

export async function handleGrantCredits(
  _prevState: OwnerActionResult,
  formData: FormData
): Promise<OwnerActionResult> {
  try {
    const owner = await getAuthenticatedOwner();
    const targetUserId = formData.get("targetUserId") as string;
    const amount = parseInt((formData.get("amount") as string) || "0", 10);
    const reason = formData.get("reason") as string;

    if (!targetUserId || !amount || amount <= 0 || !reason) {
      return {
        success: false,
        error: "User ID, positive credit amount, and explicit audit reason are required.",
      };
    }

    const result = await grantCreditsByOwner({
      ownerId: owner.id,
      ownerEmail: owner.email ?? "unknown@owner",
      targetUserId: targetUserId.trim(),
      amount,
      reason: reason.trim(),
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath("/owner");
    return { success: true, message: `Granted ${amount} credits successfully.` };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to grant credits",
    };
  }
}
