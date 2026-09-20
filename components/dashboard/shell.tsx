"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";
import { NotificationBell } from "@/components/notification-bell";
import { logoutAction } from "@/actions/auth";
import type { AuthUser } from "@/lib/auth";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: IconName;
};

type Props = {
  user: AuthUser | null;
  brand: string;
  badge?: string;
  cities?: string[];
  primaryNav: NavItem[];
  secondaryNav?: NavItem[];
  children: ReactNode;
  notifRole: "admin" | "operator" | "owner";
};

/* Unified editorial dashboard shell.
   - Topbar: logo + brand + role pill + city pills + user
   - Sidebar: primary nav (main sections), secondary nav (settings + logout)
   - Content: editorial canvas with generous padding
   - Mobile: sidebar collapses, hamburger shows overlay
   - Uses dvh instead of h-screen per frontend-skill rule.
   - Logout is a Server Action form, not a GET route. */
export function DashboardShell({
  user,
  brand,
  badge,
  cities,
  primaryNav,
  secondaryNav = [],
  children,
  notifRole,
}: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = user?.name ?? "Guest";
  const displayEmail = user?.email ?? "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function isActive(href: string, id: string) {
    if (href === "/admin" || href === "/dashboard/operator" || href === "/dashboard/owner") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink font-sans antialiased">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden bg-ink/20 backdrop-blur-sm animate-slideIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur-md border-b border-hairline">
        <div className="flex items-center justify-between px-5 lg:px-10 h-16">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-bone-secondary text-ink-secondary cursor-pointer border-none bg-transparent transition-colors"
              aria-label="Open navigation"
            >
              <Icon.Hamburger />
            </button>
            <Link href="/" className="flex items-center gap-3 no-underline shrink-0">
              <Image
                src="/assets/images/logo/Logo-DG.png"
                alt="CheckinBliss"
                width={44}
                height={44}
                className="h-10 w-auto rounded-lg border border-hairline p-1 bg-bone-secondary"
              />
              <div className="hidden sm:block">
                <p className="font-display text-base leading-none text-ink">{brand}</p>
                <p className="text-[10px] font-sans uppercase tracking-[0.18em] text-ink-tertiary mt-1">
                  CheckinBliss
                </p>
              </div>
            </Link>
            {badge && (
              <span className="hidden md:inline-flex text-[10px] font-sans font-semibold uppercase tracking-[0.12em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">
                {badge}
              </span>
            )}
            {cities && cities.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5">
                {cities.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] font-sans font-medium uppercase tracking-[0.1em] rounded-full border border-hairline text-ink-secondary bg-bone-secondary px-2.5 py-1"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell role={notifRole} userId={user?.id} />
            <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-hairline">
              <div className="text-right">
                <p className="text-xs font-sans font-semibold text-ink leading-tight">{displayName}</p>
                {displayEmail && (
                  <p className="text-[10px] text-ink-tertiary leading-tight mt-0.5">{displayEmail}</p>
                )}
              </div>
              <div className="w-9 h-9 rounded-full bg-primary text-white text-xs font-sans font-semibold flex items-center justify-center">
                {initials}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-lg:flex-col">
        {/* Sidebar */}
        <aside
          className={`w-64 shrink-0 border-r border-hairline bg-canvas lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto scroll-thin ${
            sidebarOpen ? "block fixed inset-y-16 left-0 right-0 z-40 bg-canvas overflow-y-auto" : "hidden lg:block"
          }`}
        >
          <nav className="px-4 py-8 space-y-8">
            <NavGroup items={primaryNav} pathname={pathname} isActive={isActive} onNavigate={() => setSidebarOpen(false)} />
            {secondaryNav.length > 0 && (
              <NavGroup
                items={secondaryNav}
                pathname={pathname}
                isActive={isActive}
                onNavigate={() => setSidebarOpen(false)}
                trailing={
                  <form action={logoutAction} className="m-0">
                    <button
                      type="submit"
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-sans font-medium text-ink-secondary hover:bg-bone-secondary hover:text-ink bg-transparent border-none cursor-pointer text-left transition-colors"
                    >
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center text-ink-tertiary">
                        <Icon.LogOut />
                      </span>
                      <span>Sign out</span>
                    </button>
                  </form>
                }
              />
            )}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 px-5 py-10 lg:px-12 lg:py-12">{children}</main>
      </div>
    </div>
  );
}

function NavGroup({
  items,
  pathname,
  isActive,
  onNavigate,
  trailing,
}: {
  items: NavItem[];
  pathname: string;
  isActive: (href: string, id: string) => boolean;
  onNavigate: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div>
      <ul className="space-y-1">
        {items.map((item) => {
          const IconComp = Icon[item.icon];
          const active = isActive(item.href, item.id);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-sans font-medium transition-colors no-underline ${
                  active
                    ? "bg-primary-bg text-primary-dark"
                    : "text-ink-secondary hover:bg-bone-secondary hover:text-ink"
                }`}
              >
                <span
                  className={`w-4 h-4 shrink-0 flex items-center justify-center transition-colors ${
                    active ? "text-primary" : "text-ink-tertiary group-hover:text-ink-secondary"
                  }`}
                >
                  <IconComp />
                </span>
                <span className="flex-1">{item.label}</span>
                {active && <span className="w-1 h-4 rounded-full bg-primary" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
      {trailing && <div className="mt-6 pt-6 border-t border-hairline">{trailing}</div>}
    </div>
  );
}
