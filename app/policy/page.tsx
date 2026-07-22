import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Cancellation Policy — CheckinBliss" };

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-bone">
      <header className="border-b border-hairline bg-white px-8 py-4">
        <div className="max-w-[800px] mx-auto flex items-center justify-between">
          <Link href="/" className="no-underline">
            <img src="/assets/images/logo/Logo1.png" alt="CheckinBliss" className="h-7 w-auto" />
          </Link>
          <Link href="/" className="text-sm text-ink-secondary hover:text-ink no-underline">← Back</Link>
        </div>
      </header>
      <div className="max-w-[800px] mx-auto px-6 py-12">
        <h1 className="font-display text-3xl font-medium text-ink mb-4">Cancellation & Security Deposit Policy</h1>
        <p className="text-sm text-ink-secondary mb-12">Effective from July 2026</p>

        {/* Cancellation */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-medium text-ink mb-4">Cancellation Policy</h2>
          <div className="space-y-4 text-sm text-ink-secondary leading-relaxed">
            <div className="p-5 rounded-xl bg-card border border-hairline">
              <h3 className="font-sans text-base font-semibold text-ink mb-2">Free Cancellation</h3>
              <p>Cancel up to <strong>14 days before check-in</strong> for a full refund. No questions asked. The security deposit hold, if any, is released immediately.</p>
            </div>
            <div className="p-5 rounded-xl bg-card border border-hairline">
              <h3 className="font-sans text-base font-semibold text-ink mb-2">Partial Refund</h3>
              <p>Cancel <strong>7 to 14 days before check-in</strong> and receive a 50% refund of the accommodation charge. The security deposit hold is released in full.</p>
            </div>
            <div className="p-5 rounded-xl bg-card border border-hairline">
              <h3 className="font-sans text-base font-semibold text-ink mb-2">No Refund</h3>
              <p>Bookings cancelled <strong>less than 7 days</strong> before check-in are non-refundable. The security deposit hold is still released if no damage claim is filed.</p>
            </div>
          </div>
        </section>

        {/* Security Deposit */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-medium text-ink mb-4">Security Deposit</h2>
          <div className="space-y-4 text-sm text-ink-secondary leading-relaxed">
            <div className="p-5 rounded-xl bg-card border border-hairline">
              <h3 className="font-sans text-base font-semibold text-ink mb-2">What is it?</h3>
              <p>A security deposit is a <strong>card hold</strong> — not a charge. We authorise your card for a fixed amount per booking (stated on the property page) but <strong>no money is taken</strong> unless a verified damage claim is filed after your stay.</p>
            </div>
            <div className="p-5 rounded-xl bg-card border border-hairline">
              <h3 className="font-sans text-base font-semibold text-ink mb-2">When is it released?</h3>
              <p>If our operator confirms your apartment is <strong>in good condition</strong> after checkout, the hold is released immediately. It is <strong>automatically released within 7 days</strong> of checkout regardless — you don&rsquo;t need to do anything.</p>
            </div>
            <div className="p-5 rounded-xl bg-card border border-hairline">
              <h3 className="font-sans text-base font-semibold text-ink mb-2">What if there is damage?</h3>
              <p>If damage is reported, we&rsquo;ll provide <strong>photographic evidence</strong> and an itemised estimate. You have <strong>7 days to dispute</strong> the claim. Only the approved amount is captured — the remainder stays with you.</p>
            </div>
          </div>
        </section>

        {/* 14-day rule */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-medium text-ink mb-4">Booking Rules</h2>
          <div className="p-5 rounded-xl bg-card border border-hairline space-y-3 text-sm text-ink-secondary leading-relaxed">
            <p><strong>14-day advance:</strong> All bookings must be made at least 14 days before check-in. This ensures we have time to prepare the apartment and complete pre-arrival inspections.</p>
            <p><strong>Minimum stay:</strong> 2 nights minimum on all properties.</p>
            <p><strong>Check-in:</strong> From 2:00 PM on your arrival date.</p>
            <p><strong>Check-out:</strong> By 11:00 AM. Late checkout (until 6:00 PM) is available on select properties at an additional fee.</p>
          </div>
        </section>

        <p className="text-xs text-mute mt-12">CheckinBliss is operated by Lyxio Curtis Ltd, a UK-registered company. Company number SC863027.</p>
      </div>
    </div>
  );
}
