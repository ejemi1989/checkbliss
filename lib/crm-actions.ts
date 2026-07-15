"use server";

/**
 * Server actions for the WhatsApp CRM.
 * All actions return void (per Next.js form-action contract) and revalidate the relevant path.
 * For client-side feedback, redirect with query params instead of returning values.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";

/* in-memory mirror of mock crm_notes (parity with crm-admin.ts MOCK_NOTES) */
const MOCK_NOTES: Record<string, { id: number; contact_e164: string; note: string; created_by: string; created_at: string }[]> = {};
const MOCK_STATUSES: Record<string, { status: "open" | "resolved" | "escalated" }> = {};

export async function addCrmNote(formData: FormData) {
  const e164 = String(formData.get("e164") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!e164 || !note) return;

  if (!supabaseAdminConfigured) {
    const list = MOCK_NOTES[e164] ?? [];
    list.unshift({ id: Date.now(), contact_e164: e164, note, created_by: "admin", created_at: new Date().toISOString() });
    MOCK_NOTES[e164] = list;
  } else {
    const db = createAdmin();
    await db.from("crm_notes").insert({ contact_e164: e164, note, created_by: "admin" });
  }

  revalidatePath(`/admin/crm/inbox/${encodeURIComponent(e164)}`);
}

export async function setCrmThreadStatus(formData: FormData) {
  const e164 = String(formData.get("e164") ?? "");
  const status = String(formData.get("status") ?? "open") as "open" | "resolved" | "escalated";
  if (!e164) return;

  if (!supabaseAdminConfigured) {
    MOCK_STATUSES[e164] = { status };
  } else {
    const db = createAdmin();
    await db.from("crm_thread_status").upsert({
      contact_e164: e164,
      status,
      updated_at: new Date().toISOString(),
      updated_by: "admin",
    });
  }

  revalidatePath(`/admin/crm/inbox/${encodeURIComponent(e164)}`);
  revalidatePath("/admin/crm/inbox");
}

export async function decideCrmClaim(formData: FormData) {
  const claimId = String(formData.get("claimId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "approve" | "adjust" | "reject";
  const amountMinorRaw = formData.get("amountMinor");
  const amountMinor = amountMinorRaw ? parseInt(String(amountMinorRaw), 10) : undefined;
  if (!claimId || !decision) return;

  const { decideClaim } = await import("@/actions/claims");
  await decideClaim({ claimId, decision, amountMinor });

  revalidatePath("/admin/crm/claims");
}

export async function sendCrmBroadcast(formData: FormData) {
  const templateName = String(formData.get("templateName") ?? "");
  const segment = String(formData.get("segment") ?? "all_owners");
  const customPhones = String(formData.get("customPhones") ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);

  if (!templateName) {
    redirect("/admin/crm/broadcast?result=" + encodeURIComponent(JSON.stringify({ ok: false, error: "Template required" })));
  }

  let recipients: { e164: string; name: string }[] = [];
  if (supabaseAdminConfigured) {
    const db = createAdmin();
    const role = segment.startsWith("operator") ? "operator" : "owner";
    let q = db.from("profiles").select("id, full_name, whatsapp_e164, role").eq("role", role);
    if (segment === "lagos_owners" || segment === "lagos_operators") {
      const { data: assignments } = await db.from("operator_assignments").select("operator_id").eq("city", "Lagos");
      const ids = (assignments ?? []).map((a) => a.operator_id);
      q = q.in("id", ids);
    }
    const { data } = await q;
    recipients = (data ?? []).map((p) => ({ e164: p.whatsapp_e164 ?? "", name: p.full_name }));
  } else {
    const MOCK_CONTACTS = [
      { role: "owner" as const, name: "Adaora Mensah", phone_e164: "+2348010000001" },
      { role: "operator" as const, name: "Tunde Ogunlade", phone_e164: "+2348020000001" },
      { role: "owner" as const, name: "Funke Adebayo", phone_e164: "+2348030000001" },
      { role: "operator" as const, name: "Sheena Okafor", phone_e164: "+2348040000001" },
    ];
    recipients = MOCK_CONTACTS
      .filter((c) => (segment.startsWith("operator") ? c.role === "operator" : c.role === "owner"))
      .map((c) => ({ e164: c.phone_e164, name: c.name }));
  }

  if (customPhones.length > 0) {
    recipients = customPhones.map((e) => ({ e164: e, name: e }));
  }

  const results = await Promise.all(
    recipients.map((r) =>
      r.e164
        ? sendWhatsAppTemplate(r.e164, templateName, []).then(() => ({ ok: true })).catch(() => ({ ok: false }))
        : Promise.resolve({ ok: false }),
    ),
  );
  const sent = results.filter((r) => r.ok).length;

  redirect(
    "/admin/crm/broadcast?result=" +
      encodeURIComponent(JSON.stringify({ ok: true, recipient_count: recipients.length, sent })),
  );
}
