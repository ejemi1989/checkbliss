import type { Metadata } from "next";
import { getAdminUsersFromDB } from "@/lib/data-server";
import { AdminUsersView } from "../users-client";

export const metadata: Metadata = { title: "Admin — Users" };

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getAdminUsersFromDB();
  return <AdminUsersView initialUsers={users} />;
}