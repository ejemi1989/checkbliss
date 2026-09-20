"use client";

import { useState } from "react";
import { getAdminAudit } from "@/lib/data";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { DataList } from "@/components/dashboard/data-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Icon } from "@/components/icons";

export function AdminAuditView() {
  const [audit] = useState(() => getAdminAudit());

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Audit log"
        description="Sensitive actions log — immutable, filterable by actor, action type, date range."
        meta={
          <p className="text-xs text-ink-tertiary font-sans">
            {audit.length} {audit.length === 1 ? "entry" : "entries"} · most recent first
          </p>
        }
      />

      <Section eyebrow="Activity" count={audit.length}>
        {audit.length === 0 ? (
          <EmptyState
            title="No activity yet"
            body="Sensitive actions across the platform will be logged here for compliance."
            icon={<Icon.List size={20} />}
          />
        ) : (
          <DataList
            items={audit.map((a, i) => ({
              id: `${a.action}-${i}`,
              primary: (
                <span className="flex items-center gap-2 flex-wrap">
                  <span>{a.action}</span>
                  <span className="text-ink-tertiary font-normal">·</span>
                  <span className="text-ink-secondary font-normal truncate">{a.target}</span>
                </span>
              ),
              secondary: a.detail,
              meta: a.date,
            }))}
          />
        )}
      </Section>
    </div>
  );
}
