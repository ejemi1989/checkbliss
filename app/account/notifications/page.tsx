import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { GuestDashboard } from "../guest-client";

export function generateMetadata(): Metadata {
  return { title: "Account — Notifications", robots: { index: false, follow: false } };
}

export default async function AccountNotificationsPage() {
  const user = await getSession();
  return <GuestDashboard user={user} initialTab="notifications" />;
}
