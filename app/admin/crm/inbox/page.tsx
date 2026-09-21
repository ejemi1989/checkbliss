import Link from "next/link";
import type { Metadata } from "next";
import { getCrmThreads } from "@/lib/crm-admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { DataList } from "@/components/dashboard/data-list";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusPill } from "@/components/dashboard/status-pill";
import { threadVariant, roleVariant } from "@/components/dashboard/crm-colors";
import { Icon } from "@/components/icons";

export const metadata: Metadata = { title: "Inbox · WhatsApp CRM" };

type SearchParams = Promise<{ filter?: string }>;

const FILTERS: { value: "all" | "open" | "resolved" | "escalated"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
];

export default async function CrmInboxPage({ searchParams }: { searchParams: SearchParams }) {
  const { filter: filterRaw } = await searchParams;
  const filter = (filterRaw as "all" | "open" | "resolved" | "escalated") ?? "all";
  const threads = await getCrmThreads(filter === "all" ? undefined : (filter as "open" | "resolved" | "escalated"));

  return (
    <div>
      <PageHeader
        eyebrow="WhatsApp CRM"
        title="Conversation inbox"
        description={`Live WhatsApp threads with owners and operators. ${threads.length} ${filter === "all" ? "" : filter} thread${threads.length === 1 ? "" : "s"}.`}
      />

      <div className="flex gap-2 flex-wrap pb-10 mb-10 border-b border-hairline">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/crm/inbox?filter=${f.value}`}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-sans font-semibold transition-colors cursor-pointer border no-underline ${
              filter === f.value
                ? "border-primary bg-primary text-white"
                : "border-hairline bg-canvas text-ink-secondary hover:bg-bone-secondary"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Section eyebrow="Threads" count={threads.length}>
        {threads.length === 0 ? (
          <EmptyState
            title="No threads in this view"
            body="Try another filter, or wait for inbound messages from owners and operators."
            icon={<Icon.MessageCircle size={20} />}
          />
        ) : (
          <DataList
            items={threads.map((t) => ({
              id: t.contact_e164,
              href: `/admin/crm/inbox/${encodeURIComponent(t.contact_e164)}`,
              primary: (
                <span className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-display text-base tracking-tight text-ink">{t.contact_name}</span>
                  {t.contact_role && (
                    <StatusPill variant={roleVariant(t.contact_role)}>{t.contact_role}</StatusPill>
                  )}
                  <StatusPill variant={threadVariant(t.thread_status)} dot>
                    {t.thread_status}
                  </StatusPill>
                </span>
              ),
              secondary: (
                <span>
                  <span className="text-ink-tertiary mr-1.5 font-mono text-[10px]">{t.contact_e164}</span>
                  {t.last_message_direction === "in" ? "← " : "→ "}
                  {t.last_message_body}
                </span>
              ),
              meta: new Date(t.last_message_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
              trailing: t.message_count_24h > 1 ? (
                <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.06em] text-ink-tertiary">
                  {t.message_count_24h}/24h
                </span>
              ) : null,
            }))}
          />
        )}
      </Section>
    </div>
  );
}
