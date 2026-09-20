"use client";

import { useState, useCallback } from "react";
import type { UserRecord } from "@/lib/types";
import { setUserSuspended } from "@/actions/users";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { DataList } from "@/components/dashboard/data-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Icon } from "@/components/icons";

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

  const activeCount = users.filter((u) => u.status !== "suspended").length;
  const suspendedCount = users.length - activeCount;

  return (
    <div>
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <PageHeader
        eyebrow="People"
        title="User management"
        description="Unified directory — owners, operators, guests. Suspend or restore access as needed."
        meta={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">
              {activeCount} active
            </span>
            {suspendedCount > 0 && (
              <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] rounded-full border border-error/30 text-error bg-error/5 px-2.5 py-1">
                {suspendedCount} suspended
              </span>
            )}
          </div>
        }
      />

      <Section eyebrow="Directory" count={users.length}>
        {users.length === 0 ? (
          <EmptyState
            title="No users yet"
            body="Owners, operators, and guests will appear here as they sign up."
            icon={<Icon.Users size={20} />}
          />
        ) : (
          <DataList
            items={users.map((u) => {
              const suspended = u.status === "suspended";
              return {
                id: u.id,
                primary: (
                  <span className="flex items-center gap-2.5">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-sans font-semibold ${u.type === "Guest" ? "bg-primary" : "bg-ink-tertiary"}`}>
                      {initials(u.name)}
                    </span>
                    <span>{u.name}</span>
                  </span>
                ),
                secondary: `${u.email} · ${u.bookings_or_properties} ${u.type === "Owner" ? "properties" : "bookings"}`,
                trailing: (
                  <div className="flex items-center gap-2">
                    <StatusPill variant="accent">{u.type}</StatusPill>
                    {suspended && <StatusPill variant="danger" dot>Suspended</StatusPill>}
                    <button
                      onClick={() => toggleSuspend(u)}
                      disabled={busy === u.id}
                      className={`text-xs font-sans font-semibold px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 transition-colors border ${
                        suspended
                          ? "border-primary/30 text-primary hover:bg-primary-bg"
                          : "border-error/30 text-error hover:bg-error/5"
                      }`}
                    >
                      {busy === u.id ? "…" : suspended ? "Restore" : "Suspend"}
                    </button>
                  </div>
                ),
              };
            })}
          />
        )}
      </Section>
    </div>
  );
}
