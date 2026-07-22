import type { Metadata } from "next";
import { AdminPropertiesView } from "../properties-client";

export const metadata: Metadata = { title: "Admin — Properties" };

export default function AdminPropertiesPage() {
  return <AdminPropertiesView />;
}
