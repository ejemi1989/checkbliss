import type { Metadata } from "next";
import { AdminFinanceView } from "../finance-client";

export const metadata: Metadata = { title: "Admin — Finance" };

export default function AdminFinancePage() {
  return <AdminFinanceView />;
}
