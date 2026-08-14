import "server-only";
import { getSession } from "@/actions/auth";

/**
 * Owner gate — verifies the current session is an owner. Owners see only
 * their own properties (data is keyed by `owner_id`); the gate checks role
 * only, row-level scoping is enforced in data-layer helpers.
 */
export async function checkOwnerGate(): Promise<{ ok: boolean; reason?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "Not signed in." };
  if (session.role !== "owner") {
    return { ok: false, reason: "Owner role required." };
  }
  return { ok: true };
}
