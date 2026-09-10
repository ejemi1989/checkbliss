"use server";

import { revalidatePath } from "next/cache";

import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Admin user-management mutations. Reads go through getAdminUsersFromDB()
 * (service-role); the is_suspended toggle here is the write side. Falls back
 * to a no-op mock path when Supabase is unconfigured so mock mode stays
 * interactive.
 */
export async function setUserSuspended(
  userId: string,
  suspended: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (supabaseAdminConfigured) {
      const db = createAdmin();
      const { error } = await db
        .from("profiles")
        .update({ is_suspended: suspended })
        .eq("id", userId);
      if (error) return { ok: false, error: error.message };
      await db.from("audit_log").insert({
        action: suspended ? "user.suspended" : "user.restored",
        target_id: userId,
        detail: `Admin ${suspended ? "suspended" : "restored"} user ${userId}`,
      });
    } else {
      console.log(`[mock] Admin ${suspended ? "suspended" : "restored"} user ${userId}`);
    }
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}