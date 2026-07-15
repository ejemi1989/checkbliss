import Link from "next/link";
import type { Metadata } from "next";
import { getCrmThreads } from "@/lib/crm-admin";

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
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Conversation Inbox</h1>
          <p className="text-sm text-ink-secondary mt-1">{threads.length} {filter === "all" ? "" : filter} threads</p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/crm/inbox?filter=${f.value}`}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors no-underline ${
                filter === f.value ? "bg-primary text-white border-primary" : "bg-white text-ink-secondary border-hairline hover:border-primary"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-hairline divide-y divide-hairline">
        {threads.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-sans text-lg text-ink mb-1">No threads in this view</p>
            <p className="text-sm text-ink-secondary">Try another filter, or wait for inbound messages.</p>
          </div>
        ) : (
          threads.map((t) => (
            <Link
              key={t.contact_e164}
              href={`/admin/crm/inbox/${encodeURIComponent(t.contact_e164)}`}
              className="block p-5 hover:bg-bone transition-colors no-underline"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-sans text-base font-medium text-ink">{t.contact_name}</p>
                    <span className="text-[10px] font-mono text-ink-tertiary">{t.contact_e164}</span>
                    {t.contact_role && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        t.contact_role === "owner" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}>
                        {t.contact_role}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-secondary mt-1 line-clamp-1">
                    {t.last_message_direction === "in" ? "← " : "→ "}
                    {t.last_message_body}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      t.thread_status === "resolved"
                        ? "bg-green-100 text-green-700"
                        : t.thread_status === "escalated"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {t.thread_status}
                  </span>
                  <p className="text-[10px] text-ink-tertiary mt-1.5">
                    {new Date(t.last_message_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {t.message_count_24h > 1 && (
                    <span className="inline-block mt-1 text-[10px] font-semibold text-ink-tertiary">
                      {t.message_count_24h} msgs/24h
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
