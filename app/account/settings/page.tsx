import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { GuestDashboard } from "../guest-client";

export function generateMetadata(): Metadata {
  return { title: "Account — Settings", robots: { index: false, follow: false } };
}

export default async function AccountSettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/settings");
  return <GuestDashboard user={user} initialTab="settings" />;
}
