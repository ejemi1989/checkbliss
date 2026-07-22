import type { Metadata } from "next";
import { AdminOverview } from "./overview-client";

export const metadata: Metadata = { title: "Admin — Overview" };

export default function AdminOverviewPage() {
  return <AdminOverview />;
}
