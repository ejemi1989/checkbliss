"use client";

import { useMemo, useState, useTransition } from "react";
import { formatMinor } from "@/lib/currency";
import type { PayoutLedgerEntry, PayoutAlert } from "@/lib/types";
import { resolveAlert } from "@/actions/finance";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { StatBlock, StatGrid } from "@/components/dashboard/stat-block";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Icon } from "@/components/icons";

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

function statusVariant(s: string): "accent" | "warning" | "success" | "danger" | "neutral" {
  if (s === "pending" || s === "eligible") return "accent";
  if (s === "released") return "warning";
  if (s === "paid") return "success";
  if (s === "failed") return "danger";
  return "neutral";
}

function severityVariant(s: PayoutAlert["severity"]): "danger" | "warning" | "accent" | "neutral" {
  if (s === "critical") return "danger";
  if (s === "high") return "warning";
  if (s === "medium") return "accent";
  return "neutral";
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
    <div>
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg ${feedback.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {feedback.message}
        </div>
      )}

      <PageHeader
        eyebrow="Owner payouts"
        title="Live ledger"
        description={`Live ledger from owner_payouts + payout alerts. Read-only — mutations go through Server Actions.`}
      />

      {unhandledAlerts.length > 0 && (
        <Section eyebrow="Open alerts" count={unhandledAlerts.length}>
          <div className="space-y-2">
            {unhandledAlerts.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 p-4 rounded-xl bg-primary-bg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <StatusPill variant={severityVariant(a.severity)}>{a.severity}</StatusPill>
                    <span className="text-xs font-mono text-ink-secondary">{a.kind}</span>
                  </div>
                  <p className="text-sm text-ink">{a.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] text-ink-tertiary font-sans whitespace-nowrap">{new Date(a.createdAt).toISOString().slice(0, 16).replace("T", " ")}</span>
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
                    className="text-[11px] font-sans font-semibold px-2.5 py-1 rounded-lg border border-hairline text-ink-secondary hover:bg-canvas hover:text-primary transition-colors cursor-pointer bg-canvas disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resolvingId === a.id ? "Resolving…" : "Resolve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section eyebrow="By status" description="Aggregated by payout state.">
        <StatGrid>
          {(["pending", "eligible", "released", "paid"] as const).map((s) => {
            const bucket = totals[s] ?? { count: 0, amountMinor: 0 };
            return (
              <StatBlock
                key={s}
                label={STATUS_LABEL[s] ?? s}
                value={fmt(bucket.amountMinor)}
                hint={`${bucket.count} ${bucket.count === 1 ? "payout" : "payouts"}`}
                accent={s === "paid"}
              />
            );
          })}
        </StatGrid>
      </Section>

      <Section eyebrow="Ledger" count={filtered.length}>
        <div className="flex flex-wrap items-center gap-2 pb-5 mb-6 border-b border-hairline">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="text-xs border border-hairline rounded-lg px-3 py-2 bg-canvas text-ink font-sans"
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
            className="text-xs border border-hairline rounded-lg px-3 py-2 bg-canvas text-ink placeholder:text-ink-tertiary font-sans"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No payouts match"
            body="Adjust the status filter or clear the search to see payouts."
            icon={<Icon.Coins size={20} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-ink-tertiary border-b border-hairline">
                  <th className="py-2.5 pr-3">Owner</th>
                  <th className="py-2.5 pr-3">Property</th>
                  <th className="py-2.5 pr-3 text-right">Owner share (GBP)</th>
                  <th className="py-2.5 pr-3 text-right">Payout (NGN)</th>
                  <th className="py-2.5 pr-3">FX</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 pr-3">Fincra ref</th>
                  <th className="py-2.5 pr-3">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-hairline last:border-b-0 hover:bg-bone-secondary/40 transition-colors">
                    <td className="py-3 pr-3 text-ink font-sans">{row.ownerName || "—"}</td>
                    <td className="py-3 pr-3 text-ink-secondary font-sans">{row.propertyName || "—"}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-ink font-sans font-semibold">{fmt(row.ownerShareMinor)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-ink-secondary font-sans">
                      {row.payoutNgnMinor != null ? `₦${(row.payoutNgnMinor / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}` : "—"}
                    </td>
                    <td className="py-3 pr-3 text-ink-tertiary font-sans">{row.fxRate != null ? row.fxRate.toLocaleString("en-GB") : "—"}</td>
                    <td className="py-3 pr-3">
                      <StatusPill variant={statusVariant(row.status)}>
                        {STATUS_LABEL[row.status] ?? row.status}
                      </StatusPill>
                      {row.attempts > 0 && <span className="ml-2 text-[10px] text-warning font-sans font-semibold">{row.attempts}× retries</span>}
                    </td>
                    <td className="py-3 pr-3 font-mono text-[11px] text-ink-secondary">{row.fincraReference ?? "—"}</td>
                    <td className="py-3 pr-3 text-[11px] text-ink-secondary font-sans">{row.paidAt ? new Date(row.paidAt).toISOString().slice(0, 16).replace("T", " ") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
