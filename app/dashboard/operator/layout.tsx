import { getSession } from "@/actions/auth";
import { OperatorLayout } from "./operator-layout";

export const metadata = { robots: { index: false, follow: false } };

export default async function OperatorDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <OperatorLayout user={user}>{children}</OperatorLayout>;
}
