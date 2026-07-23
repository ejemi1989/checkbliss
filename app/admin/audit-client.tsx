"use client";

import { useState } from "react";
import { getAdminAudit } from "@/lib/data";

export function AdminAuditView() {
  const [audit] = useState(() => getAdminAudit());

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-ink">Audit Log</h1>
      <p className="text-sm font-medium text-ink-secondary">Sensitive actions log — immutable, filterable by actor, action type, date range</p>

      {audit.map((a, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{a.action} — {a.target}</p>
            <p className="text-xs text-ink-secondary truncate">{a.detail}</p>
          </div>
          <span className="text-xs text-ink-secondary shrink-0 ml-4">{a.date}</span>
        </div>
      ))}
    </div>
  );
}
