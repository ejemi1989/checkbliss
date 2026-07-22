"use client";

import { useState, useCallback } from "react";

export function AdminSettingsView() {
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  return (
    <div className="space-y-4">
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <h1 className="text-lg font-bold text-ink">Platform Settings</h1>

      <div className="bg-white border border-hairline rounded-xl p-5 space-y-4 max-w-md">
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
