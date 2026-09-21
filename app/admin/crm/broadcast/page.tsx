import type { Metadata } from "next";
import { sendCrmBroadcast } from "@/lib/crm-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/dashboard/section";
import { StatusPill } from "@/components/dashboard/status-pill";

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
    <div>
      <PageHeader
        eyebrow="WhatsApp CRM"
        title="Broadcast"
        description="Send a Meta-approved template to a segment of owners or operators. Sends via the existing sendWhatsAppTemplate."
      />

      {parsedResult && (
        <div className="mb-10">
          <StatusPill variant={parsedResult.ok ? "success" : "danger"} dot>
            {parsedResult.ok
              ? `Sent to ${parsedResult.sent} of ${parsedResult.recipient_count} recipients`
              : `Error: ${parsedResult.error}`}
          </StatusPill>
        </div>
      )}

      <Section eyebrow="Compose" description="Choose a segment, pick a template, optionally override with custom phone numbers.">
        <form action={sendCrmBroadcast} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-2">Segment</label>
            <select
              name="segment"
              required
              className="w-full border border-hairline rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans"
            >
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-2">Template</label>
            <select
              name="templateName"
              required
              className="w-full border border-hairline rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans"
            >
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <p className="text-[10px] text-ink-tertiary mt-2 font-sans">Only the 11 Meta-registered templates are available.</p>
          </div>

          <div>
            <label className="block text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-ink-tertiary mb-2">Custom phones (optional)</label>
            <input
              type="text"
              name="customPhones"
              placeholder="+2348010000001, +2348020000001"
              className="w-full border border-hairline rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary text-ink bg-canvas font-sans"
            />
            <p className="text-[10px] text-ink-tertiary mt-2 font-sans">Comma-separated E.164 numbers. If provided, overrides the segment.</p>
          </div>

          <div className="pt-4 border-t border-hairline flex items-center justify-between">
            <p className="text-[10px] text-ink-tertiary font-sans">Every send is audited to whatsapp_audit_log.</p>
            <button className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-sans font-semibold hover:bg-primary-dark transition-colors cursor-pointer border-none">
              Send broadcast
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}
