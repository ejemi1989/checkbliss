import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { OperatorDashboard } from "../client";

export function generateMetadata(): Metadata {
  return { title: "Operator — Properties", robots: { index: false, follow: false } };
}

export default async function OperatorPropertiesPage() {
  const user = await getSession();
  return <OperatorDashboard user={user} initialTab="curation" />;
}
