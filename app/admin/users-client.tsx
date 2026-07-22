"use client";

import { useState, useCallback } from "react";
import { getAdminUsers } from "@/lib/data";

export function AdminUsersView() {
  const users = getAdminUsers();
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

      <h1 className="text-lg font-bold text-ink">User Management</h1>
      <p className="text-sm font-medium text-ink-secondary">Unified directory — support actions</p>

      {users.map((u) => (
        <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
          <div className="flex items-center gap-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm ${u.type === "Guest" ? "bg-primary" : "bg-ink-tertiary"}`}>{u.name.split(" ").map((n) => n[0]).join("")}</div>
            <div>
              <p className="text-sm font-semibold text-ink">{u.name}</p>
              <p className="text-xs text-ink-secondary">{u.email} · {u.bookings_or_properties} {u.type === "Owner" ? "properties" : "bookings"}</p>
            </div>
          </div>
          <div className="flex items-center gap-x-2">
            <span className={`text-[11px] font-semibold ${u.type === "Guest" ? "text-primary" : "text-ink-tertiary"}`}>{u.type}</span>
            <button onClick={() => notify(`Suspend flow for ${u.name} (mock)`, "success")} className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 text-danger cursor-pointer">Suspend</button>
          </div>
        </div>
      ))}
    </div>
  );
}
