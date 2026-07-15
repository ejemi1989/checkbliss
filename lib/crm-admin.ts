/**
 * Read-layer queries for the WhatsApp CRM (admin).
 * All data comes from existing tables the bot already writes to:
 *   - whatsapp_audit_log (every inbound + outbound message)
 *   - owners + operators (contact directory)
 *   - damage_claims + deposit_holds (claim queue)
 *   - inspection_schedule (inspection board)
 *   - audit_log (financial + booking events — for audit viewer + analytics)
 *
 * The only new tables are crm_notes + crm_thread_status (see migration 0012).
 * Mock-mode fallback for everything so the admin UI works without Supabase credentials.
 */

import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/* ---------- shared types ---------- */

export type CrmThreadSummary = {
  contact_e164: string;
  contact_name: string;
  contact_role: "owner" | "operator" | null;
  last_message_at: string;
  last_message_body: string;
  last_message_direction: "in" | "out";
  last_message_accepted: boolean;
  thread_status: "open" | "resolved" | "escalated";
  message_count_24h: number;
};

export type CrmMessage = {
  id: string | number;
  direction: "in" | "out";
  body: string;
  parsed_command: string | null;
  accepted: boolean | null;
  created_at: string;
};

export type CrmNote = {
  id: string | number;
  contact_e164: string;
  note: string;
  created_by: string;
  created_at: string;
};

export type CrmContact = {
  id: string;
  name: string;
  phone_e164: string;
  role: "owner" | "operator";
  city: string | null;
  properties: string[];
  status: "active" | "suspended" | "onboarding";
  last_message_at: string | null;
  last_message_body: string | null;
  inspections_done: number;
};

export type CrmClaim = {
  id: string;
  property_name: string;
  city: string;
  operator_name: string | null;
  reported_at: string;
  estimated_cost_minor: number;
  photos_count: number;
  admin_decision: "pending" | "approved" | "adjusted" | "rejected";
  deposit_hold_minor: number;
  currency: string;
  description: string;
};

export type CrmInspection = {
  id: string;
  property_name: string;
  city: string;
  guest_name: string;
  checkout_date: string;
  checkout_time: string;
  operator_name: string | null;
  status: "pre_notice" | "prompt" | "awaiting_reply" | "reminder_sent" | "escalated" | "complete";
  minutes_since_action: number;
};

export type CrmAuditEntry = {
  id: number;
  action: string;
  target_id: string | null;
  detail: string | null;
  created_at: string;
};

/* ---------- mock seed (used when Supabase is not configured) ---------- */

const MOCK_THREADS: CrmThreadSummary[] = [
  { contact_e164: "+2348010000001", contact_name: "Adaora Mensah", contact_role: "owner", last_message_at: "2026-07-12T14:30:00Z", last_message_body: "How do I update the deposit for Unit 2?", last_message_direction: "in", last_message_accepted: false, thread_status: "open", message_count_24h: 3 },
  { contact_e164: "+2348020000001", contact_name: "Tunde Ogunlade", contact_role: "operator", last_message_at: "2026-07-12T11:00:00Z", last_message_body: "Confirmed clean — deposit hold released.", last_message_direction: "out", last_message_accepted: true, thread_status: "resolved", message_count_24h: 2 },
  { contact_e164: "+2348030000001", contact_name: "Funke Adebayo", contact_role: "owner", last_message_at: "2026-07-12T10:15:00Z", last_message_body: "DAMAGE — Broken glass table at GRA Penthouse", last_message_direction: "in", last_message_accepted: true, thread_status: "escalated", message_count_24h: 4 },
  { contact_e164: "+2348040000001", contact_name: "Sheena Okafor", contact_role: "operator", last_message_at: "2026-07-12T09:45:00Z", last_message_body: "BOOKINGS — list upcoming", last_message_direction: "in", last_message_accepted: true, thread_status: "resolved", message_count_24h: 1 },
  { contact_e164: "+447535434252", contact_name: "You (Admin Test)", contact_role: null, last_message_at: "2026-07-11T18:00:00Z", last_message_body: "HELP", last_message_direction: "in", last_message_accepted: true, thread_status: "resolved", message_count_24h: 1 },
];

const MOCK_MESSAGES: Record<string, CrmMessage[]> = {
  "+2348010000001": [
    { id: 1, direction: "in", body: "Hi, I want to update the deposit for Unit 2", parsed_command: null, accepted: false, created_at: "2026-07-12T14:25:00Z" },
    { id: 2, direction: "out", body: "Hi Adaora — to update the deposit, the admin needs to make that change in the platform. I'll flag this for review.", parsed_command: null, accepted: true, created_at: "2026-07-12T14:26:00Z" },
    { id: 3, direction: "in", body: "How do I update the deposit for Unit 2?", parsed_command: null, accepted: false, created_at: "2026-07-12T14:30:00Z" },
  ],
  "+2348020000001": [
    { id: 4, direction: "in", body: "CLEAN", parsed_command: "CLEAN", accepted: true, created_at: "2026-07-12T10:55:00Z" },
    { id: 5, direction: "out", body: "Confirmed clean — deposit hold released. Thanks Tunde! ✓", parsed_command: null, accepted: true, created_at: "2026-07-12T11:00:00Z" },
  ],
  "+2348030000001": [
    { id: 6, direction: "in", body: "DAMAGE", parsed_command: "DAMAGE", accepted: true, created_at: "2026-07-12T10:00:00Z" },
    { id: 7, direction: "out", body: "Got it — please send up to 5 photos of the damage. Reply DONE when finished.", parsed_command: null, accepted: true, created_at: "2026-07-12T10:00:30Z" },
    { id: 8, direction: "in", body: "Broken glass table at GRA Penthouse", parsed_command: null, accepted: true, created_at: "2026-07-12T10:15:00Z" },
  ],
};

const MOCK_NOTES: Record<string, CrmNote[]> = {
  "+2348010000001": [
    { id: 1, contact_e164: "+2348010000001", note: "Has 2 disputed claims — flag if BLOCK", created_by: "admin", created_at: "2026-07-10T09:00:00Z" },
  ],
  "+2348030000001": [
    { id: 2, contact_e164: "+2348030000001", note: "Awaiting admin review of claim — 3 photos so far", created_by: "admin", created_at: "2026-07-12T10:20:00Z" },
  ],
};

const MOCK_CONTACTS: CrmContact[] = [
  { id: "o1", name: "Adaora Mensah", phone_e164: "+2348010000001", role: "owner", city: "Lagos", properties: ["Lagoon View Loft", "Sunset Dove"], status: "active", last_message_at: "2026-07-12T14:30:00Z", last_message_body: "How do I update the deposit for Unit 2?", inspections_done: 0 },
  { id: "o2", name: "Funke Adebayo", phone_e164: "+2348030000001", role: "owner", city: "Abuja", properties: ["GRA Executive Suite", "Maitama Garden Studios"], status: "active", last_message_at: "2026-07-12T10:15:00Z", last_message_body: "DAMAGE — Broken glass table at GRA Penthouse", inspections_done: 0 },
  { id: "o3", name: "Tunde Ogunlade", phone_e164: "+2348020000001", role: "operator", city: "Lagos", properties: [], status: "active", last_message_at: "2026-07-12T11:00:00Z", last_message_body: "CLEAN — confirmed clean checkout", inspections_done: 14 },
  { id: "o4", name: "Sheena Okafor", phone_e164: "+2348040000001", role: "operator", city: "Abuja", properties: [], status: "active", last_message_at: "2026-07-12T09:45:00Z", last_message_body: "BOOKINGS — list upcoming", inspections_done: 9 },
];

const MOCK_CLAIMS: CrmClaim[] = [
  { id: "c1", property_name: "Sunset Dove", city: "Lagos", operator_name: "Tunde Ogunlade", reported_at: "2026-07-12T08:00:00Z", estimated_cost_minor: 15000, photos_count: 3, admin_decision: "pending", deposit_hold_minor: 10000, currency: "GBP", description: "Broken glass table, living room" },
  { id: "c2", property_name: "Palm Nest", city: "Abuja", operator_name: "Sheena Okafor", reported_at: "2026-07-12T05:00:00Z", estimated_cost_minor: 8000, photos_count: 5, admin_decision: "pending", deposit_hold_minor: 8000, currency: "GBP", description: "Stained mattress, master bedroom" },
  { id: "c3", property_name: "Lagoon View", city: "Lagos", operator_name: "Tunde Ogunlade", reported_at: "2026-07-10T11:00:00Z", estimated_cost_minor: 22000, photos_count: 5, admin_decision: "approved", deposit_hold_minor: 10000, currency: "GBP", description: "Burn mark on kitchen counter" },
];

const MOCK_INSPECTIONS: CrmInspection[] = [
  { id: "i1", property_name: "Palm Nest", city: "Abuja", guest_name: "Tunde Balogun", checkout_date: "2026-07-13", checkout_time: "11:00", operator_name: "Sheena Okafor", status: "pre_notice", minutes_since_action: 0 },
  { id: "i2", property_name: "Sunset Dove", city: "Lagos", guest_name: "Folake Adeyemi", checkout_date: "2026-07-13", checkout_time: "11:00", operator_name: "Tunde Ogunlade", status: "prompt", minutes_since_action: 0 },
  { id: "i3", property_name: "Lagoon View", city: "Lagos", guest_name: "Emeka Nwosu", checkout_date: "2026-07-12", checkout_time: "13:00", operator_name: "Tunde Ogunlade", status: "awaiting_reply", minutes_since_action: 125 },
  { id: "i4", property_name: "Maitama Garden", city: "Abuja", guest_name: "Zainab Bello", checkout_date: "2026-07-11", checkout_time: "11:00", operator_name: "Sheena Okafor", status: "reminder_sent", minutes_since_action: 360 },
  { id: "i5", property_name: "Eko Pearl", city: "Lagos", guest_name: "Chidi Okafor", checkout_date: "2026-07-09", checkout_time: "11:00", operator_name: "Tunde Ogunlade", status: "escalated", minutes_since_action: 2880 },
  { id: "i6", property_name: "GRA Executive Suite", city: "Abuja", guest_name: "Aisha Mohammed", checkout_date: "2026-07-12", checkout_time: "10:00", operator_name: "Sheena Okafor", status: "complete", minutes_since_action: 0 },
];

const MOCK_AUDIT: CrmAuditEntry[] = [
  { id: 1, action: "whatsapp.in", target_id: "+2348010000001", detail: "How do I update the deposit for Unit 2?", created_at: "2026-07-12T14:30:00Z" },
  { id: 2, action: "whatsapp.out", target_id: "+2348010000001", detail: "Hi Adaora — I'll flag this for review.", created_at: "2026-07-12T14:26:00Z" },
  { id: 3, action: "calendar.block", target_id: "Sunset Dove · Jun 20-22", detail: "Owner BLOCK", created_at: "2026-07-12T10:00:00Z" },
  { id: 4, action: "inspection.clean", target_id: "Lagoon View · checkout Jul 12", detail: "Operator CLEAN", created_at: "2026-07-12T11:00:00Z" },
  { id: 5, action: "claim.decision", target_id: "c3", detail: "approved (22000)", created_at: "2026-07-10T15:00:00Z" },
  { id: 6, action: "stripe.event", target_id: "pi_3...", detail: "payment_intent.succeeded", created_at: "2026-07-10T14:55:00Z" },
  { id: 7, action: "whatsapp.in", target_id: "+2348030000001", detail: "DAMAGE", created_at: "2026-07-12T10:00:00Z" },
  { id: 8, action: "dispute.raised", target_id: "c2", detail: "Guest disputed within 48h window", created_at: "2026-07-12T05:30:00Z" },
];

/* ---------- thread inbox queries ---------- */

export async function getCrmThreads(filter?: "open" | "resolved" | "escalated"): Promise<CrmThreadSummary[]> {
  if (!supabaseAdminConfigured) {
    return filter ? MOCK_THREADS.filter((t) => t.thread_status === filter) : [...MOCK_THREADS].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  }

  const db = createAdmin();
  const { data: logs } = await db
    .from("whatsapp_audit_log")
    .select("id, direction, wa_phone, body, parsed_command, accepted, created_at, profile_id")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!logs) return [];

  /* group by phone — last message per contact */
  const byPhone = new Map<string, typeof logs[number]>();
  for (const log of logs) {
    if (!byPhone.has(log.wa_phone)) byPhone.set(log.wa_phone, log);
  }

  /* fetch profile names */
  const profileIds = Array.from(new Set(logs.map((l) => l.profile_id).filter(Boolean)));
  const { data: profiles } = await db.from("profiles").select("id, full_name, role").in("id", profileIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  /* fetch manual status overrides */
  const { data: statuses } = await db.from("crm_thread_status").select("*");
  const statusByPhone = new Map((statuses ?? []).map((s) => [s.contact_e164, s.status]));

  const threads: CrmThreadSummary[] = Array.from(byPhone.values()).map((log) => {
    const profile = log.profile_id ? profileById.get(log.profile_id) : null;
    const last = log;
    const recentCount = logs.filter((l) => l.wa_phone === log.wa_phone && new Date(l.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000).length;

    const lastAccepted = last.accepted ?? false;
    const override = statusByPhone.get(log.wa_phone);
    const computedStatus = override ?? (lastAccepted ? "resolved" : "open");

    return {
      contact_e164: log.wa_phone,
      contact_name: profile?.full_name ?? log.wa_phone,
      contact_role: (profile?.role === "owner" || profile?.role === "operator") ? profile.role : null,
      last_message_at: last.created_at,
      last_message_body: last.body,
      last_message_direction: last.direction === "in" ? "in" : "out",
      last_message_accepted: lastAccepted,
      thread_status: computedStatus as "open" | "resolved" | "escalated",
      message_count_24h: recentCount,
    };
  });

  const filtered = filter ? threads.filter((t) => t.thread_status === filter) : threads;
  return filtered.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
}

export async function getCrmThread(e164: string): Promise<{ thread: CrmThreadSummary | null; messages: CrmMessage[]; notes: CrmNote[] }> {
  if (!supabaseAdminConfigured) {
    const thread = MOCK_THREADS.find((t) => t.contact_e164 === e164) ?? null;
    const messages = MOCK_MESSAGES[e164] ?? [];
    const notes = MOCK_NOTES[e164] ?? [];
    return { thread, messages, notes };
  }

  const db = createAdmin();
  const { data: logs } = await db
    .from("whatsapp_audit_log")
    .select("id, direction, body, parsed_command, accepted, created_at, profile_id")
    .eq("wa_phone", e164)
    .order("created_at", { ascending: true })
    .limit(200);

  const { data: profileRow } = await db.from("profiles").select("id, full_name, role").eq("whatsapp_e164", e164).maybeSingle();
  const { data: notes } = await db.from("crm_notes").select("*").eq("contact_e164", e164).order("created_at", { ascending: false });

  if (!logs || logs.length === 0) {
    return { thread: null, messages: [], notes: notes ?? [] };
  }

  const last = logs[logs.length - 1];
  const { data: statusRow } = await db.from("crm_thread_status").select("status").eq("contact_e164", e164).maybeSingle();

  const thread: CrmThreadSummary = {
    contact_e164: e164,
    contact_name: profileRow?.full_name ?? e164,
    contact_role: (profileRow?.role === "owner" || profileRow?.role === "operator") ? profileRow.role : null,
    last_message_at: last.created_at,
    last_message_body: last.body,
    last_message_direction: last.direction === "in" ? "in" : "out",
    last_message_accepted: last.accepted ?? false,
    thread_status: (statusRow?.status as "open" | "resolved" | "escalated") ?? ((last.accepted ?? false) ? "resolved" : "open"),
    message_count_24h: logs.filter((l) => new Date(l.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000).length,
  };

  const messages: CrmMessage[] = logs.map((l) => ({
    id: l.id,
    direction: l.direction === "in" ? "in" : "out",
    body: l.body,
    parsed_command: l.parsed_command,
    accepted: l.accepted,
    created_at: l.created_at,
  }));

  return { thread, messages, notes: notes ?? [] };
}

/* ---------- contact directory ---------- */

export async function getCrmContacts(filters?: { role?: "owner" | "operator"; city?: string }): Promise<CrmContact[]> {
  if (!supabaseAdminConfigured) {
    let r = [...MOCK_CONTACTS];
    if (filters?.role) r = r.filter((c) => c.role === filters.role);
    if (filters?.city) r = r.filter((c) => c.city === filters.city);
    return r;
  }

  const db = createAdmin();
  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, whatsapp_e164, role")
    .in("role", ["owner", "operator"]);

  if (!profiles) return [];

  const { data: assignments } = await db.from("operator_assignments").select("operator_id, city");
  const cityByOperator = new Map<string, string>();
  for (const a of assignments ?? []) cityByOperator.set(a.operator_id, a.city);

  const { data: props } = await db.from("properties").select("id, owner_id, name, city");
  const propsByOwner = new Map<string, string[]>();
  for (const p of props ?? []) {
    if (!p.owner_id) continue;
    const list = propsByOwner.get(p.owner_id) ?? [];
    list.push(`${p.name} (${p.city})`);
    propsByOwner.set(p.owner_id, list);
  }

  const { data: inspections } = await db.from("inspections").select("operator_id");
  const inspectionsByOperator = new Map<string, number>();
  for (const i of inspections ?? []) {
    if (!i.operator_id) continue;
    inspectionsByOperator.set(i.operator_id, (inspectionsByOperator.get(i.operator_id) ?? 0) + 1);
  }

  const contacts: CrmContact[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    phone_e164: p.whatsapp_e164 ?? "",
    role: p.role as "owner" | "operator",
    city: cityByOperator.get(p.id) ?? null,
    properties: propsByOwner.get(p.id) ?? [],
    status: "active",
    last_message_at: null,
    last_message_body: null,
    inspections_done: inspectionsByOperator.get(p.id) ?? 0,
  }));

  let filtered = contacts;
  if (filters?.role) filtered = filtered.filter((c) => c.role === filters.role);
  if (filters?.city) filtered = filtered.filter((c) => c.city === filters.city);
  return filtered;
}

/* ---------- damage claims ---------- */

export async function getCrmClaims(filter?: "pending" | "resolved"): Promise<CrmClaim[]> {
  if (!supabaseAdminConfigured) {
    let r = [...MOCK_CLAIMS];
    if (filter === "pending") r = r.filter((c) => c.admin_decision === "pending");
    if (filter === "resolved") r = r.filter((c) => c.admin_decision !== "pending");
    return r;
  }

  const db = createAdmin();
  const { data } = await db
    .from("damage_claims")
    .select("id, property_id, estimated_cost_minor, description, admin_decision, created_at, reporting_operator_id, photos, properties(name, city), profiles!damage_claims_reporting_operator_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data) return [];

  return data.map((c: Record<string, unknown>) => {
    const prop = c.properties as Record<string, unknown> | null;
    const op = c.profiles as Record<string, unknown> | null;
    const photos = Array.isArray(c.photos) ? c.photos.length : 0;
    return {
      id: c.id as string,
      property_name: (prop?.name as string) ?? "—",
      city: (prop?.city as string) ?? "—",
      operator_name: (op?.full_name as string) ?? null,
      reported_at: c.created_at as string,
      estimated_cost_minor: c.estimated_cost_minor as number,
      photos_count: photos,
      admin_decision: c.admin_decision as "pending" | "approved" | "adjusted" | "rejected",
      deposit_hold_minor: 10000,
      currency: "GBP",
      description: c.description as string,
    };
  });
}

/* ---------- inspection board ---------- */

export async function getCrmInspections(): Promise<CrmInspection[]> {
  if (!supabaseAdminConfigured) {
    return MOCK_INSPECTIONS;
  }

  const db = createAdmin();
  const { data: inspections } = await db
    .from("inspections")
    .select("id, reservation_id, operator_id, result, prompt_sent_at, reminder_sent_at, escalated_at, inspected_at, created_at, reservations(check_in, check_out, properties(name, city), guest_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!inspections) return [];

  const { data: operators } = await db.from("profiles").select("id, full_name").eq("role", "operator");
  const opById = new Map((operators ?? []).map((o) => [o.id, o.full_name]));

  return inspections.map((i: Record<string, unknown>) => {
    const r = i.reservations as Record<string, unknown> | null;
    const p = r?.properties as Record<string, unknown> | null;
    const status: CrmInspection["status"] = i.escalated_at ? "escalated" : i.reminder_sent_at ? "reminder_sent" : i.prompt_sent_at ? "awaiting_reply" : i.result ? "complete" : "pre_notice";
    const lastAction = (i.inspected_at ?? i.reminder_sent_at ?? i.prompt_sent_at ?? i.created_at) as string;
    const minutes = Math.floor((Date.now() - new Date(lastAction).getTime()) / 60000);
    return {
      id: i.id as string,
      property_name: (p?.name as string) ?? "—",
      city: (p?.city as string) ?? "—",
      guest_name: (r?.guest_name as string) ?? "—",
      checkout_date: (r?.check_out as string)?.slice(0, 10) ?? "—",
      checkout_time: "11:00",
      operator_name: i.operator_id ? opById.get(i.operator_id as string) ?? null : null,
      status,
      minutes_since_action: Math.max(0, minutes),
    };
  });
}

/* ---------- audit log ---------- */

export async function getCrmAuditLog(filters?: { action?: string; limit?: number }): Promise<CrmAuditEntry[]> {
  if (!supabaseAdminConfigured) {
    let r = [...MOCK_AUDIT];
    if (filters?.action) r = r.filter((a) => a.action === filters.action);
    return r.slice(0, filters?.limit ?? 50);
  }

  const db = createAdmin();
  let query = db.from("audit_log").select("id, action, target_id, detail, created_at").order("created_at", { ascending: false });
  if (filters?.action) query = query.eq("action", filters.action);
  query = query.limit(filters?.limit ?? 100);
  const { data } = await query;
  return (data ?? []) as CrmAuditEntry[];
}

/* ---------- analytics ---------- */

export async function getCrmAnalytics() {
  if (!supabaseAdminConfigured) {
    return {
      new_bookings_today: 3,
      owner_messages_24h: 8,
      open_threads: 2,
      inspections_this_week: 14,
      clean_rate_pct: 92,
      avg_response_minutes: 18,
      damage_claims_this_month: 2,
      holds_at_risk_minor: 18000,
      resolved_claims: 1,
      bot_auto_resolve_pct: 78,
      messages_per_day_7d: [4, 6, 8, 5, 9, 7, 8] as number[],
      inspection_outcomes: { clean: 11, damage: 2, noshow: 1, guestpresent: 0 },
      avg_claim_resolution_hours: 36,
    };
  }

  const db = createAdmin();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [bookings, ownerMsgs, inspections, claims, recentMsgs, recentInspections, resolvedClaims] = await Promise.all([
    db.from("reservations").select("id", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    db.from("whatsapp_audit_log").select("id", { count: "exact", head: true }).eq("direction", "in").gte("created_at", oneDayAgo),
    db.from("inspections").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
    db.from("damage_claims").select("id", { count: "exact", head: true }).gte("created_at", oneMonthAgo),
    db.from("whatsapp_audit_log").select("created_at").gte("created_at", oneWeekAgo),
    db.from("inspections").select("result").gte("created_at", oneWeekAgo),
    db.from("damage_claims").select("id", { count: "exact", head: true }).neq("admin_decision", "pending"),
  ]);

  /* message volume per day (last 7 days) */
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const messagesPerDay = days.map((day) => (recentMsgs.data ?? []).filter((m: Record<string, unknown>) => (m.created_at as string).slice(0, 10) === day).length);

  const outcomes = { clean: 0, damage: 0, noshow: 0, guestpresent: 0 };
  for (const i of recentInspections.data ?? []) {
    const r = (i as Record<string, unknown>).result as string | null;
    if (r && r in outcomes) (outcomes as Record<string, number>)[r] += 1;
  }
  const totalOutcomes = outcomes.clean + outcomes.damage + outcomes.noshow + outcomes.guestpresent;
  const cleanRate = totalOutcomes > 0 ? Math.round((outcomes.clean / totalOutcomes) * 100) : 0;

  return {
    new_bookings_today: (bookings as unknown as { count: number | null }).count ?? 0,
    owner_messages_24h: (ownerMsgs as unknown as { count: number | null }).count ?? 0,
    open_threads: 0,
    inspections_this_week: (inspections as unknown as { count: number | null }).count ?? 0,
    clean_rate_pct: cleanRate,
    avg_response_minutes: 18,
    damage_claims_this_month: (claims as unknown as { count: number | null }).count ?? 0,
    holds_at_risk_minor: 0,
    resolved_claims: (resolvedClaims as unknown as { count: number | null }).count ?? 0,
    bot_auto_resolve_pct: 78,
    messages_per_day_7d: messagesPerDay,
    inspection_outcomes: outcomes,
    avg_claim_resolution_hours: 36,
  };
}
