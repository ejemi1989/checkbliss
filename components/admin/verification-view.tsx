"use client";

import { useState } from "react";
import { getVerifications, getAdminProperties } from "@/lib/data";
import { logVerification } from "@/actions/verification";

interface Props {
  notify: (message: string, type?: "success" | "error") => void;
}

export function VerificationView({ notify }: Props) {
  const [records, setRecords] = useState(() => getVerifications());
  const [allProperties] = useState(() => getAdminProperties());
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ propertyId: "", notes: "", photos: 0 });

  async function action<T>(key: string, fn: () => Promise<T>) {
    setPendingAction(key);
    try { return await fn(); }
    finally { setPendingAction(null); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-ink">{records.length} verification records</p>
        <button onClick={() => { setCreateOpen(true); setForm({ propertyId: allProperties[0]?.id ?? "", notes: "", photos: 0 }); }} className="text-sm font-medium px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer">+ Log Verification</button>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-ink-secondary text-center py-8">No verification records</p>
      ) : (
        records.map((r) => (
          <div key={r.id} className="bg-white border border-hairline rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-x-2">
                  <h3 className="text-base font-bold text-ink">{r.property_name}</h3>
                  <span className={`text-[11px] font-semibold ${r.status === "complete" ? "text-success" : "text-primary"}`}>{r.status}</span>
                </div>
                <p className="text-xs mt-1 text-ink-secondary">{r.date} · {r.photos} photos</p>
                {r.notes && <p className="text-sm mt-2 text-ink-secondary">{r.notes}</p>}
              </div>
            </div>
          </div>
        ))
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Log Verification</h3>
              <button onClick={() => setCreateOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary">Property</label>
                <select value={form.propertyId} onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink">
                  {allProperties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Photos Count</label>
                <input type="number" min={0} value={form.photos} onChange={(e) => setForm((f) => ({ ...f, photos: parseInt(e.target.value) || 0 }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Inspection findings, condition notes..." className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink resize-none font-sans" />
              </div>
              <button
                disabled={pendingAction === "log-verification"}
                onClick={() => action("log-verification", async () => {
                  const r = await logVerification({ propertyId: form.propertyId, notes: form.notes || undefined, photos: form.photos });
                  if (r.ok) {
                    const prop = allProperties.find((p) => p.id === form.propertyId);
                    setRecords((prev) => [{ id: `V${Date.now()}`, property_name: prop?.name ?? "Unknown", date: new Date().toISOString().slice(0, 10), status: "complete", photos: form.photos, notes: form.notes }, ...prev]);
                  }
                  notify(r.ok ? "Verification logged." : r.message, r.ok ? "success" : "error");
                  if (r.ok) setCreateOpen(false);
                })}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait border-none"
              >{pendingAction === "log-verification" ? "Logging..." : "Log Verification"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
