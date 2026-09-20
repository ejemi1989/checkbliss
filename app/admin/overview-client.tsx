"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatMinor } from "@/lib/currency";
import { getAdminClaims, getAdminOperators, getAdminAudit, getAdminStats } from "@/lib/data";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { StatBlock, StatGrid } from "@/components/dashboard/stat-block";
import { DataList } from "@/components/dashboard/data-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Icon } from "@/components/icons";

function fmt(n: number) {
  return formatMinor(n);
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminOverview() {
  const stats = useMemo(() => getAdminStats(), []);
  const claims = useMemo(() => getAdminClaims(), []);
  const operators = useMemo(() => getAdminOperators(), []);
  const audit = useMemo(() => getAdminAudit(), []);

  const pendingClaims = claims.filter((c) => c.admin_decision === "pending");
  const activeOperators = operators.filter((o) => o.status === "active");

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="The week at a glance"
        description="A quiet read on bookings, claims, payouts and operators across Lagos and Abuja — the things that need you this week."
        meta={
          <p className="text-xs text-ink-tertiary font-sans">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        }
      />

      <Section eyebrow="Headline numbers" count={`${stats.length} metrics`} className="border-0 p-0">
        <StatGrid>
          {stats.map((s) => (
            <StatBlock
              key={s.label}
              label={s.label}
              value={s.value}
              hint={s.sub}
              accent={s.accent}
            />
          ))}
        </StatGrid>
      </Section>

      <Section
        eyebrow="Pending claims"
        count={pendingClaims.length}
        description="Damage claims awaiting your decision. Approve to capture from the deposit hold, or release."
      >
        {pendingClaims.length === 0 ? (
          <EmptyState
            title="No claims waiting"
            body="When an operator reports damage on a checkout, the claim lands here for your decision."
            icon={<Icon.Shield size={20} />}
          />
        ) : (
          <DataList
            items={pendingClaims.slice(0, 5).map((c) => ({
              id: c.id,
              primary: c.property_name,
              secondary: `${c.guest_name} · ${c.stay_dates}`,
              meta: fmt(c.estimated_cost_minor),
              trailing: <StatusPill variant="warning">Pending</StatusPill>,
              href: "/admin/claims",
            }))}
          />
        )}
      </Section>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <Section
          eyebrow="Active operators"
          count={activeOperators.length}
          description="City operators on shift. Each one is your eyes on the ground."
        >
          {activeOperators.length === 0 ? (
            <EmptyState
              title="No active operators"
              body="Operators assigned to a city will appear here."
              icon={<Icon.Users size={20} />}
            />
          ) : (
            <DataList
              items={activeOperators.map((o) => ({
                id: o.id,
                primary: o.name,
                secondary: `${o.city} · ${o.properties_count} properties · ${o.verified_count} verified`,
                trailing: (
                  <div className="w-8 h-8 rounded-full bg-primary-bg text-primary text-xs font-sans font-semibold flex items-center justify-center">
                    {initialsOf(o.name)}
                  </div>
                ),
                href: "/admin/operators",
              }))}
            />
          )}
        </Section>

        <Section eyebrow="Recent activity" count={`${audit.length} entries`}>
          <DataList
            items={audit.slice(0, 6).map((a, i) => ({
              id: `${a.action}-${i}`,
              primary: (
                <span className="flex items-center gap-2">
                  <span>{a.action}</span>
                  <span className="text-ink-tertiary font-normal">·</span>
                  <span className="text-ink-secondary font-normal truncate">{a.target}</span>
                </span>
              ),
              secondary: a.detail,
              meta: a.date,
              href: "/admin/audit",
            }))}
          />
        </Section>
      </div>
    </div>
  );
}
