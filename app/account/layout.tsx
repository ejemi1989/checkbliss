import { getSession } from "@/actions/auth";
import { AccountLayout } from "./account-layout";

export const metadata = { robots: { index: false, follow: false } };

export default async function AccountDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <AccountLayout user={user}>{children}</AccountLayout>;
}
