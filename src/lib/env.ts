import "server-only";

export interface EnvironmentStatus {
  hasGeminiKey: boolean;
  hasSupabaseAdminKey: boolean;
  hasSupabaseUrl: boolean;
  hasSupabaseAnonKey: boolean;
  missingRequired: string[];
  warnings: string[];
}

/**
 * Validates server-side environment variables without leaking secret values.
 * Reports solely variable names and configuration state.
 */
export function validateServerEnvironment(): EnvironmentStatus {
  const missingRequired: string[] = [];
  const warnings: string[] = [];

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const hasSupabaseAdminKey = Boolean(
    process.env.SUPABASE_SECRET_KEY?.trim() ||
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  const hasSupabaseAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

  if (!hasGeminiKey) {
    missingRequired.push("GEMINI_API_KEY");
  }
  if (!hasSupabaseUrl) {
    missingRequired.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!hasSupabaseAnonKey) {
    missingRequired.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!hasSupabaseAdminKey) {
    warnings.push(
      "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY (required for administrative app_metadata assignment)"
    );
  }

  return {
    hasGeminiKey,
    hasSupabaseAdminKey,
    hasSupabaseUrl,
    hasSupabaseAnonKey,
    missingRequired,
    warnings,
  };
}
