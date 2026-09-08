import type { Metadata } from "next";
import { getPayoutLedgerFromDB, getPayoutAlertsFromDB } from "@/lib/data-server";
import { AdminPayoutsView } from "./payouts-client";

export function generateMetadata(): Metadata {
  return { title: "Admin — Payouts", robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const [ledger, alerts] = await Promise.all([
    getPayoutLedgerFromDB(),
    getPayoutAlertsFromDB(),
  ]);
  return <AdminPayoutsView ledger={ledger} alerts={alerts} />;
}
