/**
 * Public surface for Supabase clients (client-safe only).
 *
 * Only re-exports from client.ts here. Server-side modules (admin.ts, server.ts)
 * import "server-only" and must be imported directly by server code:
 *   - createAdmin, supabaseAdminConfigured   → from "@/lib/supabase/admin"
 *   - createServer, supabaseServerConfigured → from "@/lib/supabase/server"
 *   - createBrowser, supabaseBrowserConfigured → from "@/lib/supabase/client"
 *
 * supabaseConfigured mirrors the browser check (same env vars as the server check),
 * so it's safe to use in both client and server code as a "is Supabase wired up?" flag.
 */

import { supabaseBrowserConfigured } from "./client";

/** Runtime flag: true when Supabase browser env vars are set. */
export const supabaseConfigured = supabaseBrowserConfigured;

/** Browser client (anon key, RLS-governed). For Client Components only. */
export { createClient as createBrowser } from "./client";
