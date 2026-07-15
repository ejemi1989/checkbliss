"use client";

import { useState } from "react";
import { getCurationQueue, getPipeline } from "@/lib/data";
import { decideCuration } from "@/actions/curation";
import { formatMinor } from "@/lib/currency";
import { ConfirmDialog } from "@/components/dialog";

interface Props {
  notify: (message: string, type?: "success" | "error") => void;
}

export function CurationView({ notify }: Props) {
  const [items, setItems] = useState(() => getCurationQueue());
  const [pipeline] = useState(() => getPipeline());
  const pendingAction = null;
  const [confirm, setConfirm] = useState<{
    type: "approve" | "reject" | "request_changes";
    itemId: string;
    itemName: string;
  } | null>(null);

  const pipelineCounts = {
    draft: pipeline.filter((p) => p.status === "draft").length,
    pending: pipeline.filter((p) => p.status === "pending_review").length,
    approved: pipeline.filter((p) => p.status === "approved").length,
    suspended: pipeline.filter((p) => p.status === "suspended").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Draft", value: String(pipelineCounts.draft), color: "text-ink-secondary" },
          { label: "Pending Review", value: String(pipelineCounts.pending), color: "text-primary" },
          { label: "Approved", value: String(pipelineCounts.approved), color: "text-success" },
          { label: "Suspended", value: String(pipelineCounts.suspended), color: "text-danger" },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-hairline bg-primary-bg">
            <p className="text-xs font-medium text-ink-secondary">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-ink">Curation Queue ({items.length} pending)</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-secondary text-center py-8">No pending items in curation queue</p>
      ) : (
        items.map((item) => (
          <div key={item.id} className="bg-white border border-hairline rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-x-2">
                  <h3 className="text-base font-bold text-ink">{item.name}</h3>
                  <span className="text-[11px] font-semibold text-primary">{item.type}</span>
                </div>
                <p className="text-xs mt-1 text-ink-secondary">
                  {item.city} · {item.bedrooms} bed · {item.bathrooms} bath · Up to {item.max_guests} guests · {formatMinor(item.price_minor)}/night
                </p>
                <p className="text-xs text-ink-secondary mt-0.5">Submitted {item.submitted_at}</p>
              </div>
            </div>
            <div className="flex gap-x-2 mt-4">
              <button
                disabled={pendingAction === `approve-${item.id}`}
                onClick={() => setConfirm({ type: "approve", itemId: item.id, itemName: item.name })}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-success text-success hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >{pendingAction === `approve-${item.id}` ? "Processing..." : "Approve"}</button>
              <button
                disabled={pendingAction === `reject-${item.id}`}
                onClick={() => setConfirm({ type: "reject", itemId: item.id, itemName: item.name })}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-danger text-danger hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >{pendingAction === `reject-${item.id}` ? "Processing..." : "Reject"}</button>
              <button
                disabled={pendingAction === `request-${item.id}`}
                onClick={() => setConfirm({ type: "request_changes", itemId: item.id, itemName: item.name })}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-warning text-warning hover:bg-amber-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >{pendingAction === `request-${item.id}` ? "Processing..." : "Request Changes"}</button>
            </div>
          </div>
        ))
      )}

      {confirm?.type === "approve" && (
        <ConfirmDialog
          open
          title="Approve Property"
          message={`Approve "${confirm.itemName}" to go live on the storefront?`}
          confirmLabel="Approve"
          variant="primary"
          onConfirm={async () => {
            const r = await decideCuration({ propertyId: confirm.itemId, action: "approve" });
            if (r.ok) setItems((prev) => prev.filter((i) => i.id !== confirm.itemId));
            notify(r.ok ? `${confirm.itemName} approved.` : r.message, r.ok ? "success" : "error");
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm?.type === "reject" && (
        <ConfirmDialog
          open
          title="Reject Property"
          message={`Provide a reason for rejecting "${confirm.itemName}":`}
          confirmLabel="Reject"
          variant="danger"
          placeholder="Reason for rejection..."
          onConfirm={async (reason) => {
            const r = await decideCuration({ propertyId: confirm.itemId, action: "reject", reason });
            if (r.ok) setItems((prev) => prev.filter((i) => i.id !== confirm.itemId));
            notify(r.ok ? `${confirm.itemName} rejected.` : r.message, r.ok ? "success" : "error");
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm?.type === "request_changes" && (
        <ConfirmDialog
          open
          title="Request Changes"
          message={`Describe the changes needed for "${confirm.itemName}":`}
          confirmLabel="Request Changes"
          variant="primary"
          placeholder="Describe what needs to change..."
          onConfirm={async (reason) => {
            const r = await decideCuration({ propertyId: confirm.itemId, action: "request_changes", reason });
            if (r.ok) setItems((prev) => prev.filter((i) => i.id !== confirm.itemId));
            notify(r.ok ? `Changes requested for ${confirm.itemName}.` : r.message, r.ok ? "success" : "error");
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
