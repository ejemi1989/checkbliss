import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import type { AuthUser } from "@/lib/auth";

const PRIMARY_NAV: NavItem[] = [
  { id: "overview", label: "Overview", href: "/dashboard/operator", icon: "BarChart3" },
  { id: "properties", label: "Properties", href: "/dashboard/operator/properties", icon: "Building2" },
  { id: "onboarding", label: "Onboarding", href: "/dashboard/operator/onboarding", icon: "Plus" },
  { id: "verification", label: "Verification", href: "/dashboard/operator/verification", icon: "CheckSquare" },
  { id: "inspections", label: "Inspections", href: "/dashboard/operator/inspections", icon: "Clipboard" },
  { id: "claims", label: "Damage Claims", href: "/dashboard/operator/claims", icon: "Shield" },
  { id: "bookings", label: "Bookings", href: "/dashboard/operator/bookings", icon: "Bed" },
  { id: "owners", label: "Owners", href: "/dashboard/operator/owners", icon: "Users" },
  { id: "whatsapp", label: "WhatsApp", href: "/dashboard/operator/whatsapp", icon: "MessageCircle" },
  { id: "performance", label: "Performance", href: "/dashboard/operator/performance", icon: "BarChart3" },
];

export function OperatorLayout({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  return (
    <DashboardShell
      user={user}
      brand="Operator"
      badge="Field operations"
      cities={user?.assignedCities ?? []}
      primaryNav={PRIMARY_NAV}
      notifRole="operator"
    >
      {children}
    </DashboardShell>
  );
}

export type { AuthUser };
