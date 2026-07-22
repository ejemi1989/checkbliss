"use client";

import { useState, useCallback, useRef } from "react";

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
    <div className="space-y-5">
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <h1 className="text-lg font-bold text-ink">Platform Settings</h1>

      {/* Admin profile */}
      <div className="bg-white border border-hairline rounded-xl p-5 space-y-4 max-w-md">
        <h2 className="text-sm font-semibold text-ink">Admin profile</h2>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full border-2 border-hairline bg-primary-bg overflow-hidden shrink-0 flex items-center justify-center">
            {photo ? (
              <img src={photo} alt="Admin" className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-xl font-medium text-ink-secondary">AD</span>
            )}
          </div>
          <div>
            <p className="text-xs text-ink-secondary mb-2">JPG or PNG, max 5MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-line text-xs font-medium text-ink-secondary hover:bg-primary-bg transition-colors cursor-pointer">
                Upload photo
              </button>
              {photo && (
                <button type="button" onClick={() => setPhoto(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-mute hover:text-danger transition-colors cursor-pointer">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Platform config */}
      <div className="bg-white border border-hairline rounded-xl p-5 space-y-4 max-w-md">
        <h2 className="text-sm font-semibold text-ink">Platform configuration</h2>
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
          onClick={() => notify("Settings saved (mock).", "success")}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none"
        >Save Settings</button>
      </div>
    </div>
  );
}
