import type { Metadata } from "next";
import { getCrmAnalytics } from "@/lib/crm-admin";

export const metadata: Metadata = { title: "Analytics · WhatsApp CRM" };

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-ink-secondary mb-1">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-bone rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function CrmAnalyticsPage() {
  const a = await getCrmAnalytics();
  const totalInspections = a.inspection_outcomes.clean + a.inspection_outcomes.damage + a.inspection_outcomes.noshow + a.inspection_outcomes.guestpresent;
  const maxMsgs = Math.max(...a.messages_per_day_7d, 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Operational Analytics</h1>
        <p className="text-sm text-ink-secondary mt-1">Derived from <code className="text-[10px] font-mono">whatsapp_audit_log</code> + <code className="text-[10px] font-mono">inspections</code> + <code className="text-[10px] font-mono">damage_claims</code>.</p>
      </div>

      {/* Today / This week / This month grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-hairline rounded-xl p-5">
          <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-3">Today</p>
          <div className="space-y-2.5">
            <Metric label="New bookings" value={a.new_bookings_today} />
            <Metric label="Owner messages (24h)" value={a.owner_messages_24h} />
            <Metric label="Open threads" value={a.open_threads} />
          </div>
        </div>
        <div className="bg-white border border-hairline rounded-xl p-5">
          <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-3">This week</p>
          <div className="space-y-2.5">
            <Metric label="Inspections" value={a.inspections_this_week} />
            <Metric label="Clean rate" value={`${a.clean_rate_pct}%`} />
            <Metric label="Avg first reply" value={`${a.avg_response_minutes}m`} />
          </div>
        </div>
        <div className="bg-white border border-hairline rounded-xl p-5">
          <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-3">This month</p>
          <div className="space-y-2.5">
            <Metric label="Damage claims" value={a.damage_claims_this_month} />
            <Metric label="Holds at risk" value={`£${(a.holds_at_risk_minor / 100).toFixed(0)}`} />
            <Metric label="Resolved claims" value={a.resolved_claims} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-hairline rounded-xl p-5">
          <p className="font-sans text-base font-medium text-ink mb-4">Inbound messages · last 7 days</p>
          <div className="space-y-2">
            {a.messages_per_day_7d.map((count, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
              return <Bar key={i} value={count} max={maxMsgs} label={label} />;
            })}
          </div>
        </div>

        <div className="bg-white border border-hairline rounded-xl p-5">
          <p className="font-sans text-base font-medium text-ink mb-4">Inspection outcomes · this week</p>
          <div className="space-y-2">
            <Bar value={a.inspection_outcomes.clean} max={totalInspections} label={`Clean (${a.inspection_outcomes.clean})`} />
            <Bar value={a.inspection_outcomes.damage} max={totalInspections} label={`Damage (${a.inspection_outcomes.damage})`} />
            <Bar value={a.inspection_outcomes.noshow} max={totalInspections} label={`No-show (${a.inspection_outcomes.noshow})`} />
            <Bar value={a.inspection_outcomes.guestpresent} max={totalInspections} label={`Guest present (${a.inspection_outcomes.guestpresent})`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-hairline rounded-xl p-5">
          <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-2">Bot auto-resolve rate</p>
          <p className="font-sans text-4xl font-medium text-ink tabular-nums">{a.bot_auto_resolve_pct}%</p>
          <p className="text-xs text-ink-tertiary mt-2">% of inbound messages the bot handled without admin intervention</p>
        </div>
        <div className="bg-white border border-hairline rounded-xl p-5">
          <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-2">Avg claim resolution</p>
          <p className="font-sans text-4xl font-medium text-ink tabular-nums">{a.avg_claim_resolution_hours}h</p>
          <p className="text-xs text-ink-tertiary mt-2">From operator report to admin decision</p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-ink-secondary">{label}</span>
      <span className="font-sans text-xl font-medium text-ink tabular-nums">{value}</span>
    </div>
  );
}
