import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { GuestDashboard } from "../guest-client";

export function generateMetadata(): Metadata {
  return { title: "Account — Notifications", robots: { index: false, follow: false } };
}

export default async function AccountNotificationsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/notifications");
  return <GuestDashboard user={user} initialTab="notifications" />;
}
