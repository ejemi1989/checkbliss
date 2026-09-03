"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSession } from "@/actions/auth";
import { createFincraBeneficiary } from "@/lib/fincra";
import { log } from "@/lib/observability";

const BankDetailsSchema = z.object({
  nigerianBankName: z.string().trim().min(2, "Bank name is required").max(120),
  bankCode: z.string().trim().regex(/^[0-9]{3}$/, "Bank code must be 3 digits (e.g. 058 for GTBank)"),
  nigerianBankAccountNumber: z.string().trim().regex(/^[0-9]{10}$/, "Account number must be exactly 10 digits"),
  nigerianBankAccountName: z.string().trim().min(2, "Account name is required").max(120),
  taxIdentificationNumber: z.string().trim().regex(/^[0-9]{8,14}$/, "TIN must be 8–14 digits").optional().or(z.literal("")),
});

export type SavePayoutDetailsResult =
  | { ok: true; beneficiaryId: string }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION" | "REGISTRATION_FAILED" | "PERSIST_FAILED"; message: string; fieldErrors?: Record<string, string> };

export async function saveOwnerPayoutDetails(input: z.infer<typeof BankDetailsSchema>): Promise<SavePayoutDetailsResult> {
  const session = await getSession();
  if (!session) return { ok: false, code: "UNAUTHENTICATED", message: "You must be signed in." };
  if (session.role !== "owner") return { ok: false, code: "FORBIDDEN", message: "Only owners can save payout details." };

  const parsed = BankDetailsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return { ok: false, code: "VALIDATION", message: "Please correct the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  if (!supabaseAdminConfigured) {
    log("payouts:mock", "info", `Mock save — owner ${session.id} → ${data.nigerianBankName} ${data.nigerianBankAccountNumber.slice(-4)} (${data.bankCode})`);
    revalidatePath("/dashboard/owner/payout-details");
    revalidatePath("/dashboard/owner");
    return { ok: true, beneficiaryId: `mock_benef_${session.id}` };
  }

  let beneficiaryId: string;
  try {
    const beneficiary = await createFincraBeneficiary({
      firstName: data.nigerianBankAccountName.split(" ")[0] || data.nigerianBankAccountName,
      lastName: data.nigerianBankAccountName.split(" ").slice(1).join(" ") || undefined,
      accountHolderName: data.nigerianBankAccountName,
      bankName: data.nigerianBankName,
      bankCode: data.bankCode,
      accountNumber: data.nigerianBankAccountNumber,
      type: "individual",
      country: "NG",
    });
    beneficiaryId = `${beneficiary.accountHolderName}:${beneficiary.accountNumber}`;
  } catch (err) {
    log("payouts", "error", `Fincra beneficiary registration failed for owner ${session.id}: ${String(err)}`);
    return { ok: false, code: "REGISTRATION_FAILED", message: err instanceof Error ? err.message : String(err) };
  }

  try {
    const db = createAdmin();
    const now = new Date().toISOString();
    const { error } = await db
      .from("owner_payout_details")
      .upsert(
        {
          owner_id: session.id,
          nigerian_bank_name: data.nigerianBankName,
          bank_code: data.bankCode,
          nigerian_bank_account_number: data.nigerianBankAccountNumber,
          nigerian_bank_account_name: data.nigerianBankAccountName,
          tax_identification_number: data.taxIdentificationNumber || null,
          fincra_beneficiary_id: beneficiaryId,
          updated_at: now,
        },
        { onConflict: "owner_id" },
      );

    if (error) {
      log("payouts", "error", `Supabase upsert failed for owner ${session.id}: ${error.message}`);
      return { ok: false, code: "PERSIST_FAILED", message: error.message };
    }
  } catch (err) {
    return { ok: false, code: "PERSIST_FAILED", message: err instanceof Error ? err.message : String(err) };
  }

  revalidatePath("/dashboard/owner/payout-details");
  revalidatePath("/dashboard/owner");
  log("payouts", "info", `Saved payout details for owner ${session.id} → ${beneficiaryId}`);
  return { ok: true, beneficiaryId };
}

export async function getOwnerPayoutDetails(): Promise<{
  nigerianBankName: string | null;
  bankCode: string | null;
  nigerianBankAccountNumber: string | null;
  nigerianBankAccountName: string | null;
  taxIdentificationNumber: string | null;
  fincraBeneficiaryId: string | null;
} | null> {
  const session = await getSession();
  if (!session || session.role !== "owner") return null;

  if (!supabaseAdminConfigured) {
    return {
      nigerianBankName: null,
      bankCode: null,
      nigerianBankAccountNumber: null,
      nigerianBankAccountName: null,
      taxIdentificationNumber: null,
      fincraBeneficiaryId: null,
    };
  }

  const db = createAdmin();
  const { data } = await db
    .from("owner_payout_details")
    .select("fincra_beneficiary_id, nigerian_bank_account_name, nigerian_bank_account_number, nigerian_bank_name, bank_code, tax_identification_number")
    .eq("owner_id", session.id)
    .maybeSingle();

  if (!data) return null;
  return {
    nigerianBankName: (data.nigerian_bank_name as string) ?? null,
    bankCode: (data.bank_code as string) ?? null,
    nigerianBankAccountNumber: (data.nigerian_bank_account_number as string) ?? null,
    nigerianBankAccountName: (data.nigerian_bank_account_name as string) ?? null,
    taxIdentificationNumber: (data.tax_identification_number as string) ?? null,
    fincraBeneficiaryId: (data.fincra_beneficiary_id as string) ?? null,
  };
}
