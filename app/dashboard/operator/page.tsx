import { getSession } from "@/actions/auth";
import { OperatorDashboard } from "./client";

export default async function OperatorDashboardPage() {
  const user = await getSession();
  return <OperatorDashboard user={user} />;
}
