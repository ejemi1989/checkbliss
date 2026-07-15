import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { OperatorDashboard } from "./client";

export function generateMetadata(): Metadata {
  return { robots: { index: false, follow: false } };
}

export default async function OperatorDashboardPage() {
  const user = await getSession();
  return <OperatorDashboard user={user} />;
}
