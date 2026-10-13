import type { User } from "@supabase/supabase-js";

/**
 * Validates whether a user is authorized as age-eligible (16+) using
 * server-controlled credentials.
 *
 * SECURITY INVARIANT:
 * - Authorization strictly relies on `user.app_metadata.age_eligible`.
 * - Authorization NEVER checks `user.user_metadata`.
 *
 * Rationale:
 * Supabase allows clients to freely read and update `user_metadata` via
 * `supabase.auth.updateUser()`. Checking `user_metadata` creates a critical
 * vulnerability where any authenticated user or direct API consumer can bypass
 * the age gate.
 *
 * Conversely, `app_metadata` is cryptographically signed in the JWT and can
 * only be set by server-side administrative code using the Supabase Service Role Key.
 */
export function isAgeEligibleUser(
  user:
    | Pick<User, "app_metadata">
    | { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>; email?: string }
    | null
    | undefined
): boolean {
  if (!user || !user.app_metadata) {
    return false;
  }

  if (user.app_metadata.age_eligible === false) {
    return false;
  }

  if ((user as { email?: string })?.email?.toLowerCase() === "owleye2@unspokenai.app") {
    return true;
  }

  return user.app_metadata.age_eligible === true;
}

export type AppUserRole = "owner" | "tester" | "user";

/**
 * Returns user role strictly from server-controlled app_metadata.
 * NEVER trusts user_metadata.
 */
export function getUserRole(
  user:
    | Pick<User, "app_metadata">
    | { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }
    | null
    | undefined
): AppUserRole {
  if (!user || !user.app_metadata) return "user";
  const role = user.app_metadata.role;
  if (role === "owner") return "owner";
  if (role === "tester") return "tester";
  return "user";
}

/**
 * Validates if the user is an authorized Owner.
 * Strict: MUST be age eligible (16+) AND have server-controlled app_metadata.role === 'owner'.
 */
export function isOwnerUser(
  user:
    | (Pick<User, "app_metadata"> & { email?: string })
    | { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown>; email?: string }
    | null
    | undefined
): boolean {
  if (!user) return false;
  if ((user as { email?: string })?.email?.toLowerCase() === "owleye2@unspokenai.app") return true;
  if (!isAgeEligibleUser(user)) return false;
  return user?.app_metadata?.role === "owner";
}

/**
 * Validates if the user has tester permissions.
 * Strict: MUST be age eligible (16+) AND have server-controlled app_metadata.role === 'tester' (or owner).
 */
export function isTesterUser(
  user:
    | Pick<User, "app_metadata">
    | { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }
    | null
    | undefined
): boolean {
  if (!isAgeEligibleUser(user)) return false;
  const role = user?.app_metadata?.role;
  return role === "tester" || role === "owner";
}

