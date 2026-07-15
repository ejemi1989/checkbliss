"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { logoutAction } from "@/actions/auth";
import { formatMinor } from "@/lib/currency";
import { getCurationQueue, getPipeline, getInspections, getVerifications, getOperatorStats } from "@/lib/data";
import { decideCuration } from "@/actions/curation";
import { startInspection, completeInspection } from "@/actions/inspections";
import { logVerification } from "@/actions/verification";
import { updateProperty } from "@/actions/properties";
import { suspendProperty } from "@/actions/operators";
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
};

function fmt(n: number) { return formatMinor(n); }

function statusLabel(s: string) { return s.replace(/_/g, " "); }

function statusColor(s: string) {
  switch (s) {
    case "approved": case "complete": case "completed": case "active": return "text-success";
    case "pending": case "pending_review": case "in_progress": return "text-primary";
    case "draft": return "text-ink-secondary";
    case "suspended": case "escalated": return "text-danger";
    default: return "text-ink-secondary";
  }
}

export function OperatorDashboard({ user }: { user: AuthUser | null }) {
  const [tab, setTab] = useState("today");
  const [curation, setCuration] = useState(() => getCurationQueue());
  const [inspections, setInspections] = useState(() => getInspections());
  const pipeline = getPipeline();
  const stats = getOperatorStats();
  const [curationFilter, setCurationFilter] = useState("all");
  const [verifications, setVerifications] = useState(() => getVerifications());
  const [verifModalOpen, setVerifModalOpen] = useState(false);
  const [verifForm, setVerifForm] = useState({ propertyId: "", notes: "", photos: 0 });
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    type: "approve" | "reject" | "changes" | "remove";
    property: (typeof curation)[0];
  } | null>(null);

  /* photos tab state */
  const [photosTab, setPhotosTab] = useState<"browse" | "manage">("browse");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [editAltText, setEditAltText] = useState("");

  const seedProperties = getSeedProperties().filter((p) => p.status === "approved");

  /* edit property modal */
  const [editModal, setEditModal] = useState<(typeof curation)[0] | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", rate: 0, beds: 1, baths: 1, guests: 2, extended: false, extendedPrice: 0 });

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

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayInspections = inspections.filter((i) => i.checkout_date === todayStr);
  const pendingInspections = inspections.filter((i) => i.status === "pending");

  return (
    <div className="min-h-screen bg-canvas">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${
          notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-hairline bg-white px-8 py-4 flex items-center justify-between max-sm:px-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-sans text-xl font-medium tracking-tight text-ink no-underline">checkin<span className="text-brass">Bliss</span></Link>
          <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.5px] rounded-full bg-lagoon/15 text-lagoon-dark px-2.5 py-0.5">Operator</span>
        </div>
        <div className="flex items-center gap-x-3">
          <NotificationBell role="operator" userId={user?.id} onViewAll={() => setTab("notifications")} />
          <form action={logoutAction}>
            <button className="text-xs font-sans font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer bg-transparent border-none">Sign out</button>
          </form>
        </div>
      </header>

      <div className="flex max-sm:flex-col">
        {/* Sidebar */}
        <nav className="w-56 border-r border-hairline bg-white shrink-0 max-sm:w-full max-sm:border-r-0 max-sm:border-b">
          <div className="p-5 max-sm:p-3 max-sm:flex max-sm:gap-2 max-sm:overflow-x-auto">
            {[
              { id: "today", icon: "calendar" as keyof typeof I, label: "Today" },
              { id: "curation", icon: "gavel" as keyof typeof I, label: "Curation" },
              { id: "inspections", icon: "clipboard" as keyof typeof I, label: "Inspections" },
              { id: "photos", icon: "camera" as keyof typeof I, label: "Photos" },
              { id: "notifications", icon: "bell" as keyof typeof I, label: "Notifications" },
              { id: "verification", icon: "checkSquare" as keyof typeof I, label: "Verification" },
            ].map((item) => (
              <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-x-3 px-4 py-3 rounded-lg text-sm font-sans font-medium transition-colors cursor-pointer mb-1 last:mb-0 max-sm:whitespace-nowrap max-sm:flex-shrink-0 ${tab === item.id ? "bg-primary-bg text-primary" : "text-ink-secondary hover:bg-bone"}`}>
                <span className="w-4 h-4 shrink-0 flex items-center justify-center">{I[item.icon]}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1 p-8 max-sm:p-4">
          <div className="mb-8">
            <h1 className="font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Operator Dashboard</h1>
            <p className="text-sm mt-1 text-ink-secondary">{displayName} — Lagos · {pipeline.filter((p) => p.status === "approved").length} properties verified</p>
          </div>

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

          {/* ---------- CURATION ---------- */}
          {tab === "curation" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-sans text-lg font-medium text-ink">{curation.length} properties pending review</p>
                <select value={curationFilter} onChange={(e) => setCurationFilter(e.target.value)} className="text-xs border border-hairline rounded-lg px-3 py-1.5 outline-none text-ink">
                  <option value="all">All</option>
                  <option value="new">New submissions</option>
                  <option value="resubmit">Resubmitted</option>
                </select>
              </div>
              <div className="space-y-3">
                {filteredCuration.map((p) => (
                  <div key={p.id} className="bg-white border border-hairline rounded-xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-x-2">
                          <h3 className="font-sans text-lg font-medium text-ink">{p.name}</h3>
                          <span className="text-[11px] font-semibold text-primary">{p.type === "new" ? "New submission" : "Resubmitted"}</span>
                        </div>
                        <p className="text-xs mt-1 text-ink-secondary">{p.city} · Submitted {p.submitted_at}</p>
                        <div className="flex items-center gap-x-4 mt-2 text-xs text-ink-secondary">
                          <span>{p.bedrooms} bed</span><span>{p.bathrooms} bath</span><span>Up to {p.max_guests} guests</span>
                          <span className="font-semibold tabular-nums text-primary">{fmt(p.price_minor)}/night</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-x-2 mt-4">
                      <button
                        disabled={pendingAction === `approve-${p.id}`}
                        onClick={() => setDialog({ type: "approve", property: p })}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >{pendingAction === `approve-${p.id}` ? "Approving..." : "Approve"}</button>
                      <button
                        disabled={pendingAction === `reject-${p.id}`}
                        onClick={() => setDialog({ type: "reject", property: p })}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-hairline text-danger hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >{pendingAction === `reject-${p.id}` ? "Rejecting..." : "Reject"}</button>
                      <button
                        disabled={pendingAction === `changes-${p.id}`}
                        onClick={() => setDialog({ type: "changes", property: p })}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >{pendingAction === `changes-${p.id}` ? "Requesting..." : "Request Changes"}</button>
                      <button
                        onClick={() => {
                          setEditModal(p);
                          setEditForm({ name: p.name, description: "", rate: p.price_minor, beds: p.bedrooms, baths: p.bathrooms, guests: p.max_guests, extended: false, extendedPrice: 0 });
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-hairline text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer"
                      >Edit Details</button>
                      <button
                        disabled={pendingAction === `remove-${p.id}`}
                        onClick={() => setDialog({ type: "remove", property: p })}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-hairline text-danger hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                      >{pendingAction === `remove-${p.id}` ? "Removing..." : "Remove"}</button>
                    </div>
                  </div>
                ))}
                {filteredCuration.length === 0 && <p className="text-center text-sm text-ink-secondary py-8">No properties match this filter.</p>}
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
                      <div className="flex gap-x-2 mt-3">
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
                    )}
                  </div>
                ))}
              </div>
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
        </main>
      </div>

      {/* Confirm / Prompt Dialogs */}
      <ConfirmDialog
        open={dialog?.type === "approve"}
        title="Approve property"
        message={`Approve "${dialog?.property?.name}" for the platform?`}
        confirmLabel="Approve"
        onConfirm={() => {
          if (!dialog) return;
          const p = dialog.property;
          setDialog(null);
          action(`approve-${p.id}`, async () => {
            const r = await decideCuration({ propertyId: p.id, action: "approve" });
            if (r.ok) setCuration((prev) => prev.filter((x) => x.id !== p.id));
            notify(r.ok ? "Property approved." : r.message, r.ok ? "success" : "error");
          });
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.type === "reject"}
        title="Reject property"
        message={`Provide a reason for rejecting "${dialog?.property?.name}". This will be shared with the owner.`}
        confirmLabel="Reject"
        variant="danger"
        placeholder="Reason for rejection…"
        onConfirm={(reason) => {
          if (!dialog) return;
          const p = dialog.property;
          setDialog(null);
          action(`reject-${p.id}`, async () => {
            const r = await decideCuration({ propertyId: p.id, action: "reject", reason: reason ?? "" });
            if (r.ok) setCuration((prev) => prev.filter((x) => x.id !== p.id));
            notify(r.ok ? "Property rejected." : r.message, r.ok ? "success" : "error");
          });
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.type === "changes"}
        title="Request changes"
        message={`Describe what needs to change for "${dialog?.property?.name}". The owner can resubmit once addressed.`}
        confirmLabel="Request Changes"
        placeholder="Describe changes needed…"
        onConfirm={(reason) => {
          if (!dialog) return;
          const p = dialog.property;
          setDialog(null);
          action(`changes-${p.id}`, async () => {
            const r = await decideCuration({ propertyId: p.id, action: "request_changes", reason: reason ?? "" });
            if (r.ok) setCuration((prev) => prev.filter((x) => x.id !== p.id));
            notify(r.ok ? "Changes requested." : r.message, r.ok ? "success" : "error");
          });
        }}
        onCancel={() => setDialog(null)}
      />
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
                  {seedProperties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
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
    </div>
  );
}
