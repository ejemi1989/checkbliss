import type { Metadata } from "next";
import { AdminClaimsView } from "../claims-client";

export const metadata: Metadata = { title: "Admin — Damage Claims" };

export default function AdminClaimsPage() {
  return <AdminClaimsView />;
}
