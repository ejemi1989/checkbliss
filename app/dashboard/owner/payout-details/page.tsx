import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { getOwnerPayoutDetails } from "@/actions/owner-payout-details";
import { OwnerDashboard } from "../client";

export function generateMetadata(): Metadata {
  return { title: "Owner — Payout Details", robots: { index: false, follow: false } };
}

export default async function OwnerPayoutDetailsPage() {
  const user = await getSession();
  const details = await getOwnerPayoutDetails();
  return <OwnerDashboard user={user} initialTab="payout-details" initialPayoutDetails={details} />;
}
