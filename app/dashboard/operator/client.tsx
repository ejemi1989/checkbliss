"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { formatMinor } from "@/lib/currency";
import { getCurationQueue, getPipeline, getInspections, getVerifications, getOperatorStats, getOperatorClaims, getOwnersForCity, getOperatorBookings } from "@/lib/data";
import { startInspection, completeInspection } from "@/actions/inspections";
import { logVerification } from "@/actions/verification";
import { updateProperty } from "@/actions/properties";
import { suspendProperty } from "@/actions/operators";
import { submitDamageClaim } from "@/actions/claims-operator";
import { createOnboardingRecord } from "@/lib/airtable";
import type { AuthUser } from "@/lib/auth";
import type { PropertyPhoto } from "@/lib/media";
import { getSeedProperties } from "@/lib/seed-data";
import { NotificationBell } from "@/components/notification-bell";
import { NotificationsView } from "@/components/notifications-view";
import { ConfirmDialog } from "@/components/dialog";
import { Modal } from "@/components/dashboard/modal";

/* ---------- icons ---------- */
const I = {
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  gavel: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 21h12" /><path d="M6.5 7.5 9 5l3 3-2.5 2.5" /><path d="M15 10l-3 3" /><path d="M18 13l-3 3" /><path d="M21 16l-3 3" /></svg>,
  checkSquare: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 12 2 2 4-4" /></svg>,
  gitBranch: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>,
  clipboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>,
  camera: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  bed: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" /></svg>,
  inProgress: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
};

function fmt(n: number) { return formatMinor(n); }

function statusLabel(s: string) { return s.replace(/_/g, " "); }

/* Bookings tab: date helpers for grouping in-progress / upcoming / recent stays */
function isInProgress(checkIn: string, checkOut: string, todayStr: string): boolean {
  return checkIn <= todayStr && checkOut >= todayStr;
}
function isFuture(checkIn: string, todayStr: string): boolean {
  return checkIn > todayStr;
}

function statusColor(s: string) {
  switch (s) {
    case "approved": case "complete": case "completed": case "active": return "text-success";
    case "pending": case "pending_review": case "in_progress": return "text-primary";
    case "draft": return "text-ink-secondary";
    case "suspended": case "escalated": return "text-danger";
    default: return "text-ink-secondary";
  }
}

export function OperatorDashboard({ user, initialTab }: { user: AuthUser | null; initialTab?: string }) {
  const [tab, setTab] = useState(initialTab ?? "today");

  /* structure.md: operators are city-scoped. Pull the assigned cities
     from the session, and filter every data list by them so a Lagos
     operator never sees Abuja data and vice versa. */
  const assignedCities: string[] = user?.assignedCities ?? [];

  const [curation, setCuration] = useState(() =>
    getCurationQueue().filter((p) => assignedCities.length === 0 || assignedCities.includes(p.city)),
  );
  const [inspections, setInspections] = useState(() => {
    // Inspections don't carry city directly — scope by property name (Lagos vs Abuja)
    const allowed = (i: { property_name: string }) => {
      if (assignedCities.length === 0) return true;
      const inAbuja = /GRA|Transcorp|Abuja/i.test(i.property_name);
      return inAbuja ? assignedCities.includes("Abuja") : assignedCities.includes("Lagos");
    };
    return getInspections().filter(allowed);
  });
  const pipeline = getPipeline().filter((p) => {
    if (assignedCities.length === 0) return true;
    // pipeline rows carry name only — infer city by name prefix in real impl
    return true;
  });
  const stats = getOperatorStats();
  const [curationFilter, setCurationFilter] = useState("all");
  const [verifications, setVerifications] = useState(() => {
    const allowed = (v: { property_name: string }) => {
      if (assignedCities.length === 0) return true;
      const inAbuja = /GRA|Transcorp|Abuja/i.test(v.property_name);
      return inAbuja ? assignedCities.includes("Abuja") : assignedCities.includes("Lagos");
    };
    return getVerifications().filter(allowed);
  });
  const [verifModalOpen, setVerifModalOpen] = useState(false);
  const [verifForm, setVerifForm] = useState({ propertyId: "", notes: "", photos: 0 });

  /* city-scoped claims + owners + bookings (structure.md: row-level access) */
  const [claims, setClaims] = useState(() => getOperatorClaims(assignedCities));
  const [owners] = useState(() => getOwnersForCity(assignedCities));
  const [bookings] = useState(() => getOperatorBookings(assignedCities));
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({
    propertyId: "",
    guestName: "",
    bookingRef: "",
    stayDates: "",
    description: "",
    estimatedCostMinor: 0,
    photoCount: 0,
    operatorNotes: "",
  });
  const [claimFilter, setClaimFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    type: "remove";
    property: (typeof curation)[0];
  } | null>(null);

  /* photos tab state */
  const [photosTab, setPhotosTab] = useState<"browse" | "manage">("browse");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [outcomeInspId, setOutcomeInspId] = useState<string | null>(null);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [editAltText, setEditAltText] = useState("");

  const seedProperties = getSeedProperties().filter(
    (p) => p.status === "approved" && (assignedCities.length === 0 || assignedCities.includes(p.city)),
  );

  /* edit property modal */
  const [editModal, setEditModal] = useState<(typeof curation)[0] | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", rate: 0, beds: 1, baths: 1, guests: 2, extended: false, extendedPrice: 0 });

  /* Onboarding modal — operator sources a new property */
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({ name: "", city: "Lagos", address: "", bedrooms: 1, maxGuests: 2, ownerName: "", ownerPhone: "", ownerEmail: "" });

  async function loadPhotos(propertyId: string) {
    setPhotosLoading(true);
    try {
      const res = await fetch(`/api/operator/properties/${propertyId}/photos`);
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } catch {
      setPhotos([]);
    }
    setPhotosLoading(false);
  }

  function handleSelectProperty(id: string) {
    setSelectedProperty(id);
    if (id) loadPhotos(id);
  }

  function saveAltText(photoId: string) {
    if (editAltText.trim()) {
      setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, alt: editAltText.trim() } : p));
    }
    setEditingPhoto(null);
    setEditAltText("");
  }

  const displayName = user?.name ?? "Tunde Ogunlade";

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  async function action<T>(key: string, fn: () => Promise<T>) {
    setPendingAction(key);
    try { return await fn(); }
    finally { setPendingAction(null); }
  }

  const filteredCuration = curationFilter === "all" ? curation : curation.filter((i) => {
    if (curationFilter === "new") return i.type === "new";
    if (curationFilter === "resubmit") return i.type === "resubmitted";
    return true;
  });

  const [today] = useState(() => new Date());
  const todayStr = today.toISOString().slice(0, 10);

  const todayInspections = inspections.filter((i) => i.checkout_date === todayStr);
  const pendingInspections = inspections.filter((i) => i.status === "pending");

  /* Bookings tab: pre-computed buckets (complex boolean expressions confused the JSX parser) */
  const inProgressBookings = bookings.filter((b) => b.status === "confirmed" && isInProgress(b.check_in, b.check_out, todayStr));
  const upcomingBookings = bookings.filter((b) => b.status === "confirmed" && !isInProgress(b.check_in, b.check_out, todayStr) && isFuture(b.check_in, todayStr));
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const recentBookings = bookings.filter((b) => b.status === "completed" || (b.status === "confirmed" && !isFuture(b.check_in, todayStr) && !isInProgress(b.check_in, b.check_out, todayStr)));

  return (
    <>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${
          notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"
        }`}>
          {notification.message}
        </div>
      )}

      {/* Stats — editorial grid, no card boxes */}
      <div className="mb-12 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-hairline">
        {stats.map((s, i) => (
          <div key={s.label} className={i > 0 ? "lg:pl-8" : ""}>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">{s.label}</p>
            <p className={`font-display text-[2.25rem] leading-none tracking-tight mt-2 tabular-nums ${s.accent ? "text-primary" : "text-ink"}`}>{s.value}</p>
            <p className={`mt-2 text-xs ${s.accent ? "text-primary-dark" : "text-ink-secondary"}`}>{s.sub}</p>
          </div>
        ))}
      </div>

          {tab === "today" && (

            <div className="space-y-12">
              {/* Editorial section: Today's Schedule */}
              <section>
                <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline">
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">On the ground</p>
                    <h2 className="font-display text-2xl tracking-tight text-ink mt-1.5">Today&rsquo;s Schedule</h2>
                  </div>
                  {todayInspections.length > 0 && (
                    <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">
                      {todayInspections.length} scheduled
                    </span>
                  )}
                </div>
                {todayInspections.length > 0 ? (
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {todayInspections.map((i) => (
                      <li key={i.id} className="flex items-start justify-between gap-4 py-5 px-1 transition-colors hover:bg-bone-secondary/40">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-lg tracking-tight text-ink">{i.property_name}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-ink-secondary">
                            <span>Checkout {i.checkout_date} · {i.checkout_time}</span>
                            <span>{i.guest_name}</span>
                          </div>
                        </div>
                        <div className="flex gap-x-2 shrink-0">
                          <button
                            disabled={pendingAction === `start-${i.id}`}
                            onClick={() => action(`start-${i.id}`, async () => { const r = await startInspection({ inspectionId: i.id }); if (r.ok) setInspections((prev) => prev.map((x) => x.id === i.id ? { ...x, status: "in_progress" } : x)); notify(r.ok ? `Inspection ${i.id} started` : r.message, r.ok ? "success" : "error"); })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                          >{pendingAction === `start-${i.id}` ? "Starting..." : "Start Inspection"}</button>
                          <button
                            disabled={pendingAction === `complete-${i.id}`}
                            onClick={() => action(`complete-${i.id}`, async () => { const r = await completeInspection({ inspectionId: i.id }); if (r.ok) setInspections((prev) => prev.map((x) => x.id === i.id ? { ...x, status: "completed" } : x)); notify(r.ok ? `Inspection ${i.id} completed` : r.message, r.ok ? "success" : "error"); })}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                          >{pendingAction === `complete-${i.id}` ? "Completing..." : "Complete"}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-12 border border-dashed border-hairline rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-primary-bg flex items-center justify-center text-primary mx-auto mb-4">
                      {I.calendar}
                    </div>
                    <p className="font-display text-base text-ink">Nothing scheduled for today</p>
                    <p className="text-xs text-ink-secondary mt-1.5">{pendingInspections.length} pending inspections across your city.</p>
                  </div>
                )}
              </section>

              {/* Editorial section: Pipeline Overview */}
              <section>
                <div className="pb-5 mb-6 border-b border-hairline">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Curation</p>
                  <h2 className="font-display text-2xl tracking-tight text-ink mt-1.5">Pipeline Overview</h2>
                </div>
                <div className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-4 rounded-xl overflow-hidden border border-hairline">
                  {[
                    { label: "Draft", count: pipeline.filter((p) => p.status === "draft").length, color: "bg-ink-secondary" },
                    { label: "Pending", count: pipeline.filter((p) => p.status === "pending_review").length, color: "bg-primary" },
                    { label: "Approved", count: pipeline.filter((p) => p.status === "approved").length, color: "bg-success" },
                    { label: "Suspended", count: pipeline.filter((p) => p.status === "suspended").length, color: "bg-danger" },
                  ].map((s) => (
                    <div key={s.label} className="bg-canvas p-5 text-center">
                      <div className={`w-2 h-2 rounded-full inline-block ${s.color}`} />
                      <p className="font-display text-3xl tracking-tight text-ink mt-3 tabular-nums">{s.count}</p>
                      <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-ink-tertiary mt-2">{s.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ---------- PROPERTIES ---------- */}
          {tab === "curation" && (
            <div className="space-y-12">
              {/* Editorial page header */}
              <header className="pb-10 mb-10 border-b border-hairline flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[65ch]">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Curation</p>
                  <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Your properties</h2>
                  <p className="mt-4 text-base text-ink-secondary leading-relaxed">Review, edit, and submit onboarded listings to admin for final approval. Track approved properties below.</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <select value={curationFilter} onChange={(e) => setCurationFilter(e.target.value)} className="text-xs border border-hairline rounded-lg px-3 py-2 outline-none text-ink bg-canvas">
                    <option value="all">All</option>
                    <option value="new">New submissions</option>
                    <option value="resubmit">Resubmitted</option>
                  </select>
                  <button
                    onClick={() => { setOnboardForm({ name: "", city: assignedCities[0] ?? "Lagos", address: "", bedrooms: 1, maxGuests: 2, ownerName: "", ownerPhone: "", ownerEmail: "" }); setOnboardModalOpen(true); }}
                    className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer flex items-center gap-2 border-none"
                  >
                    {I.plus}<span>Onboard new property</span>
                  </button>
                </div>
              </header>

              {/* Awaiting approval */}
              <section>
                <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline">
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Pending review</p>
                    <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">Awaiting approval</h3>
                  </div>
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] rounded-full border border-warning/30 text-warning bg-warning/5 px-2.5 py-1">
                    {curation.length} submitted
                  </span>
                </div>
                {filteredCuration.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-hairline rounded-xl">
                    <p className="font-display text-base text-ink">No properties awaiting approval</p>
                    <p className="text-sm text-ink-secondary mt-1.5">Submit onboarded properties and they'll appear here for admin review.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {filteredCuration.map((p) => (
                      <li key={p.id} className="py-5 px-1 transition-colors hover:bg-bone-secondary/40">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-display text-lg tracking-tight text-ink">{p.name}</h4>
                              <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border border-warning/30 text-warning bg-warning/5 px-2 py-0.5">Awaiting admin</span>
                            </div>
                            <p className="text-xs text-ink-secondary mt-1.5">{p.city} · Submitted {p.submitted_at}</p>
                            <div className="flex items-center gap-x-4 mt-2 text-xs text-ink-secondary">
                              <span>{p.bedrooms} bed</span><span>{p.bathrooms} bath</span><span>Up to {p.max_guests} guests</span>
                              <span className="font-semibold tabular-nums text-primary">{fmt(p.price_minor)}<span className="text-ink-tertiary font-normal">/night</span></span>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setEditModal(p);
                                setEditForm({ name: p.name, description: "", rate: p.price_minor, beds: p.bedrooms, baths: p.bathrooms, guests: p.max_guests, extended: false, extendedPrice: 0 });
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-hairline text-ink-secondary hover:bg-canvas transition-colors cursor-pointer bg-transparent"
                            >Edit Details</button>
                            <button
                              disabled={pendingAction === `remove-${p.id}`}
                              onClick={() => setDialog({ type: "remove", property: p })}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-hairline text-danger hover:bg-error/5 transition-colors cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-wait"
                            >{pendingAction === `remove-${p.id}` ? "Removing..." : "Remove"}</button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Approved & Live */}
              <section>
                <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline">
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Performing</p>
                    <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">Approved &amp; live</h3>
                  </div>
                  <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">
                    {pipeline.filter((p) => p.status === "approved").length} live
                  </span>
                </div>
                {pipeline.filter((p) => p.status === "approved").length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-hairline rounded-xl">
                    <p className="font-display text-base text-ink">No live properties yet</p>
                    <p className="text-sm text-ink-secondary mt-1.5">Submit onboarded properties to admin for approval.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-2 rounded-xl overflow-hidden border border-hairline">
                    {pipeline.filter((p) => p.status === "approved").map((p) => (
                      <div key={p.id} className="bg-canvas p-6">
                        <div className="flex justify-between items-start mb-5">
                          <div>
                            <p className="font-display text-lg tracking-tight text-ink">{p.name}</p>
                            <p className="text-xs text-ink-tertiary mt-1">Updated {p.updated_at}</p>
                          </div>
                          <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2 py-0.5">Live</span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-hairline">
                          {[
                            { label: "Bookings", value: "—" },
                            { label: "Revenue (MTD)", value: "—" },
                            { label: "Occupancy", value: "—" },
                            { label: "Status", value: "Approved" },
                          ].map((m) => (
                            <div key={m.label}>
                              <p className="font-display text-base tabular-nums text-ink">{m.value}</p>
                              <p className="text-[10px] font-sans uppercase tracking-[0.1em] text-ink-tertiary mt-1">{m.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ---------- INSPECTIONS ---------- */}
          {tab === "inspections" && (
            <div className="space-y-12">
              <header className="pb-10 mb-10 border-b border-hairline flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[65ch]">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Field</p>
                  <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Inspections</h2>
                  <p className="mt-4 text-base text-ink-secondary leading-relaxed">Checkout inspections for your city. Start one when you arrive, complete with the outcome (clean, damage, noshow, guestpresent) and the platform routes the next step.</p>
                </div>
                <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1 self-start lg:self-end">
                  {pendingInspections.length} pending
                </span>
              </header>
              {inspections.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-hairline rounded-xl">
                  <p className="font-display text-base text-ink">No inspections scheduled</p>
                  <p className="text-sm text-ink-secondary mt-1.5">Inspections appear here as guests check out.</p>
                </div>
              ) : (
                <ul className="divide-y divide-hairline border-y border-hairline">
                  {inspections.map((i) => (
                    <li key={i.id} className="py-5 px-1 transition-colors hover:bg-bone-secondary/40">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-lg tracking-tight text-ink">{i.property_name}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-ink-secondary">
                            <span>Checkout {i.checkout_date} · {i.checkout_time}</span>
                            <span>{i.guest_name}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border border-hairline px-2.5 py-1 ${statusColor(i.status)}`}>{statusLabel(i.status)}</span>
                      </div>
                      {(i.status === "pending" || i.status === "in_progress") && (
                        <div className="flex flex-col gap-3 mt-4">
                          <div className="flex gap-2">
                            <button
                              disabled={pendingAction === `start-${i.id}`}
                              onClick={() => action(`start-${i.id}`, async () => { const r = await startInspection({ inspectionId: i.id }); if (r.ok) setInspections((prev) => prev.map((x) => x.id === i.id ? { ...x, status: "in_progress" } : x)); notify(r.ok ? `Inspection ${i.id} started` : r.message, r.ok ? "success" : "error"); })}
                              className="px-4 py-2 rounded-lg text-sm font-medium border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-wait"
                            >{pendingAction === `start-${i.id}` ? "Starting..." : "Start Inspection"}</button>
                            <button
                              disabled={pendingAction === `complete-${i.id}`}
                              onClick={() => action(`complete-${i.id}`, async () => { const r = await completeInspection({ inspectionId: i.id }); if (r.ok) setInspections((prev) => prev.map((x) => x.id === i.id ? { ...x, status: "completed" } : x)); notify(r.ok ? `Inspection ${i.id} completed` : r.message, r.ok ? "success" : "error"); })}
                              className="px-4 py-2 rounded-lg text-sm font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-wait"
                            >{pendingAction === `complete-${i.id}` ? "Completing..." : "Complete"}</button>
                          </div>
                          {outcomeInspId === i.id ? (
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { key: "clean", label: "CLEAN", color: "bg-success/10 text-success border-success/20" },
                                { key: "damage", label: "DAMAGE", color: "bg-danger/10 text-danger border-danger/20" },
                                { key: "noshow", label: "NOSHOW", color: "bg-warning/10 text-warning border-warning/20" },
                                { key: "guestpresent", label: "GUESTPRESENT", color: "bg-primary/10 text-primary border-primary/20" },
                              ].map((o) => (
                                <button
                                  key={o.key}
                                  onClick={() => {
                                    action(`complete-${i.id}`, async () => {
                                      const r = await completeInspection({ inspectionId: i.id, notes: o.key });
                                      if (r.ok) setInspections((prev) => prev.map((x) => x.id === i.id ? { ...x, status: "completed" } : x));
                                      notify(r.ok ? `Inspection ${i.id} completed — ${o.key}` : r.message, r.ok ? "success" : "error");
                                    });
                                    setOutcomeInspId(null);
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${o.color}`}
                                >
                                  {o.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button onClick={() => setOutcomeInspId(i.id)} className="text-xs font-medium text-primary hover:underline cursor-pointer bg-transparent border-none text-left">
                              Select outcome
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ---------- BOOKINGS (structure.md: city-scoped bookings view) ---------- */}
          {tab === "bookings" && (
            <div className="space-y-12">
              <header className="pb-10 mb-10 border-b border-hairline">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Guests</p>
                <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Bookings — {assignedCities.length > 0 ? assignedCities.join(" + ") : "all cities"}</h2>
                <p className="mt-4 text-base text-ink-secondary leading-relaxed max-w-[65ch]">City-scoped guest stays for first-line issue resolution. Tap any stay to view guest contact and stay details.</p>
              </header>

              {/* In-progress stays */}
              <section>
                <div className="flex items-center gap-3 pb-5 mb-6 border-b border-hairline">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Active</p>
                    <h3 className="font-display text-xl tracking-tight text-ink mt-1">In progress</h3>
                  </div>
                  <span className="ml-auto text-[10px] font-sans font-semibold uppercase tracking-[0.1em] rounded-full border border-success/30 text-success bg-success/5 px-2.5 py-1">
                    {inProgressBookings.length} on-site
                  </span>
                </div>
                {inProgressBookings.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-hairline rounded-xl">
                    <p className="font-display text-base text-ink">No active stays right now</p>
                    <p className="text-sm text-ink-secondary mt-1.5">Guests currently on-site will appear here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {inProgressBookings.map((b) => (
                      <li key={b.id} className="flex items-start justify-between gap-4 py-5 px-1 transition-colors hover:bg-bone-secondary/40">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-display text-lg tracking-tight text-ink">{b.property_name} · {b.unit}</p>
                            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border border-success/30 text-success bg-success/5 px-2 py-0.5">Active</span>
                          </div>
                          <p className="text-xs text-ink-secondary mt-1.5">{b.guest} · {b.guest_email}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink-secondary">
                            <span>Check-in {b.check_in}</span>
                            <span>Check-out {b.check_out}</span>
                            <span>{b.nights} night{b.nights === 1 ? "" : "s"}</span>
                            <span>{b.guest_count} guest{b.guest_count === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                        <span className="font-display text-lg tabular-nums text-ink">{fmt(b.amount_minor)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Upcoming stays */}
              <section>
                <div className="flex items-center gap-3 pb-5 mb-6 border-b border-hairline">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Coming up</p>
                    <h3 className="font-display text-xl tracking-tight text-ink mt-1">Upcoming</h3>
                  </div>
                  <span className="ml-auto text-[10px] font-sans font-semibold uppercase tracking-[0.1em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">
                    {upcomingBookings.length} arrivals
                  </span>
                </div>
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-hairline rounded-xl">
                    <p className="font-display text-base text-ink">No upcoming bookings</p>
                    <p className="text-sm text-ink-secondary mt-1.5">Future arrivals in your city will appear here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {upcomingBookings.map((b) => (
                      <li key={b.id} className="flex items-start justify-between gap-4 py-5 px-1 transition-colors hover:bg-bone-secondary/40">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-lg tracking-tight text-ink">{b.property_name} · {b.unit}</p>
                          <p className="text-xs text-ink-secondary mt-1.5">{b.guest} · {b.guest_email}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink-secondary">
                            <span>{b.check_in} → {b.check_out}</span>
                            <span>{b.nights} night{b.nights === 1 ? "" : "s"}</span>
                            <span>{b.guest_count} guest{b.guest_count === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                        <span className="font-display text-base tabular-nums text-ink-secondary">{fmt(b.amount_minor)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Pending confirmation */}
              {pendingBookings.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 pb-5 mb-6 border-b border-hairline">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    <div>
                      <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Awaiting</p>
                      <h3 className="font-display text-xl tracking-tight text-ink mt-1">Pending confirmation</h3>
                    </div>
                    <span className="ml-auto text-[10px] font-sans font-semibold uppercase tracking-[0.1em] rounded-full border border-warning/30 text-warning bg-warning/5 px-2.5 py-1">
                      {pendingBookings.length} pending
                    </span>
                  </div>
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {pendingBookings.map((b) => (
                      <li key={b.id} className="flex items-start justify-between gap-4 py-5 px-1 transition-colors hover:bg-bone-secondary/40">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-lg tracking-tight text-ink">{b.property_name} · {b.unit}</p>
                          <p className="text-xs text-ink-secondary mt-1.5">{b.guest} · {b.guest_email}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-ink-secondary">
                            <span>{b.check_in} → {b.check_out}</span>
                            <span>{b.nights} night{b.nights === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border border-warning/30 text-warning bg-warning/5 px-2 py-1 self-start">Pending</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Recent stays */}
              <section>
                <div className="flex items-center gap-3 pb-5 mb-6 border-b border-hairline">
                  <span className="w-2 h-2 rounded-full bg-ink-tertiary" />
                  <div>
                    <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Context</p>
                    <h3 className="font-display text-xl tracking-tight text-ink mt-1">Recent (last 30 days)</h3>
                  </div>
                </div>
                {recentBookings.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-hairline rounded-xl">
                    <p className="font-display text-base text-ink">No recent stays</p>
                    <p className="text-sm text-ink-secondary mt-1.5">Completed stays from the last 30 days for context during resolution.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-hairline border-y border-hairline">
                    {recentBookings.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-4 py-4 px-1 transition-colors hover:bg-bone-secondary/40">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-sans font-semibold text-ink">{b.property_name} · {b.unit}</p>
                          <p className="text-xs text-ink-secondary mt-0.5">{b.guest} · {b.check_in} → {b.check_out}</p>
                        </div>
                        <span className="text-xs font-sans tabular-nums text-ink-secondary">{fmt(b.amount_minor)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ---------- CLAIMS (structure.md: operator submits, admin reviews) ---------- */}
          {tab === "claims" && (
            <div className="space-y-10">
              <header className="pb-10 mb-10 border-b border-hairline flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[65ch]">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Damage</p>
                  <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Claims</h2>
                  <p className="mt-4 text-base text-ink-secondary leading-relaxed">
                    Submit claims for {assignedCities.length > 0 ? assignedCities.join(" + ") : "your city"} properties. Admin reviews and adjudicates.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setClaimForm({
                      propertyId: "",
                      guestName: "",
                      bookingRef: "",
                      stayDates: "",
                      description: "",
                      estimatedCostMinor: 0,
                      photoCount: 0,
                      operatorNotes: "",
                    });
                    setClaimModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none self-start lg:self-end"
                >
                  {I.plus}<span>Submit Claim</span>
                </button>
              </header>

              {/* filter chips */}
              <div className="flex items-center gap-2 flex-wrap pb-2">
                {([
                  { id: "all", label: "All", count: claims.length },
                  { id: "pending", label: "Pending", count: claims.filter((c) => c.admin_decision === "pending").length },
                  { id: "approved", label: "Approved", count: claims.filter((c) => c.admin_decision === "approved").length },
                  { id: "rejected", label: "Rejected", count: claims.filter((c) => c.admin_decision === "rejected").length },
                ] as const).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setClaimFilter(f.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                      claimFilter === f.id
                        ? "border-primary bg-primary-bg text-primary"
                        : "border-hairline bg-canvas text-ink-secondary hover:border-primary/30"
                    }`}
                  >
                    {f.label}
                    <span className="text-[10px] tabular-nums opacity-60">{f.count}</span>
                  </button>
                ))}
              </div>

              {claims.filter((c) => claimFilter === "all" || c.admin_decision === claimFilter).length === 0 ? (
                <div className="text-center py-16 border border-dashed border-hairline rounded-xl">
                  <p className="font-display text-base text-ink">No claims in this category</p>
                  <p className="text-sm text-ink-secondary mt-1.5">Submit a claim after an inspection to start the workflow.</p>
                </div>
              ) : (
                <ul className="divide-y divide-hairline border-y border-hairline">
                  {claims
                    .filter((c) => claimFilter === "all" || c.admin_decision === claimFilter)
                    .map((c) => (
                      <li key={c.id} className="py-5 px-1 transition-colors hover:bg-bone-secondary/40">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-lg tracking-tight text-ink">{c.property_name}</p>
                            <p className="text-xs text-ink-secondary mt-1.5">
                              Guest: {c.guest_name} · Stay: {c.stay_dates} · Ref: {c.booking_ref}
                            </p>
                            <p className="text-xs text-ink-secondary mt-1">
                              Submitted {c.submitted_at} · {c.photo_count} photo{c.photo_count === 1 ? "" : "s"}
                            </p>
                            <p className="text-sm text-ink mt-3">{c.description}</p>
                            {c.operator_notes && (
                              <p className="text-xs text-ink-secondary mt-2 italic">Operator notes: {c.operator_notes}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-display text-xl tabular-nums text-primary">{fmt(c.estimated_cost_minor)}</p>
                            <span className={`inline-block mt-1.5 text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border px-2 py-0.5 ${
                              c.admin_decision === "approved"
                                ? "border-primary/30 text-primary-dark bg-primary-bg"
                                : c.admin_decision === "rejected"
                                  ? "border-error/30 text-error bg-error/5"
                                  : c.admin_decision === "adjusted"
                                    ? "border-warning/30 text-warning bg-warning/5"
                                    : "border-hairline text-ink-secondary bg-canvas"
                            }`}>
                              {c.admin_decision}
                            </span>
                            {c.adjusted_amount_minor != null && (
                              <p className="text-[10px] text-ink-tertiary mt-1.5">Adjusted: {fmt(c.adjusted_amount_minor)}</p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          {/* ---------- OWNERS (structure.md: operator directory for their city) ---------- */}
          {tab === "owners" && (
            <div className="space-y-10">
              <header className="pb-10 mb-10 border-b border-hairline">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Directory</p>
                <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Property owners</h2>
                <p className="mt-4 text-base text-ink-secondary leading-relaxed max-w-[65ch]">
                  Owners with properties in {assignedCities.length > 0 ? assignedCities.join(" + ") : "your assigned city"}. Primary contact via WhatsApp.
                </p>
              </header>
              {owners.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-hairline rounded-xl">
                  <p className="font-display text-base text-ink">No owners in your assigned cities yet</p>
                  <p className="text-sm text-ink-secondary mt-1.5">Onboard property owners to grow the network.</p>
                </div>
              ) : (
                <ul className="divide-y divide-hairline border-y border-hairline">
                  {owners.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-4 py-5 px-1 transition-colors hover:bg-bone-secondary/40 flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-xs font-sans font-semibold shrink-0">
                          {o.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-lg tracking-tight text-ink truncate">{o.name}</p>
                          <p className="text-xs text-ink-secondary truncate">{o.email} · {o.whatsapp}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-ink-secondary">City: <strong className="text-ink">{o.city}</strong></p>
                          <p className="text-xs text-ink-secondary">
                            {o.properties_count} propert{o.properties_count === 1 ? "y" : "ies"} · {o.total_bookings} bookings
                          </p>
                        </div>
                        <span className={`text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border px-2.5 py-1 ${
                          o.status === "active"
                            ? "border-primary/30 text-primary-dark bg-primary-bg"
                            : o.status === "suspended"
                              ? "border-error/30 text-error bg-error/5"
                              : "border-warning/30 text-warning bg-warning/5"
                        }`}>
                          {o.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ---------- PHOTOS ---------- */}
          {tab === "photos" && (
            <div className="space-y-10">
              <header className="pb-10 mb-10 border-b border-hairline flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[65ch]">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Media</p>
                  <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Property photos</h2>
                  <p className="mt-4 text-base text-ink-secondary leading-relaxed">Upload, approve, reject, and reorder listing photos.</p>
                </div>
                <select
                  value={selectedProperty}
                  onChange={(e) => handleSelectProperty(e.target.value)}
                  className="text-xs border border-hairline rounded-lg px-3 py-2 outline-none text-ink bg-canvas self-start lg:self-end"
                >
                  <option value="">Select a property...</option>
                  {seedProperties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.neighbourhood}</option>
                  ))}
                </select>
              </header>

              {selectedProperty && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-x-2">
                      <button
                        onClick={() => setPhotosTab("browse")}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer border-none transition-colors ${photosTab === "browse" ? "bg-primary text-white" : "text-ink-secondary bg-transparent hover:bg-primary-bg"}`}
                      >Browse</button>
                      <button
                        onClick={() => setPhotosTab("manage")}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer border-none transition-colors ${photosTab === "manage" ? "bg-primary text-white" : "text-ink-secondary bg-transparent hover:bg-primary-bg"}`}
                      >Manage</button>
                    </div>

                    <button
                      disabled={pendingAction === "upload-photo"}
                      onClick={() => action("upload-photo", async () => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.onchange = async () => {
                          const file = input.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("alt", file.name);
                          setPendingAction("upload-photo");
                          try {
                            const res = await fetch(`/api/operator/properties/${selectedProperty}/photos`, { method: "POST", body: formData });
                            if (res.ok) { notify("Photo uploaded."); loadPhotos(selectedProperty); }
                            else notify("Upload failed.", "error");
                          } catch { notify("Upload failed.", "error"); }
                          setPendingAction(null);
                        };
                        input.click();
                      })}
                      className="text-sm font-medium px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >{pendingAction === "upload-photo" ? "Uploading..." : "+ Upload Photo"}</button>
                  </div>

                  {photosLoading ? (
                    <p className="text-center text-sm text-ink-secondary py-8">Loading photos...</p>
                  ) : photos.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-hairline">
                      <div className="mb-3">{I.camera}</div>
                      <p className="text-sm text-ink-secondary">No photos yet for this property.</p>
                      <p className="text-xs text-ink-tertiary mt-1">Upload listing photos to start building the gallery.</p>
                    </div>
                  ) : photosTab === "browse" ? (
                    /* Browse view — gallery grid */
                    <div className="grid grid-cols-3 gap-3">
                      {photos.map((p) => (
                        <div key={p.id} className="relative bg-white rounded-xl border border-hairline overflow-hidden group cursor-pointer" onClick={() => { photosTab === "browse" && setEditingPhoto(p.id); setEditAltText(p.alt); }}>
                          <img src={p.url} alt={p.alt} className="w-full aspect-[4/3] object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">Edit</span>
                          </div>
                          <div className="p-3">
                            {editingPhoto === p.id ? (
                              <input
                                type="text"
                                value={editAltText}
                                onChange={(e) => { e.stopPropagation(); setEditAltText(e.target.value); }}
                                onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") saveAltText(p.id); }}
                                onBlur={() => saveAltText(p.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full border border-primary rounded-lg px-2 py-1 text-xs outline-none text-ink mb-1"
                                autoFocus
                              />
                            ) : (
                              <p className="text-xs font-medium text-ink truncate">{p.alt}</p>
                            )}
                            <div className="flex items-center gap-x-2 mt-1">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                p.status === "approved" ? "bg-success/10 text-success" : p.status === "rejected" ? "bg-danger/10 text-danger" : "bg-primary-bg text-primary"
                              }`}>{p.status}</span>
                              {p.is_cover && <span className="text-[10px] text-brass font-semibold">Cover</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Manage view — list with edit/reorder/approve/reject */
                    <div className="space-y-2">
                      {photos.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline bg-white hover:bg-primary-bg transition-colors">
                          <div className="flex items-center gap-x-3 flex-1 min-w-0">
                            <img src={p.url} alt={p.alt} className="w-16 h-12 rounded-lg object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              {editingPhoto === p.id ? (
                                <div className="flex items-center gap-x-2">
                                  <input
                                    type="text"
                                    value={editAltText}
                                    onChange={(e) => setEditAltText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") saveAltText(p.id); }}
                                    onBlur={() => saveAltText(p.id)}
                                    className="flex-1 border border-primary rounded-lg px-3 py-1.5 text-sm outline-none text-ink"
                                    autoFocus
                                  />
                                  <button onClick={() => { setEditingPhoto(null); }} className="text-xs text-ink-secondary cursor-pointer border-none bg-transparent">Cancel</button>
                                </div>
                              ) : (
                                <p
                                  className="text-sm font-semibold text-ink cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => { setEditingPhoto(p.id); setEditAltText(p.alt); }}
                                  title="Click to edit"
                                >{p.alt}</p>
                              )}
                              <p className="text-xs text-ink-secondary">#{p.sort_order} · {p.status}{p.is_cover ? " · cover" : ""}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-x-1 shrink-0">
                            {/* Reorder */}
                            <button
                              disabled={idx === 0 || pendingAction === `move-${p.id}`}
                              onClick={() => action(`move-${p.id}`, async () => {
                                const reordered = [...photos];
                                const prev = reordered[idx - 1];
                                [reordered[idx].sort_order, reordered[idx - 1].sort_order] = [prev.sort_order, p.sort_order];
                                const res = await fetch(`/api/operator/properties/${selectedProperty}/photos/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: reordered.map((ph) => ({ id: ph.id, sort_order: ph.sort_order })) }) });
                                if (res.ok) { loadPhotos(selectedProperty); } else notify("Reorder failed.", "error");
                              })}
                              className="text-[10px] px-1.5 py-1 rounded hover:bg-primary-bg text-ink-secondary cursor-pointer disabled:opacity-30"
                              title="Move up"
                            >↑</button>
                            <button
                              disabled={idx === photos.length - 1 || pendingAction === `move-${p.id}`}
                              onClick={() => action(`move-${p.id}`, async () => {
                                const reordered = [...photos];
                                const next = reordered[idx + 1];
                                [reordered[idx].sort_order, reordered[idx + 1].sort_order] = [next.sort_order, p.sort_order];
                                const res = await fetch(`/api/operator/properties/${selectedProperty}/photos/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: reordered.map((ph) => ({ id: ph.id, sort_order: ph.sort_order })) }) });
                                if (res.ok) { loadPhotos(selectedProperty); } else notify("Reorder failed.", "error");
                              })}
                              className="text-[10px] px-1.5 py-1 rounded hover:bg-primary-bg text-ink-secondary cursor-pointer disabled:opacity-30"
                              title="Move down"
                            >↓</button>

                            {/* Set cover */}
                            {!p.is_cover && (
                              <button
                                disabled={pendingAction === `cover-${p.id}`}
                                onClick={() => action(`cover-${p.id}`, async () => {
                                  const res = await fetch(`/api/operator/properties/${selectedProperty}/photos/reorder`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: photos.map((ph) => ({ id: ph.id, sort_order: ph.sort_order, is_cover: ph.id === p.id })) }) });
                                  if (res.ok) { notify("Cover set."); loadPhotos(selectedProperty); } else notify("Failed.", "error");
                                })}
                                className="text-[10px] px-2 py-1 rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer disabled:opacity-50"
                              >{pendingAction === `cover-${p.id}` ? "..." : "Set Cover"}</button>
                            )}

                            {/* Approve / reject */}
                            {p.status === "pending_review" && (
                              <>
                                <button
                                  disabled={pendingAction === `approve-photo-${p.id}`}
                                  onClick={() => action(`approve-photo-${p.id}`, async () => { const res = await fetch(`/api/operator/photos/${p.id}/approve`, { method: "POST" }); if (res.ok) { notify("Photo approved."); loadPhotos(selectedProperty); } else notify("Failed.", "error"); })}
                                  className="text-[10px] px-2 py-1 rounded-lg hover:bg-green-50 text-success cursor-pointer disabled:opacity-50"
                                >{pendingAction === `approve-photo-${p.id}` ? "..." : "Approve"}</button>
                                <button
                                  disabled={pendingAction === `reject-photo-${p.id}`}
                                  onClick={() => action(`reject-photo-${p.id}`, async () => { const res = await fetch(`/api/operator/photos/${p.id}/reject`, { method: "POST" }); if (res.ok) { notify("Photo rejected."); loadPhotos(selectedProperty); } else notify("Failed.", "error"); })}
                                  className="text-[10px] px-2 py-1 rounded-lg hover:bg-red-50 text-danger cursor-pointer disabled:opacity-50"
                                >{pendingAction === `reject-photo-${p.id}` ? "..." : "Reject"}</button>
                              </>
                            )}

                            {/* Delete */}
                            <button
                              disabled={pendingAction === `delete-photo-${p.id}`}
                              onClick={() => { if (confirm("Delete this photo permanently?")) action(`delete-photo-${p.id}`, async () => { const res = await fetch(`/api/operator/photos/${p.id}`, { method: "DELETE" }); if (res.ok) { notify("Photo deleted."); loadPhotos(selectedProperty); } else notify("Failed.", "error"); }); }}
                              className="text-[10px] px-2 py-1 rounded-lg hover:bg-red-50 text-danger cursor-pointer disabled:opacity-50"
                            >{pendingAction === `delete-photo-${p.id}` ? "..." : "Del"}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!selectedProperty && (
                <div className="text-center py-12 bg-white rounded-xl border border-hairline">
                  <div className="mb-3">{I.camera}</div>
                  <p className="text-sm text-ink-secondary">Select a property above to manage its photos.</p>
                  <p className="text-xs text-ink-tertiary mt-1">You can upload, approve, reject, and reorder listing photos here.</p>
                </div>
              )}
            </div>
          )}

          {/* ---------- NOTIFICATIONS ---------- */}
          {tab === "notifications" && <NotificationsView role="operator" userId={user?.id} />}

          {/* ---------- VERIFICATION ---------- */}
          {tab === "verification" && (
            <div className="space-y-10">
              <header className="pb-10 mb-10 border-b border-hairline flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[65ch]">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Verification</p>
                  <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Monthly log — June 2026</h2>
                  <p className="mt-4 text-base text-ink-secondary leading-relaxed">Verification visits across your city — properties, photos, notes.</p>
                </div>
                <button
                  onClick={() => { setVerifForm({ propertyId: "", notes: "", photos: 0 }); setVerifModalOpen(true); }}
                  className="text-sm font-semibold px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer bg-transparent self-start lg:self-end"
                >+ New Entry</button>
              </header>
              {verifications.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-hairline rounded-xl">
                  <p className="font-display text-base text-ink">No verifications logged yet</p>
                  <p className="text-sm text-ink-secondary mt-1.5">Add a verification entry after visiting a property.</p>
                </div>
              ) : (
                <ul className="divide-y divide-hairline border-y border-hairline">
                  {verifications.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-4 py-5 px-1 transition-colors hover:bg-bone-secondary/40 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-lg tracking-tight text-ink">{v.property_name}</p>
                        <p className="text-xs text-ink-secondary mt-1.5">{v.date} · {v.photos} photos — {v.notes}</p>
                      </div>
                      <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">{v.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ---------- PERFORMANCE ---------- */}
          {tab === "performance" && (
            <div className="space-y-12">
              <header className="pb-10 mb-10 border-b border-hairline">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary mb-3">Performance</p>
                <h2 className="font-display text-[2rem] leading-[1.1] tracking-tight text-ink lg:text-[2.75rem]">Your numbers</h2>
                <p className="mt-4 text-base text-ink-secondary leading-relaxed max-w-[65ch]">Inspection throughput, claims, and revenue share — the things that earn the rating.</p>
              </header>

              <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-hairline">
                {[
                  { label: "Inspections", value: stats.find((s) => s.label.includes("Inspections"))?.value ?? "12", sub: "this month" },
                  { label: "Properties", value: "8", sub: "active" },
                  { label: "Claims submitted", value: claims.filter((c) => c.admin_decision !== "rejected").length.toString(), sub: "this month" },
                  { label: "Quality score", value: stats.find((s) => s.label.includes("Quality"))?.value ?? "92%", sub: "30-day avg" },
                ].map((m, i) => (
                  <div key={m.label} className={i > 0 ? "lg:pl-8" : ""}>
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">{m.label}</p>
                    <p className="font-display text-[2.25rem] leading-none tracking-tight mt-2 tabular-nums text-ink">{m.value}</p>
                    <p className="mt-2 text-xs text-ink-secondary">{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Revenue share */}
              <section>
                <div className="pb-5 mb-6 border-b border-hairline">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Earnings</p>
                  <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">Revenue share</h3>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-8">
                  <div>
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">City revenue (MTD)</p>
                    <p className="font-display text-[2rem] leading-none tracking-tight mt-2 tabular-nums text-ink">£{(640000 / 100)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Commission rate</p>
                    <p className="font-display text-[2rem] leading-none tracking-tight mt-2 tabular-nums text-primary">6%</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Your earnings</p>
                    <p className="font-display text-[2rem] leading-none tracking-tight mt-2 tabular-nums text-primary">£{Math.round(640000 * 0.06 / 100)}</p>
                  </div>
                </div>
                <div className="bg-primary-bg rounded-xl p-5">
                  <p className="text-xs text-ink-secondary mb-3 font-sans">Earnings breakdown</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: "60%" }} />
                    </div>
                    <span className="text-xs font-sans font-semibold text-primary">60% paid</span>
                  </div>
                  <p className="text-[11px] text-ink-secondary font-sans">Next payout: ~£{Math.round(640000 * 0.06 * 0.4 / 100)} pending (end of month)</p>
                </div>
              </section>

              {/* Response metrics */}
              <section>
                <div className="pb-5 mb-6 border-b border-hairline">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Response</p>
                  <h3 className="font-display text-2xl tracking-tight text-ink mt-1.5">Response metrics</h3>
                </div>
                <div className="grid grid-cols-1 gap-px bg-hairline sm:grid-cols-3 rounded-xl overflow-hidden border border-hairline">
                  {[
                    { label: "Avg response time", value: "2.4 min", target: "Under 5 min" },
                    { label: "Inspection completion", value: "100%", target: "Target: 95%" },
                    { label: "Verification rate", value: "92%", target: "Target: 90%" },
                  ].map((m) => (
                    <div key={m.label} className="bg-canvas p-5 text-center">
                      <p className="font-display text-[2rem] leading-none tracking-tight tabular-nums text-ink">{m.value}</p>
                      <p className="text-xs text-ink-secondary mt-2 font-sans">{m.label}</p>
                      <p className="text-[10px] font-sans uppercase tracking-[0.1em] text-ink-tertiary mt-1">{m.target}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

      {/* Confirm / Prompt Dialogs */}
      <ConfirmDialog
        open={dialog?.type === "remove"}
        title="Remove property"
        message={`Remove "${dialog?.property?.name}" from the platform? This action can be reversed.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          if (!dialog) return;
          const p = dialog.property;
          setDialog(null);
          action(`remove-${p.id}`, async () => {
            const r = await suspendProperty({ propertyId: p.id });
            if (r.ok) setCuration((prev) => prev.filter((x) => x.id !== p.id));
            notify(r.ok ? "Property removed." : r.message, r.ok ? "success" : "error");
          });
        }}
        onCancel={() => setDialog(null)}
      />

      {/* Edit Property Modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={editModal ? `Edit: ${editModal.name}` : undefined}
        size="lg"
      >
        {editModal && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Property name</label>
              <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Description (visible to guests browsing &amp; booking)</label>
              <textarea rows={4} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe the apartment — what guests see on the detail page and during booking..." className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink resize-none font-sans bg-canvas" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Nightly rate (£)</label>
                <input type="number" min={0} step={0.01} value={editForm.rate / 100} onChange={(e) => setEditForm((f) => ({ ...f, rate: Math.round(parseFloat(e.target.value || "0") * 100) }))} className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
              </div>
              <div>
                <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Bedrooms</label>
                <input type="number" min={1} max={10} value={editForm.beds} onChange={(e) => setEditForm((f) => ({ ...f, beds: parseInt(e.target.value) || 1 }))} className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
              </div>
              <div>
                <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Max guests</label>
                <input type="number" min={1} max={20} value={editForm.guests} onChange={(e) => setEditForm((f) => ({ ...f, guests: parseInt(e.target.value) || 1 }))} className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-sans font-medium text-ink-secondary">Offer extended checkout (18:00)</span>
              <input type="checkbox" checked={editForm.extended} onChange={(e) => setEditForm((f) => ({ ...f, extended: e.target.checked }))} className="w-4 h-4 accent-primary cursor-pointer" />
            </div>
            {editForm.extended && (
              <div>
                <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Extended checkout price (£)</label>
                <input type="number" min={0} step={0.01} value={editForm.extendedPrice / 100} onChange={(e) => setEditForm((f) => ({ ...f, extendedPrice: Math.round(parseFloat(e.target.value || "0") * 100) }))} className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Link href={`/stays/${editModal.id.toLowerCase()}`} target="_blank" className="flex-1 py-2.5 rounded-lg text-sm font-sans font-semibold border border-hairline text-ink-secondary text-center no-underline hover:bg-bone-secondary transition-colors bg-transparent">
                View on storefront →
              </Link>
              <button
                disabled={pendingAction === `edit-prop-${editModal.id}`}
                onClick={() => action(`edit-prop-${editModal.id}`, async () => {
                  const r = await updateProperty({
                    propertyId: editModal.id,
                    name: editForm.name || undefined,
                    description: editForm.description || undefined,
                    nightly_rate_minor: editForm.rate || undefined,
                    extended_checkout_offered: editForm.extended,
                    extended_checkout_price_minor: editForm.extended ? (editForm.extendedPrice || undefined) : undefined,
                  });
                  notify(r.ok ? "Property updated. Changes will appear on the storefront." : r.message, r.ok ? "success" : "error");
                  if (r.ok) setEditModal(null);
                })}
                className="flex-1 py-2.5 rounded-lg text-sm font-sans font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-wait"
              >{pendingAction === `edit-prop-${editModal.id}` ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Onboard New Property Modal — operator sources a property */}
      <Modal
        open={onboardModalOpen}
        onClose={() => setOnboardModalOpen(false)}
        title="Onboard a new property"
        description="Source a property for your city. The owner will be invited to the platform."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOnboardModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-sans font-semibold border border-hairline text-ink-secondary hover:bg-bone-secondary transition-colors cursor-pointer bg-canvas"
            >Cancel</button>
            <button
              type="button"
              disabled={
                pendingAction === "onboard-property" ||
                !onboardForm.name ||
                !onboardForm.address ||
                !onboardForm.ownerName ||
                !onboardForm.ownerPhone
              }
              onClick={() => action("onboard-property", async () => {
                // Per structure.md, new properties start in `pending` state and
                // the operator schedules a physical inspection. We persist the
                // draft to the local state and surface it in the Curation queue
                // alongside other submissions. (Real impl writes via createProperty
                // server action + sends WhatsApp invite to the owner.)
                const newProp = {
                  id: `OP-${Date.now()}`,
                  name: onboardForm.name,
                  city: onboardForm.city,
                  submitted_at: new Date().toISOString().slice(0, 10),
                  type: "new" as const,
                  bedrooms: onboardForm.bedrooms,
                  bathrooms: Math.max(1, onboardForm.bedrooms - 1),
                  max_guests: onboardForm.maxGuests,
                  price_minor: 0,
                  status: "pending" as const,
                };
                setCuration((prev) => [newProp, ...prev]);

                // Track in Airtable for cross-functional visibility
                createOnboardingRecord({
                  propertyName: onboardForm.name,
                  city: onboardForm.city as "Lagos" | "Abuja",
                  address: onboardForm.address,
                  bedrooms: onboardForm.bedrooms,
                  ownerName: onboardForm.ownerName,
                  ownerPhone: onboardForm.ownerPhone,
                  ownerEmail: onboardForm.ownerEmail,
                  status: "pending_inspection",
                  submittedAt: new Date().toISOString().slice(0, 10),
                  operatorName: user?.name ?? undefined,
                });

                notify(`Property "${onboardForm.name}" added to your curation queue. Schedule a physical inspection to proceed.`, "success");
                setOnboardModalOpen(false);
              })}
              className="px-4 py-2 rounded-lg text-sm font-sans font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-wait"
            >{pendingAction === "onboard-property" ? "Adding..." : "Add to Curation"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Property name</label>
            <input
              type="text"
              value={onboardForm.name}
              onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
              placeholder="e.g. The Banana Island Villa"
              className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-ink-tertiary bg-canvas font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">City</label>
              <select
                value={onboardForm.city}
                onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
                disabled={assignedCities.length === 1}
                className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink bg-canvas disabled:opacity-50 disabled:cursor-not-allowed font-sans"
              >
                {(assignedCities.length > 0 ? assignedCities : ["Lagos", "Abuja"]).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {assignedCities.length === 1 && (
                <p className="text-[10px] text-ink-tertiary mt-1 font-sans">Scoped to your assigned city.</p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Bedrooms</label>
              <input
                type="number"
                min={1}
                value={onboardForm.bedrooms}
                onChange={(e) => setOnboardForm({ ...onboardForm, bedrooms: parseInt(e.target.value) || 1 })}
                className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink bg-canvas font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Address</label>
            <input
              type="text"
              value={onboardForm.address}
              onChange={(e) => setOnboardForm({ ...onboardForm, address: e.target.value })}
              placeholder="Street, neighbourhood"
              className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-ink-tertiary bg-canvas font-sans"
            />
          </div>

          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Max guests</label>
            <input
              type="number"
              min={1}
              value={onboardForm.maxGuests}
              onChange={(e) => setOnboardForm({ ...onboardForm, maxGuests: parseInt(e.target.value) || 1 })}
              className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink bg-canvas font-sans"
            />
          </div>

          <div className="pt-4 border-t border-hairline">
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-primary mb-3">Owner details</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Owner full name</label>
                <input
                  type="text"
                  value={onboardForm.ownerName}
                  onChange={(e) => setOnboardForm({ ...onboardForm, ownerName: e.target.value })}
                  placeholder="e.g. Tunde Adebayo"
                  className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-ink-tertiary bg-canvas font-sans"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">WhatsApp</label>
                  <input
                    type="tel"
                    value={onboardForm.ownerPhone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, ownerPhone: e.target.value })}
                    placeholder="+234 800 000 0000"
                    className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-ink-tertiary bg-canvas font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Email</label>
                  <input
                    type="email"
                    value={onboardForm.ownerEmail}
                    onChange={(e) => setOnboardForm({ ...onboardForm, ownerEmail: e.target.value })}
                    placeholder="owner@email.com"
                    className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-ink-tertiary bg-canvas font-sans"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Verification Modal */}
      <Modal
        open={verifModalOpen}
        onClose={() => { setVerifModalOpen(false); setVerifForm({ propertyId: "", notes: "", photos: 0 }); }}
        title="New verification entry"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => { setVerifModalOpen(false); setVerifForm({ propertyId: "", notes: "", photos: 0 }); }}
              className="px-4 py-2 rounded-lg text-sm font-sans font-semibold border border-hairline text-ink-secondary hover:bg-bone-secondary transition-colors cursor-pointer bg-canvas"
            >Cancel</button>
            <button
              type="button"
              disabled={!verifForm.propertyId.trim() || pendingAction === "new-verification"}
              onClick={() => action("new-verification", async () => {
                const r = await logVerification({ propertyId: verifForm.propertyId, photos: verifForm.photos, notes: verifForm.notes || undefined });
                if (r.ok) {
                  const prop = seedProperties.find((p) => p.id === verifForm.propertyId);
                  setVerifications((prev) => [{ id: `V${Date.now()}`, property_name: prop?.name ?? verifForm.propertyId, date: new Date().toISOString().slice(0, 10), status: "complete", photos: verifForm.photos, notes: verifForm.notes }, ...prev]);
                  setVerifModalOpen(false);
                  setVerifForm({ propertyId: "", notes: "", photos: 0 });
                }
                notify(r.ok ? "Verification logged." : r.message, r.ok ? "success" : "error");
              })}
              className="px-4 py-2 rounded-lg text-sm font-sans font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-wait"
            >{pendingAction === "new-verification" ? "Logging..." : "Log verification"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Property</label>
            <select
              value={verifForm.propertyId}
              onChange={(e) => setVerifForm((f) => ({ ...f, propertyId: e.target.value }))}
              className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans"
            >
              <option value="">Select a property...</option>
              {seedProperties
                .filter((p) => assignedCities.length === 0 || assignedCities.includes(p.city))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Photos taken</label>
            <input type="number" min={0} value={verifForm.photos} onChange={(e) => setVerifForm((f) => ({ ...f, photos: parseInt(e.target.value) || 0 }))} className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
          </div>
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Notes</label>
            <textarea rows={3} value={verifForm.notes} onChange={(e) => setVerifForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Describe the inspection findings..." className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink resize-none font-sans bg-canvas" />
          </div>
        </div>
      </Modal>

      {/* Submit Claim Modal — structure.md: operator submits, admin reviews */}
      <Modal
        open={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        title="Submit damage claim"
        description="Admin will review and adjudicate."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setClaimModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-sans font-semibold border border-hairline text-ink-secondary hover:bg-bone-secondary transition-colors cursor-pointer bg-canvas"
            >Cancel</button>
            <button
              type="button"
              disabled={!claimForm.propertyId || !claimForm.guestName || !claimForm.description || pendingAction === "submit-claim"}
              onClick={() => action("submit-claim", async () => {
                const r = await submitDamageClaim({
                  propertyId: claimForm.propertyId,
                  guestName: claimForm.guestName,
                  bookingRef: claimForm.bookingRef || undefined,
                  stayDates: claimForm.stayDates || undefined,
                  description: claimForm.description,
                  estimatedCostMinor: claimForm.estimatedCostMinor,
                  photoCount: claimForm.photoCount,
                  operatorNotes: claimForm.operatorNotes || undefined,
                });
                if (r.ok && r.data) {
                  setClaims((prev) => [r.data!, ...prev]);
                  setClaimModalOpen(false);
                }
                notify(r.ok ? "Claim submitted for admin review." : r.message, r.ok ? "success" : "error");
              })}
              className="px-4 py-2 rounded-lg text-sm font-sans font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-wait"
            >{pendingAction === "submit-claim" ? "Submitting..." : "Submit Claim"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Property</label>
            <select
              value={claimForm.propertyId}
              onChange={(e) => setClaimForm((f) => ({ ...f, propertyId: e.target.value }))}
              className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans"
            >
              <option value="">Select a property...</option>
              {seedProperties
                .filter((p) => assignedCities.length === 0 || assignedCities.includes(p.city))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                ))}
            </select>
            {assignedCities.length > 0 && (
              <p className="text-[10px] text-ink-tertiary mt-1 font-sans">Only properties in {assignedCities.join(" + ")} are shown.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Guest name</label>
              <input type="text" value={claimForm.guestName} onChange={(e) => setClaimForm((f) => ({ ...f, guestName: e.target.value }))} placeholder="e.g. Chidi Okafor" className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Booking ref</label>
              <input type="text" value={claimForm.bookingRef} onChange={(e) => setClaimForm((f) => ({ ...f, bookingRef: e.target.value }))} placeholder="PAY-2026-XXXX" className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Stay dates</label>
            <input type="text" value={claimForm.stayDates} onChange={(e) => setClaimForm((f) => ({ ...f, stayDates: e.target.value }))} placeholder="e.g. Jun 18–22" className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
          </div>
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Damage description</label>
            <textarea rows={3} value={claimForm.description} onChange={(e) => setClaimForm((f) => ({ ...f, description: e.target.value }))} placeholder="What was damaged and how..." className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink resize-none font-sans bg-canvas" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Estimated cost (£)</label>
              <input type="number" min={0} step={0.01} value={claimForm.estimatedCostMinor / 100} onChange={(e) => setClaimForm((f) => ({ ...f, estimatedCostMinor: Math.round(parseFloat(e.target.value || "0") * 100) }))} className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
            </div>
            <div>
              <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Photo count</label>
              <input type="number" min={0} value={claimForm.photoCount} onChange={(e) => setClaimForm((f) => ({ ...f, photoCount: parseInt(e.target.value) || 0 }))} className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-1.5">Operator notes (optional)</label>
            <textarea rows={2} value={claimForm.operatorNotes} onChange={(e) => setClaimForm((f) => ({ ...f, operatorNotes: e.target.value }))} placeholder="Inspection observations for the reviewer..." className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary text-ink resize-none font-sans bg-canvas" />
          </div>
          <div className="p-3 rounded-lg bg-bone-secondary text-xs text-ink-secondary font-sans">
            <strong className="text-ink font-semibold">Workflow:</strong> Operator submits → Admin reviews &amp; adjudicates → Operator informed.
          </div>
        </div>
      </Modal>
    </>
  );
}
