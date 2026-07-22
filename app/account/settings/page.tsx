import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { GuestDashboard } from "../guest-client";

export function generateMetadata(): Metadata {
  return { title: "Account — Settings", robots: { index: false, follow: false } };
}

export default async function AccountSettingsPage() {
  const user = await getSession();
  return <GuestDashboard user={user} initialTab="settings" />;
}
