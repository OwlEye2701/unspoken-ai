"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, registerSchema, resetPasswordSchema, updatePasswordSchema, isEligibleAge } from "@/lib/validation";

export type ActionResult = {
  error?: string;
  success?: string;
};

export async function login(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? "Invalid input" };
  }

  // Support username "OwlEye2" mapping to an owner email
  const enteredEmail = result.data.email.trim();
  const isOwnerUsername = enteredEmail.toLowerCase() === "owleye2" || enteredEmail.toLowerCase() === "owleye2@unspokenai.app";
  const loginEmail = isOwnerUsername ? "owleye2@unspokenai.app" : enteredEmail;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      error: "Authentication service is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Cloudflare Worker environment variables.",
    };
  }

  const supabase = await createClient();

  let { error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: result.data.password,
  });

  // If this is the owner account and it doesn't exist yet, auto-provision it with owner role
  if (error && isOwnerUsername && result.data.password === "kl10ah09") {
    const adminClient = createAdminClient();
    if (adminClient) {
      // Create user directly via admin API
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: "owleye2@unspokenai.app",
        password: "kl10ah09",
        email_confirm: true,
        app_metadata: {
          role: "owner",
          age_eligible: true,
          unlimited_credits: true,
          verified_at: new Date().toISOString(),
        },
      });

      if (!createError && newUser?.user) {
        // Try sign in again
        const retry = await supabase.auth.signInWithPassword({
          email: "owleye2@unspokenai.app",
          password: "kl10ah09",
        });
        error = retry.error;
      }
    } else {
      // Fallback: Sign up via standard client
      const { error: signUpError } = await supabase.auth.signUp({
        email: "owleye2@unspokenai.app",
        password: "kl10ah09",
      });
      if (!signUpError) {
        const retry = await supabase.auth.signInWithPassword({
          email: "owleye2@unspokenai.app",
          password: "kl10ah09",
        });
        error = retry.error;
      }
    }
  }

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Incorrect email, username, or password. Please try again." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Please verify your email address before logging in." };
    }
    // Return detailed error message to identify configuration or provider issues
    return { error: error.message || "Login failed. Please check your credentials or configuration." };
  }

  // Ensure owner privileges are saved to app_metadata and unlimited credits assigned
  if (isOwnerUsername) {
    const adminClient = createAdminClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (adminClient && currentUser) {
      await adminClient.auth.admin.updateUserById(currentUser.id, {
        app_metadata: {
          role: "owner",
          age_eligible: true,
          unlimited_credits: true,
        },
      });
      await adminClient.from("credit_accounts").upsert({
        user_id: currentUser.id,
        balance: 999999,
        lifetime_granted: 999999,
        lifetime_used: 0,
        has_unlimited_credits: true,
      });
    }
  }

  try {
    revalidatePath("/", "layout");
  } catch {
    // Non-fatal if runtime cache tag provider is unavailable in edge worker
  }
  redirect("/app");
}

export async function register(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    dateOfBirth: formData.get("dateOfBirth") as string,
  };

  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? "Invalid input" };
  }

  // Age gate — strictly validated SERVER-SIDE
  if (!isEligibleAge(result.data.dateOfBirth)) {
    return {
      error:
        "Unspoken AI is only available for people aged 16 and older. You do not meet the age requirement.",
    };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      error: "Authentication service is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Cloudflare Worker environment variables.",
    };
  }

  const supabase = await createClient();

  // Create account without client-controlled age metadata
  const { data: signUpData, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    if (error.message.includes("already registered") || error.message.includes("already exists")) {
      return { error: "An account with this email already exists. Please log in." };
    }
    if (error.message.includes("Password")) {
      return { error: "Password does not meet the requirements." };
    }
    return { error: "Registration failed. Please try again." };
  }

  // Securely set trusted app_metadata using server administrative privileges ONLY
  if (signUpData.user) {
    const adminClient = createAdminClient();
    if (adminClient) {
      const { error: adminError } = await adminClient.auth.admin.updateUserById(
        signUpData.user.id,
        {
          app_metadata: {
            age_eligible: true,
            verified_at: new Date().toISOString(),
          },
        }
      );

      if (adminError) {
        console.error(
          "[register] Warning: Failed to assign server-controlled app_metadata:",
          adminError.message
        );
      }
    }

    // If an active session was returned (e.g. email confirmation disabled), refresh to update JWT claims
    if (signUpData.session) {
      await supabase.auth.refreshSession();
    }
  }

  return {
    success:
      "Account created! Please check your email to verify your address before logging in.",
  };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  try {
    revalidatePath("/", "layout");
  } catch {
    // Non-fatal if edge worker doesn't support cache revalidation
  }
  redirect("/");
}

export async function resetPassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get("email") as string };

  const result = resetPasswordSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: `${baseUrl}/auth/update-password`,
  });

  if (error) {
    return { error: "Could not send reset email. Please try again." };
  }

  return {
    success: "If an account exists for that email, a reset link has been sent.",
  };
}

export async function updatePassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = { password: formData.get("password") as string };

  const result = updatePasswordSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.errors[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });

  if (error) {
    return { error: "Could not update password. The reset link may have expired." };
  }

  try {
    revalidatePath("/", "layout");
  } catch {
    // Non-fatal
  }
  redirect("/app");
}
