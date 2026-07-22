import type { Metadata } from "next";
import { AdminAuditView } from "../audit-client";

export const metadata: Metadata = { title: "Admin — Audit Log" };

export default function AdminAuditPage() {
  return <AdminAuditView />;
}
