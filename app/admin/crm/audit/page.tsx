import type { Metadata } from "next";
import Link from "next/link";
import { getCrmAuditLog } from "@/lib/crm-admin";

export const metadata: Metadata = { title: "Audit Log · WhatsApp CRM" };

const ACTIONS = [
  "whatsapp.in",
  "whatsapp.out",
  "calendar.block",
  "inspection.clean",
  "inspection.damage",
  "claim.decision",
  "dispute.raised",
  "stripe.event",
];

type SearchParams = Promise<{ action?: string }>;

const ACTION_COLORS: Record<string, string> = {
  "whatsapp.in": "bg-blue-100 text-blue-700",
  "whatsapp.out": "bg-green-100 text-green-700",
  "calendar.block": "bg-purple-100 text-purple-700",
  "inspection.clean": "bg-green-100 text-green-700",
  "inspection.damage": "bg-amber-100 text-amber-700",
  "claim.decision": "bg-amber-100 text-amber-700",
  "dispute.raised": "bg-red-100 text-red-700",
  "stripe.event": "bg-ink text-bone",
};

export default async function CrmAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const { action: actionRaw } = await searchParams;
  const action = actionRaw && ACTIONS.includes(actionRaw) ? actionRaw : undefined;
  const entries = await getCrmAuditLog({ action, limit: 200 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Audit Log</h1>
        <p className="text-sm text-ink-secondary mt-1">Authoritative record of every financial and operational event. Reads from <code className="text-[10px] font-mono">audit_log</code>.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/crm/audit"
          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors no-underline ${
            !action ? "bg-primary text-white border-primary" : "bg-white text-ink-secondary border-hairline hover:border-primary"
          }`}
        >
          All
        </Link>
        {ACTIONS.map((a) => (
          <Link
            key={a}
            href={`/admin/crm/audit?action=${a}`}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors no-underline ${
              action === a ? "bg-primary text-white border-primary" : "bg-white text-ink-secondary border-hairline hover:border-primary"
            }`}
          >
            {a}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-hairline overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-bone">
              <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-ink-secondary px-4 py-3">When</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-ink-secondary px-4 py-3">Action</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-ink-secondary px-4 py-3">Target</th>
              <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-ink-secondary px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-bone transition-colors">
                <td className="px-4 py-3 text-xs text-ink-secondary whitespace-nowrap">
                  {new Date(e.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[e.action] ?? "bg-bone text-ink-secondary"}`}>
                    {e.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-ink-secondary max-w-[200px] truncate">{e.target_id ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-ink max-w-[400px] truncate">{e.detail ?? "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-ink-secondary">No audit entries match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
