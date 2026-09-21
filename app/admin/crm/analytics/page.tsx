import type { Metadata } from "next";
import { getCrmAnalytics } from "@/lib/crm-admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { StatBlock, StatGrid } from "@/components/dashboard/stat-block";

export const metadata: Metadata = { title: "Analytics · WhatsApp CRM" };

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-sans uppercase tracking-[0.1em] text-ink-tertiary mb-2">
        <span suppressHydrationWarning>{label}</span>
        <span className="font-mono tabular-nums text-ink">{value}</span>
      </div>
      <div className="h-1.5 bg-bone-secondary rounded-full overflow-hidden">
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
    <div>
      <PageHeader
        eyebrow="WhatsApp CRM"
        title="Operational analytics"
        description="Derived from whatsapp_audit_log + inspections + damage_claims."
      />

      <Section eyebrow="Headline numbers" description="Today · This week · This month.">
        <StatGrid>
          <StatBlock label="New bookings today" value={a.new_bookings_today.toString()} hint={`${a.open_threads} open threads`} />
          <StatBlock label="Inspections this week" value={a.inspections_this_week.toString()} hint={`${a.clean_rate_pct}% clean rate · ${a.avg_response_minutes}m avg reply`} />
          <StatBlock
            label="Damage claims this month"
            value={a.damage_claims_this_month.toString()}
            hint={`£${(a.holds_at_risk_minor / 100).toFixed(0)} at risk · ${a.resolved_claims} resolved`}
            accent
          />
        </StatGrid>
      </Section>

      <Section eyebrow="Charts" count="Activity">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="pb-5 mb-6 border-b border-hairline">
              <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Inbound</p>
              <h3 className="font-display text-xl tracking-tight text-ink mt-1.5">Messages · last 7 days</h3>
            </div>
            <div className="space-y-4">
              {a.messages_per_day_7d.map((count, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
                return <Bar key={i} value={count} max={maxMsgs} label={label} />;
              })}
            </div>
          </div>

          <div>
            <div className="pb-5 mb-6 border-b border-hairline">
              <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Outcomes</p>
              <h3 className="font-display text-xl tracking-tight text-ink mt-1.5">Inspections · this week</h3>
            </div>
            <div className="space-y-4">
              <Bar value={a.inspection_outcomes.clean} max={totalInspections} label={`Clean (${a.inspection_outcomes.clean})`} />
              <Bar value={a.inspection_outcomes.damage} max={totalInspections} label={`Damage (${a.inspection_outcomes.damage})`} />
              <Bar value={a.inspection_outcomes.noshow} max={totalInspections} label={`No-show (${a.inspection_outcomes.noshow})`} />
              <Bar value={a.inspection_outcomes.guestpresent} max={totalInspections} label={`Guest present (${a.inspection_outcomes.guestpresent})`} />
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Bot performance" count="Highlights">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Bot auto-resolve rate</p>
            <p className="font-display text-[3rem] leading-none tracking-tight tabular-nums text-ink mt-3">{a.bot_auto_resolve_pct}<span className="text-ink-tertiary">%</span></p>
            <p className="text-xs text-ink-tertiary mt-3 font-sans max-w-[40ch]">% of inbound messages the bot handled without admin intervention.</p>
          </div>
          <div>
            <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-ink-tertiary">Avg claim resolution</p>
            <p className="font-display text-[3rem] leading-none tracking-tight tabular-nums text-ink mt-3">{a.avg_claim_resolution_hours}<span className="text-ink-tertiary">h</span></p>
            <p className="text-xs text-ink-tertiary mt-3 font-sans max-w-[40ch]">From operator report to admin decision.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
