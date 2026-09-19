import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { getOwnerPayoutsFromDB, getOwnerBookingsFromDB, getOwnerPropertiesFromDB } from "@/lib/data-server";
import { OwnerDashboard } from "./client";

export function generateMetadata(): Metadata {
  return { title: "Owner — Dashboard", robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function OwnerHomePage() {
  const user = await getSession();
  const ownerId = user?.id ?? "";
  const [initialPayouts, initialBookings, initialProperties] = await Promise.all([
    user?.role === "owner" ? getOwnerPayoutsFromDB(ownerId) : Promise.resolve(undefined),
    user?.role === "owner" ? getOwnerBookingsFromDB(ownerId) : Promise.resolve(undefined),
    user?.role === "owner" ? getOwnerPropertiesFromDB(ownerId) : Promise.resolve(undefined),
  ]);
  return (
    <OwnerDashboard
      user={user}
      initialTab="home"
      initialPayouts={initialPayouts}
      initialBookings={initialBookings}
      initialProperties={initialProperties}
    />
  );
}
