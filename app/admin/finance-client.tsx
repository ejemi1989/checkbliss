"use client";

import { useState } from "react";
import { formatMinor } from "@/lib/currency";
import { getAdminFinance, getPendingPayouts, getReconciliation } from "@/lib/data";
import { approvePayout, rejectPayout, flagDiscrepancy } from "@/actions/finance";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { StatBlock, StatGrid } from "@/components/dashboard/stat-block";
import { DataList } from "@/components/dashboard/data-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Icon } from "@/components/icons";

function fmt(n: number) { return formatMinor(n); }

type FinanceTab = "overview" | "payouts" | "reconciliation";

export function AdminFinanceView() {
  const [finance] = useState(() => getAdminFinance());
  const [payouts] = useState(() => getPendingPayouts());
  const [reconciliation] = useState(() => getReconciliation());
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
    <div>
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-primary-bg border border-primary/20 text-sm font-medium text-primary-dark">
          {actionFeedback}
        </div>
      )}

      <PageHeader
        eyebrow="Treasury"
        title="Finance"
        description="Payments, payouts, deposit holds, and reconciliation. Source of truth for money movement on the platform."
      />

      {/* Sub-tab nav */}
      <div className="flex gap-1 p-1 bg-bone-secondary rounded-xl w-fit mb-10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-sans font-medium transition-colors cursor-pointer border-none ${tab === t.key ? "bg-canvas text-ink shadow-sm" : "text-ink-secondary hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-10">
          <Section eyebrow="Headline numbers">
            <StatGrid>
              <StatBlock label="Payments Received" value={fmt(totalPayments)} hint={`From ${finance.filter(f => f.type === "payment").length} transactions`} accent />
              <StatBlock label="Payouts Issued" value={fmt(totalPayouts)} hint={`To ${new Set(finance.filter(f => f.type === "payout").map(f => f.guest_or_owner)).size} owners`} />
              <StatBlock label="Deposits Held" value={fmt(totalHeld)} hint={`${finance.filter(f => f.type === "deposit_hold").length} active holds`} />
            </StatGrid>
          </Section>

          <Section eyebrow="Ledger" count={finance.length}>
            <DataList
              items={finance.map((f) => ({
                id: f.id,
                primary: (
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-base text-ink">{f.guest_or_owner}</span>
                    <span className="text-ink-tertiary">·</span>
                    <span className="text-ink-secondary font-normal">{f.property}</span>
                  </span>
                ),
                secondary: `${f.date} · ${f.ref}`,
                meta: fmt(f.amount_minor),
                trailing: <span className={`text-[10px] font-sans font-semibold uppercase tracking-[0.08em] ${f.status === "settled" || f.status === "paid" ? "text-success" : f.status === "held" ? "text-warning" : "text-primary"}`}>{f.type} · {f.status}</span>,
              }))}
            />
          </Section>
        </div>
      )}

      {tab === "payouts" && (
        <div className="space-y-8">
          <Section eyebrow="Pending payouts" description="Pending payouts requiring approval before funds are released to owners.">
            {payouts.length === 0 ? (
              <EmptyState
                title="No payouts queued"
                body="Payouts accumulate after each booking completes its inspection + settlement window."
                icon={<Icon.Coins size={20} />}
              />
            ) : (
              <div className="space-y-6">
                {payouts.map((p) => (
                  <article key={p.id} className="pb-6 mb-6 border-b border-hairline last:border-b-0 last:mb-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                      <div>
                        <h3 className="font-display text-xl tracking-tight text-ink">{p.owner}</h3>
                        <p className="text-xs text-ink-secondary mt-1 font-sans">{p.owner_email}</p>
                      </div>
                      <StatusPill variant={p.status === "pending" ? "warning" : p.status === "approved" ? "success" : "danger"}>
                        {p.status}
                      </StatusPill>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4 lg:divide-x lg:divide-hairline mb-5">
                      {[
                        { label: "Period", value: p.period },
                        { label: "Units", value: `${p.units}` },
                        { label: "Nights", value: `${p.nights}` },
                        { label: "Payout", value: fmt(p.payout_minor) },
                      ].map((m, i) => (
                        <div key={m.label} className={i > 0 ? "lg:pl-8" : ""}>
                          <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">{m.label}</p>
                          <p className="font-display text-[1.5rem] leading-none tracking-tight tabular-nums text-ink mt-2">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-secondary bg-bone-secondary rounded-lg p-3 font-sans">
                      <span>Revenue: <span className="font-semibold text-ink">{fmt(p.revenue_minor)}</span></span>
                      <span className="text-ink-tertiary">·</span>
                      <span>Fee (15%): <span className="font-semibold text-ink">{fmt(p.fee_minor)}</span></span>
                      <span className="text-ink-tertiary">·</span>
                      <span className="font-semibold text-primary">Net: {fmt(p.payout_minor)}</span>
                    </div>

                    {p.status === "pending" && (
                      <div className="flex gap-3 mt-4 flex-wrap">
                        <button onClick={() => handleApprove(p.id)} className="flex-1 min-w-[140px] py-2.5 rounded-lg bg-primary text-white text-sm font-sans font-semibold hover:bg-primary-dark transition-colors cursor-pointer border-none">Approve</button>
                        {rejectingId === p.id ? (
                          <div className="flex-1 min-w-[260px] flex gap-2">
                            <input
                              type="text"
                              placeholder="Reason for rejection..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border border-hairline text-sm outline-none focus:border-error bg-canvas font-sans"
                            />
                            <button onClick={() => handleReject(p.id)} className="px-4 py-2 rounded-lg bg-error text-white text-sm font-sans font-semibold hover:opacity-90 cursor-pointer border-none">Confirm</button>
                            <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="px-3 py-2 rounded-lg border border-hairline text-sm text-ink-secondary cursor-pointer bg-canvas font-sans">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setRejectingId(p.id)} className="flex-1 min-w-[140px] py-2.5 rounded-lg border border-error/30 text-error text-sm font-sans font-semibold hover:bg-error/5 transition-colors cursor-pointer bg-transparent">Reject</button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {tab === "reconciliation" && (
        <div className="space-y-10">
          <Section eyebrow="Headline numbers" description="Stripe ↔ platform ledger — match rate for June 2026.">
            <StatGrid>
              <StatBlock label="Matched" value={fmt(reconciliation.matchedTotal)} hint={`${reconciliation.records.filter(r => r.matched).length} records`} />
              <StatBlock label="Unmatched" value={fmt(reconciliation.unmatchedTotal)} hint={`${reconciliation.records.filter(r => !r.matched).length} records`} accent />
              <StatBlock
                label="Reconciliation rate"
                value={`${Math.round((reconciliation.matchedTotal / (reconciliation.matchedTotal + reconciliation.unmatchedTotal)) * 100)}%`}
                hint="June 2026"
              />
            </StatGrid>
          </Section>

          <Section eyebrow="Reconciliation log" count={reconciliation.records.length}>
            {reconciliation.records.length === 0 ? (
              <EmptyState
                title="No reconciliation records"
                body="Stripe events will be matched against platform bookings here."
                icon={<Icon.List size={20} />}
              />
            ) : (
              <DataList
                items={reconciliation.records.map((r) => ({
                  id: r.id,
                  primary: (
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-base tabular-nums text-ink">{fmt(r.amount_minor)}</span>
                      <StatusPill variant={r.type === "booking_charge" ? "accent" : r.type === "payout" ? "success" : r.type === "deposit_hold" ? "warning" : r.type === "refund" ? "danger" : "neutral"}>
                        {r.type.replace("_", " ")}
                      </StatusPill>
                    </span>
                  ),
                  secondary: `${r.date} · Stripe: ${r.stripe_id}${r.booking_ref ? ` · ${r.booking_ref}` : ""}${r.property ? ` · ${r.property}` : ""}`,
                  trailing: r.matched ? (
                    <span className="text-[11px] font-sans font-medium text-success flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      Matched: {r.matched_with}
                    </span>
                  ) : (
                    <button
                      onClick={() => flagDiscrepancy(r.id)}
                      className="text-[11px] font-sans font-medium px-3 py-1.5 rounded-lg border border-warning/30 text-warning hover:bg-warning/10 transition-colors cursor-pointer bg-transparent"
                    >
                      Flag discrepancy
                    </button>
                  ),
                }))}
              />
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
