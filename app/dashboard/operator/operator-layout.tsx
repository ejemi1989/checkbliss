"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import type { AuthUser } from "@/lib/auth";

/* ---------- icons ---------- */
const I = {
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  building2: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" /></svg>,
  clipboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>,
  checkSquare: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 12 2 2 4-4" /></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  bed: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  barChart3: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16V9" /><path d="M12 16V6" /><path d="M17 16v-4" /></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  hamburger: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  logOut: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  messageCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
};

type OperatorSection = "overview" | "properties" | "onboarding" | "verification" | "inspections" | "claims" | "bookings" | "owners" | "performance" | "whatsapp";

const NAV_ITEMS: { id: OperatorSection; icon: keyof typeof I; label: string; href: string }[] = [
  { id: "overview", icon: "barChart3", label: "Overview", href: "/dashboard/operator" },
  { id: "properties", icon: "building2", label: "Properties", href: "/dashboard/operator/properties" },
  { id: "onboarding", icon: "plus", label: "Onboarding", href: "/dashboard/operator/onboarding" },
  { id: "verification", icon: "checkSquare", label: "Verification", href: "/dashboard/operator/verification" },
  { id: "inspections", icon: "clipboard", label: "Inspections", href: "/dashboard/operator/inspections" },
  { id: "claims", icon: "shield", label: "Damage Claims", href: "/dashboard/operator/claims" },
  { id: "bookings", icon: "bed", label: "Bookings", href: "/dashboard/operator/bookings" },
  { id: "owners", icon: "users", label: "Owners", href: "/dashboard/operator/owners" },
  { id: "whatsapp", icon: "messageCircle", label: "WhatsApp", href: "/dashboard/operator/whatsapp" },
  { id: "performance", icon: "barChart3", label: "Performance", href: "/dashboard/operator/performance" },
];

function getActiveSection(pathname: string): OperatorSection {
  if (pathname === "/dashboard/operator") return "overview";
  for (const item of NAV_ITEMS) {
    if (item.href !== "/dashboard/operator" && pathname.startsWith(item.href)) return item.id;
  }
  return "overview";
}

export function OperatorLayout({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const active = getActiveSection(pathname);

  const assignedCities: string[] = user?.assignedCities ?? [];
  const displayName = user?.name ?? "Operator";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-canvas">
      {/* mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 lg:hidden bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* header */}
      <header className="border-b border-hairline bg-white px-8 py-4 flex items-center justify-between max-sm:px-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.hamburger}</button>
          <Link href="/" className="no-underline flex items-center gap-x-2">
            <img src="/assets/images/logo/Logo1.png" alt="CheckinBliss" className="h-11 w-auto rounded-md border border-hairline p-1 bg-soft" />
          </Link>
          <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.5px] rounded-full bg-lagoon/15 text-lagoon-dark px-2.5 py-0.5">Operator</span>
          {assignedCities.length > 0 && (
            <span className="text-[10px] font-sans font-medium uppercase tracking-[0.5px] rounded-full bg-soft text-ink-secondary px-2.5 py-0.5">
              {assignedCities.join(" + ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-x-3">
          <NotificationBell role="operator" userId={user?.id} />
          <Link href="/logout" className="text-xs font-sans font-medium text-ink-secondary hover:text-ink transition-colors bg-transparent border-none no-underline">Sign out</Link>
        </div>
      </header>

      <div className="flex max-sm:flex-col">
        {/* sidebar */}
        <nav className={`w-56 border-r border-hairline bg-white shrink-0 max-sm:w-full max-sm:border-r-0 max-sm:border-b lg:block ${sidebarOpen ? "block" : "hidden"}`}>
          <div className="p-5 max-sm:p-3 max-sm:flex max-sm:gap-2 max-sm:overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`w-full flex items-center gap-x-3 px-4 py-3 rounded-lg text-sm font-sans font-medium transition-colors mb-1 last:mb-0 max-sm:whitespace-nowrap max-sm:flex-shrink-0 no-underline ${isActive ? "bg-primary-bg text-primary" : "text-ink-secondary hover:bg-bone"}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="w-4 h-4 shrink-0 flex items-center justify-center">{I[item.icon]}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* main */}
        <main className="flex-1 p-8 max-sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
