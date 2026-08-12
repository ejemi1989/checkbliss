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
  AdminBookingView,
  AdminStat,
  PayoutLedgerEntry,
  PayoutAlert,
  CommissionRecord,
  FxRecord,
  BookingTrace,
} from "./types";
import type { OwnerDirectoryEntry } from "./data";
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
} from "./data";

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
        `id, reservation_id, property_id, description, estimated_cost_minor,
         operator_notes, admin_decision, adjusted_amount_minor, dispute_status,
         submitted_at, decided_at, decided_by,
         reservations(guest_name, guest_email, check_in, check_out, property_name),
         photos`
      )
      .order("submitted_at", { ascending: false });

    if (error || !data) return getMockAdminClaims();

    return data.map((r: Record<string, unknown>) => {
      const res = (r.reservations as Record<string, unknown>) ?? {};
      const photos = Array.isArray(r.photos) ? r.photos : [];
      return {
        id: r.id as string,
        reservation_id: r.reservation_id as string,
        property_name: (res.property_name as string) ?? "",
        property_id: r.property_id as string,
        guest_name: (res.guest_name as string) ?? "",
        guest_email: (res.guest_email as string) ?? "",
        booking_ref: (r.reservation_id as string) ?? "",
        stay_dates: `${(res.check_in as string) ?? ""}–${(res.check_out as string) ?? ""}`,
        description: r.description as string,
        estimated_cost_minor: r.estimated_cost_minor as number,
        operator_notes: (r.operator_notes as string) ?? "",
        photo_count: photos.length,
        admin_decision: r.admin_decision as DamageClaim["admin_decision"],
        adjusted_amount_minor: r.adjusted_amount_minor as number | null,
        dispute_status: (r.dispute_status as DamageClaim["dispute_status"]) ?? "none",
        submitted_at: r.submitted_at as string,
        decided_at: r.decided_at as string | null,
        decided_by: r.decided_by as string | null,
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
      .from("profiles")
      .select(
        `id, full_name, email, assigned_cities,
         operator_assignments(city)`
      )
      .eq("role", "operator");

    if (error || !data) return getMockAdminOperators();

    return data.map((r: Record<string, unknown>) => {
      const assignments = Array.isArray(r.operator_assignments)
        ? (r.operator_assignments as Array<{ city: string }>)
        : [];
      const cities = assignments.map((a) => a.city);
      return {
        id: r.id as string,
        name: (r.full_name as string) ?? "",
        email: (r.email as string) ?? "",
        city: cities[0] ?? "",
        assigned_cities: cities,
        properties_count: 0,
        verified_count: 0,
        status: "active" as Operator["status"],
        quality_score: 0,
        inspections_done: 0,
        created_at: "",
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
      .order("created_at", { ascending: false });

    if (error || !data) return getMockAdminProperties();

    return data.map((r: Record<string, unknown>) => {
      const owner = (r.profiles as Record<string, unknown>) ?? {};
      return {
        id: r.id as string,
        slug: r.slug as string,
        name: r.name as string,
        city: r.city as string,
        neighbourhood: r.neighbourhood as string,
        owner_id: r.owner_id as string,
        owner_name: (owner.full_name as string) ?? "",
        status: r.status as Property["status"],
        bedrooms: r.bedrooms as number,
        bathrooms: r.bathrooms as number,
        max_guests: r.max_guests as number,
        nightly_price_minor: r.nightly_rate_minor as number,
        currency: (r.currency as string) ?? "GBP",
        extended_checkout_offered: (r.extended_checkout_offered as boolean) ?? false,
        extended_checkout_price_minor: (r.extended_checkout_price_minor as number) ?? 0,
        bookings_count: 0,
        revenue_minor: 0,
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
      .select(`id, reservation_id, amount_minor, status, created_at`)
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
      amount_minor: (r.amount_minor as number) ?? 0,
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
    const { data, error } = await db
      .from("profiles")
      .select("id, full_name, email, role")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !data) return getMockAdminUsers();

    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: (r.full_name as string) ?? "",
      email: (r.email as string) ?? "",
      type:
        r.role === "owner"
          ? "Owner"
          : r.role === "operator"
            ? "Operator"
            : "Guest",
      bookings_or_properties: 0,
      status: "active" as UserRecord["status"],
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
         total_minor, nights, guest_count, property_id,
         properties(name), booking_groups(reference)`
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return getMockAdminBookings();

    return data.map((r: Record<string, unknown>) => {
      const prop = (r.properties as Record<string, unknown>) ?? {};
      return {
        id: r.id as string,
        property_name: (prop.name as string) ?? "",
        property_id: r.property_id as string,
        unit: "",
        guest: (r.guest_name as string) ?? "",
        guest_email: (r.guest_email as string) ?? "",
        check_in: r.check_in as string,
        check_out: r.check_out as string,
        status: r.status as string,
        amount_minor: (r.total_minor as number) ?? 0,
        nights: (r.nights as number) ?? 0,
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
        `id, reservation_id, property_id, description, estimated_cost_minor,
         operator_notes, admin_decision, adjusted_amount_minor, dispute_status,
         submitted_at, decided_at, decided_by,
         reservations(guest_name, guest_email, check_in, check_out, property_name),
         photos,
         properties!inner(city)`
      )
      .in("properties.city", assignedCities)
      .order("submitted_at", { ascending: false });

    if (error || !data) return [];

    return data.map((r: Record<string, unknown>) => {
      const res = (r.reservations as Record<string, unknown>) ?? {};
      const photos = Array.isArray(r.photos) ? r.photos : [];
      return {
        id: r.id as string,
        reservation_id: r.reservation_id as string,
        property_name: (res.property_name as string) ?? "",
        property_id: r.property_id as string,
        guest_name: (res.guest_name as string) ?? "",
        guest_email: (res.guest_email as string) ?? "",
        booking_ref: (r.reservation_id as string) ?? "",
        stay_dates: `${(res.check_in as string) ?? ""}–${(res.check_out as string) ?? ""}`,
        description: r.description as string,
        estimated_cost_minor: r.estimated_cost_minor as number,
        operator_notes: (r.operator_notes as string) ?? "",
        photo_count: photos.length,
        admin_decision: r.admin_decision as DamageClaim["admin_decision"],
        adjusted_amount_minor: r.adjusted_amount_minor as number | null,
        dispute_status: (r.dispute_status as DamageClaim["dispute_status"]) ?? "none",
        submitted_at: r.submitted_at as string,
        decided_at: r.decided_at as string | null,
        decided_by: r.decided_by as string | null,
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
         total_minor, nights, guest_count, property_id,
         properties!inner(name, city), booking_groups(reference)`
      )
      .in("properties.city", assignedCities)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((r: Record<string, unknown>) => {
      const prop = (r.properties as Record<string, unknown>) ?? {};
      return {
        id: r.id as string,
        property_name: (prop.name as string) ?? "",
        property_id: r.property_id as string,
        unit: "",
        guest: (r.guest_name as string) ?? "",
        guest_email: (r.guest_email as string) ?? "",
        check_in: r.check_in as string,
        check_out: r.check_out as string,
        status: r.status as string,
        amount_minor: (r.total_minor as number) ?? 0,
        nights: (r.nights as number) ?? 0,
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
        `id, full_name, email, phone,
         properties!owner_id(id, name, city, status)`
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
          whatsapp: (r.phone as string) ?? "",
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
         total_minor, nights, guest_count,
         properties(name)`
      )
      .in("property_id", propIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) return getMockOwnerBookings();

    return data.map((r: Record<string, unknown>) => {
      const prop = (r.properties as Record<string, unknown>) ?? {};
      const propName = (prop.name as string) ?? "";
      return {
        id: r.id as string,
        unit: propName,
        guest: (r.guest_name as string) ?? "",
        check_in: r.check_in as string,
        check_out: r.check_out as string,
        status: r.status as string,
        amount_minor: (r.total_minor as number) ?? 0,
        nights: (r.nights as number) ?? 0,
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

    const [{ count: totalProps }, { count: activeOps }, { count: monthRev, data: revData }] =
      await Promise.all([
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
        value: "0",
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
         payout_ngn_minor, fx_rate, raenest_reference,
         requested_at, released_at, paid_at, attempts, last_error, created_at,
         profiles!owner_id(full_name), properties(name)`
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
        raenestReference: (r.raenest_reference as string) ?? null,
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

export async function getCommissionRecordsFromDB(): Promise<CommissionRecord[]> {
  if (!supabaseAdminConfigured) return getMockCommissionRecords();
  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("booking_groups")
      .select("id, commission_minor, charge_total_minor, status, created_at, reservations(properties(name))")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !data) return getMockCommissionRecords();

    return data.map((r: Record<string, unknown>) => {
      const reservations = (r.reservations as Array<Record<string, unknown>>) ?? [];
      const property = (reservations[0]?.properties as Record<string, unknown>) ?? {};
      return {
        id: `CR-${r.id}`,
        bookingGroupId: r.id as string,
        propertyName: (property.name as string) ?? "",
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
      .select("booking_group_id, fx_rate, requested_at, raenest_reference, owner_id, profiles!owner_id(full_name)")
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
        payoutReference: (r.raenest_reference as string) ?? "",
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
      .select("id, property_id, commission_minor, owner_share_minor, check_in, check_out, properties(name, owner_id, profiles!owner_id(full_name))")
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
          property: (property.name as string) ?? "",
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
