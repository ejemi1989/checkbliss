import Link from "next/link";
import type { Metadata } from "next";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { getCrmClaims } from "@/lib/crm-admin";
import { decideCrmClaim } from "@/lib/crm-actions";

export const metadata: Metadata = { title: "Damage Claims · WhatsApp CRM" };

type SearchParams = Promise<{ filter?: string }>;

export default async function CrmClaimsPage({ searchParams }: { searchParams: SearchParams }) {
  const { filter: filterRaw } = await searchParams;
  const filter = filterRaw === "resolved" ? "resolved" : "pending";
  const claims = await getCrmClaims(filter);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Damage Claim Queue</h1>
          <p className="text-sm text-ink-secondary mt-1">{claims.length} {filter} claims</p>
        </div>
        <div className="flex gap-2">
          <FilterPill href="/admin/crm/claims?filter=pending" active={filter === "pending"} label="Pending" />
          <FilterPill href="/admin/crm/claims?filter=resolved" active={filter === "resolved"} label="Resolved" />
        </div>
      </div>

      <div className="space-y-3">
        {claims.map((c) => {
          const ageHours = Math.floor((Date.now() - new Date(c.reported_at).getTime()) / 3600000);
          return (
            <div key={c.id} className="bg-white border border-hairline rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-sans text-base font-medium text-ink">{c.property_name}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-bone text-ink-secondary">{c.city}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        c.admin_decision === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : c.admin_decision === "approved"
                          ? "bg-green-100 text-green-700"
                          : c.admin_decision === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {c.admin_decision}
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary mt-1.5">
                    Operator: {c.operator_name ?? "—"} · Reported {ageHours}h ago
                  </p>
                  <p className="text-sm text-ink mt-2 leading-relaxed">{c.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-ink-secondary">Estimate</p>
                  <p className="font-sans text-2xl font-medium text-ink tabular-nums">
                    {formatMinor(c.estimated_cost_minor, c.currency as CurrencyCode)}
                  </p>
                  <p className="text-[10px] text-ink-tertiary mt-0.5">Hold: {formatMinor(c.deposit_hold_minor, c.currency as CurrencyCode)}</p>
                  <p className="text-[10px] text-ink-tertiary mt-2">{c.photos_count} of 5 photos</p>
                </div>
              </div>

              {c.admin_decision === "pending" && (
                <div className="mt-4 pt-4 border-t border-hairline flex flex-wrap gap-2">
                  <form action={decideCrmClaim} className="contents">
                    <input type="hidden" name="claimId" value={c.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <input type="hidden" name="amountMinor" value={c.estimated_cost_minor} />
                    <button className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors cursor-pointer border-none">
                      Approve · {formatMinor(c.estimated_cost_minor, c.currency as CurrencyCode)}
                    </button>
                  </form>
                  <form action={decideCrmClaim} className="contents">
                    <input type="hidden" name="claimId" value={c.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button className="px-4 py-2 rounded-xl border border-hairline text-ink-secondary text-xs font-medium hover:bg-bone transition-colors cursor-pointer">
                      Reject · release hold
                    </button>
                  </form>
                  {c.operator_name && (
                    <Link
                      href={`/admin/crm/inbox`}
                      className="px-4 py-2 rounded-xl border border-hairline text-ink-secondary text-xs font-medium hover:bg-bone transition-colors no-underline"
                    >
                      View thread
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {claims.length === 0 && (
          <div className="bg-white border border-hairline rounded-xl p-12 text-center">
            <p className="font-sans text-lg text-ink mb-1">No {filter} claims</p>
            <p className="text-sm text-ink-secondary">All clear for now.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors no-underline ${
        active ? "bg-primary text-white border-primary" : "bg-white text-ink-secondary border-hairline hover:border-primary"
      }`}
    >
      {label}
    </Link>
  );
}
