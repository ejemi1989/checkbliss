import "server-only";
import { getSession } from "@/actions/auth";

/**
 * Operator gate — verifies the current session is an operator.
 * Per structure.md, operators are city-scoped. The gate checks role only;
 * city-level row access is enforced in data-layer helpers
 * (getOperatorClaims, getOwnersForCity) and server actions
 * (submitDamageClaim).
 */
export async function checkOperatorGate(): Promise<{ ok: boolean; reason?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "Not signed in." };
  if (session.role !== "operator") {
    return { ok: false, reason: "Operator role required." };
  }
  if (!Array.isArray(session.assignedCities) || session.assignedCities.length === 0) {
    return { ok: false, reason: "Operator has no assigned cities." };
  }
  return { ok: true };
}
