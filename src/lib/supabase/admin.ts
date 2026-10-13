import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only administrative Supabase client.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to perform privileged operations like
 * updating `user.app_metadata.age_eligible` after server-side date-of-birth verification.
 *
 * CRITICAL SECURITY RULES:
 * - NEVER import or execute this file in client components or browser bundles.
 * - NEVER expose SUPABASE_SERVICE_ROLE_KEY to public environment variables or client responses.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
