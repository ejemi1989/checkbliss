"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { formatMinor } from "@/lib/currency";
import type { AuthUser } from "@/lib/auth";
import {
  getAdminClaims,
  getAdminOperators,
  getAdminFinance,
  getAdminProperties,
  getAdminUsers,
  getAdminAudit,
  getAdminStats,
} from "@/lib/data";
import { decideClaim } from "@/actions/claims";
import { createOperator, updateOperator, suspendProperty, suspendOperator } from "@/actions/operators";
import { decideCuration } from "@/actions/curation";
import { InspectionsView } from "@/components/admin/inspections-view";
import { CurationView } from "@/components/admin/curation-view";
import { VerificationView } from "@/components/admin/verification-view";
import { BookingsView } from "@/components/admin/bookings-view";
import { updateProperty } from "@/actions/properties";
import { logoutAction } from "@/actions/auth";
import type { PropertyPhoto } from "@/lib/media";
import { NotificationBell } from "@/components/notification-bell";
import { NotificationsView } from "@/components/notifications-view";

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
  clipboardList: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>,
  checkSquare: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  checkCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  helpCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  hamburger: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  messageCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
};

type AdminView = "home" | "claims" | "operators" | "finance" | "properties" | "users" | "audit" | "notifications" | "inspections" | "curation" | "verification" | "bookings" | "crm";

/* ---------- sidebar config ---------- */
const SIDEBAR_BASE: { id: AdminView; icon: keyof typeof I; label: string; href?: string }[] = [
  { id: "home", icon: "barChart3", label: "Dashboard" },
  { id: "inspections", icon: "clipboardList", label: "Inspections" },
  { id: "curation", icon: "checkSquare", label: "Curation" },
  { id: "claims", icon: "shield", label: "Damage Claims" },
  { id: "operators", icon: "userCog", label: "Operators" },
  { id: "finance", icon: "coins", label: "Finance" },
  { id: "properties", icon: "building2", label: "Properties" },
  { id: "users", icon: "users", label: "Users" },
  { id: "bookings", icon: "calendar", label: "Bookings" },
  { id: "verification", icon: "checkCircle", label: "Verification" },
  { id: "audit", icon: "list", label: "Audit Log" },
  { id: "crm", icon: "messageCircle", label: "WhatsApp CRM", href: "/admin/crm/inbox" },
  { id: "notifications", icon: "bell", label: "Notifications" },
];

/* ---------- helpers ---------- */
function fmt(n: number) { return formatMinor(n); }
function statusLabel(s: string) { return s.replace(/_/g, " "); }

/* ---------- component ---------- */
export function AdminDashboard({ user }: { user: AuthUser | null }) {
  const [claims, setClaims] = useState(() => getAdminClaims());
  const [operators, setOperators] = useState(() => getAdminOperators());
  const [properties, setProperties] = useState(() => getAdminProperties());
  const finance = getAdminFinance();
  const users = getAdminUsers();
  const audit = getAdminAudit();
  const stats = getAdminStats();

  const [view, setView] = useState<AdminView>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [propertySearch, setPropertySearch] = useState("");

  /* modals */
  const [claimModal, setClaimModal] = useState<typeof claims[0] | null>(null);
  const [propertyModal, setPropertyModal] = useState<typeof properties[0] | null>(null);
  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [editOperator, setEditOperator] = useState<typeof operators[0] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* controlled operator form */
  const [opForm, setOpForm] = useState({ name: "", email: "", city: "Lagos" });

  /* edit property */
  const [editProp, setEditProp] = useState<(typeof properties)[0] | null>(null);
  const [propForm, setPropForm] = useState({ name: "", description: "", rate: 0, beds: 1, baths: 1, guests: 2, extended: false, extendedPrice: 0 });
  const [propPhotos, setPropPhotos] = useState<PropertyPhoto[]>([]);
  const [propPhotosLoading, setPropPhotosLoading] = useState(false);

  async function loadPropPhotos(propertyId: string) {
    setPropPhotosLoading(true);
    try {
      const res = await fetch(`/api/operator/properties/${propertyId}/photos`);
      const data = await res.json();
      setPropPhotos(data.photos ?? []);
    } catch { setPropPhotos([]); }
    setPropPhotosLoading(false);
  }

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  /* Escape closes modals */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setClaimModal(null);
        setPropertyModal(null);
        setOperatorModalOpen(false);
        setEditOperator(null);
        setSettingsOpen(false);
        setEditProp(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function action<T>(key: string, fn: () => Promise<T>) {
    setPendingAction(key);
    try { return await fn(); }
    finally { setPendingAction(null); }
  }

  const filteredProperties = propertySearch
    ? properties.filter((p) => p.name.toLowerCase().includes(propertySearch.toLowerCase()) || p.city.toLowerCase().includes(propertySearch.toLowerCase()))
    : properties;

  const displayName = user?.name ?? "Admin";
  const displayEmail = user?.email ?? "admin@checkbliss.com";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  /* ---------- render ---------- */
  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink font-sans antialiased">
      {/* notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${
          notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"
        }`}>
          {notification.message}
        </div>
      )}

      {/* mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 lg:hidden bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* ---------- sidebar ---------- */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-hairline shrink-0 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-hairline flex items-center justify-between">
          <Link href="/" className="flex items-center gap-x-2.5 no-underline">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-base">C</div>
            <span className="text-base font-bold tracking-tight text-primary">CheckinBliss</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-7 h-7 flex items-center justify-center text-ink-secondary">{I.x}</button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 scroll-thin">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-primary px-4 mb-2 mt-2">Admin</p>
          <nav className="space-y-0.5">
            {SIDEBAR_BASE.map((item) => {
              const badge = item.id === "claims" ? String(claims.filter((c) => c.admin_decision === "pending").length) : null;
              const className = `w-full flex items-center gap-x-3 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer border-none text-left transition-colors ${
                view === item.id ? "bg-primary text-white" : "text-ink-secondary hover:bg-primary-bg hover:text-primary bg-transparent"
              }`;
              const inner = (
                <>
                <span className="w-4 shrink-0 flex items-center justify-center">{I[item.icon]}</span>
                <span>{item.label}</span>
                {badge && badge !== "0" ? (
                  <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-semibold ${view === item.id ? "bg-white/20 text-white" : "bg-primary text-white"}`}>
                    {badge}
                  </span>
                ) : null}
                </>
              );
              if (item.href) {
                return (
                  <Link key={item.id} href={item.href} className={`${className} no-underline ${view === item.id ? "bg-primary text-white" : ""}`}>
                    {inner}
                  </Link>
                );
              }
              return (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setSidebarOpen(false); }}
                className={className}
              >
                {inner}
              </button>
              );
            })}
          </nav>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-ink-secondary px-4 mt-6 mb-2">Support</p>
          <nav className="space-y-0.5">
            <button onClick={() => setSettingsOpen(true)} className="w-full flex items-center gap-x-3 px-4 py-2.5 rounded-xl text-sm font-medium text-ink-secondary hover:bg-primary-bg hover:text-primary cursor-pointer border-none text-left bg-transparent font-sans">
              <span className="w-4 shrink-0 flex items-center justify-center">{I.settings}</span><span>Settings</span>
            </button>
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

      {/* ---------- main ---------- */}
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
            <NotificationBell role="admin" onViewAll={() => setView("notifications")} />
            <button onClick={() => alert("Admin Help:\n\n• Damage claims: Review photos, descriptions, and approve/adjust/reject.\n• Operators: Create and assign cities.\n• Finance: Payment, payout, deposit-hold status.\n• Properties: Suspend listings.\n• Audit: Sensitive actions log.")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-bg transition-colors text-ink-secondary cursor-pointer">
              {I.helpCircle}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 scroll-thin" onClick={() => sidebarOpen && setSidebarOpen(false)}>
          {/* stats always visible */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((s) => (
              <div key={s.label} className={`p-4 rounded-xl border ${s.accent ? "bg-primary text-white border-transparent" : "bg-white border-hairline hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"} transition-all cursor-default`}>
                <p className={`text-xs font-medium ${s.accent ? "text-blue-100" : "text-ink-secondary"}`}>{s.label}</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${s.accent ? "text-white" : s.label === "Revenue (MTD)" ? "text-primary" : "text-ink"}`}>{s.value}</p>
                <p className={`text-xs mt-1 font-medium ${s.accent ? "text-blue-200" : (s.subColor ?? "text-ink-secondary")}`}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* tab bar (not shown on home) */}
          {view !== "home" && (
            <div className="flex gap-x-1 mb-5 border-b border-hairline pb-0.5 overflow-x-auto">
              {SIDEBAR_BASE.filter((s) => s.id !== "home").map((t) => (
                <button key={t.id} onClick={() => setView(t.id)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap cursor-pointer transition-colors border-none bg-transparent ${
                  view === t.id ? "text-primary border-b-2 border-primary" : "text-ink-secondary"
                }`}>{t.label}</button>
              ))}
            </div>
          )}

          {/* ---------- HOME ---------- */}
          {view === "home" && (
            <div className="space-y-6">
              <div className="bg-white border border-hairline rounded-xl p-5">
                <h2 className="text-base font-bold text-ink mb-4">Recent Activity</h2>
                <div className="space-y-1">
                  {audit.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{a.action} — {a.target}</p>
                        <p className="text-xs text-ink-secondary truncate">{a.detail}</p>
                      </div>
                      <span className="text-xs text-ink-secondary shrink-0 ml-4">{a.date}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-hairline rounded-xl p-5">
                  <h2 className="text-base font-bold text-ink mb-3">Pending Claims</h2>
                  <div className="space-y-2">
                    {claims.filter((c) => c.admin_decision === "pending").slice(0, 3).map((c) => (
                      <div key={c.id} className="p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors cursor-pointer" onClick={() => setClaimModal(c)}>
                        <p className="text-sm font-semibold text-ink">{c.property_name}</p>
                        <p className="text-xs text-ink-secondary">{c.guest_name} · {c.stay_dates} · {fmt(c.estimated_cost_minor)}</p>
                      </div>
                    ))}
                    {claims.filter((c) => c.admin_decision === "pending").length === 0 && <p className="text-xs text-ink-secondary text-center py-4">No pending claims</p>}
                  </div>
                </div>

                <div className="bg-white border border-hairline rounded-xl p-5">
                  <h2 className="text-base font-bold text-ink mb-3">Active Operators</h2>
                  <div className="space-y-2">
                    {operators.filter((o) => o.status === "active").map((o) => (
                      <div key={o.id} className="flex items-center gap-x-3 p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xs">{o.name.split(" ").map((n) => n[0]).join("")}</div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{o.name}</p>
                          <p className="text-xs text-ink-secondary">{o.city} · {o.properties_count} properties · {o.verified_count} verified</p>
      {/* edit property + photos modal */}
      {editProp && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditProp(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Edit: {editProp.name}</h3>
              <button onClick={() => setEditProp(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Left: edit form */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-[1px] text-ink-secondary">Details</h4>
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Name</label>
                  <input type="text" value={propForm.name} onChange={(e) => setPropForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Description (storefront)</label>
                  <textarea rows={3} value={propForm.description} onChange={(e) => setPropForm((f) => ({ ...f, description: e.target.value }))} placeholder="Visible to guests on the detail page..." className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink resize-none font-sans" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-ink-secondary">Nightly rate (£)</label>
                    <input type="number" min={0} step={0.01} value={propForm.rate / 100} onChange={(e) => setPropForm((f) => ({ ...f, rate: Math.round(parseFloat(e.target.value || "0") * 100) }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-secondary">Bedrooms</label>
                    <input type="number" min={1} max={10} value={propForm.beds} onChange={(e) => setPropForm((f) => ({ ...f, beds: parseInt(e.target.value) || 1 }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-medium text-ink-secondary">Extended checkout (18:00)</span>
                  <input type="checkbox" checked={propForm.extended} onChange={(e) => setPropForm((f) => ({ ...f, extended: e.target.checked }))} className="w-4 h-4 accent-primary cursor-pointer" />
                </div>
                {propForm.extended && (
                  <div>
                    <label className="text-xs font-medium text-ink-secondary">Extended checkout price (£)</label>
                    <input type="number" min={0} step={0.01} value={propForm.extendedPrice / 100} onChange={(e) => setPropForm((f) => ({ ...f, extendedPrice: Math.round(parseFloat(e.target.value || "0") * 100) }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                  </div>
                )}

                {editProp.status === "pending_review" && (
                  <button
                    disabled={pendingAction === `approve-prop-${editProp.id}`}
                    onClick={() => action(`approve-prop-${editProp.id}`, async () => { const r = await decideCuration({ propertyId: editProp.id, action: "approve" }); if (r.ok) setProperties((prev) => prev.map((pr) => pr.id === editProp.id ? { ...pr, status: "approved" } : pr)); notify(r.ok ? "Property approved." : r.message, r.ok ? "success" : "error"); })}
                    className="w-full py-2 rounded-xl text-sm font-semibold border border-success text-success hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                  >{pendingAction === `approve-prop-${editProp.id}` ? "Approving..." : "✓ Approve Property"}</button>
                )}

                <button
                  disabled={pendingAction === `save-prop-${editProp.id}`}
                  onClick={() => action(`save-prop-${editProp.id}`, async () => {
                    const r = await updateProperty({
                      propertyId: editProp.id,
                      name: propForm.name || undefined,
                      description: propForm.description || undefined,
                      nightly_rate_minor: propForm.rate || undefined,
                      extended_checkout_offered: propForm.extended,
                      extended_checkout_price_minor: propForm.extended ? (propForm.extendedPrice || undefined) : undefined,
                    });
                    if (r.ok) setProperties((prev) => prev.map((pr) => pr.id === editProp.id ? { ...pr, name: propForm.name || pr.name } : pr));
                    notify(r.ok ? "Property updated." : r.message, r.ok ? "success" : "error");
                    if (r.ok) setEditProp(null);
                  })}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait border-none"
                >{pendingAction === `save-prop-${editProp.id}` ? "Saving..." : "Save Changes"}</button>
              </div>

              {/* Right: photo management */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-[1px] text-ink-secondary">Photos ({propPhotos.length})</h4>
                <button
                  disabled={pendingAction === "upload-admin-photo"}
                  onClick={() => action("upload-admin-photo", async () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async () => {
                      const file = input.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("file", file);
                      fd.append("alt", file.name);
                      setPendingAction("upload-admin-photo");
                      const res = await fetch(`/api/operator/properties/${editProp.id}/photos`, { method: "POST", body: fd });
                      if (res.ok) { notify("Uploaded."); loadPropPhotos(editProp.id); }
                      else notify("Upload failed.", "error");
                      setPendingAction(null);
                    };
                    input.click();
                  })}
                  className="w-full py-2 rounded-xl text-sm font-medium border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >{pendingAction === "upload-admin-photo" ? "Uploading..." : "+ Upload Photo"}</button>

                {propPhotosLoading ? (
                  <p className="text-xs text-ink-secondary text-center py-4">Loading...</p>
                ) : propPhotos.length === 0 ? (
                  <p className="text-xs text-ink-secondary text-center py-4">No photos yet</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {propPhotos.map((ph) => (
                      <div key={ph.id} className="flex items-center gap-x-2 p-2 rounded-lg border border-hairline bg-primary-bg">
                        <img src={ph.url} alt={ph.alt} className="w-12 h-9 rounded object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-ink truncate">{ph.alt}</p>
                          <p className="text-[10px] text-ink-secondary">{ph.status}{ph.is_cover ? " · cover" : ""}</p>
                        </div>
                        {ph.status === "pending_review" && (
                          <button
                            disabled={pendingAction === `admin-approve-photo-${ph.id}`}
                            onClick={() => action(`admin-approve-photo-${ph.id}`, async () => { await fetch(`/api/operator/photos/${ph.id}/approve`, { method: "POST" }); loadPropPhotos(editProp.id); })}
                            className="text-[10px] px-2 py-0.5 rounded text-success hover:bg-green-50 cursor-pointer disabled:opacity-50"
                          >{pendingAction === `admin-approve-photo-${ph.id}` ? "..." : "Approve"}</button>
                        )}
                        <button
                          disabled={pendingAction === `admin-delete-photo-${ph.id}`}
                          onClick={() => { if (confirm("Delete?")) action(`admin-delete-photo-${ph.id}`, async () => { await fetch(`/api/operator/photos/${ph.id}`, { method: "DELETE" }); loadPropPhotos(editProp.id); }); }}
                          className="text-[10px] px-2 py-0.5 rounded text-danger hover:bg-red-50 cursor-pointer disabled:opacity-50"
                        >{pendingAction === `admin-delete-photo-${ph.id}` ? "..." : "Del"}</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------- INSPECTIONS ---------- */}
          {view === "inspections" && (
            <InspectionsView notify={notify} />
          )}

          {/* ---------- CURATION ---------- */}
          {view === "curation" && (
            <CurationView notify={notify} />
          )}

          {/* ---------- BOOKINGS ---------- */}
          {view === "bookings" && (
            <BookingsView />
          )}

          {/* ---------- VERIFICATION ---------- */}
          {view === "verification" && (
            <VerificationView notify={notify} />
          )}

          {/* ---------- CLAIMS ---------- */}
          {view === "claims" && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-ink-secondary">{claims.filter((c) => c.admin_decision === "pending").length} pending of {claims.length} claims</p>
              {claims.map((c) => (
                <div key={c.id} className="bg-white border border-hairline rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-x-2">
                        <h3 className="text-base font-bold text-ink">{c.property_name}</h3>
                        <span className={`text-[11px] font-semibold ${c.admin_decision === "pending" ? "text-primary" : c.admin_decision === "approved" ? "text-success" : "text-danger"}`}>{statusLabel(c.admin_decision)}</span>
                      </div>
                      <p className="text-xs mt-1 text-ink-secondary">Guest: {c.guest_name} · {c.stay_dates} · Ref: {c.booking_ref}</p>
                      <p className="text-sm mt-2 text-ink">{c.description}</p>
                      <div className="flex items-center gap-x-3 mt-2 text-xs text-ink-secondary">
                        <span>{c.photo_count} photos</span><span>Submitted {c.submitted_at.slice(0, 10)}</span>
                        {c.estimated_cost_minor > 0 && <span className="font-semibold tabular-nums text-primary">{fmt(c.estimated_cost_minor)} claimed</span>}
                      </div>
                    </div>
                  </div>
                  {c.admin_decision === "pending" && (
                    <div className="flex gap-x-2 mt-4">
                      <button
                        disabled={pendingAction === `claim-${c.id}-approve`}
                        onClick={() => action(`claim-${c.id}-approve`, async () => { const r = await decideClaim({ claimId: c.id, decision: "approve" }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, admin_decision: "approved" } : cl)); notify(r.ok ? "Claim approved." : r.message, r.ok ? "success" : "error"); })}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >{pendingAction === `claim-${c.id}-approve` ? "Processing..." : "Approve"}</button>
                      <button
                        disabled={pendingAction === `claim-${c.id}-adjust`}
                        onClick={() => { const n = prompt("Enter adjusted amount (£):", String(c.estimated_cost_minor / 100)); if (n !== null) action(`claim-${c.id}-adjust`, async () => { const r = await decideClaim({ claimId: c.id, decision: "adjust", amountMinor: Math.round(parseFloat(n) * 100) }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, admin_decision: "adjusted" } : cl)); notify(r.ok ? "Claim adjusted." : r.message, r.ok ? "success" : "error"); }); }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-warning text-warning hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >{pendingAction === `claim-${c.id}-adjust` ? "Processing..." : "Adjust"}</button>
                      <button
                        disabled={pendingAction === `claim-${c.id}-reject`}
                        onClick={() => action(`claim-${c.id}-reject`, async () => { const r = await decideClaim({ claimId: c.id, decision: "reject" }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, admin_decision: "rejected" } : cl)); notify(r.ok ? "Claim rejected." : r.message, r.ok ? "success" : "error"); })}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-hairline text-danger hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >{pendingAction === `claim-${c.id}-reject` ? "Processing..." : "Reject"}</button>
                      <button onClick={() => setClaimModal(c)} className="px-4 py-2 rounded-xl text-sm font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer">Details</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ---------- OPERATORS ---------- */}
          {view === "operators" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-ink">{operators.length} operators · {operators.filter((o) => o.status === "active").length} active</p>
                <button onClick={() => setOperatorModalOpen(true)} className="text-sm font-medium px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer">+ Create Operator</button>
              </div>
              {operators.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-4 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                  <div className="flex items-center gap-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm ${op.status === "active" ? "bg-primary" : "bg-hairline"}`}>{op.name.split(" ").map((n) => n[0]).join("")}</div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{op.name}</p>
                      <p className="text-xs text-ink-secondary">{op.email} · {op.assigned_cities.join(", ")}</p>
                      <div className="flex items-center gap-x-3 mt-1 text-xs text-ink-secondary">
                        <span>{op.properties_count} properties</span><span>{op.verified_count} verified</span><span>Quality: {op.quality_score}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[11px] font-semibold ${op.status === "active" ? "text-success" : op.status === "onboarding" ? "text-warning" : "text-danger"}`}>{statusLabel(op.status)}</span>
                    <div className="flex gap-x-1 mt-2 justify-end">
                      <button onClick={() => { setEditOperator(op); setOpForm({ name: op.name, email: op.email, city: op.assigned_cities[0] }); }} className="text-xs px-2 py-1 rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">Edit</button>
                      <button
                        disabled={pendingAction === `suspend-op-${op.id}`}
                        onClick={() => { if (confirm(`Suspend ${op.name}?`)) action(`suspend-op-${op.id}`, async () => { const r = await suspendOperator({ operatorId: op.id }); if (r.ok) setOperators((prev) => prev.map((o) => o.id === op.id ? { ...o, status: "suspended" } : o)); notify(r.ok ? "Operator suspended." : r.message, r.ok ? "success" : "error"); }); }}
                        className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 text-danger cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >{pendingAction === `suspend-op-${op.id}` ? "..." : "Suspend"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ---------- FINANCE ---------- */}
          {view === "finance" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: "Payments Received", value: "£24,000", sub: "June 2026" },
                  { label: "Payouts Issued", value: "£19,000", sub: "To 5 owners" },
                  { label: "Deposits Held", value: "£4,200", sub: "7 active bookings" },
                ].map((s) => (
                  <div key={s.label} className="p-4 rounded-xl border border-hairline bg-primary-bg">
                    <p className="text-xs font-medium mb-1 text-ink-secondary">{s.label}</p>
                    <p className="text-xl font-bold tabular-nums text-ink">{s.value}</p>
                    <p className="text-xs text-ink-secondary">{s.sub}</p>
                  </div>
                ))}
              </div>
              {finance.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                  <div><p className="text-sm font-semibold text-ink">{f.guest_or_owner} · {f.property}</p><p className="text-xs text-ink-secondary">{f.date} · {f.ref}</p></div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-ink">{fmt(f.amount_minor)}</p>
                    <span className={`text-[11px] font-semibold ${f.status === "settled" || f.status === "paid" ? "text-success" : f.status === "held" ? "text-warning" : "text-primary"}`}>{f.type} · {f.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ---------- PROPERTIES ---------- */}
          {view === "properties" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-ink">All properties — platform-wide ({filteredProperties.length})</p>
                <input type="text" placeholder="Search property..." value={propertySearch} onChange={(e) => setPropertySearch(e.target.value)} className="border border-hairline rounded-lg px-3 py-1.5 text-sm outline-none w-48 text-ink focus:border-primary" />
              </div>
              {filteredProperties.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                  <div className="flex-1 cursor-pointer" onClick={() => setPropertyModal(p)}>
                    <p className="text-sm font-semibold text-ink">{p.name}</p>
                    <p className="text-xs text-ink-secondary">{p.city} · {p.neighbourhood} · Owner: {p.owner_name} · {p.bedrooms} bed · {p.bathrooms} bath · Up to {p.max_guests} guests</p>
                  </div>
                  <div className="flex items-center gap-x-3 shrink-0">
                    <span className="text-xs text-ink-secondary">{p.bookings_count} bookings · {fmt(p.revenue_minor)}</span>
                    <span className={`text-[11px] font-semibold ${p.status === "approved" ? "text-success" : p.status === "pending_review" ? "text-primary" : p.status === "draft" ? "text-ink-secondary" : "text-danger"}`}>{statusLabel(p.status)}</span>
                    {p.status === "pending_review" && (
                      <button
                        disabled={pendingAction === `approve-${p.id}`}
                        onClick={(e) => { e.stopPropagation(); action(`approve-${p.id}`, async () => { const r = await decideCuration({ propertyId: p.id, action: "approve" }); if (r.ok) setProperties((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "approved" } : pr)); notify(r.ok ? "Property approved." : r.message, r.ok ? "success" : "error"); }); }}
                        className="text-xs px-2 py-1 rounded-lg hover:bg-green-50 text-success cursor-pointer disabled:opacity-50 bg-transparent border border-hairline"
                      >{pendingAction === `approve-${p.id}` ? "..." : "Approve"}</button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProp(p);
                        setPropForm({ name: p.name, description: "", rate: p.nightly_price_minor, beds: p.bedrooms, baths: p.bathrooms, guests: p.max_guests, extended: p.extended_checkout_offered, extendedPrice: p.extended_checkout_price_minor });
                        loadPropPhotos(p.id);
                      }}
                      className="text-xs px-2 py-1 rounded-lg hover:bg-primary-bg text-primary cursor-pointer bg-transparent border border-hairline"
                    >Edit & Photos</button>
                    <button
                      disabled={pendingAction === `suspend-prop-${p.id}`}
                      onClick={(e) => { e.stopPropagation(); const reason = prompt("Reason for suspension:"); if (reason) action(`suspend-prop-${p.id}`, async () => { const r = await suspendProperty({ propertyId: p.id, reason }); if (r.ok) setProperties((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "suspended" } : pr)); notify(r.ok ? "Property suspended." : r.message, r.ok ? "success" : "error"); }); }}
                      className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 text-danger cursor-pointer disabled:opacity-50"
                    >{pendingAction === `suspend-prop-${p.id}` ? "..." : "Suspend"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ---------- USERS ---------- */}
          {view === "users" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-ink mb-4">User management — support actions</p>
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                  <div className="flex items-center gap-x-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm ${u.type === "Guest" ? "bg-primary" : "bg-ink-tertiary"}`}>{u.name.split(" ").map((n) => n[0]).join("")}</div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{u.name}</p>
                      <p className="text-xs text-ink-secondary">{u.email} · {u.bookings_or_properties} {u.type === "Owner" ? "properties" : "bookings"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <span className={`text-[11px] font-semibold ${u.type === "Guest" ? "text-primary" : "text-ink-tertiary"}`}>{u.type}</span>
                    <button onClick={() => notify(`Suspend flow for ${u.name} (mock)`, "success")} className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 text-danger cursor-pointer">Suspend</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ---------- NOTIFICATIONS ---------- */}
          {view === "notifications" && (
            <NotificationsView role="admin" />
          )}

          {/* ---------- AUDIT ---------- */}
          {view === "audit" && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-ink mb-4">Sensitive actions log</p>
              {audit.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{a.action} — {a.target}</p>
                    <p className="text-xs text-ink-secondary truncate">{a.detail}</p>
                  </div>
                  <span className="text-xs text-ink-secondary shrink-0 ml-4">{a.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------- MODALS ---------- */}

      {/* claim detail modal */}
      {claimModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setClaimModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Claim — {claimModal.property_name}</h3>
              <button onClick={() => setClaimModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                { label: "Property", value: claimModal.property_name },
                { label: "Guest", value: claimModal.guest_name },
                { label: "Booking Reference", value: claimModal.booking_ref },
                { label: "Stay Dates", value: claimModal.stay_dates },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-xl bg-primary-bg">
                  <span className="text-xs font-medium text-ink-secondary">{f.label}</span>
                  <p className="text-sm font-semibold mt-0.5 text-ink">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-primary-bg mb-4">
              <span className="text-xs font-medium text-ink-secondary">Description</span>
              <p className="text-sm mt-1 text-ink">{claimModal.description}</p>
            </div>
            {claimModal.estimated_cost_minor > 0 && (
              <div className="p-3 rounded-xl bg-primary-bg mb-4">
                <span className="text-xs font-medium text-ink-secondary">Claimed Amount</span>
                <p className="text-lg font-bold mt-1 tabular-nums text-primary">{fmt(claimModal.estimated_cost_minor)}</p>
              </div>
            )}
            {claimModal.photo_count > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium mb-2 text-ink-secondary">Photos ({claimModal.photo_count})</p>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: claimModal.photo_count }).map((_, i) => (
                    <div key={i} className="aspect-video rounded-xl flex items-center justify-center bg-hairline"><span className="text-xs text-ink-secondary">Photo {i + 1}</span></div>
                  ))}
                </div>
              </div>
            )}
            {claimModal.admin_decision === "pending" && (
              <div className="flex gap-x-2">
                <button
                  disabled={pendingAction === `modal-claim-${claimModal.id}-approve`}
                  onClick={() => action(`modal-claim-${claimModal.id}-approve`, async () => { const r = await decideClaim({ claimId: claimModal.id, decision: "approve" }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === claimModal.id ? { ...cl, admin_decision: "approved" } : cl)); notify(r.ok ? "Claim approved." : r.message, r.ok ? "success" : "error"); setClaimModal(null); })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >{pendingAction?.startsWith(`modal-claim-${claimModal.id}`) ? "Processing..." : "Approve"}</button>
                <button
                  disabled={pendingAction === `modal-claim-${claimModal.id}-adjust`}
                  onClick={() => { const n = prompt("Enter adjusted amount (£):", String(claimModal.estimated_cost_minor / 100)); if (n !== null) action(`modal-claim-${claimModal.id}-adjust`, async () => { const r = await decideClaim({ claimId: claimModal.id, decision: "adjust", amountMinor: Math.round(parseFloat(n) * 100) }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === claimModal.id ? { ...cl, admin_decision: "adjusted" } : cl)); notify(r.ok ? "Claim adjusted." : r.message, r.ok ? "success" : "error"); setClaimModal(null); }); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-warning text-warning hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >{pendingAction === `modal-claim-${claimModal.id}-adjust` ? "Processing..." : "Adjust"}</button>
                <button
                  disabled={pendingAction === `modal-claim-${claimModal.id}-reject`}
                  onClick={() => action(`modal-claim-${claimModal.id}-reject`, async () => { const r = await decideClaim({ claimId: claimModal.id, decision: "reject" }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === claimModal.id ? { ...cl, admin_decision: "rejected" } : cl)); notify(r.ok ? "Claim rejected." : r.message, r.ok ? "success" : "error"); setClaimModal(null); })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-hairline text-danger hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >{pendingAction === `modal-claim-${claimModal.id}-reject` ? "Processing..." : "Reject"}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* create operator modal */}
      {operatorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOperatorModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Create Operator</h3>
              <button onClick={() => setOperatorModalOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary">Full Name</label>
                <input id="op-name" type="text" placeholder="e.g. Funke Adeyemi" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Email</label>
                <input id="op-email" type="email" placeholder="operator@checkinbliss.com" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Assigned Cities</label>
                <select id="op-cities" defaultValue="Lagos" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none text-ink">
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
                  <option value="Port Harcourt">Port Harcourt</option>
                  <option value="Lagos+Abuja">Lagos + Abuja</option>
                  <option value="All">All cities</option>
                </select>
              </div>
              <button
                disabled={pendingAction === "create-operator"}
                onClick={() => action("create-operator", async () => {
                  const name = (document.getElementById("op-name") as HTMLInputElement)?.value;
                  const email = (document.getElementById("op-email") as HTMLInputElement)?.value;
                  const citiesRaw = (document.getElementById("op-cities") as HTMLSelectElement)?.value;
                  if (!name || !email) { notify("Name and email required", "error"); return; }
                  const cities = citiesRaw === "All" ? ["Lagos", "Abuja", "Port Harcourt"] : citiesRaw === "Lagos+Abuja" ? ["Lagos", "Abuja"] : [citiesRaw];
                  const r = await createOperator({ name, email, assignedCities: cities });
                  if (r.ok && r.data) setOperators((prev) => [r.data!, ...prev]);
                  notify(r.ok ? `Operator ${name} created.` : r.message, r.ok ? "success" : "error");
                  if (r.ok) setOperatorModalOpen(false);
                })}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >{pendingAction === "create-operator" ? "Creating..." : "Create Operator"}</button>
            </div>
          </div>
        </div>
      )}

      {/* edit operator modal */}
      {editOperator && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditOperator(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Edit Operator</h3>
              <button onClick={() => setEditOperator(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary">Full Name</label>
                <input type="text" value={opForm.name} onChange={(e) => setOpForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Email</label>
                <input type="email" value={opForm.email} onChange={(e) => setOpForm((f) => ({ ...f, email: e.target.value }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Assigned City</label>
                <select value={opForm.city} onChange={(e) => setOpForm((f) => ({ ...f, city: e.target.value }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none text-ink">
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
                  <option value="Port Harcourt">Port Harcourt</option>
                </select>
              </div>
              <button
                disabled={pendingAction === `edit-operator-${editOperator.id}`}
                onClick={() => action(`edit-operator-${editOperator.id}`, async () => {
                  if (!opForm.name || !opForm.email) { notify("Name and email required", "error"); return; }
                  const r = await updateOperator({ operatorId: editOperator.id, name: opForm.name, email: opForm.email, assignedCities: [opForm.city] });
                  if (r.ok) setOperators((prev) => prev.map((o) => o.id === editOperator.id ? { ...o, name: opForm.name, email: opForm.email, assigned_cities: [opForm.city], city: opForm.city } : o));
                  notify(r.ok ? "Operator updated." : r.message, r.ok ? "success" : "error");
                  if (r.ok) setEditOperator(null);
                })}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait border-none"
              >{pendingAction === `edit-operator-${editOperator.id}` ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* settings modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSettingsOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Platform Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary">Platform Name</label>
                <input type="text" defaultValue="CheckinBliss" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Default Currency</label>
                <select defaultValue="GBP" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none text-ink">
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Deposit Hold Duration (days)</label>
                <input type="number" defaultValue="7" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Max Nights Per Booking</label>
                <input type="number" defaultValue="14" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-ink-secondary">Enable WhatsApp Notifications</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary cursor-pointer" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-ink-secondary">Maintenance Mode</span>
                <input type="checkbox" className="w-4 h-4 accent-primary cursor-pointer" />
              </div>
              <button
                onClick={() => { notify("Settings saved (mock).", "success"); setSettingsOpen(false); }}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none"
              >Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* property detail modal */}
      {propertyModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPropertyModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">{propertyModal.name}</h3>
              <button onClick={() => setPropertyModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                { label: "City", value: propertyModal.city },
                { label: "Neighbourhood", value: propertyModal.neighbourhood },
                { label: "Owner", value: propertyModal.owner_name },
                { label: "Status", value: statusLabel(propertyModal.status) },
                { label: "Bedrooms", value: String(propertyModal.bedrooms) },
                { label: "Bathrooms", value: String(propertyModal.bathrooms) },
                { label: "Max Guests", value: String(propertyModal.max_guests) },
                { label: "Nightly Rate", value: fmt(propertyModal.nightly_price_minor) },
                { label: "Bookings", value: String(propertyModal.bookings_count) },
                { label: "Revenue", value: fmt(propertyModal.revenue_minor) },
                { label: "Late Checkout", value: propertyModal.extended_checkout_offered ? "Yes" : "No" },
                { label: "Late Checkout Fee", value: propertyModal.extended_checkout_price_minor > 0 ? fmt(propertyModal.extended_checkout_price_minor) : "N/A" },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-xl bg-primary-bg">
                  <span className="text-xs font-medium text-ink-secondary">{f.label}</span>
                  <p className="text-sm font-semibold mt-0.5 text-ink">{f.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
