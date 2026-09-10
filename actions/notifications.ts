"use server";

import { revalidatePath } from "next/cache";

import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  deleteAllNotifications,
  type NotifRole,
  type Notification,
} from "@/lib/notifications";
import {
  getNotificationsFromDB,
  setReadInDB,
  markAllReadInDB,
  deleteInDB,
  deleteAllInDB,
} from "@/lib/notifications-server";
import { supabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * Client-facing notification surface. Reads persist through the service-role
 * admin client when Supabase is configured and fall back to the in-memory
 * store (mock mode) otherwise. Every mutation revalidates the whole layout so
 * the header bell count refreshes.
 */

export type { NotifRole, Notification };

export async function fetchNotifications(
  role: NotifRole,
  userId?: string,
): Promise<{ notifs: Notification[]; unread: number; live: boolean }> {
  const uid = role === "admin" ? undefined : userId;
  if (supabaseAdminConfigured) {
    const live = await getNotificationsFromDB(role, uid);
    if (live) {
      return { notifs: live, unread: live.filter((n) => !n.read).length, live: true };
    }
  }
  return { notifs: getNotifications(role, uid), unread: getUnreadCount(role, uid), live: false };
}

export async function markReadAction(notificationId: string): Promise<void> {
  markRead(notificationId);
  await setReadInDB(notificationId, true);
  revalidatePath("/", "layout");
}

export async function markAllReadAction(role: NotifRole, userId?: string): Promise<void> {
  const uid = role === "admin" ? undefined : userId;
  markAllRead(role, uid);
  await markAllReadInDB(role, uid);
  revalidatePath("/", "layout");
}

export async function deleteNotificationAction(notificationId: string): Promise<void> {
  deleteNotification(notificationId);
  await deleteInDB(notificationId);
  revalidatePath("/", "layout");
}

export async function deleteAllNotificationsAction(role: NotifRole, userId?: string): Promise<void> {
  const uid = role === "admin" ? undefined : userId;
  deleteAllNotifications(role, uid);
  await deleteAllInDB(role, uid);
  revalidatePath("/", "layout");
}