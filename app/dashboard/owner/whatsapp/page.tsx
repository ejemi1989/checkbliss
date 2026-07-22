import type { Metadata } from "next";
import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Owner — WhatsApp", robots: { index: false, follow: false } };

export default async function OwnerWhatsAppPage() {
  const user = await getSession();
  if (!user || user.role !== "owner") redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">WhatsApp Communication</h1>
        <p className="text-sm text-ink-secondary mt-1">
          Stay in touch with your assigned CheckinBliss operator. Automated notifications are sent for bookings, inspections, and verification reminders.
        </p>
      </div>

      {/* Contact operator */}
      <div className="bg-white rounded-xl border border-hairline p-6">
        <h2 className="font-sans text-base font-semibold text-ink mb-4">Your assigned operator</h2>
        <p className="text-sm text-ink-secondary mb-4">
          Your CheckinBliss operator manages your property listings, inspections, and guest coordination. Reach out via WhatsApp for any questions.
        </p>
        <div className="p-4 rounded-xl border border-hairline bg-primary-bg text-sm text-ink-secondary">
          <p className="font-medium text-ink mb-1">How to contact your operator</p>
          <p>Your operator will reach out to you directly once your property is onboarded. If you don&apos;t have their contact yet, email <span className="font-medium text-ink">hello@checkinbliss.com</span> and we&apos;ll connect you.</p>
        </div>
      </div>

      {/* Automated notifications */}
      <div className="bg-white rounded-xl border border-hairline p-6">
        <h2 className="font-sans text-base font-semibold text-ink mb-4">Automated notifications you&apos;ll receive</h2>
        <p className="text-xs text-ink-secondary mb-4">These messages are sent automatically via WhatsApp. No action required.</p>
        <div className="space-y-3">
          {[
            { title: "New booking confirmed", desc: "When a guest books your property. Includes guest name, dates, and unit details.", format: "WhatsApp template" },
            { title: "Pre-checkout reminder", desc: "Sent 24 hours before guest checkout. Reminds you to prepare for inspection.", format: "WhatsApp template" },
            { title: "Inspection result", desc: "CLEAN — deposit released. DAMAGE — claim filed with evidence and itemised estimate.", format: "WhatsApp template" },
            { title: "Monthly verification due", desc: "When your property is due for its monthly re-verification inspection.", format: "WhatsApp template" },
            { title: "Payout processed", desc: "When your earnings for completed bookings have been transferred.", format: "WhatsApp template" },
          ].map((m) => (
            <div key={m.title} className="flex items-start justify-between p-3 rounded-lg bg-primary-bg">
              <div>
                <p className="text-sm font-medium text-ink">{m.title}</p>
                <p className="text-xs text-ink-secondary mt-0.5">{m.desc}</p>
              </div>
              <span className="text-[10px] font-semibold text-mute shrink-0 ml-4">{m.format}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar sync */}
      <div className="bg-white rounded-xl border border-hairline p-6">
        <h2 className="font-sans text-base font-semibold text-ink mb-4">Calendar sync</h2>
        <p className="text-xs text-ink-secondary mb-4">Sync your CheckinBliss bookings to your personal calendar app. Your operator can share sync links for your properties.</p>
        <div className="p-4 rounded-xl bg-primary-bg text-sm text-ink-secondary">
          Contact your operator to get your unique calendar sync URL.
        </div>
      </div>
    </div>
  );
}
