import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCrmThread } from "@/lib/crm-admin";
import { addCrmNote, setCrmThreadStatus } from "@/lib/crm-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusPill } from "@/components/dashboard/status-pill";
import { threadVariant, roleVariant } from "@/components/dashboard/crm-colors";

export const metadata: Metadata = { title: "Thread · WhatsApp CRM" };

type Params = Promise<{ e164: string }>;

export default async function CrmThreadPage({ params }: { params: Params }) {
  const { e164: rawE164 } = await params;
  const e164 = decodeURIComponent(rawE164);
  const { thread, messages, notes } = await getCrmThread(e164);

  if (!thread) {
    return (
      <div className="space-y-6">
        <Link href="/admin/crm/inbox" className="text-xs font-sans font-medium text-ink-secondary hover:text-ink no-underline">← Inbox</Link>
        <div className="text-center py-16 border border-dashed border-hairline rounded-xl">
          <p className="font-display text-base text-ink">No messages found for {e164}</p>
          <p className="text-sm text-ink-secondary mt-1.5">This thread may have been deleted or the contact has not messaged yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={
          <Link href="/admin/crm/inbox" className="text-ink-secondary hover:text-ink no-underline">
            ← Inbox
          </Link>
        }
        title={thread.contact_name}
        description={`${thread.contact_e164} · ${thread.contact_role ?? "unknown role"}`}
        meta={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill variant={threadVariant(thread.thread_status)} dot>
              {thread.thread_status}
            </StatusPill>
            {thread.contact_role && (
              <StatusPill variant={roleVariant(thread.contact_role)}>
                {thread.contact_role}
              </StatusPill>
            )}
            <form action={setCrmThreadStatus}>
              <input type="hidden" name="e164" value={e164} />
              <input type="hidden" name="status" value={thread.thread_status === "resolved" ? "open" : "resolved"} />
              <button className="text-[10px] font-sans font-semibold uppercase tracking-[0.08em] rounded-full border border-hairline bg-canvas text-ink-secondary hover:border-primary hover:text-primary px-3 py-1 cursor-pointer transition-colors">
                Mark as {thread.thread_status === "resolved" ? "open" : "resolved"}
              </button>
            </form>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px] lg:gap-12">
        {/* Conversation */}
        <section>
          <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline">
            <div>
              <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Conversation</p>
              <h2 className="font-display text-xl tracking-tight text-ink mt-1.5">{messages.length} messages</h2>
            </div>
            <span className="text-[10px] font-sans font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
              {thread.message_count_24h} in last 24h
            </span>
          </div>

          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm ${
                    m.direction === "in"
                      ? "bg-bone-secondary text-ink"
                      : "bg-primary text-white"
                  }`}
                >
                  {m.parsed_command && (
                    <span className="text-[10px] font-mono uppercase opacity-70 mr-2">{m.parsed_command}</span>
                  )}
                  <p className="leading-relaxed">{m.body}</p>
                  <p className={`text-[10px] mt-1.5 ${m.direction === "in" ? "text-ink-tertiary" : "opacity-60"}`}>
                    {new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Internal notes */}
        <section>
          <div className="flex items-end justify-between gap-4 pb-5 mb-6 border-b border-hairline">
            <div>
              <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.18em] text-primary">Private</p>
              <h2 className="font-display text-xl tracking-tight text-ink mt-1.5">Internal notes</h2>
            </div>
            <span className="text-[10px] text-ink-tertiary font-sans">Admin-only</span>
          </div>
          <div className="space-y-3 mb-6">
            {notes.length === 0 ? (
              <p className="text-xs text-ink-tertiary text-center py-8 font-sans">No notes yet.</p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
                  <p className="text-sm text-ink leading-relaxed">{n.note}</p>
                  <p className="text-[10px] text-ink-tertiary mt-2 font-sans">
                    {n.created_by} · {new Date(n.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))
            )}
          </div>
          <form action={addCrmNote} className="space-y-3 pt-4 border-t border-hairline">
            <input type="hidden" name="e164" value={e164} />
            <textarea
              name="note"
              required
              rows={3}
              placeholder="Add a note (admin-only)..."
              className="w-full border border-hairline rounded-lg px-3 py-2 text-sm outline-none focus:border-primary text-ink resize-none font-sans bg-canvas"
            />
            <button className="w-full py-2.5 rounded-lg bg-primary text-white text-xs font-sans font-semibold hover:bg-primary-dark transition-colors cursor-pointer border-none">
              Save note
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
