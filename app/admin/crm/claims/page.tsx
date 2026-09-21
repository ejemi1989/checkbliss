import Link from "next/link";
import type { Metadata } from "next";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { getCrmClaims } from "@/lib/crm-admin";
import { decideCrmClaim } from "@/lib/crm-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { crmClaimVariant } from "@/components/dashboard/crm-colors";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Damage Claims · WhatsApp CRM" };

type SearchParams = Promise<{ filter?: string }>;

export default async function CrmClaimsPage({ searchParams }: { searchParams: SearchParams }) {
  const { filter: filterRaw } = await searchParams;
  const filter = filterRaw === "resolved" ? "resolved" : "pending";
  const claims = await getCrmClaims(filter);

  return (
    <div>
      <PageHeader
        eyebrow="WhatsApp CRM"
        title="Damage claim queue"
        description={`Operator-submitted claims surfaced in WhatsApp — approve to capture from the deposit hold, or reject to release. ${claims.length} ${filter} claims.`}
        meta={
          <div className="flex gap-2">
            <FilterPill href="/admin/crm/claims?filter=pending" active={filter === "pending"} label="Pending" />
            <FilterPill href="/admin/crm/claims?filter=resolved" active={filter === "resolved"} label="Resolved" />
          </div>
        }
      />

      <Section eyebrow="Queue" count={claims.length}>
        {claims.length === 0 ? (
          <EmptyState
            title={`No ${filter} claims`}
            body={filter === "pending" ? "All clear for now — operator-submitted claims will land here." : "Resolved claims stay here for reference."}
            icon={<Icon.Shield size={20} />}
          />
        ) : (
          <ul className="space-y-6">
            {claims.map((c) => {
              const ageHours = Math.floor((Date.now() - new Date(c.reported_at).getTime()) / 3600000);
              return (
                <li key={c.id} className="pb-6 mb-6 border-b border-hairline last:border-b-0 last:mb-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-xl tracking-tight text-ink">{c.property_name}</h3>
                        <StatusPill variant="neutral" dot uppercase>{c.city}</StatusPill>
                        <StatusPill variant={crmClaimVariant(c.admin_decision)} dot>
                          {c.admin_decision}
                        </StatusPill>
                      </div>
                      <p className="text-xs text-ink-secondary mt-1.5 font-sans">
                        Operator: {c.operator_name ?? "—"} · Reported {ageHours}h ago
                      </p>
                      <p className="text-sm text-ink mt-3 leading-relaxed max-w-[65ch]">{c.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.14em] text-ink-tertiary">Estimate</p>
                      <p className="font-display text-[1.75rem] leading-none tracking-tight tabular-nums text-ink mt-1.5">
                        {formatMinor(c.estimated_cost_minor, c.currency as CurrencyCode)}
                      </p>
                      <p className="text-[10px] text-ink-tertiary mt-2 font-sans">Hold: {formatMinor(c.deposit_hold_minor, c.currency as CurrencyCode)}</p>
                      <p className="text-[10px] text-ink-tertiary mt-1 font-sans">{c.photos_count} of 5 photos</p>
                    </div>
                  </div>

                  {c.admin_decision === "pending" && (
                    <div className="mt-4 pt-4 border-t border-hairline flex flex-wrap gap-2 items-center">
                      <form action={decideCrmClaim} className="inline">
                        <input type="hidden" name="claimId" value={c.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <input type="hidden" name="amountMinor" value={c.estimated_cost_minor} />
                        <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-sans font-semibold hover:bg-primary-dark transition-colors cursor-pointer border-none">
                          Approve · {formatMinor(c.estimated_cost_minor, c.currency as CurrencyCode)}
                        </button>
                      </form>
                      <form action={decideCrmClaim} className="inline">
                        <input type="hidden" name="claimId" value={c.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <button type="submit" className="px-4 py-2 rounded-lg border border-hairline text-ink-secondary text-xs font-sans font-semibold hover:bg-bone-secondary transition-colors cursor-pointer bg-transparent">
                          Reject · release hold
                        </button>
                      </form>
                      {c.operator_name && (
                        <Link
                          href="/admin/crm/inbox"
                          className="px-4 py-2 rounded-lg border border-hairline text-ink-secondary text-xs font-sans font-semibold hover:bg-bone-secondary transition-colors no-underline bg-transparent"
                        >
                          View thread
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-sans font-semibold transition-colors no-underline border ${
        active
          ? "border-primary bg-primary text-white"
          : "border-hairline bg-canvas text-ink-secondary hover:bg-bone-secondary"
      }`}
    >
      {label}
    </Link>
  );
}
