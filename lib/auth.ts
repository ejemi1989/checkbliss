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
 *
 * Per `.context/admin/structure.md`: City Operators are scoped to their
 * assigned cities. The `assignedCities` field on AuthUser is used by
 * data-layer helpers to enforce row-level access (e.g. Lagos operator
 * sees only Lagos data, not Abuja).
 */

export type Role = "admin" | "operator" | "owner";

export interface AuthUser {
  email: string;
  role: Role;
  name: string;
  id: string;
  /** Operator-only: cities this operator is assigned to. */
  assignedCities?: string[];
}

export interface SignupData {
  email: string;
  name: string;
  role: "operator" | "owner";
  phone: string;
  city?: string;
  property?: string;
  country?: string;
}

/* ---------- city scoping helpers (structure.md) ----------
   Operators see only their assigned cities. Admins see all. Owners see
   only their own properties (no city filter needed — data is keyed by
   owner_id). */

/** Returns true if the user is an operator scoped to a given city. */
export function operatorCanAccessCity(user: AuthUser | null, city: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "operator") {
    return Array.isArray(user.assignedCities) && user.assignedCities.includes(city);
  }
  return false;
}

/** Filter a list of items to only those in the operator's assigned cities. */
export function filterByAssignedCities<T extends { city: string }>(
  user: AuthUser | null,
  items: T[],
): T[] {
  if (!user) return [];
  if (user.role === "admin") return items;
  if (user.role === "operator" && Array.isArray(user.assignedCities)) {
    return items.filter((i) => user.assignedCities!.includes(i.city));
  }
  return items;
}

/** Mock-mode operator assignment: derive assigned cities from email. */
export function mockOperatorCities(email: string | undefined): string[] {
  if (!email) return [];
  const e = email.toLowerCase();
  if (e.includes("lagos")) return ["Lagos"];
  if (e.includes("abuja")) return ["Abuja"];
  if (e.includes("port-harcourt") || e.includes("portharcourt")) return ["Port Harcourt"];
  if (e === "operator@checkbliss.com") return ["Lagos", "Abuja"];
  return [];
}
