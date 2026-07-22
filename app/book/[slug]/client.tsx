"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { propertyHref } from "@/lib/slug";
import { Footer } from "@/components/footer";

interface Props {
  propertyId: string;
  propertySlug: string;
  propertyName: string;
  city: string;
  neighbourhood: string;
  neighbourhoodSlug: string;
  buildingSlug: string;
  nightlyRateMinor: number;
  depositMinor: number;
  currency: string;
  extendedCheckoutOffered: boolean;
  extendedCheckoutPriceMinor: number | null;
  sleeps: number;
  coverPhotoUrl?: string | null;
}

type Step = "dates" | "checkout" | "payment";

export function BookingFlow(props: Props) {
  const router = useRouter();
  const {
    propertyId, propertySlug, propertyName, city, neighbourhood,
    neighbourhoodSlug, buildingSlug,
    nightlyRateMinor, depositMinor, currency,
    extendedCheckoutOffered, extendedCheckoutPriceMinor,
    sleeps, coverPhotoUrl,
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
    if (s === "dates") return "Guest info";
    if (s === "checkout") return "Checkout option";
    return "Payment";
  }

  function validateStep() {
    const errors: Record<string, string> = {};
    if (step === "dates") {
      if (!checkIn) errors.checkIn = "Required";
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
      <header className="bg-card border-b border-line sticky top-0 z-50">
        <div className="max-w-[1240px] mx-auto px-8 py-4 flex items-center gap-5 max-sm:px-5">
          <Link href={propertyHref({ city, neighbourhood_slug: neighbourhoodSlug, building_slug: buildingSlug, slug: propertySlug })} className="font-sans text-sm font-medium text-ink-secondary no-underline hover:text-green-soft transition-colors shrink-0">
            &#8592; Back to property
          </Link>
          <Link href="/" className="shrink-0 no-underline">
            <img src="/assets/images/logo/logo-wrd.png" alt="CheckinBliss" className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-8 py-10 max-sm:px-5">
        <div className="grid grid-cols-[1fr_400px] gap-16 items-start max-lg:grid-cols-1 max-lg:gap-10">
          {/* Main */}
          <div className="min-w-0">
            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-10 font-sans text-sm text-mute">
              <div className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center text-[13px] font-semibold shrink-0 ${currentIndex >= 0 ? "bg-brass border-brass text-soft" : "border-line"}`}>
                {currentIndex > 0 ? "✓" : "1"}
              </div>
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.1em]">Dates</span>
              <div className="w-6 h-px bg-line shrink-0" />
              <div className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center text-[13px] font-semibold shrink-0 ${currentIndex >= 1 ? "bg-brass border-brass text-soft" : "border-line"}`}>
                {currentIndex > 1 ? "✓" : "2"}
              </div>
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.1em]">Guest info</span>
              <div className="w-6 h-px bg-line shrink-0" />
              <div className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center text-[13px] font-semibold shrink-0 ${currentIndex >= 2 ? "bg-brass border-brass text-soft" : "border-line"}`}>
                3
              </div>
              <span className="font-sans text-xs font-semibold uppercase tracking-[0.1em]">Payment</span>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-danger/5 border border-danger/20 text-sm text-danger font-medium font-sans">
                {error}
              </div>
            )}

            {/* Sidebar (mobile only — shown before form on small screens) */}
            <div className="hidden max-lg:block mb-8">
              <BookingSidebar
                propertyName={propertyName}
                neighbourhood={neighbourhood}
                city={city}
                coverPhotoUrl={coverPhotoUrl}
                checkIn={checkIn}
                checkOut={checkOut}
                nights={nights}
                accommodationTotal={accommodationTotal}
                extendedFee={extendedFee}
                chargeTotal={chargeTotal}
                depositMinor={depositMinor}
                nightlyLabel={nightlyLabel}
                depositLabel={depositLabel}
                chargeLabel={chargeLabel}
                extendedFeeLabel={extendedFeeLabel}
                currency={currency as CurrencyCode}
                step={step}
              />
            </div>

            {/* STEP 1 — Guest details */}
            {step === "dates" && (
              <div className="bg-card rounded-[var(--radius-lg)] border border-line p-7">
                <h2 className="font-display text-[22px] font-medium text-ink mb-5">Guest details</h2>
                <div className="grid grid-cols-2 gap-4 mb-4 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">First name</label>
                    <input
                      type="text"
                      placeholder="Temi"
                      value={guestName}
                      onChange={(e) => { setGuestName(e.target.value); setFieldErrors((f) => ({ ...f, name: "" })); }}
                      className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors ${fieldErrors.name ? "border-danger" : "border-line focus:border-green-soft"}`}
                    />
                    {fieldErrors.name && <p className="font-sans text-[10px] text-danger mt-0.5">Required</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Last name</label>
                    <input
                      type="text"
                      placeholder="Adetola"
                      className="px-4 py-3 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Email address</label>
                    <input
                      type="email"
                      placeholder="temi@email.com"
                      value={guestEmail}
                      onChange={(e) => { setGuestEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: "" })); }}
                      className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors ${fieldErrors.email ? "border-danger" : "border-line focus:border-green-soft"}`}
                    />
                    {fieldErrors.email && <p className="font-sans text-[10px] text-danger mt-0.5">Required</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Phone number</label>
                    <input
                      type="tel"
                      placeholder="+234 801 234 5678"
                      value={guestPhone}
                      onChange={(e) => { setGuestPhone(e.target.value); setFieldErrors((f) => ({ ...f, phone: "" })); }}
                      className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors ${fieldErrors.phone ? "border-danger" : "border-line focus:border-green-soft"}`}
                    />
                    {fieldErrors.phone && <p className="font-sans text-[10px] text-danger mt-0.5">Required</p>}
                  </div>
                </div>

                <h2 className="font-display text-[22px] font-medium text-ink mb-5 mt-8">Trip details</h2>
                <div className="flex flex-col gap-1 mb-4">
                  <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">What brings you to {city}?</label>
                  <select className="px-4 py-3 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[15px] text-ink outline-none cursor-pointer appearance-none focus:border-green-soft transition-colors">
                    <option>Business travel</option>
                    <option>Leisure / holiday</option>
                    <option>Relocation</option>
                    <option>Visiting family</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Special requests (optional)</label>
                  <input type="text" placeholder="Early check-in, airport transfer, dietary needs…" className="px-4 py-3 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors" />
                </div>

                <hr className="border-none border-t border-line my-6" />

                <h2 className="font-display text-[22px] font-medium text-ink mb-5">Choose your dates</h2>
                <div className="grid grid-cols-2 gap-4 mb-5 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-medium text-mute">Check-in</label>
                    <input
                      type="date"
                      min={minDateStr}
                      value={checkIn}
                      onChange={(e) => { setCheckIn(e.target.value); setFieldErrors((f) => ({ ...f, checkIn: "", checkOut: "" })); }}
                      className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors ${fieldErrors.checkIn ? "border-danger" : "border-line focus:border-green-soft"}`}
                    />
                    {fieldErrors.checkIn && <p className="font-sans text-[10px] text-danger mt-0.5">{fieldErrors.checkIn}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-medium text-mute">Check-out</label>
                    <input
                      type="date"
                      min={checkIn || minDateStr}
                      value={checkOut}
                      onChange={(e) => { setCheckOut(e.target.value); setFieldErrors((f) => ({ ...f, checkOut: "" })); }}
                      className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors ${fieldErrors.checkOut ? "border-danger" : "border-line focus:border-green-soft"}`}
                    />
                    {fieldErrors.checkOut && <p className="font-sans text-[10px] text-danger mt-0.5">{fieldErrors.checkOut}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-1 mb-5">
                  <label className="font-sans text-xs font-medium text-mute">Guests</label>
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value))}
                    className="w-32 px-4 py-3 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[15px] text-ink outline-none cursor-pointer"
                  >
                    {Array.from({ length: sleeps }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleContinue}
                  className="w-full py-4 rounded-sm bg-brass text-soft font-sans text-base font-semibold transition-all hover:bg-brass-dark cursor-pointer border-none"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 2 — Checkout option */}
            {step === "checkout" && (
              <div className="bg-card rounded-[var(--radius-lg)] border border-line p-7">
                <h2 className="font-display text-[22px] font-medium text-ink mb-1">Checkout preference</h2>
                <p className="font-sans text-xs text-ink-secondary mb-5">
                  Choose how late you&rsquo;d like to check out. Standard checkout at 11:00 is included.
                </p>

                <div className="space-y-3 mb-6">
                  <label className={`flex items-center justify-between p-4 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${!extendedCheckout ? "border-brass bg-soft" : "border-line hover:bg-soft"}`}>
                    <div>
                      <p className="font-sans text-sm font-semibold text-ink">Standard checkout — 11:00</p>
                      <p className="font-sans text-xs text-ink-secondary mt-0.5">Included with every booking.</p>
                    </div>
                    <input type="radio" name="checkout" checked={!extendedCheckout} onChange={() => setExtendedCheckout(false)} className="accent-brass" />
                  </label>

                  {extendedCheckoutOffered && extendedCheckoutPriceMinor && (
                    <label className={`flex items-center justify-between p-4 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${extendedCheckout ? "border-brass bg-soft" : "border-line hover:bg-soft"}`}>
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

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("dates")}
                    className="flex-1 py-3 rounded-sm border border-line text-sm font-medium text-ink-secondary hover:bg-soft transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep("payment")}
                    className="flex-1 py-3 rounded-sm bg-brass text-soft text-sm font-semibold transition-all hover:bg-brass-dark cursor-pointer border-none"
                  >
                    Continue to payment
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Payment */}
            {step === "payment" && (
              <div className="bg-card rounded-[var(--radius-lg)] border border-line p-7">
                <h2 className="font-display text-[22px] font-medium text-ink mb-1">Payment method</h2>
                <p className="font-sans text-xs text-ink-secondary mb-5">Your card won&rsquo;t be charged until 48 hours before check-in.</p>

                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-4 p-5 rounded-[var(--radius-md)] border cursor-pointer border-brass bg-soft hover:border-green-soft transition-colors">
                    <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-brass shrink-0 flex items-center justify-center">
                      <div className="w-[9px] h-[9px] rounded-full bg-brass" />
                    </div>
                    <svg className="w-6 h-6 text-mute shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    <span className="font-sans text-sm font-medium text-ink">Credit or debit card</span>
                  </label>
                  <label className="flex items-center gap-4 p-5 rounded-[var(--radius-md)] border cursor-pointer border-line hover:border-green-soft transition-colors">
                    <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-line shrink-0" />
                    <svg className="w-6 h-6 text-mute shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M12 8v8"/></svg>
                    <span className="font-sans text-sm font-medium text-ink">Bank transfer</span>
                  </label>
                </div>

                <div className="flex flex-col gap-1 mb-4">
                  <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Card number</label>
                  <input type="text" placeholder="1234 5678 9012 3456" className="px-4 py-3 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Expiry date</label>
                    <input type="text" placeholder="MM / YY" className="px-4 py-3 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">CVC</label>
                    <input type="text" placeholder="123" className="px-4 py-3 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 mb-4">
                  <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Cardholder name</label>
                  <input type="text" placeholder="Temi Adetola" className="px-4 py-3 rounded-[var(--radius-md)] border border-line bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors" />
                </div>

                <div className="p-5 bg-soft rounded-none mt-5">
                  <div className="font-sans text-sm font-semibold text-ink mb-2">Free cancellation</div>
                  <p className="font-sans text-[13px] leading-relaxed text-ink-secondary">
                    Cancel up to 48 hours before check-in for a full refund. After that, the first night is non-refundable.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setStep("checkout")}
                    className="flex-1 py-3 rounded-sm border border-line text-sm font-medium text-ink-secondary hover:bg-soft transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="flex-1 py-3.5 rounded-sm bg-brass text-soft text-sm font-semibold transition-all hover:bg-brass-dark disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
                  >
                    {submitting ? "Processing..." : `Confirm and pay`}
                  </button>
                </div>

                <p className="font-sans text-xs text-center mt-4 text-mute">
                  <strong className="text-ink-secondary">You won&rsquo;t be charged yet.</strong><br />
                  Your card will be charged 48 hours before check-in.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar (desktop) */}
          <aside className="relative max-lg:hidden">
            <BookingSidebar
              propertyName={propertyName}
              neighbourhood={neighbourhood}
              city={city}
              coverPhotoUrl={coverPhotoUrl}
              checkIn={checkIn}
              checkOut={checkOut}
              nights={nights}
              accommodationTotal={accommodationTotal}
              extendedFee={extendedFee}
              chargeTotal={chargeTotal}
              depositMinor={depositMinor}
              nightlyLabel={nightlyLabel}
              depositLabel={depositLabel}
              chargeLabel={chargeLabel}
              extendedFeeLabel={extendedFeeLabel}
              currency={currency as CurrencyCode}
              step={step}
            />
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function BookingSidebar({
  propertyName,
  neighbourhood,
  city,
  coverPhotoUrl,
  checkIn,
  checkOut,
  nights,
  accommodationTotal,
  extendedFee,
  chargeTotal,
  depositMinor,
  nightlyLabel,
  depositLabel,
  chargeLabel,
  extendedFeeLabel,
  currency,
  step,
}: {
  propertyName: string;
  neighbourhood: string;
  city: string;
  coverPhotoUrl?: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  accommodationTotal: number;
  extendedFee: number;
  chargeTotal: number;
  depositMinor: number;
  nightlyLabel: string;
  depositLabel: string;
  chargeLabel: string;
  extendedFeeLabel: string | null;
  currency: CurrencyCode;
  step: Step;
}) {
  return (
    <div className="p-7 bg-card rounded-[var(--radius-lg)] border border-line sticky top-[80px]">
      <div className="flex gap-4 mb-5 pb-5 border-b border-line">
        {coverPhotoUrl ? (
          <div className="w-[100px] h-20 rounded-[var(--radius-md)] overflow-hidden shrink-0 bg-soft">
            <img src={coverPhotoUrl} alt={propertyName} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-[100px] h-20 rounded-[var(--radius-md)] overflow-hidden bg-soft shrink-0 flex items-center justify-center text-mute/40">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
          </div>
        )}
        <div>
          <div className="font-display text-lg font-medium text-ink leading-tight mb-1">{propertyName}</div>
          <div className="font-sans text-[13px] text-mute mb-1">{neighbourhood}, {city}</div>
        </div>
      </div>

      {step !== "dates" && checkIn && checkOut && (
        <div className="flex gap-4 mb-5 pb-5 border-b border-line">
          <div className="flex-1">
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-mute mb-1">Check-in</div>
            <div className="font-sans text-sm font-medium text-ink">{checkIn}</div>
            <div className="font-sans text-xs text-mute">After 2:00 PM</div>
          </div>
          <div className="flex-1 text-right">
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-mute mb-1">Check-out</div>
            <div className="font-sans text-sm font-medium text-ink">{checkOut}</div>
            <div className="font-sans text-xs text-mute">Before 11:00 AM</div>
          </div>
        </div>
      )}

      {nights > 0 && (
        <>
          <div className="font-sans text-sm flex justify-between py-1">
            <span className="text-ink-secondary">{nightlyLabel} × {nights} night{nights > 1 ? "s" : ""}</span>
            <span className="font-semibold tabular-nums text-ink">{formatMinor(accommodationTotal, currency)}</span>
          </div>
          <div className="font-sans text-sm flex justify-between py-1">
            <span className="text-ink-secondary">Cleaning fee</span>
            <span className="font-semibold tabular-nums text-ink">{formatMinor(4500, currency)}</span>
          </div>
          <div className="font-sans text-sm flex justify-between py-1">
            <span className="text-ink-secondary">Service fee</span>
            <span className="font-semibold tabular-nums text-ink">{formatMinor(6200, currency)}</span>
          </div>
          {extendedFee > 0 && (
            <div className="font-sans text-sm flex justify-between py-1">
              <span className="text-ink-secondary">Extended checkout</span>
              <span className="font-semibold tabular-nums text-ink">{extendedFeeLabel}</span>
            </div>
          )}
          <div className="font-sans text-sm flex justify-between py-1 text-green-soft">
            <span>First-time guest credit</span>
            <span className="font-semibold">&minus;{formatMinor(4000, currency)}</span>
          </div>
          <div className="font-sans text-[15px] flex justify-between pt-3 mt-3 border-t border-line font-semibold text-ink">
            <span>Total</span>
            <span>{formatMinor(Math.max(0, chargeTotal - 4000), currency)}</span>
          </div>
        </>
      )}

      <div className="font-sans text-sm flex justify-between py-1 mt-3">
        <span className="text-ink-secondary">Deposit hold</span>
        <span className="font-semibold text-ink">{depositLabel}</span>
      </div>
      <p className="font-sans text-[11px] leading-relaxed text-mute mt-1">
        Pre-authorized — not a charge. Released 7 days after clean checkout.
      </p>
    </div>
  );
}
