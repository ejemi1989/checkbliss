import "server-only";

import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase/admin";
import {
  notifyBookingConfirmed as enqueueBookingConfirmed,
  notifyBoth as enqueueBoth,
  type Notification,
  type NotifRole,
} from "@/lib/notifications";

export type { NotifRole };

/**
 * Persists a notification row via the service-role client when Supabase is
 * configured. In-memory enqueue (lib/notifications) always runs first so mock
 * mode and the offline test suite remain identical. Persistence is best-effort
 * — a DB failure must never break the calling Server Action, so errors are
 * swallowed and the in-memory copy is the fallback.
 */
async function persistNotification(input: {
  role: NotifRole;
  title: string;
  body: string;
  link?: string;
  userId?: string;
}): Promise<void> {
  if (!supabaseAdminConfigured) return;
  try {
    const db = createAdmin();
    await db.from("notifications").insert({
      role: input.role,
      user_id: input.userId ?? null,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      read: false,
    });
  } catch {
    // In-memory fallback already happened; never throw from a notification.
  }
}

/**
 * Easy-email-style helper: one notification per recipient (admin + affected
 * user + actor). Runs the in-memory enqueue and mirrors to the DB.
 */
export async function notifyBoth(
  userRole: NotifRole,
  userId: string | undefined,
  title: string,
  body: string,
  link?: string,
  adminLink?: string,
  actorRole?: NotifRole,
  actorId?: string,
): Promise<void> {
  enqueueBoth(userRole, userId, title, body, link, adminLink, actorRole, actorId);
  await persistNotification({ role: "admin", title, body, link: adminLink ?? link });
  if (userId) {
    await persistNotification({ role: userRole, title, body, link, userId });
  }
  if (actorRole && actorId && actorRole !== "admin") {
    await persistNotification({ role: actorRole, title: `You ${title.toLowerCase()}`, body, link, userId: actorId });
  }
}

/**
 * Booking-confirmed notifications (admin + guest + each owner). Runs the
 * in-memory enqueue and mirrors each recipient to the DB.
 */
export async function notifyBookingConfirmed(params: {
  reference: string;
  guestName: string;
  propertyNames: string[];
  checkIn: string;
  checkOut: string;
  amountLabel: string;
  ownerUserIds?: string[];
  guestUserId?: string;
}): Promise<void> {
  enqueueBookingConfirmed(params);
  if (!supabaseAdminConfigured) return;

  const body = `${params.guestName} booked ${params.propertyNames.join(", ")} · ${params.checkIn} → ${params.checkOut} · ${params.amountLabel} · Ref ${params.reference}`;
  await persistNotification({ role: "admin", title: "New booking confirmed", body, link: "/admin" });
  await persistNotification({
    role: "guest",
    title: "Booking confirmed",
    body,
    link: "/account/notifications",
    userId: params.guestUserId,
  });
  for (const ownerId of params.ownerUserIds?.length ? params.ownerUserIds : [undefined]) {
    await persistNotification({
      role: "owner",
      title: "New booking",
      body,
      link: "/dashboard/owner/bookings",
      userId: ownerId,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  DB read helpers (service-role admin). Components call these via    */
/*  actions/notifications.ts so client code never talks to Supabase.   */
/* ------------------------------------------------------------------ */

export async function getNotificationsFromDB(
  role: NotifRole,
  userId?: string,
): Promise<Notification[] | null> {
  if (!supabaseAdminConfigured) return null;
  try {
    const db = createAdmin();
    let query = db
      .from("notifications")
      .select("id, role, user_id, title, body, link, read, created_at")
      .eq("role", role)
      .order("created_at", { ascending: false })
      .limit(100);
    if (userId) query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    const { data, error } = await query;
    if (error || !data) return null;
    return (data as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      role: r.role as NotifRole,
      user_id: (r.user_id as string) ?? undefined,
      title: r.title as string,
      body: (r.body as string) ?? "",
      link: (r.link as string) ?? undefined,
      read: (r.read as boolean) ?? false,
      created_at: r.created_at as string,
    }));
  } catch {
    return null;
  }
}

export async function getUnreadCountFromDB(
  role: NotifRole,
  userId?: string,
): Promise<number> {
  const rows = await getNotificationsFromDB(role, userId);
  if (!rows) return 0;
  return rows.filter((n) => !n.read).length;
}

export async function setReadInDB(notificationId: string, read: boolean): Promise<boolean> {
  if (!supabaseAdminConfigured) return false;
  try {
    const db = createAdmin();
    const { error } = await db
      .from("notifications")
      .update({ read })
      .eq("id", notificationId);
    return !error;
  } catch {
    return false;
  }
}

export async function markAllReadInDB(role: NotifRole, userId?: string): Promise<boolean> {
  if (!supabaseAdminConfigured) return false;
  try {
    const db = createAdmin();
    let query = db.from("notifications").update({ read: true }).eq("role", role);
    if (userId) query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    const { error } = await query;
    return !error;
  } catch {
    return false;
  }
}

export async function deleteInDB(notificationId: string): Promise<boolean> {
  if (!supabaseAdminConfigured) return false;
  try {
    const db = createAdmin();
    const { error } = await db.from("notifications").delete().eq("id", notificationId);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteAllInDB(role: NotifRole, userId?: string): Promise<boolean> {
  if (!supabaseAdminConfigured) return false;
  try {
    const db = createAdmin();
    let query = db.from("notifications").delete().eq("role", role);
    if (userId) query = query.or(`user_id.is.null,user_id.eq.${userId}`);
    const { error } = await query;
    return !error;
  } catch {
    return false;
  }
}