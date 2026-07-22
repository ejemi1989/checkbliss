/**
 * Notification system — in-memory store for mock mode.
 * Production: persists to `notifications` table via `createAdmin()`.
 */

export type NotifRole = "admin" | "operator" | "owner" | "guest";

export interface Notification {
  id: string;
  role: NotifRole;
  user_id?: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  created_at: string;
}

const store: Notification[] = [
  /* --- admin --- */
  { id: "n1", role: "admin", title: "New damage claim", body: "Claim C001 — Broken glass table at The Palms Maisonette. £350 claimed.", link: "/admin?view=claims", read: false, created_at: "2026-06-22T10:00:00Z" },
  { id: "n2", role: "admin", title: "Operator onboarding", body: "Yetunde Bakare joined Lagos — onboarding in progress.", link: "/admin?view=operators", read: true, created_at: "2026-06-05T09:30:00Z" },
  { id: "n3", role: "admin", title: "New property submitted", body: "Lekki Beach House (Lagos) pending review.", link: "/admin?view=operators", read: false, created_at: "2026-06-12T14:00:00Z" },
  /* --- operator --- */
  { id: "n4", role: "operator", title: "Inspection due", body: "Unit 1 — The Palms Maisonette. Chidi Okafor checks out today at 11:00.", read: false, created_at: "2026-06-22T08:00:00Z" },
  { id: "n5", role: "operator", title: "Property approved", body: "GRA Executive Suite approved by admin.", read: false, created_at: "2026-06-07T12:00:00Z" },
  { id: "n6", role: "operator", title: "Verification reminder", body: "June monthly verification for 3 properties due this week.", read: true, created_at: "2026-06-20T09:00:00Z" },
  /* --- owner --- */
  { id: "n7", role: "owner", title: "New booking", body: "Chidi Okafor booked The Palms Maisonette · Unit 1. Jun 18–22, £840.", read: false, created_at: "2026-06-18T14:00:00Z" },
  { id: "n8", role: "owner", title: "Payout processed", body: "June payout of £3,000 sent to your account.", read: false, created_at: "2026-06-05T10:00:00Z" },
  { id: "n9", role: "owner", title: "Damage claim resolved", body: "Broken glass claim for The Palms Maisonette — £350 captured from deposit.", read: true, created_at: "2026-06-08T11:00:00Z" },
];

export function getNotifications(role: NotifRole, userId?: string): Notification[] {
  const byRole = store.filter((n) => n.role === role);
  const byUser = userId ? byRole.filter((n) => !n.user_id || n.user_id === userId) : byRole;
  return byUser.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getUnreadCount(role: NotifRole, userId?: string): number {
  const byRole = store.filter((n) => n.role === role && !n.read);
  return userId ? byRole.filter((n) => !n.user_id || n.user_id === userId).length : byRole.length;
}

export function markRead(notificationId: string): void {
  const n = store.find((x) => x.id === notificationId);
  if (n) n.read = true;
}

export function markAllRead(role: NotifRole, userId?: string): void {
  const byRole = store.filter((n) => n.role === role);
  const targets = userId ? byRole.filter((n) => !n.user_id || n.user_id === userId) : byRole;
  targets.forEach((n) => { n.read = true; });
}

export function enqueueNotification(
  role: NotifRole,
  title: string,
  body: string,
  link?: string,
  userId?: string,
): Notification {
  const n: Notification = {
    id: `n${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role,
    user_id: userId,
    title,
    body,
    link,
    read: false,
    created_at: new Date().toISOString(),
  };
  store.unshift(n);
  return n;
}

/**
 * Sends a notification to admin, the affected user, and optionally the actor.
 * Admin gets a role-scoped notification (always visible to any admin).
 * The affected user gets a user-scoped notification (visible only to them).
 * The actor gets a user-scoped confirmation (visible only to them).
 */
export function notifyBoth(
  userRole: NotifRole,
  userId: string | undefined,
  title: string,
  body: string,
  link?: string,
  adminLink?: string,
  actorRole?: NotifRole,
  actorId?: string,
): void {
  // Notify admin
  enqueueNotification("admin", title, body, adminLink ?? link);
  // Notify the affected user
  if (userId) {
    enqueueNotification(userRole, title, body, link, userId);
  }
  // Notify the actor (operator/owner who performed the action)
  if (actorRole && actorId && actorRole !== "admin") {
    enqueueNotification(actorRole, `You ${title.toLowerCase()}`, body, link, actorId);
  }
}
