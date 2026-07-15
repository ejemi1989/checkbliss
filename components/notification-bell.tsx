"use client";

import { useState, useEffect } from "react";
import type { NotifRole } from "@/lib/notifications";
import { getNotifications, getUnreadCount, markRead, markAllRead } from "@/lib/notifications";

export function NotificationBell({ role, userId, onViewAll }: { role: NotifRole; userId?: string; onViewAll?: () => void }) {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const uid = role === "admin" ? undefined : userId;
  const notifs = getNotifications(role, uid);
  const unread = getUnreadCount(role, uid);

  function load() { setTick((t) => t + 1); }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = document.getElementById("notif-bell-container");
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleMarkRead(id: string) {
    markRead(id);
    load();
  }

  function handleMarkAll() {
    markAllRead(role, uid);
    load();
  }

  const BellIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );

  return (
    <div id="notif-bell-container" className="relative">
      <button
        onClick={() => { setOpen(!open); load(); }}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-bg transition-colors text-ink-secondary cursor-pointer border-none bg-transparent"
      >
        {BellIcon}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-danger text-white text-[9px] font-bold leading-none px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-hairline shadow-xl z-50 overflow-hidden animate-slideIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
            <span className="text-xs font-semibold text-ink">{notifs.length} notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAll} className="text-[10px] font-medium text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto scroll-thin">
            {notifs.length === 0 ? (
              <p className="text-xs text-ink-secondary text-center py-10">No notifications</p>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`px-4 py-3 border-b border-hairline last:border-b-0 cursor-pointer transition-colors hover:bg-primary-bg ${!n.read ? "bg-primary-bg/40" : ""}`}
                >
                  <div className="flex items-start gap-x-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">{n.title}</p>
                      <p className="text-[11px] text-ink-secondary mt-0.5" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.body}</p>
                      <p className="text-[10px] text-ink-tertiary mt-1">
                        {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-hairline bg-bone">
            <button
              onClick={() => { setOpen(false); onViewAll?.(); }}
              className="w-full text-center text-[11px] font-semibold text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent"
            >
              Open notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
