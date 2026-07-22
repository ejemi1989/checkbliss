"use client";

import { useState, useCallback, useEffect } from "react";
import { formatMinor } from "@/lib/currency";
import { getAdminClaims } from "@/lib/data";
import { decideClaim } from "@/actions/claims";
import type { DamageClaim } from "@/lib/types";

function fmt(n: number) { return formatMinor(n); }
function statusLabel(s: string) { return s.replace(/_/g, " "); }

type QueueFilter = "all" | "pending" | "decided" | "disputed";

const I = {
  gavel: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 21h12" /><path d="M6.5 7.5 9 5l3 3-2.5 2.5" /><path d="M15 10l-3 3" /><path d="M18 13l-3 3" /><path d="M21 16l-3 3" /></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  alert: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
};

function decisionBadge(c: DamageClaim) {
  const base = "text-[10px] font-sans font-semibold uppercase tracking-[0.5px] rounded-full px-2.5 py-0.5";
  if (c.dispute_status !== "none") {
    return <span className={`${base} bg-danger/10 text-danger`}>Disputed</span>;
  }
  switch (c.admin_decision) {
    case "approved": return <span className={`${base} bg-success/10 text-success`}>Approved</span>;
    case "adjusted": return <span className={`${base} bg-warning/10 text-warning`}>Adjusted</span>;
    case "rejected": return <span className={`${base} bg-ink-secondary/10 text-ink-secondary`}>Rejected</span>;
    case "pending": return <span className={`${base} bg-primary/10 text-primary`}>Pending</span>;
    default: return null;
  }
}

export function AdminClaimsView() {
  const [claims, setClaims] = useState<DamageClaim[]>(() => getAdminClaims());
  const [claimModal, setClaimModal] = useState<DamageClaim | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("all");

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setClaimModal(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function doAction<T>(key: string, fn: () => Promise<T>) {
    setPendingAction(key);
    try { return await fn(); }
    finally { setPendingAction(null); }
  }

  const pending = claims.filter((c) => c.admin_decision === "pending" && c.dispute_status === "none");
  const disputed = claims.filter((c) => c.dispute_status !== "none");
  const decided = claims.filter((c) => c.admin_decision !== "pending" && c.dispute_status === "none");

  const displayed = filter === "pending" ? pending : filter === "disputed" ? disputed : filter === "decided" ? decided : claims;

  return (
    <div className="space-y-4">
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold text-ink">Damage Claims</h1>
        <div className="flex items-center gap-x-3">
          {disputed.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-sans font-semibold text-danger">
              {I.alert} {disputed.length} dispute{disputed.length > 1 ? "s" : ""}
            </span>
          )}
          <p className="text-sm font-medium text-ink-secondary">{pending.length} pending of {claims.length}</p>
        </div>
      </div>

      {/* queue tabs */}
      <div className="flex gap-x-2 border-b border-hairline pb-3 mb-2">
        {([
          { key: "all" as QueueFilter, label: "All", count: claims.length },
          { key: "pending" as QueueFilter, label: "Pending Review", count: pending.length },
          { key: "disputed" as QueueFilter, label: "Disputes", count: disputed.length },
          { key: "decided" as QueueFilter, label: "Decided", count: decided.length },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-xs font-sans font-semibold transition-colors cursor-pointer ${
              filter === tab.key ? "bg-primary text-white" : "bg-bone text-ink-secondary hover:bg-hairline"
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${filter === tab.key ? "bg-white/20 text-white" : "bg-ink/5 text-ink-secondary"}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {displayed.length === 0 && (
        <div className="text-center py-16 text-ink-secondary bg-white rounded-xl border border-hairline">
          {I.gavel}
          <p className="text-sm mt-3">{filter === "disputed" ? "No active disputes" : filter === "pending" ? "No claims pending review" : "No claims in this queue"}</p>
          <p className="text-xs mt-1">Claims submitted by operators will appear here for admin adjudication.</p>
        </div>
      )}

      {displayed.map((c) => (
        <div key={c.id} className={`bg-white border rounded-xl p-5 ${c.dispute_status !== "none" ? "border-danger/20 bg-danger/2" : "border-hairline"}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-x-2">
                <h3 className="text-base font-bold text-ink">{c.property_name}</h3>
                {decisionBadge(c)}
                {c.dispute_status !== "none" && (
                  <span className="flex items-center gap-1 text-[10px] font-sans font-semibold text-danger">
                    {I.shield} Dispute open
                  </span>
                )}
              </div>
              <p className="text-xs mt-1 text-ink-secondary">Guest: {c.guest_name} · {c.stay_dates} · Ref: {c.booking_ref}</p>
              <p className="text-sm mt-2 text-ink">{c.description}</p>
              {c.operator_notes && (
                <p className="text-xs mt-1 text-ink-secondary italic">Operator note: &ldquo;{c.operator_notes}&rdquo;</p>
              )}
              <div className="flex items-center gap-x-3 mt-2 text-xs text-ink-secondary">
                <span>{c.photo_count} photos</span>
                <span>Submitted {c.submitted_at.slice(0, 10)}</span>
                {c.estimated_cost_minor > 0 && <span className="font-semibold tabular-nums text-primary">{fmt(c.estimated_cost_minor)} claimed</span>}
                {c.adjusted_amount_minor && <span className="font-semibold tabular-nums text-warning">{fmt(c.adjusted_amount_minor)} adjusted</span>}
                {c.decided_at && <span>Decided {c.decided_at.slice(0, 10)}</span>}
              </div>
            </div>
          </div>

          {/* pending review actions */}
          {c.admin_decision === "pending" && c.dispute_status === "none" && (
            <div className="flex gap-x-2 mt-4">
              <button
                disabled={pendingAction === `claim-${c.id}-approve`}
                onClick={() => doAction(`claim-${c.id}-approve`, async () => { const r = await decideClaim({ claimId: c.id, decision: "approve" }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, admin_decision: "approved" as const } : cl)); notify(r.ok ? "Claim approved." : r.message, r.ok ? "success" : "error"); })}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50"
              >{pendingAction === `claim-${c.id}-approve` ? "..." : "Approve"}</button>
              <button
                disabled={pendingAction === `claim-${c.id}-adjust`}
                onClick={() => { const n = prompt("Enter adjusted amount (£):", String(c.estimated_cost_minor / 100)); if (n && !isNaN(Number(n))) doAction(`claim-${c.id}-adjust`, async () => { const r = await decideClaim({ claimId: c.id, decision: "adjust", amountMinor: Math.round(Number(n) * 100) }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, admin_decision: "adjusted" as const, adjusted_amount_minor: Math.round(Number(n) * 100) } : cl)); notify(r.ok ? "Claim adjusted." : r.message, r.ok ? "success" : "error"); }); }}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-warning text-warning hover:bg-warning/10 transition-colors cursor-pointer disabled:opacity-50"
              >Adjust</button>
              <button
                disabled={pendingAction === `claim-${c.id}-reject`}
                onClick={() => doAction(`claim-${c.id}-reject`, async () => { const r = await decideClaim({ claimId: c.id, decision: "reject" }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, admin_decision: "rejected" as const } : cl)); notify(r.ok ? "Claim rejected." : r.message, r.ok ? "success" : "error"); })}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-hairline text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50"
              >Reject</button>
              <button onClick={() => setClaimModal(c)} className="px-4 py-2 rounded-xl text-sm font-medium border border-hairline text-ink-secondary hover:bg-bone transition-colors cursor-pointer">Details</button>
            </div>
          )}

          {/* disputed — final adjudication */}
          {c.dispute_status !== "none" && (
            <div className="flex gap-x-2 mt-4">
              <div className="flex-1 p-3 rounded-lg bg-danger/5 border border-danger/10">
                <p className="text-xs font-sans font-medium text-danger mb-1">{I.alert} Guest Disputed</p>
                <p className="text-xs text-ink-secondary">This claim requires final adjudication. Review the evidence, operator notes, and guest dispute reason before reaching a final decision.</p>
              </div>
              <div className="flex gap-x-2 shrink-0">
                <button
                  disabled={pendingAction === `dispute-${c.id}-uphold`}
                  onClick={() => doAction(`dispute-${c.id}-uphold`, async () => {
                    const r = await decideClaim({ claimId: c.id, decision: "approve" });
                    if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, dispute_status: "resolved" as const, admin_decision: "approved" as const } : cl));
                    notify(r.ok ? "Claim upheld. Deposit will be captured." : r.message, r.ok ? "success" : "error");
                  })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer bg-primary text-white hover:bg-lagoon transition-colors disabled:opacity-50"
                >Uphold</button>
                <button
                  disabled={pendingAction === `dispute-${c.id}-reverse`}
                  onClick={() => doAction(`dispute-${c.id}-reverse`, async () => {
                    const r = await decideClaim({ claimId: c.id, decision: "reject" });
                    if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === c.id ? { ...cl, dispute_status: "resolved" as const, admin_decision: "rejected" as const } : cl));
                    notify(r.ok ? "Claim reversed. Deposit will be released." : r.message, r.ok ? "success" : "error");
                  })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border border-danger text-danger hover:bg-danger/5 transition-colors disabled:opacity-50"
                >Reverse</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* claim detail modal */}
      {claimModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setClaimModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Claim — {claimModal.property_name}</h3>
              <button onClick={() => setClaimModal(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-bone text-ink-secondary cursor-pointer">{I.x}</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                { label: "Property", value: claimModal.property_name },
                { label: "Guest", value: claimModal.guest_name },
                { label: "Booking Reference", value: claimModal.booking_ref },
                { label: "Stay Dates", value: claimModal.stay_dates },
                { label: "Status", value: `${statusLabel(claimModal.admin_decision)}${claimModal.dispute_status !== "none" ? " · Disputed" : ""}` },
                { label: "Submitted", value: claimModal.submitted_at.slice(0, 10) },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-xl bg-bone/50">
                  <span className="text-xs font-medium text-ink-secondary">{f.label}</span>
                  <p className="text-sm font-semibold mt-0.5 text-ink">{f.value}</p>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-bone/50 mb-4">
              <span className="text-xs font-medium text-ink-secondary">Description</span>
              <p className="text-sm mt-1 text-ink">{claimModal.description}</p>
            </div>
            {claimModal.operator_notes && (
              <div className="p-3 rounded-xl bg-bone/50 mb-4">
                <span className="text-xs font-medium text-ink-secondary">Operator Notes</span>
                <p className="text-sm mt-1 text-ink">{claimModal.operator_notes}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {claimModal.estimated_cost_minor > 0 && (
                <div className="p-3 rounded-xl bg-primary-bg">
                  <span className="text-xs font-medium text-ink-secondary">Claimed Amount</span>
                  <p className="text-lg font-bold mt-1 tabular-nums text-primary">{fmt(claimModal.estimated_cost_minor)}</p>
                </div>
              )}
              {claimModal.adjusted_amount_minor && (
                <div className="p-3 rounded-xl bg-warning/10">
                  <span className="text-xs font-medium text-ink-secondary">Adjusted Amount</span>
                  <p className="text-lg font-bold mt-1 tabular-nums text-warning">{fmt(claimModal.adjusted_amount_minor)}</p>
                </div>
              )}
            </div>
            {claimModal.admin_decision === "pending" && claimModal.dispute_status === "none" && (
              <div className="flex gap-x-2">
                <button
                  disabled={pendingAction === `modal-${claimModal.id}-approve`}
                  onClick={() => doAction(`modal-${claimModal.id}-approve`, async () => { const r = await decideClaim({ claimId: claimModal.id, decision: "approve" }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === claimModal.id ? { ...cl, admin_decision: "approved" as const } : cl)); notify(r.ok ? "Claim approved." : r.message); setClaimModal(null); })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50"
                >Approve</button>
                <button
                  disabled={pendingAction === `modal-${claimModal.id}-adjust`}
                  onClick={() => { const n = prompt("Adjusted amount (£):", String(claimModal.estimated_cost_minor / 100)); if (n && !isNaN(Number(n))) doAction(`modal-${claimModal.id}-adjust`, async () => { const r = await decideClaim({ claimId: claimModal.id, decision: "adjust", amountMinor: Math.round(Number(n) * 100) }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === claimModal.id ? { ...cl, admin_decision: "adjusted" as const, adjusted_amount_minor: Math.round(Number(n) * 100) } : cl)); notify(r.ok ? "Claim adjusted." : r.message); setClaimModal(null); }); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-warning text-warning hover:bg-warning/10 transition-colors cursor-pointer disabled:opacity-50"
                >Adjust</button>
                <button
                  disabled={pendingAction === `modal-${claimModal.id}-reject`}
                  onClick={() => doAction(`modal-${claimModal.id}-reject`, async () => { const r = await decideClaim({ claimId: claimModal.id, decision: "reject" }); if (r.ok) setClaims((prev) => prev.map((cl) => cl.id === claimModal.id ? { ...cl, admin_decision: "rejected" as const } : cl)); notify(r.ok ? "Claim rejected." : r.message); setClaimModal(null); })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-hairline text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50"
                >Reject</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
