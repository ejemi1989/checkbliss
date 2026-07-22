import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { OwnerDashboard } from "../client";

export function generateMetadata(): Metadata {
  return { title: "Owner — Notifications", robots: { index: false, follow: false } };
}

export default async function OwnerNotificationsPage() {
  const user = await getSession();
  return <OwnerDashboard user={user} initialTab="notifications" />;
}
