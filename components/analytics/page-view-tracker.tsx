"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string>("");

  useEffect(() => {
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    if (lastPath.current === path) return;
    lastPath.current = path;

    let clientId = "";
    try {
      clientId = localStorage.getItem("ga_client_id") ?? "";
      if (!clientId) {
        clientId = `forare${Date.now()}${Math.floor(Math.random() * 100000)}`;
        localStorage.setItem("ga_client_id", clientId);
      }
    } catch {
      clientId = `forare${Date.now()}`;
    }

    fetch("/api/analytics/page-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        title: document.title,
        session_id: crypto.randomUUID(),
        client_id: clientId,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}
