import Link from "next/link";
import type { Metadata } from "next";
import { getCrmInspections } from "@/lib/crm-admin";
import type { CrmInspection } from "@/lib/crm-admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Inspections · WhatsApp CRM" };

type ColumnTone = "accent" | "warning" | "danger" | "success" | "neutral";

const COLUMNS: { id: CrmInspection["status"]; label: string; tone: ColumnTone; description: string }[] = [
  { id: "pre_notice", label: "Pre-notice due", tone: "accent", description: "checkout in 24h" },
  { id: "prompt", label: "Prompt due", tone: "accent", description: "checkout now" },
  { id: "awaiting_reply", label: "Awaiting reply", tone: "warning", description: "+2h no reply" },
  { id: "reminder_sent", label: "Reminder sent", tone: "warning", description: "+6h no reply" },
  { id: "escalated", label: "Escalated", tone: "danger", description: "+48h no reply" },
  { id: "complete", label: "Complete", tone: "success", description: "resolved" },
];

const TONE_BG: Record<ColumnTone, string> = {
  accent: "bg-primary",
  warning: "bg-warning",
  danger: "bg-error",
  success: "bg-primary",
  neutral: "bg-ink-tertiary",
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
    <div>
      <PageHeader
        eyebrow="WhatsApp CRM"
        title="Inspection status board"
        description={`Live kanban of checkout inspections across the platform. ${inspections.length} active — reads inspection_schedule.`}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {COLUMNS.map((col) => (
          <section key={col.id} className="bg-canvas rounded-xl border border-hairline overflow-hidden flex flex-col min-h-[360px]">
            <header className={`px-4 pt-4 pb-3 border-b-2 ${TONE_BG[col.tone]}`}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-white">{col.label}</p>
                <span className="text-[10px] font-mono tabular-nums text-white/80">{byStatus[col.id].length}</span>
              </div>
              <p className="text-[10px] text-white/70 mt-1 font-sans">{col.description}</p>
            </header>
            <div className="p-3 space-y-2 flex-1">
              {byStatus[col.id].map((i) => (
                <div key={i.id} className="bg-bone-secondary rounded-lg p-3 border border-hairline">
                  <p className="text-sm font-sans font-semibold text-ink">{i.property_name}</p>
                  <p className="text-[10px] text-ink-tertiary mt-0.5 font-sans">{i.city} · {i.guest_name}</p>
                  <p className="text-[10px] text-ink-secondary mt-1.5 font-sans">checkout {i.checkout_date} at {i.checkout_time}</p>
                  <p className="text-[10px] text-ink-secondary font-sans">op: {i.operator_name ?? "—"}</p>
                  {i.minutes_since_action > 0 && (
                    <p className="text-[10px] text-ink-tertiary mt-1 font-sans tabular-nums">
                      {Math.floor(i.minutes_since_action / 60)}h {i.minutes_since_action % 60}m ago
                    </p>
                  )}
                  {i.operator_name && (
                    <Link
                      href="/admin/crm/inbox"
                      className="inline-block mt-2 text-[10px] font-sans font-semibold uppercase tracking-[0.06em] text-primary hover:text-primary-dark no-underline"
                    >
                      Open thread →
                    </Link>
                  )}
                </div>
              ))}
              {byStatus[col.id].length === 0 && (
                <p className="text-[10px] text-ink-tertiary text-center py-8 font-sans">—</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
