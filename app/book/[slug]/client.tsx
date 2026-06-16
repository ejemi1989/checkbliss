"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { Footer } from "@/components/footer";

interface Props {
  propertyId: string;
  propertySlug: string;
  propertyName: string;
  city: string;
  neighbourhood: string;
  nightlyRateMinor: number;
  depositMinor: number;
  currency: string;
  extendedCheckoutOffered: boolean;
  extendedCheckoutPriceMinor: number | null;
  sleeps: number;
}

type Step = "dates" | "checkout" | "payment";

export function BookingFlow(props: Props) {
  const router = useRouter();
  const {
    propertyId, propertySlug, propertyName, city, neighbourhood,
    nightlyRateMinor, depositMinor, currency,
    extendedCheckoutOffered, extendedCheckoutPriceMinor,
    sleeps,
  } = props;

  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [extendedCheckout, setExtendedCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const steps: Step[] = ["dates", "checkout", "payment"];
  const currentIndex = steps.indexOf(step);

  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 14);
  const minDateStr = minDate.toISOString().split("T")[0];

  const nights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const accommodationTotal = nights * nightlyRateMinor;
  const extendedFee = extendedCheckout && extendedCheckoutPriceMinor ? extendedCheckoutPriceMinor : 0;
  const chargeTotal = accommodationTotal + extendedFee;
  const nightlyLabel = formatMinor(nightlyRateMinor, currency as CurrencyCode);
  const depositLabel = formatMinor(depositMinor, currency as CurrencyCode);
  const chargeLabel = formatMinor(chargeTotal, currency as CurrencyCode);
  const extendedFeeLabel = extendedFee > 0 ? formatMinor(extendedFee, currency as CurrencyCode) : null;

  function stepLabel(s: Step) {
    if (s === "dates") return "Dates & guest";
    if (s === "checkout") return "Checkout option";
    return "Payment";
  }

  function validateStep() {
    const errors: Record<string, string> = {};
    if (step === "dates") {
      if (!checkIn) errors.checkIn = "Required";
      else if (checkIn < minDateStr) errors.checkIn = "Must be 14+ days ahead";
      if (!checkOut) errors.checkOut = "Required";
      else if (checkOut <= checkIn) errors.checkOut = "Must be after check-in";
      if (!guestName.trim()) errors.name = "Required";
      if (!guestEmail.trim()) errors.email = "Required";
      if (!guestPhone.trim()) errors.phone = "Required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleContinue() {
    if (validateStep()) {
      setStep("checkout");
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const body = {
      guest: { name: guestName, email: guestEmail, phone: guestPhone, guests: guestCount },
      items: [{ property_id: propertyId, check_in: checkIn, check_out: checkOut, extended_checkout: extendedCheckout }],
    };
    try {
      const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Booking failed. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(`/confirmation/${data.reference}`);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bone">
      {/* Nav */}
      <nav className="bg-white border-b border-hairline px-8 py-4 flex items-center justify-between max-sm:px-5">
        <Link href="/" className="font-sans text-xl font-bold tracking-tight text-ink no-underline">
          checkin<span className="text-brass">Bliss</span>
        </Link>
        <Link href={`/stays/${propertySlug}`} className="text-xs font-medium text-ink-secondary hover:text-ink transition-colors">
          ← Back to {propertyName}
        </Link>
      </nav>

      <div className="mx-auto max-w-[720px] px-4 sm:px-6 lg:px-8 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-x-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-x-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= currentIndex ? "bg-brass text-white" : "bg-hairline text-ink-secondary"
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs font-medium ${i <= currentIndex ? "text-ink" : "text-ink-tertiary"}`}>
                {stepLabel(s)}
              </span>
              {i < steps.length - 1 && <div className={`w-8 h-px ${i < currentIndex ? "bg-brass" : "bg-hairline"}`} />}
            </div>
          ))}
        </div>

        {/* Booking summary sidebar */}
        <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-white border border-hairline">
          <p className="font-serif text-base font-semibold text-ink mb-1">{propertyName}</p>
          <p className="font-sans text-xs text-ink-secondary">{neighbourhood}, {city}</p>
          {step !== "dates" && nights > 0 && (
            <div className="flex items-baseline gap-x-2 mt-2 text-sm">
              <span className="text-ink-secondary">{nights} night{nights > 1 ? "s" : ""}</span>
              <span className="font-semibold tabular-nums text-ink">{chargeLabel}</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger/5 border border-danger/20 text-sm text-danger font-medium">
            {error}
          </div>
        )}

        {/* STEP 1 — Dates & Guest */}
        {step === "dates" && (
          <div className="bg-white rounded-[var(--radius-md)] border border-hairline p-6">
            <h2 className="font-serif text-lg font-bold text-ink mb-1">Choose your dates</h2>
            <p className="font-sans text-xs text-ink-secondary mb-5">Bookings open 14+ days ahead — we verify every stay.</p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="font-sans text-xs font-medium text-ink-secondary block mb-1.5">Check-in</label>
                <input
                  type="date"
                  min={minDateStr}
                  value={checkIn}
                  onChange={(e) => { setCheckIn(e.target.value); setFieldErrors((f) => ({ ...f, checkIn: "", checkOut: "" })); }}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-sans text-ink outline-none focus:border-brass transition-colors ${fieldErrors.checkIn ? "border-danger" : "border-hairline"}`}
                />
                {fieldErrors.checkIn && <p className="font-sans text-[10px] text-danger mt-0.5">{fieldErrors.checkIn}</p>}
                <p className="font-sans text-[10px] text-ink-tertiary mt-1">14 days from today minimum</p>
              </div>
              <div>
                <label className="font-sans text-xs font-medium text-ink-secondary block mb-1.5">Check-out</label>
                <input
                  type="date"
                  min={checkIn || minDateStr}
                  value={checkOut}
                  onChange={(e) => { setCheckOut(e.target.value); setFieldErrors((f) => ({ ...f, checkOut: "" })); }}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-sans text-ink outline-none focus:border-brass transition-colors ${fieldErrors.checkOut ? "border-danger" : "border-hairline"}`}
                />
                {fieldErrors.checkOut && <p className="font-sans text-[10px] text-danger mt-0.5">{fieldErrors.checkOut}</p>}
              </div>
            </div>

            {nights > 0 && (
              <div className="p-3 rounded-xl bg-primary-bg mb-5 flex justify-between text-sm">
                <span className="text-ink-secondary">
                  {nights} night{nights > 1 ? "s" : ""} × {nightlyLabel}
                </span>
                <span className="font-semibold tabular-nums text-ink">{chargeLabel}</span>
              </div>
            )}

            <div className="border-t border-hairline pt-5">
              <h3 className="font-serif text-base font-semibold text-ink mb-4">Guest details</h3>
              <div className="space-y-4">
                <div>
                  <label className="font-sans text-xs font-medium text-ink-secondary block mb-1.5">Full name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={guestName}
                  onChange={(e) => { setGuestName(e.target.value); setFieldErrors((f) => ({ ...f, name: "" })); }}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-sans text-ink outline-none focus:border-brass transition-colors ${fieldErrors.name ? "border-danger" : "border-hairline"}`}
                />
                {fieldErrors.name && <p className="font-sans text-[10px] text-danger mt-0.5">Required</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-sans text-xs font-medium text-ink-secondary block mb-1.5">Email</label>
                    <input
                      type="email"
                      placeholder="you@email.com"
                      value={guestEmail}
                      onChange={(e) => { setGuestEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: "" })); }}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm font-sans text-ink outline-none focus:border-brass transition-colors ${fieldErrors.email ? "border-danger" : "border-hairline"}`}
                    />
                    {fieldErrors.email && <p className="font-sans text-[10px] text-danger mt-0.5">Required</p>}
                  </div>
                  <div>
                    <label className="font-sans text-xs font-medium text-ink-secondary block mb-1.5">Phone</label>
                    <input
                      type="tel"
                      placeholder="+234 800 000 0000"
                      value={guestPhone}
                      onChange={(e) => { setGuestPhone(e.target.value); setFieldErrors((f) => ({ ...f, phone: "" })); }}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm font-sans text-ink outline-none focus:border-brass transition-colors ${fieldErrors.phone ? "border-danger" : "border-hairline"}`}
                    />
                    {fieldErrors.phone && <p className="font-sans text-[10px] text-danger mt-0.5">Required</p>}
                  </div>
                </div>
                <div>
                  <label className="font-sans text-xs font-medium text-ink-secondary block mb-1.5">Guests</label>
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value))}
                    className="w-32 border border-hairline rounded-xl px-4 py-2.5 text-sm font-sans text-ink outline-none"
                  >
                    {Array.from({ length: sleeps }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="w-full mt-6 py-3.5 rounded-full bg-brass text-white text-sm font-semibold transition-all hover:bg-brass-dark cursor-pointer border-none"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 2 — Checkout option */}
        {step === "checkout" && (
          <div className="bg-white rounded-[var(--radius-md)] border border-hairline p-6">
            <h2 className="font-serif text-lg font-bold text-ink mb-1">Checkout preference</h2>
            <p className="font-sans text-xs text-ink-secondary mb-5">
              Choose how late you&rsquo;d like to check out. Standard checkout at 11:00 is included.
            </p>

            <div className="space-y-3 mb-6">
              <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                !extendedCheckout ? "border-brass bg-brass-light/30" : "border-hairline hover:bg-bone"
              }`}>
                <div>
                  <p className="font-sans text-sm font-semibold text-ink">Standard checkout — 11:00</p>
                  <p className="font-sans text-xs text-ink-secondary mt-0.5">Included with every booking.</p>
                </div>
                <input type="radio" name="checkout" checked={!extendedCheckout} onChange={() => setExtendedCheckout(false)} className="accent-brass" />
              </label>

              {extendedCheckoutOffered && extendedCheckoutPriceMinor && (
                <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                  extendedCheckout ? "border-brass bg-brass-light/30" : "border-hairline hover:bg-bone"
                }`}>
                  <div>
                    <p className="font-sans text-sm font-semibold text-ink">Extended checkout — 18:00</p>
                    <p className="font-sans text-xs text-ink-secondary mt-0.5">
                      +{formatMinor(extendedCheckoutPriceMinor, currency as CurrencyCode)}. Request at least 48 hours before check-out.
                    </p>
                  </div>
                  <input type="radio" name="checkout" checked={extendedCheckout} onChange={() => setExtendedCheckout(true)} className="accent-brass" />
                </label>
              )}
            </div>

            <div className="flex gap-x-3">
              <button
                onClick={() => setStep("dates")}
                className="flex-1 py-3 rounded-full border border-hairline text-sm font-medium text-ink-secondary hover:bg-bone transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={() => setStep("payment")}
                className="flex-1 py-3 rounded-full bg-brass text-white text-sm font-semibold transition-all hover:bg-brass-dark cursor-pointer border-none"
              >
                Continue to payment
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Payment */}
        {step === "payment" && (
          <div className="bg-white rounded-[var(--radius-md)] border border-hairline p-6">
            <h2 className="font-serif text-lg font-bold text-ink mb-1">Confirm & pay</h2>
            <p className="font-sans text-xs text-ink-secondary mb-5">Review your stay before confirming.</p>

            <div className="space-y-3 mb-6">
              <div className="p-4 rounded-xl bg-primary-bg">
                <p className="font-serif text-sm font-semibold text-ink">{propertyName}</p>
                <p className="font-sans text-xs text-ink-secondary mt-0.5">{neighbourhood}, {city}</p>
                <div className="flex items-center gap-x-4 mt-2 text-xs text-ink-secondary">
                  <span>{checkIn} → {checkOut}</span>
                  <span>·</span>
                  <span>{guestCount} guest{guestCount > 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{guestName}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary-bg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-secondary">{nights} night{nights > 1 ? "s" : ""} × {nightlyLabel}</span>
                  <span className="font-semibold tabular-nums text-ink">{formatMinor(accommodationTotal, currency as CurrencyCode)}</span>
                </div>
                {extendedFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-secondary">Extended checkout (18:00)</span>
                    <span className="font-semibold tabular-nums text-ink">{extendedFeeLabel}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-hairline">
                  <span className="font-semibold text-ink">You pay today</span>
                  <span className="font-bold tabular-nums text-ink">{chargeLabel}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary-bg">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-secondary">Deposit hold</span>
                  <span className="font-semibold text-ink">{depositLabel}</span>
                </div>
                <p className="font-sans text-[11px] leading-relaxed text-ink-tertiary">
                  Pre-authorised — not a charge. Released within 7 days of a clean checkout.
                </p>
              </div>
            </div>

            <div className="flex gap-x-3">
              <button
                onClick={() => setStep("checkout")}
                className="flex-1 py-3 rounded-full border border-hairline text-sm font-medium text-ink-secondary hover:bg-bone transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="flex-1 py-3.5 rounded-full bg-brass text-white text-sm font-semibold transition-all hover:bg-brass-dark disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
              >
                {submitting ? "Processing..." : `Confirm & pay ${chargeLabel}`}
              </button>
            </div>

            <p className="font-sans text-[11px] leading-relaxed text-ink-tertiary text-center mt-4">
              No host approval. Instant confirmation. Book in GBP, USD, or EUR. Card data never touches our servers — processed securely by Airwallex.
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
