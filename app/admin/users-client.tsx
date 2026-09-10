"use client";

import { useState, useCallback } from "react";
import type { UserRecord } from "@/lib/types";
import { setUserSuspended } from "@/actions/users";

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminUsersView({ initialUsers }: { initialUsers: UserRecord[] }) {
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [busy, setBusy] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  async function toggleSuspend(u: UserRecord) {
    const suspended = u.status !== "suspended";
    setBusy(u.id);
    const res = await setUserSuspended(u.id, suspended);
    setBusy(null);
    if (res.ok) {
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, status: suspended ? "suspended" : "active" } : x,
        ),
      );
      notify(`${u.name} ${suspended ? "suspended" : "restored"}`);
    } else {
      notify(res.error ?? "Action failed", "error");
    }
  }

  return (
    <div className="space-y-4">
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <h1 className="text-lg font-bold text-ink">User Management</h1>
      <p className="text-sm font-medium text-ink-secondary">Unified directory — support actions</p>

      {users.map((u) => {
        const suspended = u.status === "suspended";
        return (
          <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
            <div className="flex items-center gap-x-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm ${u.type === "Guest" ? "bg-primary" : "bg-ink-tertiary"}`}>{initials(u.name)}</div>
              <div>
                <p className="text-sm font-semibold text-ink">{u.name}</p>
                <p className="text-xs text-ink-secondary">{u.email} · {u.bookings_or_properties} {u.type === "Owner" ? "properties" : "bookings"}</p>
              </div>
            </div>
            <div className="flex items-center gap-x-2">
              <span className={`text-[11px] font-semibold ${u.type === "Guest" ? "text-primary" : "text-ink-tertiary"}`}>{u.type}</span>
              {suspended ? (
                <span className="text-[11px] font-semibold text-danger">Suspended</span>
              ) : null}
              <button
                onClick={() => toggleSuspend(u)}
                disabled={busy === u.id}
                className={`text-xs px-2 py-1 rounded-lg cursor-pointer disabled:opacity-50 ${
                  suspended ? "hover:bg-success/10 text-success" : "hover:bg-red-50 text-danger"
                }`}
              >
                {busy === u.id ? "…" : suspended ? "Restore" : "Suspend"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}