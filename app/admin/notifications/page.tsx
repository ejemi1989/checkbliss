import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications-view";
import { PageHeader } from "@/components/dashboard/page-header";

export const metadata: Metadata = { title: "Admin — Notifications" };

export default function AdminNotificationsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="System events, action prompts, and platform alerts."
      />
      <NotificationsView role="admin" />
    </div>
  );
}
