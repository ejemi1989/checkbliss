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
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-bone p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 bg-hairline rounded w-1/4 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-hairline rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-hairline rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className={`p-5 rounded-xl border ${s.accent ? "bg-primary text-white border-transparent" : "bg-white border-hairline hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"} transition-all cursor-default`}>
                <p className={`text-xs font-sans font-semibold uppercase tracking-[0.1em] ${s.accent ? "text-blue-100" : "text-ink-secondary"}`}>{s.label}</p>
                <p className={`font-sans text-[clamp(1.5rem,2.4vw,2rem)] font-medium mt-2 tabular-nums ${s.accent ? "text-white" : "text-primary"}`}>{s.value}</p>
                <p className={`text-xs mt-1 ${s.accent ? "text-blue-200" : s.subColor} font-medium`}>{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ---------- TODAY ---------- */}
          {tab === "today" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-hairline p-6">
                <h2 className="font-sans text-lg font-medium text-ink mb-5">Today&rsquo;s Schedule</h2>
                {todayInspections.length > 0 ? (
                  <div className="space-y-3">
                    {todayInspections.map((i) => (
                      <div key={i.id} className="flex items-start justify-between p-4 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                        <div>
                          <p className="font-sans text-base font-medium text-ink">{i.property_name}</p>
                          <div className="flex items-center gap-x-4 mt-1.5 text-xs text-ink-secondary">
                            <span>Checkout: {i.checkout_date} at {i.checkout_time}</span>
                            <span>{i.guest_name}</span>
                          </div>
                        </div>
                        <div className="flex gap-x-2">
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    {I.calendar}
                    <p className="text-sm text-ink-secondary mt-2">No inspections scheduled for today.</p>
                    <p className="text-xs text-ink-secondary mt-1">{pendingInspections.length} pending inspections overall.</p>
                  </div>
                )}
              </div>

              {/* Quick status */}
              <div className="bg-white rounded-xl border border-hairline p-6">
                <h2 className="font-sans text-lg font-medium text-ink mb-5">Pipeline Overview</h2>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Draft", count: pipeline.filter((p) => p.status === "draft").length, color: "bg-ink-secondary" },
                    { label: "Pending", count: pipeline.filter((p) => p.status === "pending_review").length, color: "bg-primary" },
                    { label: "Approved", count: pipeline.filter((p) => p.status === "approved").length, color: "bg-success" },
                    { label: "Suspended", count: pipeline.filter((p) => p.status === "suspended").length, color: "bg-danger" },
                  ].map((s) => (
                    <div key={s.label} className="p-4 rounded-xl border border-hairline bg-primary-bg text-center">
                      <div className={`w-2.5 h-2.5 rounded-full inline-block ${s.color}`} />
                      <p className="font-sans text-2xl font-medium mt-2 text-ink tabular-nums">{s.count}</p>
                      <p className="text-xs text-ink-secondary">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------- PROPERTIES ---------- */}
          {tab === "curation" && (
            <div className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-medium text-ink mb-1">Your properties</h2>
                <p className="text-xs text-ink-secondary">Review, edit, and submit onboarded listings to admin for final approval. Track approved properties below.</p>
              </div>

              {/* Awaiting approval */}
              <div>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <p className="font-sans text-base font-semibold text-ink">{curation.length} awaiting approval</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-warning/10 text-warning">Submitted to admin</span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <button
                      onClick={() => { setOnboardForm({ name: "", city: assignedCities[0] ?? "Lagos", address: "", bedrooms: 1, maxGuests: 2, ownerName: "", ownerPhone: "", ownerEmail: "" }); setOnboardModalOpen(true); }}
                      className="text-sm font-medium px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer flex items-center gap-x-1.5"
                    >
                      <span className="w-3.5 h-3.5">{I.plus}</span>
                      Onboard new property
                    </button>
                    <select value={curationFilter} onChange={(e) => setCurationFilter(e.target.value)} className="text-xs border border-hairline rounded-lg px-3 py-1.5 outline-none text-ink">
                      <option value="all">All</option>
                      <option value="new">New submissions</option>
                      <option value="resubmit">Resubmitted</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  {filteredCuration.map((p) => (
                    <div key={p.id} className="bg-white border border-hairline rounded-xl p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-x-2">
                            <h3 className="font-sans text-base font-medium text-ink">{p.name}</h3>
                            <span className="text-[10px] font-semibold bg-warning/10 text-warning px-2 py-0.5 rounded-full">Awaiting admin</span>
                          </div>
                          <p className="text-xs mt-1 text-ink-secondary">{p.city} · Submitted {p.submitted_at}</p>
                          <div className="flex items-center gap-x-4 mt-2 text-xs text-ink-secondary">
                            <span>{p.bedrooms} bed</span><span>{p.bathrooms} bath</span><span>Up to {p.max_guests} guests</span>
                            <span className="font-semibold tabular-nums text-primary">{fmt(p.price_minor)}/night</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-x-2 mt-3">
                        <button
                          onClick={() => {
                            setEditModal(p);
                            setEditForm({ name: p.name, description: "", rate: p.price_minor, beds: p.bedrooms, baths: p.bathrooms, guests: p.max_guests, extended: false, extendedPrice: 0 });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer"
                        >Edit Details</button>
                        <button
                          disabled={pendingAction === `remove-${p.id}`}
                          onClick={() => setDialog({ type: "remove", property: p })}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-hairline text-danger hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        >{pendingAction === `remove-${p.id}` ? "Removing..." : "Remove"}</button>
                      </div>
                    </div>
                  ))}
                  {filteredCuration.length === 0 && <p className="text-center text-sm text-ink-secondary py-8">No properties awaiting approval.</p>}
                </div>
              </div>

              {/* Approved & Live */}
              <div className="pt-4 border-t border-hairline">
                <div className="flex items-center gap-2 mb-3">
                  <p className="font-sans text-base font-semibold text-ink">{pipeline.filter((p) => p.status === "approved").length} approved &amp; live</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-success/10 text-success">Performing</span>
                </div>
                <div className="space-y-2">
                  {pipeline.filter((p) => p.status === "approved").map((p) => (
                    <div key={p.id} className="bg-white border border-hairline rounded-xl p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-sans text-base font-medium text-ink">{p.name}</h3>
                          <p className="text-xs text-ink-secondary mt-0.5">Updated {p.updated_at}</p>
                        </div>
                        <span className="text-[10px] font-semibold bg-success/10 text-success px-2 py-0.5 rounded-full">Live</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 mt-3 text-center">
                        {[
                          { label: "Bookings", value: "—" },
                          { label: "Revenue (MTD)", value: "—" },
                          { label: "Occupancy", value: "—" },
                          { label: "Status", value: "Approved" },
                        ].map((m) => (
                          <div key={m.label} className="p-2 rounded-lg bg-primary-bg">
                            <p className="text-sm font-semibold text-ink">{m.value}</p>
                            <p className="text-[10px] text-ink-secondary mt-0.5">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {pipeline.filter((p) => p.status === "approved").length === 0 && (
                    <p className="text-center text-sm text-ink-secondary py-8">No live properties yet. Submit onboarded properties to admin for approval.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ---------- INSPECTIONS ---------- */}
          {tab === "inspections" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-sans text-lg font-medium text-ink">All inspections</p>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-primary-bg text-primary">{pendingInspections.length} pending</span>
              </div>
              <div className="space-y-3">
                {inspections.map((i) => (
                  <div key={i.id} className="bg-white border border-hairline rounded-xl p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-sans text-base font-medium text-ink">{i.property_name}</p>
                        <div className="flex items-center gap-x-4 mt-1.5 text-xs text-ink-secondary">
                          <span>Checkout: {i.checkout_date} at {i.checkout_time}</span>
                          <span>{i.guest_name}</span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold ${statusColor(i.status)}`}>{statusLabel(i.status)}</span>
                    </div>
                    {(i.status === "pending" || i.status === "in_progress") && (
                      <div className="flex flex-col gap-2 mt-3">
                        <div className="flex gap-x-2">
                        <button
                          disabled={pendingAction === `start-${i.id}`}
                          onClick={() => action(`start-${i.id}`, async () => { const r = await startInspection({ inspectionId: i.id }); if (r.ok) setInspections((prev) => prev.map((x) => x.id === i.id ? { ...x, status: "in_progress" } : x)); notify(r.ok ? `Inspection ${i.id} started` : r.message, r.ok ? "success" : "error"); })}
                          className="px-4 py-2 rounded-xl text-sm font-medium border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        >{pendingAction === `start-${i.id}` ? "Starting..." : "Start Inspection"}</button>
                        <button
                          disabled={pendingAction === `complete-${i.id}`}
                          onClick={() => action(`complete-${i.id}`, async () => { const r = await completeInspection({ inspectionId: i.id }); if (r.ok) setInspections((prev) => prev.map((x) => x.id === i.id ? { ...x, status: "completed" } : x)); notify(r.ok ? `Inspection ${i.id} completed` : r.message, r.ok ? "success" : "error"); })}
                          className="px-4 py-2 rounded-xl text-sm font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        >{pendingAction === `complete-${i.id}` ? "Completing..." : "Complete"}</button>
                        </div>
                        {outcomeInspId === i.id ? (
                          <div className="flex gap-2">
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---------- BOOKINGS (structure.md: city-scoped bookings view) ---------- */}
          {tab === "bookings" && (
            <div className="space-y-6">
              <div>
                <p className="font-sans text-lg font-medium text-ink">Bookings — {assignedCities.length > 0 ? assignedCities.join(" + ") : "all cities"}</p>
                <p className="text-xs text-ink-secondary mt-0.5">City-scoped guest stays for first-line issue resolution. Tap any stay to view guest contact and stay details.</p>
              </div>

              {/* In-progress stays */}
              <section>
                <div className="flex items-center gap-x-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-secondary">In progress</h3>
                </div>
                {inProgressBookings.length === 0 ? (
                  <div className="bg-white border border-hairline rounded-xl p-5 text-center text-sm text-ink-secondary">
                    No active stays in your city right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inProgressBookings.map((b) => (
                      <div key={b.id} className="bg-white border border-hairline rounded-xl p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-x-2">
                              <p className="font-sans text-base font-medium text-ink">{b.property_name} · {b.unit}</p>
                              <span className="text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">Active</span>
                            </div>
                            <p className="text-xs text-ink-secondary mt-1.5">{b.guest} · {b.guest_email}</p>
                            <div className="flex items-center gap-x-4 mt-2 text-xs text-ink-secondary">
                              <span>Check-in {b.check_in}</span>
                              <span>Check-out {b.check_out}</span>
                              <span>{b.nights} night{b.nights === 1 ? "" : "s"}</span>
                              <span>{b.guest_count} guest{b.guest_count === 1 ? "" : "s"}</span>
                            </div>
                          </div>
                          <span className="font-sans text-base font-semibold tabular-nums text-ink">{fmt(b.amount_minor)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Upcoming stays */}
              <section>
                <div className="flex items-center gap-x-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-secondary">Upcoming</h3>
                </div>
                {upcomingBookings.length === 0 ? (
                  <div className="bg-white border border-hairline rounded-xl p-5 text-center text-sm text-ink-secondary">
                    No upcoming bookings in your city.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingBookings.map((b) => (
                      <div key={b.id} className="bg-white border border-hairline rounded-xl p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-sans text-base font-medium text-ink">{b.property_name} · {b.unit}</p>
                            <p className="text-xs text-ink-secondary mt-1.5">{b.guest} · {b.guest_email}</p>
                            <div className="flex items-center gap-x-4 mt-2 text-xs text-ink-secondary">
                              <span>{b.check_in} → {b.check_out}</span>
                              <span>{b.nights} night{b.nights === 1 ? "" : "s"}</span>
                              <span>{b.guest_count} guest{b.guest_count === 1 ? "" : "s"}</span>
                            </div>
                          </div>
                          <span className="font-sans text-sm font-semibold tabular-nums text-ink-secondary">{fmt(b.amount_minor)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Pending confirmation */}
              {pendingBookings.length > 0 && (
                <section>
                  <div className="flex items-center gap-x-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-secondary">Pending confirmation</h3>
                  </div>
                  <div className="space-y-3">
                    {pendingBookings.map((b) => (
                      <div key={b.id} className="bg-white border border-hairline rounded-xl p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-sans text-base font-medium text-ink">{b.property_name} · {b.unit}</p>
                            <p className="text-xs text-ink-secondary mt-1.5">{b.guest} · {b.guest_email}</p>
                            <div className="flex items-center gap-x-4 mt-2 text-xs text-ink-secondary">
                              <span>{b.check_in} → {b.check_out}</span>
                              <span>{b.nights} night{b.nights === 1 ? "" : "s"}</span>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-warning">Pending</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent stays (for context during resolution) */}
              <section>
                <div className="flex items-center gap-x-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-ink-secondary" />
                  <h3 className="font-sans text-sm font-semibold uppercase tracking-wider text-ink-secondary">Recent (last 30 days)</h3>
                </div>
                {recentBookings.length === 0 ? (
                  <div className="bg-white border border-hairline rounded-xl p-5 text-center text-sm text-ink-secondary">
                    No recent stays in your city.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentBookings.map((b) => (
                      <div key={b.id} className="bg-white border border-hairline rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="font-sans text-sm font-medium text-ink">{b.property_name} · {b.unit}</p>
                          <p className="text-xs text-ink-secondary mt-0.5">{b.guest} · {b.check_in} → {b.check_out}</p>
                        </div>
                        <span className="text-xs text-ink-secondary">{fmt(b.amount_minor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ---------- CLAIMS (structure.md: operator submits, admin reviews) ---------- */}
          {tab === "claims" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-sans text-lg font-medium text-ink">Damage claims</p>
                  <p className="text-xs text-ink-secondary mt-0.5">
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
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none"
                >
                  {I.plus}<span>Submit Claim</span>
                </button>
              </div>

              {/* filter chips */}
              <div className="flex items-center gap-2 flex-wrap">
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
                        : "border-hairline bg-card text-ink-secondary hover:border-green-soft"
                    }`}
                  >
                    {f.label}
                    <span className="text-[10px] tabular-nums opacity-60">{f.count}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {claims
                  .filter((c) => claimFilter === "all" || c.admin_decision === claimFilter)
                  .map((c) => (
                    <div key={c.id} className="bg-white border border-hairline rounded-xl p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-base font-medium text-ink">{c.property_name}</p>
                          <p className="text-xs text-ink-secondary mt-1">
                            Guest: {c.guest_name} · Stay: {c.stay_dates} · Ref: {c.booking_ref}
                          </p>
                          <p className="text-xs text-ink-secondary mt-1">
                            Submitted {c.submitted_at} · {c.photo_count} photo{c.photo_count === 1 ? "" : "s"}
                          </p>
                          <p className="text-sm text-ink mt-2">{c.description}</p>
                          {c.operator_notes && (
                            <p className="text-xs text-ink-secondary mt-2 italic">Operator notes: {c.operator_notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-sans text-lg font-semibold text-primary tabular-nums">{fmt(c.estimated_cost_minor)}</p>
                          <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            c.admin_decision === "approved"
                              ? "bg-success/10 text-success"
                              : c.admin_decision === "rejected"
                                ? "bg-danger/10 text-danger"
                                : c.admin_decision === "adjusted"
                                  ? "bg-warning/10 text-warning"
                                  : "bg-primary-bg text-primary"
                          }`}>
                            {c.admin_decision}
                          </span>
                          {c.adjusted_amount_minor != null && (
                            <p className="text-[10px] text-ink-secondary mt-1">Adjusted: {fmt(c.adjusted_amount_minor)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {claims.filter((c) => claimFilter === "all" || c.admin_decision === claimFilter).length === 0 && (
                  <p className="text-center text-sm text-ink-secondary py-8">No claims in this category.</p>
                )}
              </div>
            </div>
          )}

          {/* ---------- OWNERS (structure.md: operator directory for their city) ---------- */}
          {tab === "owners" && (
            <div className="space-y-4">
              <div>
                <p className="font-sans text-lg font-medium text-ink">Property owners</p>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Owners with properties in {assignedCities.length > 0 ? assignedCities.join(" + ") : "your assigned city"}. Primary contact via WhatsApp.
                </p>
              </div>
              {owners.length === 0 ? (
                <p className="text-center text-sm text-ink-secondary py-8">No owners in your assigned cities yet.</p>
              ) : (
                <div className="space-y-2">
                  {owners.map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-hairline bg-white hover:bg-primary-bg transition-colors flex-wrap">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {o.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-sans text-base font-medium text-ink truncate">{o.name}</p>
                          <p className="text-xs text-ink-secondary truncate">{o.email} · {o.whatsapp}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-ink-secondary">City: <strong className="text-ink">{o.city}</strong></p>
                          <p className="text-xs text-ink-secondary">
                            {o.properties_count} propert{o.properties_count === 1 ? "y" : "ies"} · {o.total_bookings} bookings
                          </p>
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          o.status === "active"
                            ? "bg-success/10 text-success"
                            : o.status === "suspended"
                              ? "bg-danger/10 text-danger"
                              : "bg-warning/10 text-warning"
                        }`}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------- PHOTOS ---------- */}
          {tab === "photos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-sans text-lg font-medium text-ink">Property photo management</p>
                <select
                  value={selectedProperty}
                  onChange={(e) => handleSelectProperty(e.target.value)}
                  className="text-xs border border-hairline rounded-lg px-3 py-1.5 outline-none text-ink"
                >
                  <option value="">Select a property...</option>
                  {seedProperties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.neighbourhood}</option>
                  ))}
                </select>
              </div>

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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-sans text-lg font-medium text-ink">Monthly verification log — June 2026</p>
                <button
                  onClick={() => { setVerifForm({ propertyId: "", notes: "", photos: 0 }); setVerifModalOpen(true); }}
                  className="text-sm font-medium px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer"
                >+ New Entry</button>
              </div>
              <div className="space-y-2">
                {verifications.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-4 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                    <div>
                      <p className="font-sans text-base font-medium text-ink">{v.property_name}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">{v.date} · {v.photos} photos — {v.notes}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-success">{v.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---------- PERFORMANCE ---------- */}
          {tab === "performance" && (
            <div className="space-y-5">
              <h2 className="font-sans text-xl font-medium text-ink">Your performance</h2>

              <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
                {[
                  { label: "Inspections", value: stats.find((s) => s.label.includes("Inspections"))?.value ?? "12", sub: "this month" },
                  { label: "Properties", value: "8", sub: "active" },
                  { label: "Claims submitted", value: claims.filter((c) => c.admin_decision !== "rejected").length.toString(), sub: "this month" },
                  { label: "Quality score", value: stats.find((s) => s.label.includes("Quality"))?.value ?? "92%", sub: "30-day avg" },
                ].map((m) => (
                  <div key={m.label} className="p-4 rounded-xl border border-hairline bg-white">
                    <p className="text-xs font-medium text-ink-secondary mb-1">{m.label}</p>
                    <p className="font-sans text-2xl font-semibold text-ink">{m.value}</p>
                    <p className="text-xs text-ink-secondary mt-0.5">{m.sub}</p>
                  </div>
                ))}
              </div>

              {/* Revenue share */}
              <div className="p-5 rounded-xl border border-hairline bg-white">
                <h3 className="font-sans text-base font-medium text-ink mb-4">Revenue share</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-ink-secondary mb-0.5">City revenue (MTD)</p>
                    <p className="font-sans text-2xl font-semibold text-ink">£{(640000 / 100)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-secondary mb-0.5">Commission rate</p>
                    <p className="font-sans text-2xl font-semibold text-primary">6%</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-secondary mb-0.5">Your earnings</p>
                    <p className="font-sans text-2xl font-semibold text-success">£{Math.round(640000 * 0.06 / 100)}</p>
                  </div>
                </div>
                <div className="bg-primary-bg rounded-lg p-4">
                  <p className="text-xs text-ink-secondary mb-2">Earnings breakdown</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: "60%" }} />
                    </div>
                    <span className="text-xs font-medium text-success">60% paid</span>
                  </div>
                  <p className="text-[11px] text-ink-secondary">Next payout: ~£{Math.round(640000 * 0.06 * 0.4 / 100)} pending (end of month)</p>
                </div>
              </div>

              {/* Response metrics */}
              <div className="p-5 rounded-xl border border-hairline bg-white">
                <h3 className="font-sans text-base font-medium text-ink mb-4">Response metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Avg response time", value: "2.4 min", target: "Under 5 min" },
                    { label: "Inspection completion", value: "100%", target: "Target: 95%" },
                    { label: "Verification rate", value: "92%", target: "Target: 90%" },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-3 rounded-lg bg-primary-bg">
                      <p className="font-sans text-2xl font-semibold text-ink">{m.value}</p>
                      <p className="text-xs text-ink-secondary mt-0.5">{m.label}</p>
                      <p className="text-[10px] text-mute mt-1">{m.target}</p>
                    </div>
                  ))}
                </div>
              </div>
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
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Edit: {editModal.name}</h3>
              <button onClick={() => setEditModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary">Property Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Description (visible to guests browsing &amp; booking)</label>
                <textarea rows={4} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe the apartment — what guests see on the detail page and during booking..." className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink resize-none font-sans" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Nightly rate (£)</label>
                  <input type="number" min={0} step={0.01} value={editForm.rate / 100} onChange={(e) => setEditForm((f) => ({ ...f, rate: Math.round(parseFloat(e.target.value || "0") * 100) }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Bedrooms</label>
                  <input type="number" min={1} max={10} value={editForm.beds} onChange={(e) => setEditForm((f) => ({ ...f, beds: parseInt(e.target.value) || 1 }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Max guests</label>
                  <input type="number" min={1} max={20} value={editForm.guests} onChange={(e) => setEditForm((f) => ({ ...f, guests: parseInt(e.target.value) || 1 }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-ink-secondary">Offer extended checkout (18:00)</span>
                <input type="checkbox" checked={editForm.extended} onChange={(e) => setEditForm((f) => ({ ...f, extended: e.target.checked }))} className="w-4 h-4 accent-primary cursor-pointer" />
              </div>
              {editForm.extended && (
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Extended checkout price (£)</label>
                  <input type="number" min={0} step={0.01} value={editForm.extendedPrice / 100} onChange={(e) => setEditForm((f) => ({ ...f, extendedPrice: Math.round(parseFloat(e.target.value || "0") * 100) }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                </div>
              )}

              <div className="flex gap-x-2 pt-2">
                <Link href={`/stays/${editModal.id.toLowerCase()}`} target="_blank" className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-hairline text-ink-secondary text-center no-underline hover:bg-primary-bg transition-colors">
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait border-none"
                >{pendingAction === `edit-prop-${editModal.id}` ? "Saving..." : "Save Changes"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onboard New Property Modal — operator sources a property */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOnboardModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl animate-modalIn max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-ink">Onboard a new property</h3>
                <p className="text-xs text-ink-secondary mt-0.5">Source a property for your city. The owner will be invited to the platform.</p>
              </div>
              <button onClick={() => setOnboardModalOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">Property name</label>
                <input
                  type="text"
                  value={onboardForm.name}
                  onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                  placeholder="e.g. The Banana Island Villa"
                  className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-mute"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">City</label>
                  <select
                    value={onboardForm.city}
                    onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
                    disabled={assignedCities.length === 1}
                    className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(assignedCities.length > 0 ? assignedCities : ["Lagos", "Abuja"]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {assignedCities.length === 1 && (
                    <p className="text-[10px] text-mute mt-1">Scoped to your assigned city.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1.5">Bedrooms</label>
                  <input
                    type="number"
                    min={1}
                    value={onboardForm.bedrooms}
                    onChange={(e) => setOnboardForm({ ...onboardForm, bedrooms: parseInt(e.target.value) || 1 })}
                    className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">Address</label>
                <input
                  type="text"
                  value={onboardForm.address}
                  onChange={(e) => setOnboardForm({ ...onboardForm, address: e.target.value })}
                  placeholder="Street, neighbourhood"
                  className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-mute"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">Max guests</label>
                <input
                  type="number"
                  min={1}
                  value={onboardForm.maxGuests}
                  onChange={(e) => setOnboardForm({ ...onboardForm, maxGuests: parseInt(e.target.value) || 1 })}
                  className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink"
                />
              </div>

              <div className="pt-3 border-t border-hairline">
                <p className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">Owner details</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-secondary mb-1.5">Owner full name</label>
                    <input
                      type="text"
                      value={onboardForm.ownerName}
                      onChange={(e) => setOnboardForm({ ...onboardForm, ownerName: e.target.value })}
                      placeholder="e.g. Tunde Adebayo"
                      className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-mute"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink-secondary mb-1.5">WhatsApp</label>
                      <input
                        type="tel"
                        value={onboardForm.ownerPhone}
                        onChange={(e) => setOnboardForm({ ...onboardForm, ownerPhone: e.target.value })}
                        placeholder="+234 800 000 0000"
                        className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-mute"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-secondary mb-1.5">Email</label>
                      <input
                        type="email"
                        value={onboardForm.ownerEmail}
                        onChange={(e) => setOnboardForm({ ...onboardForm, ownerEmail: e.target.value })}
                        placeholder="owner@email.com"
                        className="w-full text-sm border border-hairline rounded-lg px-3 py-2 outline-none focus:border-primary text-ink placeholder:text-mute"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-x-2 mt-6">
              <button
                onClick={() => setOnboardModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer"
              >Cancel</button>
              <button
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
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait border-none"
              >{pendingAction === "onboard-property" ? "Adding..." : "Add to Curation"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {verifModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setVerifModalOpen(false); setVerifForm({ propertyId: "", notes: "", photos: 0 }); }}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">New Verification Entry</h3>
              <button onClick={() => { setVerifModalOpen(false); setVerifForm({ propertyId: "", notes: "", photos: 0 }); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary">Property</label>
                <select
                  value={verifForm.propertyId}
                  onChange={(e) => setVerifForm((f) => ({ ...f, propertyId: e.target.value }))}
                  className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink"
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
                <label className="text-xs font-medium text-ink-secondary">Photos taken</label>
                <input type="number" min={0} value={verifForm.photos} onChange={(e) => setVerifForm((f) => ({ ...f, photos: parseInt(e.target.value) || 0 }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Notes</label>
                <textarea rows={3} value={verifForm.notes} onChange={(e) => setVerifForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Describe the inspection findings..." className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink resize-none font-sans" />
              </div>

              <div className="flex gap-x-2 pt-2">
                <button
                  onClick={() => { setVerifModalOpen(false); setVerifForm({ propertyId: "", notes: "", photos: 0 }); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer"
                >Cancel</button>
                <button
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait border-none"
                >{pendingAction === "new-verification" ? "Logging..." : "Log Verification"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Claim Modal — structure.md: operator submits, admin reviews */}
      {claimModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setClaimModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-ink">Submit damage claim</h3>
                <p className="text-xs text-ink-secondary mt-0.5">Admin will review and adjudicate.</p>
              </div>
              <button onClick={() => setClaimModalOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">{I.x}</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary">Property</label>
                <select
                  value={claimForm.propertyId}
                  onChange={(e) => setClaimForm((f) => ({ ...f, propertyId: e.target.value }))}
                  className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink"
                >
                  <option value="">Select a property...</option>
                  {seedProperties
                    .filter((p) => assignedCities.length === 0 || assignedCities.includes(p.city))
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                    ))}
                </select>
                {assignedCities.length > 0 && (
                  <p className="text-[10px] text-ink-secondary mt-1">Only properties in {assignedCities.join(" + ")} are shown.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Guest name</label>
                  <input type="text" value={claimForm.guestName} onChange={(e) => setClaimForm((f) => ({ ...f, guestName: e.target.value }))} placeholder="e.g. Chidi Okafor" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Booking ref</label>
                  <input type="text" value={claimForm.bookingRef} onChange={(e) => setClaimForm((f) => ({ ...f, bookingRef: e.target.value }))} placeholder="PAY-2026-XXXX" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Stay dates</label>
                <input type="text" value={claimForm.stayDates} onChange={(e) => setClaimForm((f) => ({ ...f, stayDates: e.target.value }))} placeholder="e.g. Jun 18–22" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Damage description</label>
                <textarea rows={3} value={claimForm.description} onChange={(e) => setClaimForm((f) => ({ ...f, description: e.target.value }))} placeholder="What was damaged and how..." className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink resize-none font-sans" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Estimated cost (£)</label>
                  <input type="number" min={0} step={0.01} value={claimForm.estimatedCostMinor / 100} onChange={(e) => setClaimForm((f) => ({ ...f, estimatedCostMinor: Math.round(parseFloat(e.target.value || "0") * 100) }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-secondary">Photo count</label>
                  <input type="number" min={0} value={claimForm.photoCount} onChange={(e) => setClaimForm((f) => ({ ...f, photoCount: parseInt(e.target.value) || 0 }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Operator notes (optional)</label>
                <textarea rows={2} value={claimForm.operatorNotes} onChange={(e) => setClaimForm((f) => ({ ...f, operatorNotes: e.target.value }))} placeholder="Inspection observations for the reviewer..." className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink resize-none font-sans" />
              </div>

              <div className="p-3 rounded-xl bg-soft text-xs text-ink-secondary">
                <strong className="text-ink">Workflow:</strong> Operator submits → Admin reviews &amp; adjudicates → Operator informed.
              </div>

              <div className="flex gap-x-2 pt-2">
                <button
                  onClick={() => setClaimModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer"
                >Cancel</button>
                <button
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait border-none"
                >{pendingAction === "submit-claim" ? "Submitting..." : "Submit Claim"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
