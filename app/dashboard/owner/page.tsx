import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { getOwnerPayoutsFromDB } from "@/lib/data-server";
import { OwnerDashboard } from "./client";

export function generateMetadata(): Metadata {
  return { title: "Owner — Dashboard", robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function OwnerHomePage() {
  const user = await getSession();
  const initialPayouts = user?.role === "owner" ? await getOwnerPayoutsFromDB(user.id) : undefined;
  return <OwnerDashboard user={user} initialTab="home" initialPayouts={initialPayouts} />;
}
