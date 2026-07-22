"use client";

import { useState } from "react";
import { formatMinor } from "@/lib/currency";
import { getAdminFinance, getPendingPayouts, getReconciliation } from "@/lib/data";
import { approvePayout, rejectPayout, flagDiscrepancy } from "@/actions/finance";
import type { PendingPayout } from "@/lib/data";

function fmt(n: number) { return formatMinor(n); }

type FinanceTab = "overview" | "payouts" | "reconciliation";

export function AdminFinanceView() {
  const finance = getAdminFinance();
  const payouts = getPendingPayouts();
  const reconciliation = getReconciliation();
  const [tab, setTab] = useState<FinanceTab>("overview");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const totalPayments = finance.filter(f => f.type === "payment").reduce((s, f) => s + f.amount_minor, 0);
  const totalPayouts = finance.filter(f => f.type === "payout").reduce((s, f) => s + f.amount_minor, 0);
  const totalHeld = finance.filter(f => f.type === "deposit_hold").reduce((s, f) => s + f.amount_minor, 0);

  async function handleApprove(id: string) {
    await approvePayout(id);
    setActionFeedback(`Payout ${id} approved`);
    setTimeout(() => setActionFeedback(null), 3000);
  }

  async function handleReject(id: string) {
    if (!rejectReason) return;
    await rejectPayout(id, rejectReason);
    setRejectingId(null);
    setRejectReason("");
    setActionFeedback(`Payout ${id} rejected`);
    setTimeout(() => setActionFeedback(null), 3000);
  }

  const tabs: { key: FinanceTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "payouts", label: "Payouts" },
    { key: "reconciliation", label: "Reconciliation" },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-ink">Finance</h1>

      {actionFeedback && (
        <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-sm font-medium text-success">
          {actionFeedback}
        </div>
      )}

      <div className="flex gap-1 p-1 bg-primary-bg rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${tab === t.key ? "bg-card text-ink shadow-sm" : "text-ink-secondary hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Payments Received", value: fmt(totalPayments), sub: `From ${finance.filter(f => f.type === "payment").length} transactions` },
              { label: "Payouts Issued", value: fmt(totalPayouts), sub: `To ${new Set(finance.filter(f => f.type === "payout").map(f => f.guest_or_owner)).size} owners` },
              { label: "Deposits Held", value: fmt(totalHeld), sub: `${finance.filter(f => f.type === "deposit_hold").length} active holds` },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-xl border border-hairline bg-primary-bg">
                <p className="text-xs font-medium mb-1 text-ink-secondary">{s.label}</p>
                <p className="text-xl font-bold tabular-nums text-ink">{s.value}</p>
                <p className="text-xs text-ink-secondary">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {finance.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
                <div>
                  <p className="text-sm font-semibold text-ink">{f.guest_or_owner} · {f.property}</p>
                  <p className="text-xs text-ink-secondary">{f.date} · {f.ref}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-ink">{fmt(f.amount_minor)}</p>
                  <span className={`text-[11px] font-semibold ${f.status === "settled" || f.status === "paid" ? "text-success" : f.status === "held" ? "text-warning" : "text-primary"}`}>{f.type} · {f.status}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "payouts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-secondary">Pending payouts requiring approval before funds are released to owners.</p>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-warning/10 text-warning">{payouts.filter(p => p.status === "pending").length} pending</span>
          </div>

          {payouts.map((p) => (
            <div key={p.id} className="p-5 rounded-xl border border-hairline bg-card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink">{p.owner}</p>
                  <p className="text-xs text-ink-secondary">{p.owner_email}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${p.status === "pending" ? "bg-warning/10 text-warning" : p.status === "approved" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{p.status}</span>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center">
                {[
                  { label: "Period", value: p.period },
                  { label: "Units", value: `${p.units}` },
                  { label: "Nights", value: `${p.nights}` },
                  { label: "Payout", value: fmt(p.payout_minor) },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-mute mb-0.5">{m.label}</p>
                    <p className="text-sm font-bold tabular-nums text-ink">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-secondary bg-primary-bg rounded-lg p-3">
                <span>Revenue: {fmt(p.revenue_minor)}</span>
                <span className="text-mute">|</span>
                <span>Fee (15%): {fmt(p.fee_minor)}</span>
                <span className="text-mute">|</span>
                <span className="font-semibold text-ink">Net: {fmt(p.payout_minor)}</span>
              </div>

              {p.status === "pending" && (
                <div className="flex gap-3">
                  <button onClick={() => handleApprove(p.id)} className="flex-1 py-2.5 rounded-lg bg-success text-white text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer">Approve</button>
                  {rejectingId === p.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-line text-sm outline-none focus:border-danger"
                      />
                      <button onClick={() => handleReject(p.id)} className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-semibold hover:opacity-90 cursor-pointer">Confirm</button>
                      <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="px-3 py-2 rounded-lg border border-line text-sm text-ink-secondary cursor-pointer">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setRejectingId(p.id)} className="flex-1 py-2.5 rounded-lg border border-danger/30 text-danger text-sm font-semibold hover:bg-danger/5 transition-colors cursor-pointer">Reject</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "reconciliation" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-hairline bg-primary-bg">
              <p className="text-xs font-medium mb-1 text-ink-secondary">Matched</p>
              <p className="text-xl font-bold tabular-nums text-success">{fmt(reconciliation.matchedTotal)}</p>
              <p className="text-xs text-ink-secondary">{reconciliation.records.filter(r => r.matched).length} records</p>
            </div>
            <div className="p-4 rounded-xl border border-hairline bg-primary-bg">
              <p className="text-xs font-medium mb-1 text-ink-secondary">Unmatched</p>
              <p className="text-xl font-bold tabular-nums text-warning">{fmt(reconciliation.unmatchedTotal)}</p>
              <p className="text-xs text-ink-secondary">{reconciliation.records.filter(r => !r.matched).length} records</p>
            </div>
            <div className="p-4 rounded-xl border border-hairline bg-primary-bg">
              <p className="text-xs font-medium mb-1 text-ink-secondary">Reconciliation Rate</p>
              <p className="text-xl font-bold tabular-nums text-ink">
                {Math.round((reconciliation.matchedTotal / (reconciliation.matchedTotal + reconciliation.unmatchedTotal)) * 100)}%
              </p>
              <p className="text-xs text-ink-secondary">June 2026</p>
            </div>
          </div>

          <div className="space-y-2">
            {reconciliation.records.map((r) => (
              <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${r.matched ? "border-hairline hover:bg-primary-bg" : "border-warning/20 bg-warning/5"}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${r.matched ? "bg-success" : "bg-warning"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${r.type === "booking_charge" ? "bg-primary/10 text-primary" : r.type === "payout" ? "bg-success/10 text-success" : r.type === "deposit_hold" ? "bg-warning/10 text-warning" : r.type === "refund" ? "bg-danger/10 text-danger" : "bg-ink/10 text-ink-secondary"}`}>{r.type.replace("_", " ")}</span>
                      <span className="text-sm font-medium text-ink">{fmt(r.amount_minor)}</span>
                    </div>
                    <p className="text-xs text-ink-secondary">{r.date} · Stripe: {r.stripe_id}{r.booking_ref ? ` · ${r.booking_ref}` : ""}{r.property ? ` · ${r.property}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {r.matched ? (
                    <span className="text-[11px] font-medium text-success flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      Matched: {r.matched_with}
                    </span>
                  ) : (
                    <button
                      onClick={() => flagDiscrepancy(r.id)}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-lg border border-warning/30 text-warning hover:bg-warning/10 transition-colors cursor-pointer"
                    >
                      Flag discrepancy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
