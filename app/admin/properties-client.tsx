"use client";

import { useState, useCallback } from "react";
import { formatMinor } from "@/lib/currency";
import { getAdminProperties } from "@/lib/data";
import { decideCuration } from "@/actions/curation";
import { suspendProperty } from "@/actions/operators";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { DataList } from "@/components/dashboard/data-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Modal } from "@/components/dashboard/modal";
import { Icon } from "@/components/icons";

function fmt(n: number) { return formatMinor(n); }
function statusLabel(s: string) { return s.replace(/_/g, " "); }
function statusVariant(s: string): "success" | "warning" | "danger" | "neutral" {
  if (s === "approved") return "success";
  if (s === "pending_review") return "warning";
  if (s === "draft") return "neutral";
  return "danger";
}

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

  const pendingReview = properties.filter((p) => p.status === "pending_review").length;
  const approved = properties.filter((p) => p.status === "approved").length;
  const suspended = properties.filter((p) => p.status === "suspended").length;

  return (
    <div>
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <PageHeader
        eyebrow="Inventory"
        title="Properties"
        description="Platform-wide property directory. Approve onboarding submissions, suspend problematic listings."
        meta={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">
              {pendingReview} pending
            </span>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">
              {approved} approved
            </span>
            {suspended > 0 && (
              <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] rounded-full border border-error/30 text-error bg-error/5 px-2.5 py-1">
                {suspended} suspended
              </span>
            )}
            <input type="text" placeholder="Search by name or city..." value={propertySearch} onChange={(e) => setPropertySearch(e.target.value)} className="border border-hairline rounded-lg px-3 py-1.5 text-xs outline-none w-56 text-ink bg-canvas focus:border-primary font-sans" />
          </div>
        }
      />

      <Section eyebrow="Directory" count={filteredProperties.length}>
        {filteredProperties.length === 0 ? (
          <EmptyState
            title="No properties match"
            body={propertySearch ? `Clear the search to see all properties.` : "Properties onboarded by operators will appear here for admin review."}
            icon={<Icon.Building2 size={20} />}
          />
        ) : (
          <DataList
            items={filteredProperties.map((p) => ({
              id: p.id,
              primary: (
                <span className="flex items-center gap-2.5 flex-wrap">
                  <button onClick={() => setPropertyModal(p)} className="font-display text-lg tracking-tight text-ink hover:text-primary transition-colors bg-transparent border-none p-0 cursor-pointer text-left">
                    {p.name}
                  </button>
                  <StatusPill variant={statusVariant(p.status)} dot>{statusLabel(p.status)}</StatusPill>
                </span>
              ),
              secondary: `${p.city} · ${p.neighbourhood} · Owner: ${p.owner_name} · ${p.bedrooms} bed · ${p.bathrooms} bath · Up to ${p.max_guests} guests`,
              meta: `${p.bookings_count} bookings · ${fmt(p.revenue_minor)}`,
              trailing: (
                <div className="flex gap-1.5">
                  {p.status === "pending_review" && (
                    <button
                      disabled={pendingAction === `approve-${p.id}`}
                      onClick={(e) => { e.stopPropagation(); action(`approve-${p.id}`, async () => { const r = await decideCuration({ propertyId: p.id, action: "approve" }); if (r.ok) setProperties((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "approved" } : pr)); notify(r.ok ? "Property approved." : r.message, r.ok ? "success" : "error"); }); }}
                      className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary-bg transition-colors cursor-pointer bg-canvas disabled:opacity-50"
                    >{pendingAction === `approve-${p.id}` ? "..." : "Approve"}</button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setPropertyModal(p); }} className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg hover:bg-bone-secondary text-ink-secondary cursor-pointer border border-hairline bg-canvas">
                    View
                  </button>
                  {p.status === "approved" && (
                    <button
                      disabled={pendingAction === `suspend-prop-${p.id}`}
                      onClick={(e) => { e.stopPropagation(); const reason = prompt("Reason for suspension:"); if (reason) action(`suspend-prop-${p.id}`, async () => { const r = await suspendProperty({ propertyId: p.id, reason }); if (r.ok) setProperties((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "suspended" } : pr)); notify(r.ok ? "Property suspended." : r.message, r.ok ? "success" : "error"); }); }}
                      className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg hover:bg-error/5 text-error cursor-pointer border border-error/30 bg-canvas disabled:opacity-50"
                    >{pendingAction === `suspend-prop-${p.id}` ? "..." : "Suspend"}</button>
                  )}
                  {p.status === "suspended" && (
                    <button
                      disabled={pendingAction === `reactivate-prop-${p.id}`}
                      onClick={(e) => { e.stopPropagation(); action(`reactivate-prop-${p.id}`, async () => { setProperties((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "approved" } : pr)); notify("Property reactivated.", "success"); }); }}
                      className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg hover:bg-primary-bg text-primary cursor-pointer border border-primary/30 bg-canvas disabled:opacity-50"
                    >{pendingAction === `reactivate-prop-${p.id}` ? "..." : "Reactivate"}</button>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Section>

      {/* property detail modal */}
      <Modal
        open={!!propertyModal}
        onClose={() => setPropertyModal(null)}
        title={propertyModal?.name}
        size="lg"
      >
        {propertyModal && (
          <div className="grid grid-cols-2 gap-3">
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
              <div key={f.label} className="p-3 rounded-xl bg-bone-secondary">
                <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-ink-tertiary">{f.label}</span>
                <p className="text-sm font-sans font-semibold mt-1 text-ink">{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
