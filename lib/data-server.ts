import "server-only";

import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase/admin";
import type {
  DamageClaim,
  Operator,
  Property,
  FinanceRecord,
  UserRecord,
  AuditEntry,
  OwnerBookingView,
  OwnerPayout,
  AdminBookingView,
  AdminStat,
  PayoutLedgerEntry,
  PayoutAlert,
  CommissionRecord,
  FxRecord,
  BookingTrace,
} from "./types";
import type { OwnerDirectoryEntry, PendingPayout, ReconciliationRecord } from "./data";
import {
  getAdminClaims as getMockAdminClaims,
  getAdminOperators as getMockAdminOperators,
  getAdminProperties as getMockAdminProperties,
  getAdminFinance as getMockAdminFinance,
  getAdminUsers as getMockAdminUsers,
  getAdminAudit as getMockAdminAudit,
  getAdminBookings as getMockAdminBookings,
  getOperatorClaims as getMockOperatorClaims,
  getOperatorBookings as getMockOperatorBookings,
  getOwnersForCity as getMockOwnersForCity,
  getOwnerBookings as getMockOwnerBookings,
  getPayoutLedger as getMockPayoutLedger,
  getPayoutAlerts as getMockPayoutAlerts,
  getCommissionRecords as getMockCommissionRecords,
  getFxHistory as getMockFxHistory,
  getCommissionSummary as getMockCommissionSummary,
  getPendingPayouts as getMockPendingPayouts,
  getReconciliation as getMockReconciliation,
} from "./data";

export type ReconciliationView = {
  records: ReconciliationRecord[];
  matchedTotal: number;
  unmatchedTotal: number;
  monthLabel?: string;
};

function daysBetween(left: string, right: string): number {
  const a = new Date(left).getTime();
  const b = new Date(right).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/* ------------------------------------------------------------------ */
/*  Admin Claims                                                        */
/* ------------------------------------------------------------------ */

export async function getAdminClaimsFromDB(): Promise<DamageClaim[]> {
  if (!supabaseAdminConfigured) return getMockAdminClaims();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("damage_claims")
      .select(
        `id, reservation_id, description, estimated_cost_minor,
         admin_decision, admin_reviewer_id, admin_decided_at,
         guest_dispute_status, resolved_amount_minor, created_at,
         reservations(id, property_id, guest_name, guest_email, check_in, check_out,
           properties(branded_name)),
         photos`
      )
      .order("created_at", { ascending: false });

    if (error || !data) return getMockAdminClaims();

    return data.map((r: Record<string, unknown>) => {
      const res = (r.reservations as Record<string, unknown>) ?? {};
      const prop = (res.properties as Record<string, unknown>) ?? {};
      const photos = Array.isArray(r.photos) ? r.photos : [];
      return {
        id: r.id as string,
        reservation_id: r.reservation_id as string,
        property_name: (prop.branded_name as string) ?? "",
        property_id: (res.property_id as string) ?? "",
        guest_name: (res.guest_name as string) ?? "",
        guest_email: (res.guest_email as string) ?? "",
        booking_ref: (r.reservation_id as string) ?? "",
        stay_dates: `${(res.check_in as string) ?? ""}–${(res.check_out as string) ?? ""}`,
        description: r.description as string,
        estimated_cost_minor: r.estimated_cost_minor as number,
        operator_notes: "",
        photo_count: photos.length,
        admin_decision: (r.admin_decision as DamageClaim["admin_decision"]) ?? "pending",
        adjusted_amount_minor: (r.resolved_amount_minor as number | null) ?? null,
        dispute_status: (r.guest_dispute_status as DamageClaim["dispute_status"]) ?? "none",
        submitted_at: (r.created_at as string) ?? "",
        decided_at: (r.admin_decided_at as string | null) ?? null,
        decided_by: (r.admin_reviewer_id as string | null) ?? null,
      };
    });
  } catch {
    return getMockAdminClaims();
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Operators                                                     */
/* ------------------------------------------------------------------ */

export async function getAdminOperatorsFromDB(): Promise<Operator[]> {
  if (!supabaseAdminConfigured) return getMockAdminOperators();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("operators")
      .select(
        `id, name, email, city, assigned_cities, status, quality_score,
         inspections_done, verified_count, properties_count, created_at,
         profiles!operators_profile_id_fkey(full_name)`
      )
      .order("created_at", { ascending: false });

    if (error || !data) return getMockAdminOperators();

    return data.map((r: Record<string, unknown>) => {
      const profile = (r.profiles as Record<string, unknown>) ?? {};
      const submittedCities = Array.isArray(r.assigned_cities)
        ? (r.assigned_cities as string[]).filter(Boolean)
        : [];
      const status = (r.status as string) ?? "onboarding";
      return {
        id: r.id as string,
        name: (r.name as string) || (profile.full_name as string) || "",
        email: (r.email as string) ?? "",
        city: (r.city as string) ?? submittedCities[0] ?? "",
        assigned_cities: submittedCities,
        properties_count: (r.properties_count as number) ?? 0,
        verified_count: (r.verified_count as number) ?? 0,
        status: ["active", "suspended", "onboarding"].includes(status)
          ? (status as Operator["status"])
          : "active",
        quality_score: (r.quality_score as number) ?? 0,
        inspections_done: (r.inspections_done as number) ?? 0,
        created_at: (r.created_at as string) ?? "",
      };
    });
  } catch {
    return getMockAdminOperators();
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Properties                                                    */
/* ------------------------------------------------------------------ */

export async function getAdminPropertiesFromDB(): Promise<Property[]> {
  if (!supabaseAdminConfigured) return getMockAdminProperties();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("properties")
      .select("*, profiles!owner_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return getMockAdminProperties();

    const ids = data.map((p: Record<string, unknown>) => p.id as string);
    const agg = new Map<string, { bookings: number; revenue: number }>();
    if (ids.length > 0) {
      const { data: reservations } = await db
        .from("reservations")
        .select("property_id, total_minor")
        .in("property_id", ids);
      for (const r of (reservations ?? []) as Array<Record<string, unknown>>) {
        const cur = agg.get(r.property_id as string) ?? { bookings: 0, revenue: 0 };
        cur.bookings += 1;
        cur.revenue += (r.total_minor as number) ?? 0;
        agg.set(r.property_id as string, cur);
      }
    }

    return data.map((r: Record<string, unknown>) => {
      const owner = (r.profiles as Record<string, unknown>) ?? {};
      const stats = agg.get(r.id as string) ?? { bookings: 0, revenue: 0 };
      return {
        id: r.id as string,
        slug: r.slug as string,
        name: r.branded_name as string,
        city: r.city as string,
        neighbourhood: r.neighbourhood as string,
        owner_id: r.owner_id as string,
        owner_name: (owner.full_name as string) ?? "",
        status: r.status as Property["status"],
        bedrooms: r.bedrooms as number,
        bathrooms: 0,
        max_guests: r.sleeps as number,
        nightly_price_minor: r.nightly_rate_minor as number,
        currency: (r.currency as string) ?? "GBP",
        extended_checkout_offered: (r.extended_checkout_offered as boolean) ?? false,
        extended_checkout_price_minor: (r.extended_checkout_price_minor as number) ?? 0,
        bookings_count: stats.bookings,
        revenue_minor: stats.revenue,
        image_url: "",
      };
    });
  } catch {
    return getMockAdminProperties();
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Finance                                                       */
/* ------------------------------------------------------------------ */

export async function getAdminFinanceFromDB(): Promise<FinanceRecord[]> {
  if (!supabaseAdminConfigured) return getMockAdminFinance();
  try {
    const db = createAdmin();

    const { data: bookings, error: bookingsErr } = await db
      .from("reservations")
      .select(
        `id, guest_name, property_name, total_minor, currency, status, created_at,
         booking_group_id`
      )
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: holds, error: holdsErr } = await db
      .from("deposit_holds")
      .select(`id, reservation_id, hold_amount_minor, status, created_at`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (bookingsErr || holdsErr) return getMockAdminFinance();

    const records: FinanceRecord[] = (bookings ?? []).map((r: Record<string, unknown>) => ({
      id: `B-${r.id}`,
      type: "payment" as const,
      guest_or_owner: (r.guest_name as string) ?? "",
      property: (r.property_name as string) ?? "",
      amount_minor: (r.total_minor as number) ?? 0,
      date: (r.created_at as string)?.slice(0, 10) ?? "",
      status: r.status === "confirmed" ? "settled" : "processing",
      ref: (r.booking_group_id as string) ?? "-",
    }));

    const holdRecords: FinanceRecord[] = (holds ?? []).map((r: Record<string, unknown>) => ({
      id: `H-${r.id}`,
      type: "deposit_hold" as const,
      guest_or_owner: "",
      property: "",
      amount_minor: (r.hold_amount_minor as number) ?? 0,
      date: (r.created_at as string)?.slice(0, 10) ?? "",
      status: r.status === "captured" ? "captured" : "held",
      ref: (r.reservation_id as string) ?? "-",
    }));

    return [...records, ...holdRecords];
  } catch {
    return getMockAdminFinance();
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Users                                                         */
/* ------------------------------------------------------------------ */

export async function getAdminUsersFromDB(): Promise<UserRecord[]> {
  if (!supabaseAdminConfigured) return getMockAdminUsers();
  try {
    const db = createAdmin();
    type ProfileRow = {
      id: string;
      full_name: string;
      email: string;
      role: string;
      created_at: string;
      is_suspended?: boolean;
    };
    let rows: ProfileRow[] = [];
    let withSuspended = true;

    const first = await db
      .from("profiles")
      .select("id, full_name, email, role, created_at, is_suspended")
      .order("created_at", { ascending: false })
      .limit(100);

    if (first.error || !first.data) {
      withSuspended = false;
      const fallback = await db
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (fallback.error || !fallback.data) return getMockAdminUsers();
      rows = fallback.data as ProfileRow[];
    } else {
      rows = first.data as ProfileRow[];
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.full_name ?? "",
      email: r.email ?? "",
      type:
        r.role === "owner"
          ? "Owner"
          : r.role === "operator"
            ? "Operator"
            : "Guest",
      bookings_or_properties: 0,
      status:
        withSuspended && r.is_suspended === true
          ? "suspended"
          : "active",
    }));
  } catch {
    return getMockAdminUsers();
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Audit                                                         */
/* ------------------------------------------------------------------ */

export async function getAdminAuditFromDB(): Promise<AuditEntry[]> {
  if (!supabaseAdminConfigured) return getMockAdminAudit();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("audit_log")
      .select("id, action, target_id, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) return getMockAdminAudit();

    return data.map((r: Record<string, unknown>) => ({
      action: r.action as string,
      target: (r.target_id as string) ?? "-",
      by: "System",
      date: (r.created_at as string) ?? "",
      detail: (r.detail as string) ?? "",
    }));
  } catch {
    return getMockAdminAudit();
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Bookings                                                      */
/* ------------------------------------------------------------------ */

export async function getAdminBookingsFromDB(): Promise<AdminBookingView[]> {
  if (!supabaseAdminConfigured) return getMockAdminBookings();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("reservations")
      .select(
        `id, guest_name, guest_email, check_in, check_out, status,
         total_minor, guest_count, property_id,
         properties(branded_name), booking_groups(reference)`
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return getMockAdminBookings();

    return data.map((r: Record<string, unknown>) => {
      const prop = (r.properties as Record<string, unknown>) ?? {};
      return {
        id: r.id as string,
        property_name: (prop.branded_name as string) ?? "",
        property_id: r.property_id as string,
        unit: "",
        guest: (r.guest_name as string) ?? "",
        guest_email: (r.guest_email as string) ?? "",
        check_in: r.check_in as string,
        check_out: r.check_out as string,
        status: r.status as string,
        amount_minor: (r.total_minor as number) ?? 0,
        nights: daysBetween(r.check_in as string, r.check_out as string),
        guest_count: (r.guest_count as number) ?? 0,
      };
    });
  } catch {
    return getMockAdminBookings();
  }
}

/* ------------------------------------------------------------------ */
/*  Operator Claims (city-scoped)                                       */
/* ------------------------------------------------------------------ */

export async function getOperatorClaimsFromDB(
  assignedCities: string[],
): Promise<DamageClaim[]> {
  if (!supabaseAdminConfigured) return getMockOperatorClaims(assignedCities);
  if (assignedCities.length === 0) return [];
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("damage_claims")
      .select(
        `id, reservation_id, description, estimated_cost_minor,
         admin_decision, admin_reviewer_id, admin_decided_at,
         guest_dispute_status, resolved_amount_minor, created_at,
         reservations(id, property_id, guest_name, guest_email, check_in, check_out,
           properties(branded_name, city)),
         photos`
      )
      .in("reservations.properties.city", assignedCities)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((r: Record<string, unknown>) => {
      const res = (r.reservations as Record<string, unknown>) ?? {};
      const prop = (res.properties as Record<string, unknown>) ?? {};
      const photos = Array.isArray(r.photos) ? r.photos : [];
      return {
        id: r.id as string,
        reservation_id: r.reservation_id as string,
        property_name: (prop.branded_name as string) ?? "",
        property_id: (res.property_id as string) ?? "",
        guest_name: (res.guest_name as string) ?? "",
        guest_email: (res.guest_email as string) ?? "",
        booking_ref: (r.reservation_id as string) ?? "",
        stay_dates: `${(res.check_in as string) ?? ""}–${(res.check_out as string) ?? ""}`,
        description: r.description as string,
        estimated_cost_minor: r.estimated_cost_minor as number,
        operator_notes: "",
        photo_count: photos.length,
        admin_decision: (r.admin_decision as DamageClaim["admin_decision"]) ?? "pending",
        adjusted_amount_minor: (r.resolved_amount_minor as number | null) ?? null,
        dispute_status: (r.guest_dispute_status as DamageClaim["dispute_status"]) ?? "none",
        submitted_at: (r.created_at as string) ?? "",
        decided_at: (r.admin_decided_at as string | null) ?? null,
        decided_by: (r.admin_reviewer_id as string | null) ?? null,
      };
    });
  } catch {
    return getMockOperatorClaims(assignedCities);
  }
}

/* ------------------------------------------------------------------ */
/*  Operator Bookings (city-scoped)                                     */
/* ------------------------------------------------------------------ */

export async function getOperatorBookingsFromDB(
  assignedCities: string[],
): Promise<AdminBookingView[]> {
  if (!supabaseAdminConfigured) return getMockOperatorBookings(assignedCities);
  if (assignedCities.length === 0) return [];
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("reservations")
      .select(
        `id, guest_name, guest_email, check_in, check_out, status,
         total_minor, guest_count, property_id,
         properties!inner(branded_name, city), booking_groups(reference)`
      )
      .in("properties.city", assignedCities)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((r: Record<string, unknown>) => {
      const prop = (r.properties as Record<string, unknown>) ?? {};
      return {
        id: r.id as string,
        property_name: (prop.branded_name as string) ?? "",
        property_id: r.property_id as string,
        unit: "",
        guest: (r.guest_name as string) ?? "",
        guest_email: (r.guest_email as string) ?? "",
        check_in: r.check_in as string,
        check_out: r.check_out as string,
        status: r.status as string,
        amount_minor: (r.total_minor as number) ?? 0,
        nights: daysBetween(r.check_in as string, r.check_out as string),
        guest_count: (r.guest_count as number) ?? 0,
      };
    });
  } catch {
    return getMockOperatorBookings(assignedCities);
  }
}

/* ------------------------------------------------------------------ */
/*  Owners For City (operator view)                                     */
/* ------------------------------------------------------------------ */

export async function getOwnersForCityFromDB(
  assignedCities: string[],
): Promise<OwnerDirectoryEntry[]> {
  if (!supabaseAdminConfigured) return getMockOwnersForCity(assignedCities);
  if (assignedCities.length === 0) return [];
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("profiles")
      .select(
        `id, full_name, email, whatsapp_e164,
         properties!owner_id(id, branded_name, city, status)`
      )
      .eq("role", "owner");

    if (error || !data) return [];

    return data
      .map((r: Record<string, unknown>) => {
        const props = Array.isArray(r.properties)
          ? (r.properties as Array<Record<string, unknown>>)
          : [];
        const cities = Array.from(
          new Set(props.map((p) => p.city as string)),
        );
        const hasCity = assignedCities.length === 0 || cities.some((c) => assignedCities.includes(c));
        if (!hasCity) return null;

        return {
          id: r.id as string,
          name: (r.full_name as string) ?? "",
          email: (r.email as string) ?? "",
          whatsapp: (r.whatsapp_e164 as string) ?? "",
          city: cities[0] ?? "",
          properties_count: props.length,
          total_bookings: 0,
          last_verified: "",
          status: "active" as OwnerDirectoryEntry["status"],
        };
      })
      .filter(Boolean) as OwnerDirectoryEntry[];
  } catch {
    return getMockOwnersForCity(assignedCities);
  }
}

/* ------------------------------------------------------------------ */
/*  Owner Bookings                                                      */
/* ------------------------------------------------------------------ */

export async function getOwnerBookingsFromDB(
  ownerId: string,
): Promise<OwnerBookingView[]> {
  if (!supabaseAdminConfigured) return getMockOwnerBookings();
  try {
    const db = createAdmin();
    const { data: props, error: propsErr } = await db
      .from("properties")
      .select("id")
      .eq("owner_id", ownerId);

    if (propsErr || !props || props.length === 0) {
      return getMockOwnerBookings();
    }

    const propIds = props.map((p: Record<string, unknown>) => p.id);

    const { data, error } = await db
      .from("reservations")
      .select(
        `id, guest_name, check_in, check_out, status,
         total_minor, guest_count,
         properties(branded_name)`
      )
      .in("property_id", propIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) return getMockOwnerBookings();

    return data.map((r: Record<string, unknown>) => {
      const prop = (r.properties as Record<string, unknown>) ?? {};
      const propName = (prop.branded_name as string) ?? "";
      const nights = daysBetween(r.check_in as string, r.check_out as string);
      return {
        id: r.id as string,
        unit: propName,
        guest: (r.guest_name as string) ?? "",
        check_in: r.check_in as string,
        check_out: r.check_out as string,
        status: r.status as string,
        amount_minor: (r.total_minor as number) ?? 0,
        nights,
        guest_count: (r.guest_count as number) ?? 0,
        property: propName,
        city: "",
        neighbourhood: "",
        guests: (r.guest_count as number) ?? 0,
      };
    });
  } catch {
    return getMockOwnerBookings();
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Stats (aggregated from multiple tables)                       */
/* ------------------------------------------------------------------ */

export async function getAdminStatsFromDB(): Promise<AdminStat[]> {
  if (!supabaseAdminConfigured) return getMockAdminStats();
  try {
    const db = createAdmin();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { count: totalProps },
      { count: activeOps },
      { count: activeBookings },
      { data: revData },
    ] = await Promise.all([
      db
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "operator"),
      db
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .not("status", "in", ["cancelled", "completed"]),
      db
        .from("reservations")
        .select("total_minor")
        .gte("created_at", monthStart)
        .neq("status", "cancelled"),
    ]);

    const mtRevenue = (revData ?? []).reduce(
      (sum: number, r: Record<string, unknown>) =>
        sum + ((r.total_minor as number) ?? 0),
      0,
    );

    return [
      {
        label: "Total Properties",
        value: String(totalProps ?? 0),
        sub: "",
        accent: false,
      },
      {
        label: "Active Bookings",
        value: String(activeBookings ?? 0),
        sub: "Across all properties",
        accent: false,
      },
      {
        label: "Revenue (MTD)",
        value: `£${((mtRevenue / 100).toFixed(0))}`,
        sub: "",
        subColor: "text-success",
        accent: false,
      },
      {
        label: "Active Operators",
        value: String(activeOps ?? 0),
        sub: "",
        accent: true,
      },
    ];
  } catch {
    return getMockAdminStats();
  }
}

import { getAdminStats as getMockAdminStats } from "./data";

/* ------------------------------------------------------------------ */
/*  Payment Architecture (V2) — Payout Ledger & Reconciliation         */
/* ------------------------------------------------------------------ */

export async function getPayoutLedgerFromDB(): Promise<PayoutLedgerEntry[]> {
  if (!supabaseAdminConfigured) return getMockPayoutLedger();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("owner_payouts")
      .select(
        `id, booking_group_id, owner_id, owner_share_minor, status,
         payout_ngn_minor, fx_rate, fincra_reference,
         requested_at, released_at, paid_at, attempts, last_error, created_at,
         profiles!owner_id(full_name), properties(branded_name)`
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) return getMockPayoutLedger();

    return data.map((r: Record<string, unknown>) => {
      const profile = (r.profiles as Record<string, unknown>) ?? {};
      const property = (r.properties as Record<string, unknown>) ?? {};
      return {
        id: r.id as string,
        bookingGroupId: r.booking_group_id as string,
        ownerId: (r.owner_id as string) ?? "",
        ownerName: (profile.full_name as string) ?? "",
        propertyName: (property.name as string) ?? "",
        ownerShareMinor: (r.owner_share_minor as number) ?? 0,
        status: (r.status as string) ?? "pending",
        payoutNgnMinor: (r.payout_ngn_minor as number) ?? null,
        fxRate: (r.fx_rate as number) ?? null,
        fincraReference: (r.fincra_reference as string) ?? null,
        requestedAt: (r.requested_at as string) ?? null,
        releasedAt: (r.released_at as string) ?? null,
        paidAt: (r.paid_at as string) ?? null,
        attempts: (r.attempts as number) ?? 0,
        lastError: (r.last_error as string) ?? null,
        createdAt: (r.created_at as string) ?? "",
      };
    });
  } catch {
    return getMockPayoutLedger();
  }
}

export async function getPayoutAlertsFromDB(): Promise<PayoutAlert[]> {
  if (!supabaseAdminConfigured) return getMockPayoutAlerts();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("payout_alerts")
      .select("id, severity, kind, message, resolved, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return getMockPayoutAlerts();

    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      severity: (r.severity as PayoutAlert["severity"]) ?? "medium",
      kind: (r.kind as string) ?? "",
      message: (r.message as string) ?? "",
      resolved: (r.resolved as boolean) ?? false,
      createdAt: (r.created_at as string) ?? "",
    }));
  } catch {
    return getMockPayoutAlerts();
  }
}

/* ------------------------------------------------------------------ */
/*  Owner Payouts — signed-in owner's view                             */
/* ------------------------------------------------------------------ */

function formatPayoutPeriod(isoDate: string): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "—";
  const month = d.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  return `${month} ${d.getUTCFullYear()}`;
}

export async function getOwnerPayoutsFromDB(ownerId: string): Promise<OwnerPayout[]> {
  if (!supabaseAdminConfigured) return getMockPayoutsForOwner(ownerId);
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("owner_payouts")
      .select(
        `id, owner_share_minor, status, paid_at, released_at, requested_at, created_at,
         properties!owner_payouts_property_id_fkey(branded_name)`
      )
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return getMockPayoutsForOwner(ownerId);

    return data.map((r: Record<string, unknown>) => {
      const property = (r.properties as Record<string, unknown> | null) ?? {};
      const propertyName = (property.branded_name as string) ?? "—";
      const periodDate = (r.paid_at as string) ?? (r.released_at as string) ?? (r.requested_at as string) ?? (r.created_at as string) ?? "";
      const paidAt =
        r.status === "paid" && r.paid_at
          ? new Date(r.paid_at as string).toISOString().slice(0, 10)
          : r.status === "released"
            ? "Pending — disbursing"
            : r.status === "eligible"
              ? "Eligible — awaiting settlement"
              : r.status === "failed"
                ? "Failed"
                : r.status === "refunded"
                  ? "Refunded"
                  : "Pending";
      return {
        id: r.id as string,
        period: formatPayoutPeriod(periodDate),
        amount_minor: (r.owner_share_minor as number) ?? 0,
        paid_at: paidAt,
        status: (r.status as string) ?? "pending",
        units: propertyName,
      };
    });
  } catch {
    return getMockPayoutsForOwner(ownerId);
  }
}

function getMockPayoutsForOwner(_ownerId: string): OwnerPayout[] {
  return [
    { id: "P001", period: "June 2026", amount_minor: 300000, paid_at: "2026-07-05", status: "paid", units: "All units" },
    { id: "P002", period: "May 2026", amount_minor: 240000, paid_at: "2026-06-05", status: "paid", units: "All units" },
  ];
}

export async function getCommissionRecordsFromDB(): Promise<CommissionRecord[]> {
  if (!supabaseAdminConfigured) return getMockCommissionRecords();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("booking_groups")
      .select("id, commission_minor, charge_total_minor, status, created_at, reservations(properties(branded_name))")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return getMockCommissionRecords();

    return data.map((r: Record<string, unknown>) => {
      const reservations = (r.reservations as Array<Record<string, unknown>>) ?? [];
      const property = (reservations[0]?.properties as Record<string, unknown>) ?? {};
      return {
        id: `CR-${r.id}`,
        bookingGroupId: r.id as string,
        propertyName: (property.branded_name as string) ?? "",
        commissionMinor: (r.commission_minor as number) ?? 0,
        totalMinor: (r.charge_total_minor as number) ?? 0,
        date: ((r.created_at as string) ?? "").slice(0, 10),
        status: (r.status as string) ?? "pending",
      };
    });
  } catch {

    return getMockCommissionRecords();
  }
}

export async function getFxHistoryFromDB(): Promise<FxRecord[]> {
  if (!supabaseAdminConfigured) return getMockFxHistory();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("owner_payouts")
      .select("booking_group_id, fx_rate, requested_at, fincra_reference, owner_id, profiles!owner_id(full_name)")
      .not("fx_rate", "is", null)
      .order("requested_at", { ascending: false })
      .limit(50);

    if (error || !data) return getMockFxHistory();

    return data.map((r: Record<string, unknown>) => {
      const profile = (r.profiles as Record<string, unknown>) ?? {};
      return {
        date: ((r.requested_at as string) ?? "").slice(0, 10),
        rate: (r.fx_rate as number) ?? 0,
        bookingGroupId: (r.booking_group_id as string) ?? "",
        payoutReference: (r.fincra_reference as string) ?? "",
        ownerName: (profile.full_name as string) ?? "",
      };
    });
  } catch {
    return getMockFxHistory();
  }
}

export async function getCommissionSummaryFromDB(): Promise<{ daily: number; weekly: number; monthly: number; totalPayouts: number }> {
  if (!supabaseAdminConfigured) return getMockCommissionSummary();
  try {
    const db = createAdmin();
    const now = new Date();
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const w1 = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();
    const m1 = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [dailyRes, weeklyRes, monthlyRes, paidPayoutsRes] = await Promise.all([
      db.from("booking_groups").select("commission_minor").gte("created_at", d1),
      db.from("booking_groups").select("commission_minor").gte("created_at", w1),
      db.from("booking_groups").select("commission_minor").gte("created_at", m1),
      db.from("owner_payouts").select("*", { count: "exact", head: true }).eq("status", "paid"),
    ]);

    const sum = (rows: { commission_minor: number }[] | null | undefined) =>
      (rows ?? []).reduce((s, r) => s + (r.commission_minor ?? 0), 0);

    return {
      daily: sum(dailyRes.data),
      weekly: sum(weeklyRes.data),
      monthly: sum(monthlyRes.data),
      totalPayouts: paidPayoutsRes.count ?? 0,
    };
  } catch {
    return getMockCommissionSummary();
  }
}

export async function getPendingPayoutsFromDB(): Promise<PendingPayout[]> {
  if (!supabaseAdminConfigured) return getMockPendingPayouts();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("owner_payouts")
      .select(
        `id, owner_share_minor, status, requested_at, created_at,
         booking_group_id,
         profiles!owner_id(full_name, email),
         properties!property_id(branded_name),
         reservations!reservation_id(check_in, check_out)`
      )
      .order("created_at", { ascending: false })
      .limit(250);

    if (error || !data) return getMockPendingPayouts();

    type LedgerRow = {
      owner_share_minor: number;
      status: string;
      requested_at: string | null;
      created_at: string;
      booking_group_id: string;
      profiles: Record<string, unknown>[] | Record<string, unknown> | null;
      properties: Record<string, unknown>[] | Record<string, unknown> | null;
      reservations: Record<string, unknown>[] | Record<string, unknown> | null;
    };

    const firstRow = (v: unknown): Record<string, unknown> =>
      Array.isArray(v) ? ((v[0] ?? {}) as Record<string, unknown>) : ((v ?? {}) as Record<string, unknown>);

    const byOwnerPeriod = new Map<string, PendingPayout>();
    for (const r of data as unknown as LedgerRow[]) {
      const profile = firstRow(r.profiles);
      const property = firstRow(r.properties);
      const reservation = firstRow(r.reservations);
      const owner = (profile.full_name as string) || "Owner";
      const email = (profile.email as string) ?? "";
      const created = (r.requested_at as string) ?? r.created_at;
      const period = created ? created.slice(0, 7) : "";
      const key = `${owner}|${period}`;

      const cur = byOwnerPeriod.get(key) ?? {
        id: `PO-${owner.trim().replace(/\s+/g, "-").toLowerCase()}-${period}`,
        owner,
        owner_email: email,
        period,
        units: 0,
        nights: 0,
        revenue_minor: 0,
        fee_minor: 0,
        payout_minor: 0,
        status: "pending" as PendingPayout["status"],
        requested_at: created,
        property_ids: [],
      };
      cur.units += property.branded_name ? 1 : 0;
      cur.nights += daysBetween(
        (reservation.check_in as string) ?? created,
        (reservation.check_out as string) ?? created,
      );
      const share = (r.owner_share_minor as number) ?? 0;
      cur.payout_minor += share;
      cur.fee_minor += Math.round(share / 0.88 * 0.12);
      cur.revenue_minor += Math.round(share / 0.88);
      if (r.status === "pending" && cur.status === "approved") cur.status = "pending";
      if (r.status === "rejected") cur.status = "rejected";
      if (r.status === "pending") cur.status = "pending";
      if (r.booking_group_id) cur.property_ids.push(r.booking_group_id.slice(0, 8));
      byOwnerPeriod.set(key, cur);
    }

    return [...byOwnerPeriod.values()].sort((a, b) =>
      (b.requested_at ?? "").localeCompare(a.requested_at ?? ""),
    );
  } catch {
    return getMockPendingPayouts();
  }
}

export async function getReconciliationFromDB(): Promise<ReconciliationView> {
  if (!supabaseAdminConfigured) return getMockReconciliation();
  try {
    const db = createAdmin();
    const [charges, groups, holds, payouts, log] = await Promise.all([
      db
        .from("reservations")
        .select(
          "id, total_minor, created_at, booking_group_id, status, properties(branded_name)"
        )
        .limit(100),
      db.from("booking_groups").select("id, reference, charge_intent_id, charge_status, created_at"),
      db
        .from("deposit_holds")
        .select("id, reservation_id, hold_amount_minor, created_at, status")
        .limit(50),
      db
        .from("owner_payouts")
        .select("id, owner_share_minor, fincra_reference, created_at, status")
        .limit(50),
      db.from("reconciliation_log").select("intent_id, disposition, created_at").order("created_at", { ascending: false }).limit(200),
    ]);

    if (charges.error || groups.error || holds.error || payouts.error || log.error) {
      return getMockReconciliation();
    }

    const resolved = new Set(
      (log.data ?? []).map((l: Record<string, unknown>) => l.intent_id as string),
    );

    const groupById = new Map(
      (groups.data ?? []).map((g: Record<string, unknown>) => [g.id as string, g]),
    );

    const records: ReconciliationRecord[] = [];
    const dateNow = new Date().toISOString().slice(0, 7);

    for (const r of (charges.data ?? []) as Array<Record<string, unknown>>) {
      const group = groupById.get(r.booking_group_id as string) as
        | Record<string, unknown>
        | undefined;
      const prop = (r.properties as Record<string, unknown>) ?? {};
      const amount = (r.total_minor as number) ?? 0;
      const intent = (group?.charge_intent_id as string | undefined) ?? `pi_${r.id}`;
      records.push({
        id: `R-${r.id}`,
        type: (r.status as string) === "cancelled" ? "refund" : "booking_charge",
        amount_minor: amount,
        stripe_id: intent.slice(0, 12),
        booking_ref: (group?.reference as string) ?? "",
        property: (prop.branded_name as string) ?? "",
        date: ((r.created_at as string) ?? "").slice(0, 10),
        matched: resolved.has(intent),
        matched_with: resolved.has(intent) ? "reconciled" : undefined,
      });
    }

    for (const h of (holds.data ?? []) as Array<Record<string, unknown>>) {
      const amount = (h.hold_amount_minor as number) ?? 0;
      const intent = `pi_hold_${h.reservation_id}`.slice(0, 12);
      records.push({
        id: `H-${h.id}`,
        type: "deposit_hold",
        amount_minor: amount,
        stripe_id: intent,
        booking_ref: (h.reservation_id as string) ?? "",
        date: ((h.created_at as string) ?? "").slice(0, 10),
        matched: resolved.has(`hold_${h.id}`),
        matched_with: resolved.has(`hold_${h.id}`) ? "reconciled" : undefined,
      });
    }

    for (const p of (payouts.data ?? []) as Array<Record<string, unknown>>) {
      const amount = (p.owner_share_minor as number) ?? 0;
      const ref = (p.fincra_reference as string) ?? `po_${p.id}`.slice(0, 12);
      records.push({
        id: `P-${p.id}`,
        type: "payout",
        amount_minor: amount,
        stripe_id: ref,
        booking_ref: (p.booking_group_id as string) ?? "",
        date: ((p.created_at as string) ?? "").slice(0, 10),
        matched: resolved.has(ref),
        matched_with: resolved.has(ref) ? "reconciled" : undefined,
      });
    }

    const bannerDate = (charges.data?.[0] as Record<string, unknown>)?.created_at as string | undefined;
    const monthLabel = bannerDate
      ? new Date(bannerDate).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
      : new Date(`${dateNow}-01`).toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

    const matchedTotal = records.filter((r) => r.matched).reduce((s, r) => s + r.amount_minor, 0);
    const unmatchedTotal = records.filter((r) => !r.matched).reduce((s, r) => s + r.amount_minor, 0);

    return {
      records: records
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 60),
      matchedTotal,
      unmatchedTotal,
      monthLabel,
    };
  } catch {
    return getMockReconciliation();
  }
}

export async function getBookingTraceFromDB(bookingGroupId: string): Promise<BookingTrace | null> {
  if (!supabaseAdminConfigured) return null;
  try {
    const db = createAdmin();
    const { data: group, error } = await db
      .from("booking_groups")
      .select("*")
      .eq("id", bookingGroupId)
      .maybeSingle();

    if (error || !group) return null;

    const { data: reservations } = await db
      .from("reservations")
      .select("id, property_id, commission_minor, owner_share_minor, check_in, check_out, properties(branded_name, owner_id, profiles!owner_id(full_name))")
      .eq("booking_group_id", bookingGroupId);

    return {
      groupId: group.id,
      chargeIntentId: (group.charge_intent_id as string) ?? "",
      chargeId: (group.stripe_charge_id as string) ?? null,
      chargeStatus: (group.charge_status as string) ?? "pending",
      chargeTotalMinor: (group.charge_total_minor as number) ?? 0,
      commissionMinor: (group.commission_minor as number) ?? 0,
      ownerShareMinor: (group.owner_share_minor as number) ?? 0,
      refundedMinor: (group.refunded_minor as number) ?? 0,
      platformPayoutStatus: (group.platform_payout_status as string) ?? "pending",
      ownerPayoutStatus: (group.owner_payout_status as string) ?? "pending",
      ownerPayoutReference: (group.owner_payout_reference as string) ?? null,
      ownerPayoutNgnMinor: (group.owner_payout_ngn_minor as number) ?? null,
      ownerPayoutFxRate: (group.owner_payout_fx_rate as number) ?? null,
      ownerPayoutDate: (group.owner_payout_date as string) ?? null,
      reservations: (reservations ?? []).map((r: Record<string, unknown>) => {
        const property = (r.properties as Record<string, unknown>) ?? {};
        const profile = (property.profiles as Record<string, unknown>) ?? {};
        return {
          property: (property.branded_name as string) ?? "",
          owner: (profile.full_name as string) ?? "",
          checkIn: (r.check_in as string) ?? "",
          checkOut: (r.check_out as string) ?? "",
          commissionMinor: (r.commission_minor as number) ?? 0,
          ownerShareMinor: (r.owner_share_minor as number) ?? 0,
        };
      }),
    };
  } catch {
    return null;
  }
}
