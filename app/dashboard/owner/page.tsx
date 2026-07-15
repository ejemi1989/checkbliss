import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { OwnerDashboard } from "./client";

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

export default async function OwnerDashboardPage() {
  const user = await getSession();
  return <OwnerDashboard user={user} />;
}
