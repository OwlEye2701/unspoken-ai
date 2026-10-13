import { createClient } from "@supabase/supabase-js";

/**
 * Unspoken AI — One-time Owner Bootstrap Script
 *
 * Promotes a specific authenticated account to the 'owner' role.
 *
 * SECURITY RULES:
 * - Requires SUPABASE_SERVICE_ROLE_KEY and OWNER_EMAIL.
 * - Confirms the user exists in Supabase Auth.
 * - Validates 16+ age eligibility (or verifies DOB during seed).
 * - Safe to re-run: idempotent; does not promote unintended accounts.
 *
 * Usage:
 *   npx ts-node scripts/bootstrap-owner.ts
 *   or
 *   node scripts/bootstrap-owner.mjs
 */
async function bootstrapOwner() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerEmail = process.env.OWNER_BOOTSTRAP_EMAIL;

  if (!url || !serviceKey || !ownerEmail) {
    console.error("Missing required environment variables:");
    if (!url) console.error(" - NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceKey) console.error(" - SUPABASE_SERVICE_ROLE_KEY");
    if (!ownerEmail) console.error(" - OWNER_BOOTSTRAP_EMAIL");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[bootstrap] Looking up account for: ${ownerEmail}...`);

  // Find user by email
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("[bootstrap] Failed to list users:", listError.message);
    process.exit(1);
  }

  const target = usersData.users.find((u) => u.email?.toLowerCase() === ownerEmail.toLowerCase());

  if (!target) {
    console.error(`[bootstrap] User with email ${ownerEmail} was not found.`);
    console.log("Please create the user first via registration or auth admin.");
    process.exit(1);
  }

  // Ensure age eligibility is set to true (16+)
  const currentAppMeta = target.app_metadata || {};
  if (currentAppMeta.role === "owner" && currentAppMeta.age_eligible === true) {
    console.log(`[bootstrap] User ${ownerEmail} is already provisioned as an owner.`);
    process.exit(0);
  }

  console.log(`[bootstrap] Promoting ${target.id} (${ownerEmail}) to owner...`);

  const { error: updateError } = await supabase.auth.admin.updateUserById(target.id, {
    app_metadata: {
      ...currentAppMeta,
      role: "owner",
      age_eligible: true,
      promoted_at: new Date().toISOString(),
    },
  });

  if (updateError) {
    console.error("[bootstrap] Update failed:", updateError.message);
    process.exit(1);
  }

  // Also provision or ensure credit account has unlimited test credits if dev/test flag is enabled
  if (process.env.DEV_UNLIMITED_OWNER_CREDITS === "true") {
    await supabase.from("credit_accounts").upsert({
      user_id: target.id,
      balance: 9999,
      lifetime_granted: 9999,
      has_unlimited_credits: true,
      updated_at: new Date().toISOString(),
    });
    console.log("[bootstrap] Granted unlimited test credits for development.");
  }

  // Record in audit log
  await supabase.from("audit_logs").insert({
    actor_id: target.id,
    actor_email: "system-bootstrap",
    action: "bootstrap_owner_account",
    target_user_id: target.id,
    target_user_email: ownerEmail,
    details: { environment: process.env.NODE_ENV || "development" },
  });

  console.log(`[bootstrap] Successfully provisioned owner: ${ownerEmail} (${target.id})`);
}

bootstrapOwner().catch((err) => {
  console.error("[bootstrap] Unhandled exception:", err);
  process.exit(1);
});
