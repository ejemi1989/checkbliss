import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { checkAdminGate } from "@/lib/admin-gate";

const NAV = [
  { href: "/admin/crm/inbox", label: "Inbox", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> },
  { href: "/admin/crm/contacts", label: "Contacts", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  { href: "/admin/crm/claims", label: "Damage Claims", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
  { href: "/admin/crm/inspections", label: "Inspections", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg> },
  { href: "/admin/crm/broadcast", label: "Broadcast", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg> },
  { href: "/admin/crm/audit", label: "Audit Log", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg> },
  { href: "/admin/crm/analytics", label: "Analytics", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 16V9" /><path d="M12 16V6" /><path d="M17 16v-4" /></svg> },
];

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  const gate = await checkAdminGate();
  if (!gate.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-6">
        <div className="max-w-md w-full bg-card border border-line rounded-[var(--radius-lg)] p-8 text-center">
          <h1 className="font-sans text-2xl text-ink mb-2">Admin access required</h1>
          <p className="text-sm text-ink-secondary mb-4">{gate.reason}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-hairline bg-white px-8 py-4 flex items-center justify-between max-sm:px-5">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-ink-secondary hover:text-ink transition-colors no-underline flex items-center gap-1 text-xs font-sans font-medium">
            ← Admin
          </Link>
          <span className="text-hairline">/</span>
          <span className="font-sans text-xl font-medium tracking-tight text-ink">WhatsApp CRM</span>
        </div>
        <div className="flex items-center gap-x-3">
          <Link href="/admin?view=notifications" className="text-xs font-sans font-medium text-ink-secondary hover:text-ink transition-colors no-underline">Notifications</Link>
          <Link href="/logout" className="text-xs font-sans font-medium text-ink-secondary hover:text-ink transition-colors no-underline">Sign out</Link>
        </div>
      </header>

      <div className="flex max-sm:flex-col">
        {/* Sidebar */}
        <nav className="w-56 border-r border-hairline bg-white shrink-0 max-sm:w-full max-sm:border-r-0 max-sm:border-b">
          <div className="p-5 max-sm:p-3 max-sm:flex max-sm:gap-2 max-sm:overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="w-full flex items-center gap-x-3 px-4 py-3 rounded-lg text-sm font-sans font-medium text-ink-secondary hover:bg-bone transition-colors mb-1 last:mb-0 max-sm:whitespace-nowrap max-sm:flex-shrink-0 no-underline"
              >
                <span className="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 p-8 max-sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
