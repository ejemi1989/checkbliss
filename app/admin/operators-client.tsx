"use client";

import { useState, useCallback, useEffect } from "react";
import { getAdminOperators } from "@/lib/data";
import { createOperator, updateOperator, suspendOperator } from "@/actions/operators";

function statusLabel(s: string) { return s.replace(/_/g, " "); }

export function AdminOperatorsView() {
  const [operators, setOperators] = useState(() => getAdminOperators());
  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [editOperator, setEditOperator] = useState<typeof operators[0] | null>(null);
  const [opForm, setOpForm] = useState({ name: "", email: "", city: "Lagos" });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const notify = useCallback((message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") { setOperatorModalOpen(false); setEditOperator(null); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function action<T>(key: string, fn: () => Promise<T>) {
    setPendingAction(key);
    try { return await fn(); }
    finally { setPendingAction(null); }
  }

  return (
    <div className="space-y-4">
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-ink">Operators</h1>
        <div className="flex items-center gap-x-3">
          <p className="text-sm font-semibold text-ink">{operators.length} operators · {operators.filter((o) => o.status === "active").length} active</p>
          <button onClick={() => setOperatorModalOpen(true)} className="text-sm font-medium px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer">+ Create Operator</button>
        </div>
      </div>

      {operators.map((op) => (
        <div key={op.id} className="flex items-center justify-between p-4 rounded-xl border border-hairline hover:bg-primary-bg transition-colors">
          <div className="flex items-center gap-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm ${op.status === "active" ? "bg-primary" : "bg-hairline"}`}>{op.name.split(" ").map((n) => n[0]).join("")}</div>
            <div>
              <p className="text-sm font-semibold text-ink">{op.name}</p>
              <p className="text-xs text-ink-secondary">{op.email} · {op.assigned_cities.join(", ")}</p>
              <div className="flex items-center gap-x-3 mt-1 text-xs text-ink-secondary">
                <span>{op.properties_count} properties</span><span>{op.verified_count} verified</span><span>Quality: {op.quality_score}%</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-[11px] font-semibold ${op.status === "active" ? "text-success" : op.status === "onboarding" ? "text-warning" : "text-danger"}`}>{statusLabel(op.status)}</span>
            <div className="flex gap-x-1 mt-2 justify-end">
              <button onClick={() => { setEditOperator(op); setOpForm({ name: op.name, email: op.email, city: op.assigned_cities[0] }); }} className="text-xs px-2 py-1 rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">Edit</button>
              <button
                disabled={pendingAction === `suspend-op-${op.id}`}
                onClick={() => { if (confirm(`Suspend ${op.name}?`)) action(`suspend-op-${op.id}`, async () => { const r = await suspendOperator({ operatorId: op.id }); if (r.ok) setOperators((prev) => prev.map((o) => o.id === op.id ? { ...o, status: "suspended" } : o)); notify(r.ok ? "Operator suspended." : r.message, r.ok ? "success" : "error"); }); }}
                className="text-xs px-2 py-1 rounded-lg hover:bg-red-50 text-danger cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >{pendingAction === `suspend-op-${op.id}` ? "..." : "Suspend"}</button>
            </div>
          </div>
        </div>
      ))}

      {/* create operator modal */}
      {operatorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOperatorModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Create Operator</h3>
              <button onClick={() => setOperatorModalOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary">Full Name</label>
                <input id="op-name" type="text" placeholder="e.g. Funke Adeyemi" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Email</label>
                <input id="op-email" type="email" placeholder="operator@checkinbliss.com" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Assigned Cities</label>
                <select id="op-cities" defaultValue="Lagos" className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none text-ink">
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
                  <option value="Port Harcourt">Port Harcourt</option>
                  <option value="Lagos+Abuja">Lagos + Abuja</option>
                  <option value="All">All cities</option>
                </select>
              </div>
              <button
                disabled={pendingAction === "create-operator"}
                onClick={() => action("create-operator", async () => {
                  const name = (document.getElementById("op-name") as HTMLInputElement)?.value;
                  const email = (document.getElementById("op-email") as HTMLInputElement)?.value;
                  const citiesRaw = (document.getElementById("op-cities") as HTMLSelectElement)?.value;
                  if (!name || !email) { notify("Name and email required", "error"); return; }
                  const cities = citiesRaw === "All" ? ["Lagos", "Abuja", "Port Harcourt"] : citiesRaw === "Lagos+Abuja" ? ["Lagos", "Abuja"] : [citiesRaw];
                  const r = await createOperator({ name, email, assignedCities: cities });
                  if (r.ok && r.data) setOperators((prev) => [r.data!, ...prev]);
                  notify(r.ok ? `Operator ${name} created.` : r.message, r.ok ? "success" : "error");
                  if (r.ok) setOperatorModalOpen(false);
                })}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >{pendingAction === "create-operator" ? "Creating..." : "Create Operator"}</button>
            </div>
          </div>
        </div>
      )}

      {/* edit operator modal */}
      {editOperator && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditOperator(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-modalIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-ink">Edit Operator</h3>
              <button onClick={() => setEditOperator(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-bg text-ink-secondary cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary">Full Name</label>
                <input type="text" value={opForm.name} onChange={(e) => setOpForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Email</label>
                <input type="email" value={opForm.email} onChange={(e) => setOpForm((f) => ({ ...f, email: e.target.value }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none focus:border-primary text-ink" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-secondary">Assigned City</label>
                <select value={opForm.city} onChange={(e) => setOpForm((f) => ({ ...f, city: e.target.value }))} className="w-full border border-hairline rounded-xl px-4 py-2.5 text-sm mt-1 outline-none text-ink">
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
                  <option value="Port Harcourt">Port Harcourt</option>
                </select>
              </div>
              <button
                disabled={pendingAction === `edit-operator-${editOperator.id}`}
                onClick={() => action(`edit-operator-${editOperator.id}`, async () => {
                  if (!opForm.name || !opForm.email) { notify("Name and email required", "error"); return; }
                  const r = await updateOperator({ operatorId: editOperator.id, name: opForm.name, email: opForm.email, assignedCities: [opForm.city] });
                  if (r.ok) setOperators((prev) => prev.map((o) => o.id === editOperator.id ? { ...o, name: opForm.name, email: opForm.email, assigned_cities: [opForm.city], city: opForm.city } : o));
                  notify(r.ok ? "Operator updated." : r.message, r.ok ? "success" : "error");
                  if (r.ok) setEditOperator(null);
                })}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait border-none"
              >{pendingAction === `edit-operator-${editOperator.id}` ? "Saving..." : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
