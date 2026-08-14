import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { checkOwnerGate } from "@/lib/owner-gate";
import { OwnerLayout } from "./owner-layout";

export const metadata = { robots: { index: false, follow: false } };

export default async function OwnerDashboardLayout({ children }: { children: React.ReactNode }) {
  const gate = await checkOwnerGate();
  if (!gate.ok) redirect("/login?next=/dashboard/owner");

  const user = await getSession();
  return <OwnerLayout user={user}>{children}</OwnerLayout>;
}
