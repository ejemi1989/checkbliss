import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { getGuestBookingsFromDB } from "@/lib/data-guest";
import { GuestDashboard } from "../guest-client";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return { title: "Account — Past Stays", robots: { index: false, follow: false } };
}

export default async function AccountHistoryPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/history");
  const bookings = await getGuestBookingsFromDB(user.email);
  return <GuestDashboard user={user} initialTab="history" bookings={bookings} />;
}
