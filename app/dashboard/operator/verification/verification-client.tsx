"use client";

import { useState, useCallback } from "react";
import type { AuthUser } from "@/lib/auth";
import { getVerifications } from "@/lib/data";

const I = {
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  camera: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" /></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  alert: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  plusCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>,
  loader: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>,
};

const DELTA_CHECKLIST = [
  { id: "paint", label: "Wall paint condition", icon: "check" },
  { id: "ac", label: "AC servicing — filters cleaned", icon: "check" },
  { id: "linens", label: "Linens — replaced or freshly laundered", icon: "check" },
  { id: "plumbing", label: "Plumbing — no new leaks", icon: "check" },
  { id: "electrical", label: "Electrical — all sockets and switches working", icon: "check" },
  { id: "appliances", label: "Appliances — tested and functional", icon: "check" },
  { id: "furniture", label: "Furniture — no new damage or wear", icon: "check" },
  { id: "windows", label: "Windows — seals intact, open/close smoothly", icon: "check" },
  { id: "smoke", label: "Smoke detector — tested", icon: "check" },
  { id: "wifi", label: "WiFi — speed test passed", icon: "check" },
];

interface DeltaItem {
  id: string;
  label: string;
  status: "unchanged" | "passed" | "failed" | null;
  notes: string;
}

interface PhotoDiff {
  id: string;
  label: string;
  previous: string; // url or placeholder
  current: File | null;
  preview: string;
}

export function OperatorVerification({ user }: { user: AuthUser | null }) {
  const assignedCities = user?.assignedCities ?? [];
  const verifications = getVerifications().filter((v) => {
    if (assignedCities.length === 0) return true;
    const inAbuja = /GRA|Transcorp|Abuja/i.test(v.property_name);
    return inAbuja ? assignedCities.includes("Abuja") : assignedCities.includes("Lagos");
  });

  const [selectedProperty, setSelectedProperty] = useState("");
  const [activeProperty, setActiveProperty] = useState<(typeof verifications)[0] | null>(null);
  const [deltaItems, setDeltaItems] = useState<DeltaItem[]>([]);
  const [photos, setPhotos] = useState<PhotoDiff[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  function startVerification(property: (typeof verifications)[0]) {
    setActiveProperty(property);
    setSelectedProperty(property.property_name);

    setDeltaItems(
      DELTA_CHECKLIST.map((item) => ({
        id: item.id,
        label: item.label,
        status: null,
        notes: "",
      })),
    );

    setPhotos([
      { id: "p1", label: "Living room", previous: "/placeholder/living-room.jpg", current: null, preview: "" },
      { id: "p2", label: "Kitchen", previous: "/placeholder/kitchen.jpg", current: null, preview: "" },
      { id: "p3", label: "Main bedroom", previous: "/placeholder/bedroom.jpg", current: null, preview: "" },
      { id: "p4", label: "Bathroom", previous: "/placeholder/bathroom.jpg", current: null, preview: "" },
    ]);

    setNotes("");
    setNotification(null);
  }

  function toggleDelta(index: number, status: "passed" | "failed") {
    setDeltaItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, status: item.status === status ? null : status } : item,
      ),
    );
  }

  function updateDeltaNote(index: number, note: string) {
    setDeltaItems((prev) => prev.map((item, i) => (i === index ? { ...item, notes: note } : item)));
  }

  function handleDiffPhoto(photoId: string, file: File) {
    const preview = URL.createObjectURL(file);
    setPhotos((prev) => prev.map((p) => (p.id === photoId ? { ...p, current: file, preview } : p)));
  }

  function removeDiffPhoto(photoId: string) {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === photoId && p.preview) URL.revokeObjectURL(p.preview);
        return p.id === photoId ? { ...p, current: null, preview: "" } : p;
      }),
    );
  }

  async function submitVerification() {
    const unchecked = deltaItems.filter((d) => d.status === null).length;
    if (unchecked > 0) { notify(`${unchecked} item${unchecked > 1 ? "s" : ""} unchecked`, "error"); return; }

    const failedItems = deltaItems.filter((d) => d.status === "failed");
    setSubmitting(true);

    try {
      await new Promise((r) => setTimeout(r, 800));
      notify(
        failedItems.length > 0
          ? `Re-verification submitted — ${failedItems.length} issue${failedItems.length > 1 ? "s" : ""} flagged for review`
          : `Re-verification passed for ${activeProperty?.property_name ?? "property"}`,
        failedItems.length > 0 ? "error" : "success",
      );
      setActiveProperty(null);
    } catch {
      notify("Submission failed. Try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const passedCount = deltaItems.filter((d) => d.status === "passed").length;
  const failedCount = deltaItems.filter((d) => d.status === "failed").length;

  return (
    <>
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${
          notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"
        }`}>
          {notification.message}
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-sans text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-tight text-ink">Verification</h1>
        <p className="text-sm mt-1 text-ink-secondary">30-day re-verification cycle — check property condition and compare against last audit</p>
      </div>

      {activeProperty ? (
        <div className="max-w-2xl space-y-6">
          {/* header */}
          <div className="bg-white rounded-xl border border-hairline p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-sans font-semibold text-ink">{activeProperty.property_name}</h2>
                <p className="text-xs text-ink-secondary mt-0.5">Last verified: {activeProperty.date} · {activeProperty.photos} reference photos</p>
              </div>
              <button onClick={() => setActiveProperty(null)} className="text-xs font-sans font-medium text-ink-secondary hover:text-ink cursor-pointer bg-transparent border-none">Cancel</button>
            </div>
            {activeProperty.notes && (
              <p className="text-xs text-ink-secondary mt-2 p-2 rounded bg-bone/50">{activeProperty.notes}</p>
            )}
          </div>

          {/* delta checklist */}
          <div className="bg-white rounded-xl border border-hairline p-6">
            <h3 className="text-sm font-sans font-semibold text-ink mb-3">Condition Delta Checklist</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-success">{I.check} {passedCount} passed</div>
              {failedCount > 0 && <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-danger">{I.x} {failedCount} failed</div>}
              <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-ink-secondary">{deltaItems.filter((d) => d.status === null).length} unchecked</div>
            </div>
            <div className="space-y-1.5">
              {deltaItems.map((item, idx) => (
                <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-hairline last:border-0">
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <button onClick={() => toggleDelta(idx, "passed")} className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${item.status === "passed" ? "bg-success text-white" : "border border-hairline text-ink-secondary hover:border-success hover:text-success"}`}>{I.check}</button>
                    <button onClick={() => toggleDelta(idx, "failed")} className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${item.status === "failed" ? "bg-danger text-white" : "border border-hairline text-ink-secondary hover:border-danger hover:text-danger"}`}>{I.x}</button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-sans font-medium text-ink">{item.label}</p>
                    {item.status !== null && (
                      <input type="text" value={item.notes} onChange={(e) => updateDeltaNote(idx, e.target.value)} placeholder={item.status === "failed" ? "Describe the issue..." : "Notes (optional)"} className="mt-1.5 w-full px-3 py-1.5 rounded-lg border border-hairline text-xs font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* photo diff */}
          <div className="bg-white rounded-xl border border-hairline p-6">
            <h3 className="text-sm font-sans font-semibold text-ink mb-3">Photo Diff — Compare against last verification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="border border-hairline rounded-lg overflow-hidden">
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary px-3 py-2 bg-bone/50">{photo.label}</p>
                  <div className="flex border-t border-hairline">
                    <div className="flex-1 aspect-video bg-bone/50 flex flex-col items-center justify-center border-r border-hairline">
                      <p className="text-[10px] text-ink-secondary">Previous</p>
                      <div className="w-8 h-8 mt-1 rounded bg-white border border-hairline flex items-center justify-center">{I.clock}</div>
                    </div>
                    <div className="flex-1 aspect-video">
                      {photo.preview ? (
                        <div className="relative w-full h-full">
                          <img src={photo.preview} alt={photo.label} className="w-full h-full object-cover" />
                          <button onClick={() => removeDiffPhoto(photo.id)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer">{I.x}</button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer bg-bone/50 hover:bg-bone transition-colors">
                          {I.plusCircle}
                          <span className="text-[10px] text-ink-secondary mt-1">Current</span>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDiffPhoto(photo.id, f); }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* notes */}
          <div className="bg-white rounded-xl border border-hairline p-6">
            <h3 className="text-sm font-sans font-semibold text-ink mb-3">Overall Notes</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional observations about the property condition..." rows={3} className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors resize-none" />
          </div>

          <button onClick={submitVerification} disabled={submitting} className="w-full py-3 rounded-lg bg-primary text-white text-sm font-sans font-semibold cursor-pointer hover:bg-lagoon transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <>{I.loader} Submitting...</> : <>Submit Re-verification</>}
          </button>
        </div>
      ) : (
        /* property list */
        <div className="space-y-4">
          {verifications.length === 0 && (
            <div className="text-center py-12 text-ink-secondary bg-white rounded-xl border border-hairline">
              <p className="text-sm">No properties requiring verification</p>
            </div>
          )}
          {verifications.map((v) => {
            const lastDate = new Date(v.date);
            const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            const needsReVerification = daysSince > 25;

            return (
              <div key={v.id} className={`bg-white rounded-xl border p-5 flex items-center justify-between transition-colors ${needsReVerification ? "border-warning/30 bg-warning/5" : "border-hairline"}`}>
                <div className="flex items-start gap-4">
                  {needsReVerification ? (
                    <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0 mt-0.5">
                      {I.alert}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 mt-0.5">
                      {I.check}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-sans font-semibold text-ink">{v.property_name}</h3>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      Last verified {v.date}
                      {needsReVerification && <span className="text-warning font-medium ml-1">· Re-verification due ({daysSince} days ago)</span>}
                    </p>
                    {v.notes && <p className="text-xs text-ink-secondary mt-1 line-clamp-1">{v.notes}</p>}
                  </div>
                </div>
                <button
                  onClick={() => startVerification(v)}
                  className={`px-4 py-2 rounded-lg text-xs font-sans font-medium cursor-pointer transition-colors shrink-0 ${
                    needsReVerification
                      ? "bg-warning text-white hover:bg-warning/80"
                      : "bg-primary text-white hover:bg-lagoon"
                  }`}
                >
                  {I.refresh}
                  <span className="ml-1.5">{needsReVerification ? "Re-verify now" : "Verify"}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
