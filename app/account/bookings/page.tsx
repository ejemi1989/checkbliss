import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { GuestDashboard } from "../guest-client";

export function generateMetadata(): Metadata {
  return { title: "Account — Bookings", robots: { index: false, follow: false } };
}

export default async function AccountBookingsPage() {
  const user = await getSession();
  return <GuestDashboard user={user} initialTab="bookings" />;
}
