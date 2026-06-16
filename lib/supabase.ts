import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabaseAdminConfigured = !!(
  supabaseUrl && (supabaseSecretKey || supabaseAnonKey)
);

export function createBrowser() {
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase browser client not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function createServer() {
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase server client not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

export function createAdmin() {
  if (!supabaseAdminConfigured) {
    throw new Error(
      "Supabase admin client not configured. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  const key = supabaseSecretKey || supabaseAnonKey;
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
    },
  });
}
