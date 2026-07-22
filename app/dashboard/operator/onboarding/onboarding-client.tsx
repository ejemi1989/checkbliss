"use client";

import { useState, useCallback } from "react";
import { createProperty } from "@/actions/properties";
import type { AuthUser } from "@/lib/auth";

const I = {
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  camera: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  clipboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>,
  send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  upload: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  plusCircle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>,
  arrowLeft: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  arrowRight: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  loader: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>,
};

const STEPS = [
  { id: "details", label: "Property", icon: "home" as keyof typeof I },
  { id: "photos", label: "Photos", icon: "camera" as keyof typeof I },
  { id: "inspection", label: "Inspection", icon: "clipboard" as keyof typeof I },
  { id: "submit", label: "Submit", icon: "send" as keyof typeof I },
];

const INSPECTION_ITEMS = [
  "Front door lock & key functional",
  "All windows open/close and lock properly",
  "AC units operational in all rooms",
  "Water heater functional — hot water at all taps",
  "Toilet flush working, no leaks",
  "Shower pressure adequate, no leaks",
  "Kitchen sink drain clear, no odors",
  "Refrigerator cooling properly",
  "Stove/oven operational",
  "All light fixtures working — no blown bulbs",
  "Walls free of scuffs, stains, mold",
  "Floors clean — no cracks, stains, loose tiles",
  "Furnishings present per inventory list",
  "Linens & towels stocked — 2 sets per bed",
  "Smoke detector tested and functional",
  "Fire extinguisher present and in date",
  "WiFi router powered on and connected",
  "TV and remotes present and working",
  "Unit clean — no trash, dust, or odors",
  "Emergency contact numbers posted",
];

interface FormData {
  name: string;
  city: string;
  neighbourhood: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  nightlyRate: number;
  description: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}

interface PhotoEntry {
  id: string;
  label: string;
  file: File | null;
  preview: string;
}

interface ChecklistItem {
  label: string;
  passed: boolean | null;
  notes: string;
}

export function OperatorOnboarding({ user }: { user: AuthUser | null }) {
  const assignedCities = user?.assignedCities ?? [];
  const defaultCity = assignedCities.length === 1 ? assignedCities[0] : "Lagos";

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    city: defaultCity,
    neighbourhood: "",
    address: "",
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    nightlyRate: 0,
    description: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
  });

  const [photos, setPhotos] = useState<PhotoEntry[]>([
    { id: "p1", label: "Exterior / building entrance", file: null, preview: "" },
    { id: "p2", label: "Living room", file: null, preview: "" },
    { id: "p3", label: "Kitchen", file: null, preview: "" },
    { id: "p4", label: "Main bedroom", file: null, preview: "" },
    { id: "p5", label: "Bathroom", file: null, preview: "" },
  ]);

  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    INSPECTION_ITEMS.map((label) => ({ label, passed: null, notes: "" })),
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  function update(field: keyof FormData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handlePhotoSelect(photoId: string, file: File) {
    const preview = URL.createObjectURL(file);
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, file, preview } : p));
  }

  function removePhoto(photoId: string) {
    setPhotos((prev) => prev.map((p) => {
      if (p.id === photoId && p.preview) URL.revokeObjectURL(p.preview);
      return p.id === photoId ? { ...p, file: null, preview: "" } : p;
    }));
  }

  function toggleChecklistItem(index: number, passed: boolean) {
    setChecklist((prev) => prev.map((item, i) => i === index ? { ...item, passed: item.passed === passed ? null : passed } : item));
  }

  function updateChecklistNote(index: number, notes: string) {
    setChecklist((prev) => prev.map((item, i) => i === index ? { ...item, notes } : item));
  }

  function validateStep(currentStep: number): boolean {
    const errs: Record<string, string> = {};

    if (currentStep === 0) {
      if (!form.name.trim()) errs.name = "Property name is required";
      if (!form.city) errs.city = "City is required";
      if (form.bedrooms < 1) errs.bedrooms = "At least 1 bedroom";
      if (form.maxGuests < 1) errs.maxGuests = "At least 1 guest";
      if (!form.ownerName.trim()) errs.ownerName = "Owner name is required";
      if (!form.ownerEmail.trim()) errs.ownerEmail = "Owner email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) errs.ownerEmail = "Invalid email";
    }

    if (currentStep === 2) {
      const incomplete = checklist.filter((c) => c.passed === null).length;
      if (incomplete > 0) errs.checklist = `${incomplete} item${incomplete > 1 ? "s" : ""} not checked`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit() {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }

    setSubmitting(true);

    try {
      const result = await createProperty({
        name: form.name,
        city: form.city,
        neighbourhood: form.neighbourhood,
        address: form.address,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        max_guests: form.maxGuests,
        nightly_rate_minor: form.nightlyRate,
        description: form.description,
        owner_name: form.ownerName,
        owner_email: form.ownerEmail,
        owner_phone: form.ownerPhone,
      });

      if (result.ok) {
        setDone(true);
        notify(`Property "${form.name}" submitted for curation`, "success");
      } else {
        notify(result.message ?? "Failed to create property", "error");
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const passedCount = checklist.filter((c) => c.passed === true).length;
  const failedCount = checklist.filter((c) => c.passed === false).length;

  if (done) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-14 h-14 rounded-full bg-success/10 text-success mx-auto mb-4 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 className="font-sans text-2xl font-medium text-ink mb-2">Property Submitted</h1>
        <p className="text-sm text-ink-secondary mb-6">
          &ldquo;{form.name}&rdquo; has been added to the curation queue. Our admin team will review it within 48 hours.
        </p>
        <button onClick={() => { setDone(false); setStep(0); setForm({ name: "", city: defaultCity, neighbourhood: "", address: "", bedrooms: 1, bathrooms: 1, maxGuests: 2, nightlyRate: 0, description: "", ownerName: "", ownerEmail: "", ownerPhone: "" }); setPhotos((prev) => prev.map((p) => ({ ...p, file: null, preview: "" }))); setChecklist(INSPECTION_ITEMS.map((label) => ({ label, passed: null, notes: "" }))); }} className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-sans font-medium cursor-pointer hover:bg-lagoon transition-colors">
          Onboard another property
        </button>
      </div>
    );
  }

  return (
    <>
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${
          notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"
        }`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="font-sans text-[clamp(1.5rem,2.4vw,2rem)] font-medium leading-tight text-ink">Onboard New Property</h1>
          <p className="text-sm mt-1 text-ink-secondary">Source a new property for verification and listing</p>
        </div>

        {/* step indicator */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex items-center">
              <button
                onClick={() => { if (i < step) setStep(i); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-sans font-medium transition-colors cursor-pointer ${
                  i === step ? "bg-primary text-white" :
                  i < step ? "bg-success/10 text-success" :
                  "bg-bone text-ink-secondary"
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">{i < step ? I.check : I[s.icon]}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? "bg-success/40" : "bg-hairline"}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Property Details */}
        {step === 0 && (
          <div className="bg-white rounded-xl border border-hairline p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Property Name</label>
                <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Lekki Garden Apartments" className={`w-full px-4 py-2.5 rounded-lg border text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:bg-white transition-colors ${errors.name ? "border-danger" : "border-hairline focus:border-lagoon"}`} />
                {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">City</label>
                <select value={form.city} onChange={(e) => update("city", e.target.value)} disabled={assignedCities.length === 1} className={`w-full px-4 py-2.5 rounded-lg border text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:bg-white transition-colors ${errors.city ? "border-danger" : "border-hairline focus:border-lagoon"}`}>
                  {assignedCities.length === 0 && <>
                    <option>Lagos</option>
                    <option>Abuja</option>
                    <option>Port Harcourt</option>
                  </>}
                  {assignedCities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.city && <p className="text-xs text-danger mt-1">{errors.city}</p>}
              </div>

              <div>
                <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Neighbourhood</label>
                <input type="text" value={form.neighbourhood} onChange={(e) => update("neighbourhood", e.target.value)} placeholder="e.g. Victoria Island" className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Address</label>
                <input type="text" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Street address" className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Bedrooms</label>
                <input type="number" min={1} value={form.bedrooms} onChange={(e) => update("bedrooms", Number(e.target.value))} className={`w-full px-4 py-2.5 rounded-lg border text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:bg-white transition-colors ${errors.bedrooms ? "border-danger" : "border-hairline focus:border-lagoon"}`} />
              </div>
              <div>
                <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Bathrooms</label>
                <input type="number" min={1} value={form.bathrooms} onChange={(e) => update("bathrooms", Number(e.target.value))} className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Max Guests</label>
                <input type="number" min={1} value={form.maxGuests} onChange={(e) => update("maxGuests", Number(e.target.value))} className={`w-full px-4 py-2.5 rounded-lg border text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:bg-white transition-colors ${errors.maxGuests ? "border-danger" : "border-hairline focus:border-lagoon"}`} />
              </div>
              <div>
                <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Nightly Rate (£)</label>
                <input type="number" min={0} step={1} value={form.nightlyRate} onChange={(e) => update("nightlyRate", Number(e.target.value))} placeholder="0.00" className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors" />
              </div>
            </div>

            <div className="pt-4 border-t border-hairline">
              <h3 className="text-sm font-sans font-semibold text-ink mb-3">Property Owner</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Full Name</label>
                  <input type="text" value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} placeholder="Owner's full name" className={`w-full px-4 py-2.5 rounded-lg border text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:bg-white transition-colors ${errors.ownerName ? "border-danger" : "border-hairline focus:border-lagoon"}`} />
                  {errors.ownerName && <p className="text-xs text-danger mt-1">{errors.ownerName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Email</label>
                  <input type="email" value={form.ownerEmail} onChange={(e) => update("ownerEmail", e.target.value)} placeholder="owner@email.com" className={`w-full px-4 py-2.5 rounded-lg border text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:bg-white transition-colors ${errors.ownerEmail ? "border-danger" : "border-hairline focus:border-lagoon"}`} />
                  {errors.ownerEmail && <p className="text-xs text-danger mt-1">{errors.ownerEmail}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-1.5">Phone (WhatsApp)</label>
                  <input type="tel" value={form.ownerPhone} onChange={(e) => update("ownerPhone", e.target.value)} placeholder="+234..." className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-hairline">
              <h3 className="text-sm font-sans font-semibold text-ink mb-3">Description</h3>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Describe the property — location highlights, nearby landmarks, building features..." rows={3} className="w-full px-4 py-2.5 rounded-lg border border-hairline text-sm font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors resize-none" />
            </div>
          </div>
        )}

        {/* Step 1: Photos */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-hairline p-6 space-y-5">
            <p className="text-sm text-ink-secondary">Upload photos for each area. Minimum 5 photos required for review. Tap each card to capture with your camera.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="border border-hairline rounded-lg overflow-hidden">
                  {photo.preview ? (
                    <div className="relative aspect-video bg-bone">
                      <img src={photo.preview} alt={photo.label} className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(photo.id)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors">{I.x}</button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video bg-bone/50 cursor-pointer hover:bg-bone transition-colors">
                      {I.plusCircle}
                      <span className="text-xs font-sans font-medium text-ink-secondary mt-1">{photo.label}</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(photo.id, f); }} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Inspection Checklist */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-hairline p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 text-xs font-sans font-medium text-success">{I.check} {passedCount} passed</div>
              {failedCount > 0 && <div className="flex items-center gap-2 text-xs font-sans font-medium text-danger">{I.x} {failedCount} failed</div>}
              <div className="flex items-center gap-2 text-xs font-sans font-medium text-ink-secondary">{checklist.filter((c) => c.passed === null).length} unchecked</div>
            </div>

            {errors.checklist && <p className="text-xs text-danger">{errors.checklist}</p>}

            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 py-2.5 border-b border-hairline last:border-0">
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <button
                      onClick={() => toggleChecklistItem(idx, true)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${item.passed === true ? "bg-success text-white" : "border border-hairline text-ink-secondary hover:border-success hover:text-success"}`}
                    >
                      {I.check}
                    </button>
                    <button
                      onClick={() => toggleChecklistItem(idx, false)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${item.passed === false ? "bg-danger text-white" : "border border-hairline text-ink-secondary hover:border-danger hover:text-danger"}`}
                    >
                      {I.x}
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-sans font-medium text-ink">{item.label}</p>
                    {item.passed !== null && (
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => updateChecklistNote(idx, e.target.value)}
                        placeholder={item.passed ? "Notes (optional)" : "Describe the issue..."}
                        className="mt-1.5 w-full px-3 py-1.5 rounded-lg border border-hairline text-xs font-sans text-ink bg-bone/50 focus:outline-none focus:border-lagoon focus:bg-white transition-colors"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="bg-white rounded-xl border border-hairline p-6 space-y-5">
            <h3 className="text-sm font-sans font-semibold text-ink">Review your submission</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-hairline"><span className="text-ink-secondary">Property</span><span className="font-medium text-ink">{form.name}</span></div>
              <div className="flex justify-between py-2 border-b border-hairline"><span className="text-ink-secondary">City</span><span className="font-medium text-ink">{form.city}</span></div>
              <div className="flex justify-between py-2 border-b border-hairline"><span className="text-ink-secondary">Bedrooms</span><span className="font-medium text-ink">{form.bedrooms} · {form.bathrooms} bath · {form.maxGuests} guests</span></div>
              <div className="flex justify-between py-2 border-b border-hairline"><span className="text-ink-secondary">Photos</span><span className="font-medium text-ink">{photos.filter((p) => p.file || p.preview).length} / {photos.length}</span></div>
              <div className="flex justify-between py-2 border-b border-hairline"><span className="text-ink-secondary">Inspection</span><span className="font-medium text-ink">{passedCount} passed{failedCount > 0 ? ` · ${failedCount} flagged` : ""}</span></div>
              <div className="flex justify-between py-2 border-b border-hairline"><span className="text-ink-secondary">Owner</span><span className="font-medium text-ink">{form.ownerName} · {form.ownerEmail}</span></div>
            </div>

            {failedCount > 0 && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-ink-secondary">
                {failedCount} inspection item{failedCount > 1 ? "s" : ""} flagged — the property will be submitted but marked for follow-up inspection.
              </div>
            )}

            <button
              onClick={onSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-primary text-white text-sm font-sans font-semibold cursor-pointer hover:bg-lagoon transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <>{I.loader} Submitting...</> : <>{I.send} Submit for Curation</>}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={prev} disabled={step === 0} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-sans font-medium transition-colors cursor-pointer ${step === 0 ? "text-ink-tertiary" : "text-ink-secondary hover:bg-bone"}`}>
            {I.arrowLeft} Back
          </button>

          {step < STEPS.length - 1 && (
            <button onClick={next} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-sans font-medium cursor-pointer hover:bg-lagoon transition-colors">
              Next {I.arrowRight}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
