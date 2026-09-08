"use client";

import { useMemo, useState, useTransition } from "react";
import { formatMinor } from "@/lib/currency";
import type { PayoutLedgerEntry, PayoutAlert } from "@/lib/types";
import { resolveAlert } from "@/actions/finance";

function fmt(n: number) { return formatMinor(n); }

type StatusFilter = "all" | "pending" | "eligible" | "released" | "paid" | "failed" | "refunded";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  eligible: "Eligible",
  released: "Released",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-primary/10 text-primary",
  eligible: "bg-primary/10 text-primary",
  released: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  failed: "bg-danger/10 text-danger",
  refunded: "bg-ink/10 text-ink-secondary",
};

function severityTone(s: PayoutAlert["severity"]): string {
  if (s === "critical") return "bg-danger/10 text-danger";
  if (s === "high") return "bg-warning/10 text-warning";
  if (s === "medium") return "bg-primary/10 text-primary";
  return "bg-ink/10 text-ink-secondary";
}

export function AdminPayoutsView({
  ledger,
  alerts,
}: {
  ledger: PayoutLedgerEntry[];
  alerts: PayoutAlert[];
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return ledger.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (ownerFilter) {
        const needle = ownerFilter.toLowerCase();
        if (!row.ownerName.toLowerCase().includes(needle) && !row.propertyName.toLowerCase().includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [ledger, statusFilter, ownerFilter]);

  const totals = useMemo(() => {
    const by: Record<string, { count: number; amountMinor: number }> = {};
    for (const row of ledger) {
      const bucket = by[row.status] ?? { count: 0, amountMinor: 0 };
      bucket.count += 1;
      bucket.amountMinor += row.ownerShareMinor;
      by[row.status] = bucket;
    }
    return by;
  }, [ledger]);

  const unhandledAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="space-y-5">
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg ${feedback.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {feedback.message}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink">Owner Payouts</h1>
          <p className="text-xs text-ink-secondary mt-1">Live ledger from <code className="font-mono text-[11px]">owner_payouts</code> + payout alerts. Read-only — mutations go through Server Actions.</p>
        </div>
      </div>

      {unhandledAlerts.length > 0 && (
        <div className="bg-white rounded-xl border border-hairline p-5">
          <h2 className="font-display text-base font-medium text-ink mb-3">Open payout alerts ({unhandledAlerts.length})</h2>
          <div className="space-y-2">
            {unhandledAlerts.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-primary-bg">
                <div className="flex-1">
                  <div className="flex items-center gap-x-2 mb-1">
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${severityTone(a.severity)}`}>{a.severity}</span>
                    <span className="text-xs font-mono text-ink-secondary">{a.kind}</span>
                  </div>
                  <p className="text-sm text-ink">{a.message}</p>
                </div>
                <div className="flex flex-col items-end gap-y-1">
                  <span className="text-[11px] text-ink-secondary whitespace-nowrap">{new Date(a.createdAt).toISOString().slice(0, 16).replace("T", " ")}</span>
                  <button
                    type="button"
                    disabled={resolvingId === a.id}
                    onClick={() => {
                      setResolvingId(a.id);
                      startTransition(async () => {
                        const result = await resolveAlert(a.id);
                        setResolvingId(null);
                        if (result.ok) {
                          setFeedback({ type: "success", message: `Alert ${a.id.slice(0, 8)}… resolved` });
                        } else {
                          setFeedback({ type: "error", message: "message" in result && result.message ? result.message : "Resolve failed" });
                        }
                        setTimeout(() => setFeedback(null), 3000);
                      });
                    }}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-hairline text-ink-secondary hover:bg-white hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resolvingId === a.id ? "Resolving…" : "Resolve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["pending", "eligible", "released", "paid"] as const).map((s) => {
          const bucket = totals[s] ?? { count: 0, amountMinor: 0 };
          return (
            <div key={s} className="bg-white rounded-xl border border-hairline p-4">
              <p className="text-xs font-medium text-ink-secondary">{STATUS_LABEL[s] ?? s}</p>
              <p className="text-xl font-bold mt-1 tabular-nums text-ink">{fmt(bucket.amountMinor)}</p>
              <p className="text-[11px] mt-0.5 text-ink-tertiary">{bucket.count} {bucket.count === 1 ? "payout" : "payouts"}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-hairline p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-display text-base font-medium text-ink">Ledger</h2>
          <div className="flex items-center gap-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="text-xs border border-hairline rounded-lg px-3 py-1.5 bg-white text-ink"
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input
              type="text"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              placeholder="Owner / property…"
              className="text-xs border border-hairline rounded-lg px-3 py-1.5 bg-white text-ink placeholder:text-ink-tertiary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-secondary border-b border-hairline">
                <th className="py-2 pr-3 font-semibold">Owner</th>
                <th className="py-2 pr-3 font-semibold">Property</th>
                <th className="py-2 pr-3 font-semibold text-right">Owner share (GBP)</th>
                <th className="py-2 pr-3 font-semibold text-right">Payout (NGN)</th>
                <th className="py-2 pr-3 font-semibold">FX</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Fincra ref</th>
                <th className="py-2 pr-3 font-semibold">Paid at</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-ink-secondary">No payouts match the current filter.</td>
                </tr>
              )}
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-hairline last:border-b-0 hover:bg-primary-bg">
                  <td className="py-2.5 pr-3 text-ink">{row.ownerName || "—"}</td>
                  <td className="py-2.5 pr-3 text-ink-secondary">{row.propertyName || "—"}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-ink font-semibold">{fmt(row.ownerShareMinor)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-ink-secondary">
                    {row.payoutNgnMinor != null ? `₦${(row.payoutNgnMinor / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}` : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-ink-tertiary">{row.fxRate != null ? row.fxRate.toLocaleString("en-GB") : "—"}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_TONE[row.status] ?? "bg-ink/10 text-ink-secondary"}`}>{STATUS_LABEL[row.status] ?? row.status}</span>
                    {row.attempts > 0 && <span className="ml-2 text-[10px] text-warning font-semibold">{row.attempts}× retries</span>}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-ink-secondary">{row.fincraReference ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-[11px] text-ink-secondary">{row.paidAt ? new Date(row.paidAt).toISOString().slice(0, 16).replace("T", " ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
