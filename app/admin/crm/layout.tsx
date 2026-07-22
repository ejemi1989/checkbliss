import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { checkAdminGate } from "@/lib/admin-gate";

const NAV = [
  { href: "/admin/crm/inbox", label: "Inbox" },
  { href: "/admin/crm/contacts", label: "Contacts" },
  { href: "/admin/crm/claims", label: "Damage Claims" },
  { href: "/admin/crm/inspections", label: "Inspections" },
  { href: "/admin/crm/broadcast", label: "Broadcast" },
  { href: "/admin/crm/audit", label: "Audit Log" },
  { href: "/admin/crm/analytics", label: "Analytics" },
];

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  const gate = await checkAdminGate();
  if (!gate.ok) {
    return (
      <div className="flex items-center justify-center px-6 py-20">
        <div className="max-w-md w-full bg-card border border-line rounded-[var(--radius-lg)] p-8 text-center">
          <h1 className="font-sans text-2xl text-ink mb-2">Admin access required</h1>
          <p className="text-sm text-ink-secondary mb-4">{gate.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="font-sans text-sm font-medium text-ink-primary">WhatsApp CRM</span>
      </div>

      <nav className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-ink-secondary hover:text-ink hover:bg-primary-bg transition-colors no-underline"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
