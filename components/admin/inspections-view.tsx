"use client";

import { useState } from "react";
import { getInspections } from "@/lib/data";
import { startInspection, completeInspection } from "@/actions/inspections";
import { ConfirmDialog } from "@/components/dialog";

interface Props {
  notify: (message: string, type?: "success" | "error") => void;
}

export function InspectionsView({ notify }: Props) {
  const [inspections, setInspections] = useState(() => getInspections());
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "start" | "complete";
    inspectionId: string;
  } | null>(null);

  const pendingCount = inspections.filter((i) => i.status === "pending").length;
  const inProgressCount = inspections.filter((i) => i.status === "in_progress").length;
  const completedCount = inspections.filter((i) => i.status === "completed").length;
  const escalatedCount = inspections.filter((i) => i.status === "escalated").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Pending", value: String(pendingCount), color: "text-primary" },
          { label: "In Progress", value: String(inProgressCount), color: "text-warning" },
          { label: "Completed", value: String(completedCount), color: "text-success" },
          { label: "Escalated", value: String(escalatedCount), color: "text-danger" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-hairline bg-primary-bg">
            <p className="text-xs font-medium text-ink-secondary">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {inspections.length === 0 ? (
        <p className="text-sm text-ink-secondary text-center py-8">No inspections found</p>
      ) : (
        inspections.map((ins) => (
          <div key={ins.id} className="bg-white border border-hairline rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-x-2">
                  <h3 className="text-base font-bold text-ink">{ins.property_name}</h3>
                  <span className={`text-[11px] font-semibold ${
                    ins.status === "pending" ? "text-primary" :
                    ins.status === "in_progress" ? "text-warning" :
                    ins.status === "completed" ? "text-success" : "text-danger"
                  }`}>{ins.status.replace(/_/g, " ")}</span>
                </div>
                <p className="text-xs mt-1 text-ink-secondary">
                  Guest: {ins.guest_name} · Unit: {ins.unit} · Checkout: {ins.checkout_date} at {ins.checkout_time}
                </p>
                {ins.confirmed_checkout_time && (
                  <p className="text-xs text-ink-secondary mt-0.5">Confirmed checkout: {ins.confirmed_checkout_time}</p>
                )}
              </div>
            </div>
            <div className="flex gap-x-2 mt-4">
              {ins.status === "pending" && (
                <button
                  disabled={pendingAction === `start-${ins.id}`}
                  onClick={() => setConfirmDialog({ type: "start", inspectionId: ins.id })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-primary text-primary hover:bg-primary-bg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >{pendingAction === `start-${ins.id}` ? "Starting..." : "Start Inspection"}</button>
              )}
              {ins.status === "in_progress" && (
                <button
                  disabled={pendingAction === `complete-${ins.id}`}
                  onClick={() => setConfirmDialog({ type: "complete", inspectionId: ins.id })}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-success text-success hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >{pendingAction === `complete-${ins.id}` ? "Completing..." : "Complete Inspection"}</button>
              )}
            </div>
          </div>
        ))
      )}

      {confirmDialog?.type === "start" && (
        <ConfirmDialog
          open
          title="Start Inspection"
          message={`Begin inspection for ${inspections.find((i) => i.id === confirmDialog.inspectionId)?.property_name}?`}
          confirmLabel="Start"
          onConfirm={async () => {
            const id = confirmDialog.inspectionId;
            setPendingAction(`start-${id}`);
            const r = await startInspection({ inspectionId: id });
            if (r.ok) setInspections((prev) => prev.map((i) => i.id === id ? { ...i, status: "in_progress" } : i));
            notify(r.ok ? "Inspection started." : r.message, r.ok ? "success" : "error");
            setPendingAction(null);
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {confirmDialog?.type === "complete" && (
        <ConfirmDialog
          open
          title="Complete Inspection"
          message={`Mark inspection for ${inspections.find((i) => i.id === confirmDialog.inspectionId)?.property_name} as complete?`}
          confirmLabel="Complete"
          placeholder="Optional notes on condition..."
          onConfirm={async (notes) => {
            const id = confirmDialog.inspectionId;
            setPendingAction(`complete-${id}`);
            const r = await completeInspection({ inspectionId: id, notes });
            if (r.ok) setInspections((prev) => prev.map((i) => i.id === id ? { ...i, status: "completed" } : i));
            notify(r.ok ? "Inspection completed." : r.message, r.ok ? "success" : "error");
            setPendingAction(null);
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
