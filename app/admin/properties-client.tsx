"use client";

import { useState, useCallback } from "react";
import { formatMinor } from "@/lib/currency";
import { getAdminProperties } from "@/lib/data";
import { decideCuration } from "@/actions/curation";
import { suspendProperty } from "@/actions/operators";

function fmt(n: number) { return formatMinor(n); }
function statusLabel(s: string) { return s.replace(/_/g, " "); }

export function AdminPropertiesView() {
  const [properties, setProperties] = useState(() => getAdminProperties());
  const [propertySearch, setPropertySearch] = useState("");
  const [propertyModal, setPropertyModal] = useState<typeof properties[0] | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  async function action<T>(key: string, fn: () => Promise<T>) {
    setPendingAction(key);
    try { return await fn(); }
    finally { setPendingAction(null); }
  }

  const filteredProperties = propertySearch
    ? properties.filter((p) => p.name.toLowerCase().includes(propertySearch.toLowerCase()) || p.city.toLowerCase().includes(propertySearch.toLowerCase()))
    : properties;

  return (
    <div className="space-y-4">
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-ink">Properties — platform-wide ({filteredProperties.length})</h1>
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
            <button onClick={(e) => { e.stopPropagation(); setPropertyModal(p); }} className="text-xs px-2 py-1 rounded-lg hover:bg-primary-bg text-primary cursor-pointer bg-transparent border border-hairline">View</button>
            {p.status === "approved" && (
              <button
                disabled={pendingAction === `suspend-prop-${p.id}`}
                onClick={(e) => { e.stopPropagation(); const reason = prompt("Reason for suspension:"); if (reason) action(`suspend-prop-${p.id}`, async () => { const r = await suspendProperty({ propertyId: p.id, reason }); if (r.ok) setProperties((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "suspended" } : pr)); notify(r.ok ? "Property suspended." : r.message, r.ok ? "success" : "error"); }); }}
                className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 text-danger cursor-pointer disabled:opacity-50 bg-transparent border border-hairline"
              >{pendingAction === `suspend-prop-${p.id}` ? "..." : "Suspend"}</button>
            )}
            {p.status === "suspended" && (
              <button
                disabled={pendingAction === `reactivate-prop-${p.id}`}
                onClick={(e) => { e.stopPropagation(); action(`reactivate-prop-${p.id}`, async () => { setProperties((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "approved" } : pr)); notify("Property reactivated.", "success"); }); }}
                className="text-xs px-2 py-1 rounded-lg hover:bg-green-50 text-success cursor-pointer disabled:opacity-50 bg-transparent border border-hairline"
              >{pendingAction === `reactivate-prop-${p.id}` ? "..." : "Reactivate"}</button>
            )}
          </div>
        </div>
      ))}

      {/* property detail modal */}
      {propertyModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPropertyModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">{propertyModal.name}</h3>
              <button onClick={() => setPropertyModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
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
