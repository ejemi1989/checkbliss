import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { checkAdminGate } from "@/lib/admin-gate";
import { AdminLayout } from "./admin-layout";

export default async function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const gate = await checkAdminGate();
  if (!gate.ok) redirect("/admin/login");

  const user = await getSession();
  return <AdminLayout user={user}>{children}</AdminLayout>;
}
