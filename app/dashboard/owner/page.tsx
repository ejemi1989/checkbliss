import { getSession } from "@/actions/auth";
import { OwnerDashboard } from "./client";

export default async function OwnerDashboardPage() {
  const user = await getSession();
  return <OwnerDashboard user={user} />;
}
