"use client";

import { formatMinor } from "@/lib/currency";
import { getAdminFinance } from "@/lib/data";

function fmt(n: number) { return formatMinor(n); }

export function AdminFinanceView() {
  const finance = getAdminFinance();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-ink">Finance</h1>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Payments Received", value: "£24,000", sub: "June 2026" },
          { label: "Payouts Issued", value: "£19,000", sub: "To 5 owners" },
          { label: "Deposits Held", value: "£4,200", sub: "7 active bookings" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-hairline bg-primary-bg">
            <p className="text-xs font-medium mb-1 text-ink-secondary">{s.label}</p>
            <p className="text-xl font-bold tabular-nums text-ink">{s.value}</p>
            <p className="text-xs text-ink-secondary">{s.sub}</p>
          </div>
        ))}
      </div>

      {finance.map((f) => (
        <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
          <div><p className="text-sm font-semibold text-ink">{f.guest_or_owner} · {f.property}</p><p className="text-xs text-ink-secondary">{f.date} · {f.ref}</p></div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums text-ink">{fmt(f.amount_minor)}</p>
            <span className={`text-[11px] font-semibold ${f.status === "settled" || f.status === "paid" ? "text-success" : f.status === "held" ? "text-warning" : "text-primary"}`}>{f.type} · {f.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
