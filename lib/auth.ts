/**
 * Auth types and helpers for the CheckinBliss dashboard.
 *
 * Authentication is now handled by Supabase Auth. The dev-only session
 * cookie + hardcoded user list have been removed. Roles are read from
 * the `profiles` table (see supabase/migrations/0001_schema.sql), which
 * is keyed to `auth.users.id` via a foreign key.
 *
 * For dashboard pages, use `getSession()` from `actions/auth.ts` — it
 * wraps `supabase.auth.getUser()` and looks up the role.
 */

export type Role = "admin" | "operator" | "owner";

export interface AuthUser {
  email: string;
  role: Role;
  name: string;
  id: string;
}

export interface SignupData {
  email: string;
  name: string;
  role: "operator" | "owner";
  phone: string;
  city?: string;
  property?: string;
}
