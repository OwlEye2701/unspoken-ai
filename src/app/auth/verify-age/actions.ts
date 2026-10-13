"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEligibleAge } from "@/lib/validation";

export type AgeGateResult = {
  error?: string;
  success?: string;
};

export async function completeOAuthAgeGate(
  _prevState: AgeGateResult,
  formData: FormData
): Promise<AgeGateResult> {
  const dateOfBirth = formData.get("dateOfBirth") as string;

  if (!dateOfBirth) {
    return { error: "Please enter your date of birth." };
  }

  // Strict server-side age validation
  if (!isEligibleAge(dateOfBirth)) {
    return {
      error:
        "Unspoken AI is only available for people aged 16 and older. You do not meet the age requirement.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Session expired. Please sign in again." };
  }

  const adminClient = createAdminClient();
  if (adminClient) {
    const { error: adminError } = await adminClient.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        age_eligible: true,
        verified_at: new Date().toISOString(),
      },
    });

    if (adminError) {
      return { error: "Could not record age verification. Please contact support." };
    }
  }

  // Refresh user session so newly signed app_metadata JWT is active
  await supabase.auth.refreshSession();

  revalidatePath("/", "layout");
  redirect("/app");
}
