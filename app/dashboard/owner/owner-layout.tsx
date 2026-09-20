import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import type { AuthUser } from "@/lib/auth";

const PRIMARY_NAV: NavItem[] = [
  { id: "home", label: "Dashboard", href: "/dashboard/owner", icon: "BarChart3" },
  { id: "properties", label: "Properties", href: "/dashboard/owner/properties", icon: "Building2" },
  { id: "bookings", label: "Bookings", href: "/dashboard/owner/bookings", icon: "Calendar" },
  { id: "claims", label: "Damage Claims", href: "/dashboard/owner/claims", icon: "Shield" },
  { id: "payouts", label: "Payouts", href: "/dashboard/owner/payouts", icon: "Receipt" },
  { id: "calendar", label: "Calendar Sync", href: "/dashboard/owner/calendar", icon: "Sync" },
  { id: "notifications", label: "Notifications", href: "/dashboard/owner/notifications", icon: "Bell" },
];

export function OwnerLayout({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  return (
    <DashboardShell
      user={user}
      brand="Owner"
      badge="Listings"
      primaryNav={PRIMARY_NAV}
      notifRole="owner"
    >
      {children}
    </DashboardShell>
  );
}

export type { AuthUser };
