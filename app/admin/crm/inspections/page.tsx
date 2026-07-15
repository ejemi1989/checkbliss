import Link from "next/link";
import type { Metadata } from "next";
import { getCrmInspections } from "@/lib/crm-admin";
import type { CrmInspection } from "@/lib/crm-admin";

export const metadata: Metadata = { title: "Inspections · WhatsApp CRM" };

const COLUMNS: { id: CrmInspection["status"]; label: string; accent: string }[] = [
  { id: "pre_notice", label: "Pre-notice due", accent: "border-t-blue-400" },
  { id: "prompt", label: "Prompt due", accent: "border-t-primary" },
  { id: "awaiting_reply", label: "Awaiting reply", accent: "border-t-amber-400" },
  { id: "reminder_sent", label: "Reminder sent", accent: "border-t-amber-600" },
  { id: "escalated", label: "Escalated", accent: "border-t-red-500" },
  { id: "complete", label: "Complete", accent: "border-t-green-500" },
];

const STATUS_DESCRIPTIONS: Record<CrmInspection["status"], string> = {
  pre_notice: "checkout in 24h",
  prompt: "checkout now",
  awaiting_reply: "+2h no reply",
  reminder_sent: "+6h no reply",
  escalated: "+48h no reply",
  complete: "resolved",
};

export default async function CrmInspectionsPage() {
  const inspections = await getCrmInspections();
  const byStatus: Record<CrmInspection["status"], CrmInspection[]> = {
    pre_notice: [],
    prompt: [],
    awaiting_reply: [],
    reminder_sent: [],
    escalated: [],
    complete: [],
  };
  for (const i of inspections) byStatus[i.status].push(i);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Inspection Status Board</h1>
        <p className="text-sm text-ink-secondary mt-1">{inspections.length} active inspections · reads <code className="text-[10px] font-mono">inspection_schedule</code></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.id} className={`bg-white rounded-xl border border-hairline border-t-4 ${col.accent} p-3 min-h-[300px]`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink">{col.label}</p>
              <span className="text-[10px] font-mono text-ink-tertiary">{byStatus[col.id].length}</span>
            </div>
            <div className="space-y-2">
              {byStatus[col.id].map((i) => (
                <div key={i.id} className="bg-bone rounded-lg p-3">
                  <p className="text-sm font-semibold text-ink">{i.property_name}</p>
                  <p className="text-[10px] text-ink-tertiary mt-0.5">{i.city} · {i.guest_name}</p>
                  <p className="text-[10px] text-ink-secondary mt-1.5">checkout {i.checkout_date} at {i.checkout_time}</p>
                  <p className="text-[10px] text-ink-secondary">op: {i.operator_name ?? "—"}</p>
                  <p className="text-[10px] text-ink-tertiary mt-1">{STATUS_DESCRIPTIONS[i.status]}</p>
                  {i.minutes_since_action > 0 && (
                    <p className="text-[10px] text-ink-tertiary mt-0.5">
                      {Math.floor(i.minutes_since_action / 60)}h {i.minutes_since_action % 60}m ago
                    </p>
                  )}
                  {i.operator_name && (
                    <Link
                      href={`/admin/crm/inbox`}
                      className="inline-block mt-2 text-[10px] font-semibold text-primary hover:text-primary-dark no-underline"
                    >
                      Open thread →
                    </Link>
                  )}
                </div>
              ))}
              {byStatus[col.id].length === 0 && (
                <p className="text-[10px] text-ink-tertiary text-center py-4">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
