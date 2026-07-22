"use server";

import { revalidatePath } from "next/cache";

export async function approvePayout(payoutId: string) {
  // In production: call Stripe to release payout, update DB
  console.log(`[mock] Payout ${payoutId} approved`);
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function rejectPayout(payoutId: string, reason: string) {
  console.log(`[mock] Payout ${payoutId} rejected: ${reason}`);
  revalidatePath("/admin/finance");
  return { ok: true };
}

export async function flagDiscrepancy(recordId: string) {
  console.log(`[mock] Discrepancy flagged for ${recordId}`);
  revalidatePath("/admin/finance");
  return { ok: true };
}
