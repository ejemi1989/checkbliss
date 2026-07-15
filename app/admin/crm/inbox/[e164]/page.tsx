import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCrmThread } from "@/lib/crm-admin";
import { addCrmNote, setCrmThreadStatus } from "@/lib/crm-actions";

export const metadata: Metadata = { title: "Thread · WhatsApp CRM" };

type Params = Promise<{ e164: string }>;

export default async function CrmThreadPage({ params }: { params: Params }) {
  const { e164: rawE164 } = await params;
  const e164 = decodeURIComponent(rawE164);
  const { thread, messages, notes } = await getCrmThread(e164);

  if (!thread) {
    return (
      <div className="space-y-4">
        <Link href="/admin/crm/inbox" className="text-xs font-sans text-ink-secondary hover:text-ink no-underline">← Inbox</Link>
        <div className="bg-white rounded-xl border border-hairline p-12 text-center">
          <p className="font-sans text-lg text-ink">No messages found for {e164}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/crm/inbox" className="text-xs font-sans text-ink-secondary hover:text-ink no-underline">← Inbox</Link>
          <h1 className="font-sans text-[clamp(1.6rem,2.6vw,2rem)] font-medium leading-tight text-ink mt-1">
            {thread.contact_name}
          </h1>
          <p className="text-xs font-mono text-ink-tertiary mt-1">{thread.contact_e164} · {thread.contact_role ?? "unknown role"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              thread.thread_status === "resolved"
                ? "bg-green-100 text-green-700"
                : thread.thread_status === "escalated"
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {thread.thread_status}
          </span>
          <form action={setCrmThreadStatus}>
            <input type="hidden" name="e164" value={e164} />
            <input type="hidden" name="status" value={thread.thread_status === "resolved" ? "open" : "resolved"} />
            <button className="text-xs font-medium px-3 py-1.5 rounded-lg border border-hairline bg-white text-ink-secondary hover:border-primary cursor-pointer">
              Mark as {thread.thread_status === "resolved" ? "open" : "resolved"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Conversation */}
        <div className="bg-white rounded-xl border border-hairline flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-hairline">
            <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary">{messages.length} messages · {thread.message_count_24h} in last 24h</p>
          </div>
          <div className="flex-1 p-5 space-y-3 overflow-y-auto max-h-[500px]">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === "in" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                    m.direction === "in" ? "bg-bone text-ink" : "bg-primary text-white"
                  }`}
                >
                  {m.parsed_command && (
                    <span className="text-[10px] font-mono uppercase opacity-70 mr-2">{m.parsed_command}</span>
                  )}
                  <p className="leading-relaxed">{m.body}</p>
                  <p className="text-[10px] opacity-60 mt-1.5">
                    {new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Internal notes */}
        <div className="bg-white rounded-xl border border-hairline flex flex-col">
          <div className="p-4 border-b border-hairline">
            <p className="text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary">Internal notes</p>
            <p className="text-[10px] text-ink-tertiary mt-0.5">Admin-only — never sent to the contact</p>
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[400px]">
            {notes.length === 0 ? (
              <p className="text-xs text-ink-tertiary text-center py-4">No notes yet.</p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-ink leading-relaxed">{n.note}</p>
                  <p className="text-[10px] text-ink-tertiary mt-1.5">
                    {n.created_by} · {new Date(n.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))
            )}
          </div>
          <form action={addCrmNote} className="p-4 border-t border-hairline space-y-2">
            <input type="hidden" name="e164" value={e164} />
            <textarea
              name="note"
              required
              rows={3}
              placeholder="Add a note (admin-only)..."
              className="w-full border border-hairline rounded-lg px-3 py-2 text-sm outline-none focus:border-primary text-ink resize-none"
            />
            <button className="w-full py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors cursor-pointer border-none">
              Save note
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
