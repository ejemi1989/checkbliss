import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import type { AuthUser } from "@/lib/auth";

const PRIMARY_NAV: NavItem[] = [
  { id: "overview", label: "Dashboard", href: "/admin", icon: "BarChart3" },
  { id: "claims", label: "Damage Claims", href: "/admin/claims", icon: "Shield" },
  { id: "operators", label: "Operators", href: "/admin/operators", icon: "UserCog" },
  { id: "finance", label: "Finance", href: "/admin/finance", icon: "Coins" },
  { id: "payouts", label: "Owner Payouts", href: "/admin/payouts", icon: "Coins" },
  { id: "properties", label: "Properties", href: "/admin/properties", icon: "Building2" },
  { id: "users", label: "Users", href: "/admin/users", icon: "Users" },
  { id: "audit", label: "Audit Log", href: "/admin/audit", icon: "List" },
  { id: "crm", label: "WhatsApp CRM", href: "/admin/crm/inbox", icon: "MessageCircle" },
  { id: "notifications", label: "Notifications", href: "/admin/notifications", icon: "Bell" },
];

const SECONDARY_NAV: NavItem[] = [
  { id: "settings", label: "Settings", href: "/admin/settings", icon: "Settings" },
];

export function AdminLayout({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  return (
    <DashboardShell
      user={user}
      brand="Operations"
      badge="Founder access"
      primaryNav={PRIMARY_NAV}
      secondaryNav={SECONDARY_NAV}
      notifRole="admin"
    >
      {children}
    </DashboardShell>
  );
}

export type { AuthUser };
