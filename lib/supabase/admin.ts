import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

/**
 * True when Supabase is fully seeded — callers use this flag to decide
 * whether to fall back to mock data when queries return empty.
 */
export const supabaseAdminConfigured = !!(
  supabaseUrl && supabaseSecretKey && process.env.SUPABASE_DATA_LOADED === "true"
);

const supabaseReady = !!(supabaseUrl && supabaseSecretKey);

/**
 * Admin client — service-role key, server-only, bypasses RLS by design.
 * Every write in the system (booking creation, deposit-hold records,
 * claim decisions, webhook-driven mutations) flows through this client
 * inside a Route Handler. No anonymous or authenticated client ever
 * writes to a privileged table directly.
 */
export function createAdmin() {
  if (!supabaseReady) {
    throw new Error(
      "Supabase admin client not configured. Set SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  return createSupabaseClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
