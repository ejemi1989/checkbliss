import Link from "next/link";
import { Icon } from "@/components/icons";

const NAV = [
  { href: "/admin/crm/inbox", label: "Inbox", icon: "MessageCircle" as const },
  { href: "/admin/crm/contacts", label: "Contacts", icon: "Users" as const },
  { href: "/admin/crm/claims", label: "Damage Claims", icon: "Shield" as const },
  { href: "/admin/crm/inspections", label: "Inspections", icon: "Clipboard" as const },
  { href: "/admin/crm/broadcast", label: "Broadcast", icon: "Bell" as const },
  { href: "/admin/crm/audit", label: "Audit Log", icon: "List" as const },
  { href: "/admin/crm/analytics", label: "Analytics", icon: "BarChart3" as const },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-10">
      <nav className="pb-2">
        <ul className="flex gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const IconComp = Icon[item.icon];
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-sans font-semibold text-ink-secondary hover:bg-bone-secondary hover:text-ink transition-colors no-underline"
                >
                  <IconComp size={14} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
