"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { NotificationBell } from "@/components/notification-bell";
import type { AuthUser } from "@/lib/auth";

/* ---------- icons ---------- */
const I = {
  barChart3: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16V9" /><path d="M12 16V6" /><path d="M17 16v-4" /></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  userCog: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="15" r="3" /><circle cx="9" cy="7" r="4" /><path d="M10 15H6a4 4 0 0 0-4 4v1" /><path d="M21.7 16.4l-.9-.3" /><path d="M15.2 13.9l-.9-.3" /><path d="M16.6 18.7l.3-.9" /><path d="M19.1 12.2l.3-.9" /><path d="M19.6 18.7l-.4-1" /><path d="M16.8 12.3l-.4-1" /><path d="M14.3 16.6l1-.4" /><path d="M20.7 13.8l1-.4" /></svg>,
  coins: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></svg>,
  building2: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" /></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  list: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  logOut: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  messageCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  hamburger: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
};

type AdminSection = "overview" | "claims" | "operators" | "finance" | "properties" | "users" | "audit" | "notifications" | "crm" | "settings";

const NAV_ITEMS: { id: AdminSection; icon: keyof typeof I; label: string; href: string }[] = [
  { id: "overview", icon: "barChart3", label: "Dashboard", href: "/admin" },
  { id: "claims", icon: "shield", label: "Damage Claims", href: "/admin/claims" },
  { id: "operators", icon: "userCog", label: "Operators", href: "/admin/operators" },
  { id: "finance", icon: "coins", label: "Finance", href: "/admin/finance" },
  { id: "properties", icon: "building2", label: "Properties", href: "/admin/properties" },
  { id: "users", icon: "users", label: "Users", href: "/admin/users" },
  { id: "audit", icon: "list", label: "Audit Log", href: "/admin/audit" },
  { id: "crm", icon: "messageCircle", label: "WhatsApp CRM", href: "/admin/crm/inbox" },
  { id: "notifications", icon: "bell", label: "Notifications", href: "/admin/notifications" },
];

function getActiveSection(pathname: string): AdminSection {
  if (pathname === "/admin") return "overview";
  for (const item of NAV_ITEMS) {
    if (item.href !== "/admin" && pathname.startsWith(item.href)) return item.id;
  }
  return "overview";
}

export function AdminLayout({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const active = getActiveSection(pathname);

  const displayName = user?.name ?? "Admin";
  const displayEmail = user?.email ?? "admin@checkbliss.com";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink font-sans antialiased">
      {/* mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 lg:hidden bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-hairline shrink-0 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-hairline flex items-center justify-between">
          <Link href="/" className="no-underline">
            <img src="/assets/images/logo/Logo1.png" alt="CheckinBliss" className="h-7 w-auto" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-7 h-7 flex items-center justify-center text-ink-secondary">{I.x}</button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 scroll-thin">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-primary px-4 mb-2 mt-2">Admin</p>
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.id;
              const className = `w-full flex items-center gap-x-3 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none text-left transition-colors ${
                isActive ? "bg-primary text-white" : "text-ink-secondary hover:bg-primary-bg hover:text-primary bg-transparent"
              }`;
              return (
                <Link key={item.id} href={item.href} className={`${className} no-underline`} onClick={() => setSidebarOpen(false)}>
                  <span className="w-4 shrink-0 flex items-center justify-center">{I[item.icon]}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-ink-secondary px-4 mt-6 mb-2">Support</p>
          <nav className="space-y-0.5">
            <Link href="/admin/settings" className={`w-full flex items-center gap-x-3 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none text-left transition-colors no-underline ${active === "settings" ? "bg-primary text-white" : "text-ink-secondary hover:bg-primary-bg hover:text-primary bg-transparent"}`}>
              <span className="w-4 shrink-0 flex items-center justify-center">{I.settings}</span><span>Settings</span>
            </Link>
            <form action={logoutAction}>
              <button className="w-full flex items-center gap-x-3 px-4 py-2.5 rounded-xl text-sm font-medium text-ink-secondary hover:bg-primary-bg hover:text-primary cursor-pointer border-none text-left bg-transparent font-sans">
                <span className="w-4 shrink-0 flex items-center justify-center">{I.logOut}</span><span>Logout</span>
              </button>
            </form>
          </nav>
        </div>

        <div className="p-4 border-t border-hairline shrink-0 bg-primary-bg">
          <div className="flex items-center gap-x-3">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">{initials}</div>
            <div>
              <div className="text-sm font-semibold text-ink">{displayName}</div>
              <div className="text-xs text-ink-secondary">{displayEmail}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-hairline flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-x-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.hamburger}</button>
            <div className="flex items-center gap-x-2">
              <span className="text-sm font-semibold text-ink">Admin Dashboard</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-primary text-white">Founder access</span>
            </div>
          </div>
          <div className="flex items-center gap-x-2">
            <NotificationBell role="admin" />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 scroll-thin" onClick={() => sidebarOpen && setSidebarOpen(false)}>
          {children}
        </div>
      </div>
    </div>
  );
}
