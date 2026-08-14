import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { checkOperatorGate } from "@/lib/operator-gate";
import { OperatorLayout } from "./operator-layout";

export const metadata = { robots: { index: false, follow: false } };

export default async function OperatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const gate = await checkOperatorGate();
  if (!gate.ok) redirect("/login?next=/dashboard/operator");

  const user = await getSession();
  return <OperatorLayout user={user}>{children}</OperatorLayout>;
}
