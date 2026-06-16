import { getSession } from "@/actions/auth";
import { AdminDashboard } from "./client";

export default async function AdminPage() {
  const user = await getSession();
  return <AdminDashboard user={user} />;
}
