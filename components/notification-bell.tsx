"use client";

import { useState, useEffect, useCallback } from "react";
import type { NotifRole } from "@/lib/notifications";
import {
  fetchNotifications,
  markReadAction,
  markAllReadAction,
  deleteNotificationAction,
  deleteAllNotificationsAction,
} from "@/actions/notifications";

export function NotificationBell({ role, userId, onViewAll }: { role: NotifRole; userId?: string; onViewAll?: () => void }) {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Array<{
    id: string;
    title: string;
    body: string;
    created_at: string;
    read: boolean;
  }>>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const { notifs: fetched, unread: unreadCount } = await fetchNotifications(role, userId);
    setNotifs(fetched);
    setUnread(unreadCount);
  }, [role, userId]);

  useEffect(() => {
    let cancelled = false;
    void fetchNotifications(role, userId).then(({ notifs: fetched, unread: unreadCount }) => {
      if (cancelled) return;
      setNotifs(fetched);
      setUnread(unreadCount);
    });
    return () => { cancelled = true; };
  }, [role, userId]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = document.getElementById("notif-bell-container");
      if (el && !el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleMarkRead(id: string) {
    await markReadAction(id);
    await load();
  }

  async function handleMarkAll() {
    await markAllReadAction(role, userId);
    await load();
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteNotificationAction(id);
    await load();
  }

  async function handleClearAll() {
    await deleteAllNotificationsAction(role, userId);
    await load();
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
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-bg transition-colors text-ink-secondary cursor-pointer border-none bg-transparent"
        aria-label="Notifications"
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
            <div className="flex items-center gap-x-2">
              {unread > 0 && (
                <button onClick={handleMarkAll} className="text-[10px] font-medium text-primary hover:text-primary-dark cursor-pointer border-none bg-transparent">
                  Mark all read
                </button>
              )}
              {notifs.length > 0 && (
                <button onClick={handleClearAll} className="text-[10px] font-medium text-danger hover:text-danger/80 cursor-pointer border-none bg-transparent">
                  Clear all
                </button>
              )}
            </div>
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
                        <p className="text-[10px] text-ink-tertiary mt-1" suppressHydrationWarning>
                        {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-ink-tertiary hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer border-none bg-transparent"
                      aria-label="Delete notification"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
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