import type { Metadata } from "next";
import { sendCrmBroadcast } from "@/lib/crm-actions";

export const metadata: Metadata = { title: "Broadcast · WhatsApp CRM" };

const SEGMENTS = [
  { value: "all_owners", label: "All owners" },
  { value: "lagos_owners", label: "Lagos owners" },
  { value: "abuja_owners", label: "Abuja owners" },
  { value: "all_operators", label: "All operators" },
  { value: "lagos_operators", label: "Lagos operators" },
  { value: "abuja_operators", label: "Abuja operators" },
];

const TEMPLATES = [
  "new_booking",
  "pre_checkout_reminder",
  "post_checkout_clean",
  "post_checkout_damage",
  "damage_resolution",
  "payout_processed",
  "verification_scheduled",
  "verification_failed",
  "pre_checkout_confirm",
  "inspection_prompt",
  "inspection_reminder",
];

export default async function CrmBroadcastPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  let parsedResult: { ok: boolean; recipient_count?: number; sent?: number; error?: string } | null = null;
  if (result) {
    try { parsedResult = JSON.parse(decodeURIComponent(result)); } catch { parsedResult = null; }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-sans text-[clamp(1.8rem,3vw,2.4rem)] font-medium leading-tight text-ink">Broadcast</h1>
        <p className="text-sm text-ink-secondary mt-1">Send a Meta-approved template to a segment of owners or operators. Sends via the existing <code className="text-[10px] font-mono">sendWhatsAppTemplate</code>.</p>
      </div>

      {parsedResult && (
        <div className={`p-4 rounded-xl border ${parsedResult.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          {parsedResult.ok ? (
            <p className="text-sm text-green-800">
              <strong>Sent</strong> to {parsedResult.sent} of {parsedResult.recipient_count} recipients.
            </p>
          ) : (
            <p className="text-sm text-red-800">Error: {parsedResult.error}</p>
          )}
        </div>
      )}

      <form action={sendCrmBroadcast} className="bg-white border border-hairline rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-2">Segment</label>
          <select
            name="segment"
            required
            className="w-full border border-hairline rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary text-ink bg-white"
          >
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-2">Template</label>
          <select
            name="templateName"
            required
            className="w-full border border-hairline rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary text-ink bg-white"
          >
            {TEMPLATES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="text-[10px] text-ink-tertiary mt-1.5">Only the 11 Meta-registered templates are available.</p>
        </div>

        <div>
          <label className="block text-xs font-sans font-semibold uppercase tracking-[0.1em] text-ink-secondary mb-2">Custom phones (optional)</label>
          <input
            type="text"
            name="customPhones"
            placeholder="+2348010000001, +2348020000001"
            className="w-full border border-hairline rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary text-ink"
          />
          <p className="text-[10px] text-ink-tertiary mt-1.5">Comma-separated E.164 numbers. If provided, overrides the segment.</p>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-ink-tertiary">Every send is audited to <code className="font-mono">whatsapp_audit_log</code>.</p>
          <button className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors cursor-pointer border-none">
            Send broadcast
          </button>
        </div>
      </form>
    </div>
  );
}
