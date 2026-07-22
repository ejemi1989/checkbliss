import type { Metadata } from "next";
import { AdminUsersView } from "../users-client";

export const metadata: Metadata = { title: "Admin — Users" };

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
