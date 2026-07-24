"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { NotifRole } from "@/lib/notifications";
import { getNotifications, getUnreadCount, markRead, markAllRead } from "@/lib/notifications";

export function NotificationsView({ role, userId }: { role: NotifRole; userId?: string }) {
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  useEffect(() => setMounted(true), []);

  const uid = role === "admin" ? undefined : userId;
  const notifs = getNotifications(role, uid);
  const unread = getUnreadCount(role, uid);

  function load() { setTick((t) => t + 1); }

  function handleClick(id: string, link?: string) {
    markRead(id);
    load();
    if (link) router.push(link);
  }

  function handleMarkAll(e: React.MouseEvent) {
    e.stopPropagation();
    markAllRead(role, uid);
    load();
  }

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-hairline rounded w-48 animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-hairline rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-ink">
          {notifs.length} notification{notifs.length !== 1 ? "s" : ""} · {unread} unread
        </p>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-xs font-medium text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-hairline">
          <div className="mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-tertiary mx-auto">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <p className="text-sm text-ink-secondary">No notifications</p>
          <p className="text-xs text-ink-tertiary mt-1">You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(n.id, n.link)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(n.id, n.link); } }}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                n.read ? "bg-white border-hairline hover:bg-bone" : "bg-primary-bg/40 border-primary/20 hover:bg-primary-bg/60"
              }`}
            >
              <div className="flex items-start gap-x-3">
                {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{n.title}</p>
                  <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{n.body}</p>
                  <div className="flex items-center gap-x-2 mt-2">
                    <span className="text-[10px] text-ink-tertiary">
                      {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {n.read ? (
                      <span className="text-[10px] text-ink-tertiary">Read</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-primary">Unread</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
