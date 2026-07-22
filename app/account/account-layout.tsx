"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import type { AuthUser } from "@/lib/auth";

const I = {
  barChart3: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16V9" /><path d="M12 16V6" /><path d="M17 16v-4" /></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  hamburger: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
};

type AccountSection = "overview" | "bookings" | "history" | "claims" | "settings" | "notifications";

const NAV_ITEMS: { id: AccountSection; icon: keyof typeof I; label: string; href: string }[] = [
  { id: "overview", icon: "barChart3", label: "Overview", href: "/account" },
  { id: "bookings", icon: "calendar", label: "Upcoming", href: "/account/bookings" },
  { id: "history", icon: "clock", label: "Past Stays", href: "/account/history" },
  { id: "claims", icon: "shield", label: "My Claims", href: "/account/claims" },
  { id: "settings", icon: "settings", label: "Settings", href: "/account/settings" },
  { id: "notifications", icon: "bell", label: "Notifications", href: "/account/notifications" },
];

function getActiveSection(pathname: string): AccountSection {
  if (pathname === "/account") return "overview";
  for (const item of NAV_ITEMS) {
    if (item.href !== "/account" && pathname.startsWith(item.href)) return item.id;
  }
  return "overview";
}

export function AccountLayout({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const active = getActiveSection(pathname);

  const displayName = user?.name ?? "Guest";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-canvas">
      {sidebarOpen && <div className="fixed inset-0 z-30 lg:hidden bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      <header className="border-b border-hairline bg-white px-8 py-4 flex items-center justify-between max-sm:px-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.hamburger}</button>
          <Link href="/" className="no-underline">
            <img src="/assets/images/logo/Logo1.png" alt="CheckinBliss" className="h-7 w-auto" />
          </Link>
        </div>
        <div className="flex items-center gap-x-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary text-white text-[11px] font-sans font-semibold flex items-center justify-center">{initials}</div>
            <span className="text-xs font-sans font-medium text-ink-secondary">{displayName}</span>
          </div>
          <form action={logoutAction}>
            <button className="text-xs font-sans font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer bg-transparent border-none">Sign out</button>
          </form>
        </div>
      </header>

      <div className="flex max-sm:flex-col">
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

        <main className="flex-1 p-8 max-sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
