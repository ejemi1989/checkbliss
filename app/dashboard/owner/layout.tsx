import { getSession } from "@/actions/auth";
import { OwnerLayout } from "./owner-layout";

export const metadata = { robots: { index: false, follow: false } };

export default async function OwnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return <OwnerLayout user={user}>{children}</OwnerLayout>;
}
