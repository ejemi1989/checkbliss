"use client";

import { useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";

export function AdminSettingsView() {
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { notify("File too large. Max 5MB.", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <PageHeader
        eyebrow="Configuration"
        title="Platform settings"
        description="Admin profile, defaults, and operational toggles."
      />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Admin profile */}
        <Section eyebrow="Profile" count="Admin">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full border-2 border-hairline bg-primary-bg overflow-hidden shrink-0 flex items-center justify-center">
              {photo ? (
                <img src={photo} alt="Admin" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-ink-secondary">AD</span>
              )}
            </div>
            <div>
              <p className="text-xs text-ink-secondary mb-3 font-sans">JPG or PNG, max 5MB</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg border border-hairline text-xs font-sans font-semibold text-ink-secondary hover:bg-bone-secondary transition-colors cursor-pointer bg-transparent">
                  Upload photo
                </button>
                {photo && (
                  <button type="button" onClick={() => setPhoto(null)} className="px-4 py-2 rounded-lg text-xs font-sans font-semibold text-ink-tertiary hover:text-error transition-colors cursor-pointer bg-transparent">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Platform config */}
        <Section eyebrow="Defaults" count="Operational">
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary">Platform Name</label>
              <input type="text" defaultValue="CheckinBliss" className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm mt-1.5 outline-none focus:border-primary text-ink bg-canvas font-sans" />
            </div>
            <div>
              <label className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary">Default Currency</label>
              <select defaultValue="GBP" className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm mt-1.5 outline-none text-ink bg-canvas font-sans">
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary">Deposit Hold (days)</label>
                <input type="number" defaultValue="7" className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm mt-1.5 outline-none focus:border-primary text-ink bg-canvas font-sans" />
              </div>
              <div>
                <label className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary">Max Nights / Booking</label>
                <input type="number" defaultValue="14" className="w-full border border-hairline rounded-lg px-4 py-2.5 text-sm mt-1.5 outline-none focus:border-primary text-ink bg-canvas font-sans" />
              </div>
            </div>
            <div className="pt-4 border-t border-hairline space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-sans font-medium text-ink">Enable WhatsApp notifications</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary cursor-pointer" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-sans font-medium text-ink">Maintenance mode</span>
                <input type="checkbox" className="w-4 h-4 accent-primary cursor-pointer" />
              </label>
            </div>
            <button
              onClick={() => notify("Settings saved (mock).", "success")}
              className="w-full py-2.5 rounded-lg text-sm font-sans font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none"
            >Save settings</button>
          </div>
        </Section>
      </div>
    </div>
  );
}
