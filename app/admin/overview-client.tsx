"use client";

import { useState, useEffect } from "react";
import { formatMinor } from "@/lib/currency";
import { getAdminClaims, getAdminOperators, getAdminAudit, getAdminStats } from "@/lib/data";

function fmt(n: number) { return formatMinor(n); }

export function AdminOverview() {
  const [mounted, setMounted] = useState(false);
  const [claims] = useState(() => getAdminClaims());
  const [operators] = useState(() => getAdminOperators());
  const audit = getAdminAudit();
  const stats = getAdminStats();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-canvas" />;
  }

  return (
    <div className="space-y-6">
      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`p-4 rounded-xl border ${s.accent ? "bg-primary text-white border-transparent" : "bg-white border-hairline hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"} transition-all cursor-default`}>
            <p className={`text-xs font-medium ${s.accent ? "text-blue-100" : "text-ink-secondary"}`}>{s.label}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${s.accent ? "text-white" : s.label === "Revenue (MTD)" ? "text-primary" : "text-ink"}`}>{s.value}</p>
            <p className={`text-xs mt-1 font-medium ${s.accent ? "text-blue-200" : (s.subColor ?? "text-ink-secondary")}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* recent activity */}
      <div className="bg-white border border-hairline rounded-xl p-5">
        <h2 className="text-base font-bold text-ink mb-4">Recent Activity</h2>
        <div className="space-y-1">
          {audit.slice(0, 5).map((a, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{a.action} — {a.target}</p>
                <p className="text-xs text-ink-secondary truncate">{a.detail}</p>
              </div>
              <span className="text-xs text-ink-secondary shrink-0 ml-4">{a.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* pending claims + active operators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-hairline rounded-xl p-5">
          <h2 className="text-base font-bold text-ink mb-3">Pending Claims</h2>
          <div className="space-y-2">
            {claims.filter((c) => c.admin_decision === "pending").slice(0, 3).map((c) => (
              <div key={c.id} className="p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                <p className="text-sm font-semibold text-ink">{c.property_name}</p>
                <p className="text-xs text-ink-secondary">{c.guest_name} · {c.stay_dates} · {fmt(c.estimated_cost_minor)}</p>
              </div>
            ))}
            {claims.filter((c) => c.admin_decision === "pending").length === 0 && <p className="text-xs text-ink-secondary text-center py-4">No pending claims</p>}
          </div>
        </div>

        <div className="bg-white border border-hairline rounded-xl p-5">
          <h2 className="text-base font-bold text-ink mb-3">Active Operators</h2>
          <div className="space-y-2">
            {operators.filter((o) => o.status === "active").map((o) => (
              <div key={o.id} className="flex items-center gap-x-3 p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xs">{o.name.split(" ").map((n) => n[0]).join("")}</div>
                <div>
                  <p className="text-sm font-semibold text-ink">{o.name}</p>
                  <p className="text-xs text-ink-secondary">{o.city} · {o.properties_count} properties · {o.verified_count} verified</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
