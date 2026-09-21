import type { Metadata } from "next";
import Link from "next/link";
import { getCrmAuditLog } from "@/lib/crm-admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { CRM_ACTION_VARIANT } from "@/components/dashboard/crm-colors";
import { Icon } from "@/components/icons";

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

export default async function CrmAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const { action: actionRaw } = await searchParams;
  const action = actionRaw && ACTIONS.includes(actionRaw) ? actionRaw : undefined;
  const entries = await getCrmAuditLog({ action, limit: 200 });

  return (
    <div>
      <PageHeader
        eyebrow="WhatsApp CRM"
        title="Audit log"
        description="Authoritative record of every financial and operational event. Reads from audit_log."
      />

      <Section eyebrow="Filter" count={`${entries.length} of 200`}>
        <div className="flex flex-wrap gap-2">
          <FilterPill href="/admin/crm/audit" active={!action} label="All" />
          {ACTIONS.map((a) => (
            <FilterPill key={a} href={`/admin/crm/audit?action=${a}`} active={action === a} label={a} />
          ))}
        </div>
      </Section>

      <Section eyebrow="Entries" count={entries.length}>
        {entries.length === 0 ? (
          <EmptyState
            title="No audit entries match"
            body="Adjust the action filter or wait for new events."
            icon={<Icon.List size={20} />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-ink-tertiary border-b border-hairline">
                  <th className="py-2.5 pr-3">When</th>
                  <th className="py-2.5 pr-3">Action</th>
                  <th className="py-2.5 pr-3">Target</th>
                  <th className="py-2.5 pr-3">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-bone-secondary/40 transition-colors">
                    <td className="py-3 pr-3 text-xs text-ink-secondary font-sans whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusPill variant={CRM_ACTION_VARIANT[e.action] ?? "neutral"} dot uppercase>
                        {e.action}
                      </StatusPill>
                    </td>
                    <td className="py-3 pr-3 text-xs font-mono text-ink-secondary max-w-[200px] truncate">{e.target_id ?? "—"}</td>
                    <td className="py-3 pr-3 text-xs text-ink max-w-[400px] truncate font-sans">{e.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors no-underline border ${
        active
          ? "border-primary bg-primary text-white"
          : "border-hairline bg-canvas text-ink-secondary hover:bg-bone-secondary"
      }`}
    >
      {label}
    </Link>
  );
}
