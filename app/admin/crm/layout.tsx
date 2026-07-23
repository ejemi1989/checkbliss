import Link from "next/link";

const NAV = [
  { href: "/admin/crm/inbox", label: "Inbox" },
  { href: "/admin/crm/contacts", label: "Contacts" },
  { href: "/admin/crm/claims", label: "Damage Claims" },
  { href: "/admin/crm/inspections", label: "Inspections" },
  { href: "/admin/crm/broadcast", label: "Broadcast" },
  { href: "/admin/crm/audit", label: "Audit Log" },
  { href: "/admin/crm/analytics", label: "Analytics" },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
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
