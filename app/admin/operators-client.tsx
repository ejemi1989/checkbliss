"use client";

import { useState, useCallback, useEffect } from "react";
import { getAdminOperators } from "@/lib/data";
import { createOperator, updateOperator, suspendOperator } from "@/actions/operators";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { DataList } from "@/components/dashboard/data-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Icon } from "@/components/icons";

function statusLabel(s: string) { return s.replace(/_/g, " "); }
function statusVariant(s: string): "success" | "warning" | "danger" | "accent" {
  if (s === "active") return "success";
  if (s === "onboarding") return "warning";
  return "danger";
}
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2);
}

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

  const activeCount = operators.filter((o) => o.status === "active").length;

  return (
    <div>
      {notification && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-xl text-sm font-medium animate-slideIn shadow-lg ${notification.type === "success" ? "bg-success text-white" : "bg-danger text-white"}`}>
          {notification.message}
        </div>
      )}

      <PageHeader
        eyebrow="City teams"
        title="Operators"
        description="City operators on shift across Lagos, Abuja, Port Harcourt. Create new accounts, edit assignments, suspend access."
        meta={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] rounded-full border border-primary/30 text-primary-dark bg-primary-bg px-2.5 py-1">
              {activeCount} active
            </span>
            <button onClick={() => setOperatorModalOpen(true)} className="text-sm font-sans font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none">
              + Create operator
            </button>
          </div>
        }
      />

      <Section eyebrow="Roster" count={operators.length}>
        {operators.length === 0 ? (
          <EmptyState
            title="No operators yet"
            body="Create an operator to assign them a city and start inspections."
            icon={<Icon.UserCog size={20} />}
            action={
              <button onClick={() => setOperatorModalOpen(true)} className="text-sm font-sans font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer border-none">
                + Create operator
              </button>
            }
          />
        ) : (
          <DataList
            items={operators.map((op) => ({
              id: op.id,
              primary: (
                <span className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-sans font-semibold text-xs ${op.status === "active" ? "bg-primary" : "bg-ink-tertiary"}`}>
                    {initials(op.name)}
                  </span>
                  <span>{op.name}</span>
                  <StatusPill variant={statusVariant(op.status)}>{statusLabel(op.status)}</StatusPill>
                </span>
              ),
              secondary: `${op.email} · ${op.assigned_cities.join(", ")} · ${op.properties_count} properties · ${op.verified_count} verified · Quality ${op.quality_score}%`,
              trailing: (
                <div className="flex gap-1">
                  <button onClick={() => { setEditOperator(op); setOpForm({ name: op.name, email: op.email, city: op.assigned_cities[0] }); }} className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg hover:bg-bone-secondary text-ink-secondary cursor-pointer border border-hairline bg-canvas">
                    Edit
                  </button>
                  <button
                    disabled={pendingAction === `suspend-op-${op.id}`}
                    onClick={() => { if (confirm(`Suspend ${op.name}?`)) action(`suspend-op-${op.id}`, async () => { const r = await suspendOperator({ operatorId: op.id }); if (r.ok) setOperators((prev) => prev.map((o) => o.id === op.id ? { ...o, status: "suspended" } : o)); notify(r.ok ? "Operator suspended." : r.message, r.ok ? "success" : "error"); }); }}
                    className="text-xs font-sans font-semibold px-3 py-1.5 rounded-lg hover:bg-error/5 text-error cursor-pointer border border-error/30 bg-canvas disabled:opacity-50 disabled:cursor-wait"
                  >{pendingAction === `suspend-op-${op.id}` ? "..." : "Suspend"}</button>
                </div>
              ),
            }))}
          />
        )}
      </Section>

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
