import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications-view";

export const metadata: Metadata = { title: "Admin — Notifications" };

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-ink">Notifications</h1>
      <NotificationsView role="admin" />
    </div>
  );
}
