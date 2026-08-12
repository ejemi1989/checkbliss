"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { formatMinor, type CurrencyCode } from "@/lib/currency";
import { propertyHref } from "@/lib/slug";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK ?? "");

const STRIPE_APPEARANCE = {
  variables: {
    colorPrimary: "#0D3D56",
    colorBackground: "#FAFAF5",
    colorText: "#1A1A1A",
    colorDanger: "#C0392B",
    fontFamily: "var(--font-sans)",
    borderRadius: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #D8DBCF",
      padding: "12px 16px",
      fontSize: "15px",
    },
    ".Input:focus": {
      border: "1px solid #5C6B4F",
      boxShadow: "none",
    },
  },
};

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
  initialStep?: string;
}

type Step = "dates" | "guest" | "payment";

export function BookingFlow(props: Props) {
  const router = useRouter();
  const {
    propertyId, propertySlug, propertyName, city, neighbourhood,
    neighbourhoodSlug, buildingSlug,
    nightlyRateMinor, depositMinor, currency,
    extendedCheckoutOffered, extendedCheckoutPriceMinor,
    sleeps, coverPhotoUrl, initialStep,
  } = props;

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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [chargeClientSecret, setChargeClientSecret] = useState<string | null>(null);
  const [holdClientSecret, setHoldClientSecret] = useState<string | null>(null);
  const [bookingGroupId, setBookingGroupId] = useState<string | null>(null);

  const [minDateStr] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 14);
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  const steps: Step[] = ["dates", "guest", "payment"];
  const validStep = steps.includes(initialStep as Step) ? (initialStep as Step) : "dates";
  const [step, setStepState] = useState<Step>(validStep);
  const currentIndex = steps.indexOf(step);

  function setStep(s: Step) {
    setStepState(s);
    const params = new URLSearchParams(window.location.search);
    params.set("step", s);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const nights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const accommodationTotal = nights * nightlyRateMinor;
  const extendedFee = extendedCheckout && extendedCheckoutPriceMinor ? extendedCheckoutPriceMinor : 0;
  const chargeTotal = accommodationTotal + extendedFee;
  const nightlyLabel = formatMinor(nightlyRateMinor, currency as CurrencyCode);
  const depositLabel = formatMinor(depositMinor, currency as CurrencyCode);

  function formatCheckinDate(d: string) {
    if (!d) return "";
    const dt = new Date(d + "T12:00:00");
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function validateStep(s: Step) {
    const errors: Record<string, string> = {};
    if (s === "dates") {
      if (!checkIn) errors.checkIn = "Select a check-in date";
      if (!checkOut) errors.checkOut = "Select a check-out date";
      else if (checkOut <= checkIn) errors.checkOut = "Must be after check-in";
      if (nights < 2) errors.nights = "Minimum 2 nights";
    }
    if (s === "guest") {
      if (!guestName.trim()) errors.name = "Required";
      if (!guestEmail.trim()) errors.email = "Required";
      else if (!/\S+@\S+\.\S+/.test(guestEmail)) errors.email = "Invalid email";
      if (!guestPhone.trim()) errors.phone = "Required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleContinue(from: Step, to: Step) {
    if (validateStep(from)) {
      setStep(to);
      setError(null);
    }
  }

  async function createBookingIntents() {
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const body = {
      guest: { name: guestName, email: guestEmail, phone: guestPhone, guests: guestCount },
      items: [{ property_id: propertyId, check_in: checkIn, check_out: checkOut, extended_checkout: extendedCheckout }],
      turnstile_token: turnstileToken || "mock-token",
    };
    try {
      const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Booking failed. Please try again.");
        setSubmitting(false);
        return;
      }
      setChargeClientSecret(data.chargeClientSecret);
      setHoldClientSecret(data.holdClientSecret);
      setBookingGroupId(data.booking_group_id);
      setSubmitting(false);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const totalAfterCredit = Math.max(0, chargeTotal - 4000);

  const stepInfo = [
    { label: "Dates", num: 1 },
    { label: "Guest info", num: 2 },
    { label: "Payment", num: 3 },
  ];

  return (
    <>
      <div className="min-h-screen bg-bone">
      <header className="bg-card border-b border-hairline sticky top-0 z-50">
        <div className="max-w-[1240px] mx-auto px-8 py-4 flex items-center gap-5 max-sm:px-5">
          <Link href={propertyHref({ city, neighbourhood_slug: neighbourhoodSlug, building_slug: buildingSlug, slug: propertySlug })} className="font-sans text-sm font-medium text-ink-secondary no-underline hover:text-green-soft transition-colors shrink-0">
            &#8592; Back to property
          </Link>
          <span className="font-display text-xl font-medium text-ink tracking-[-0.01em]">CheckinBliss</span>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-8 py-10 max-sm:px-5">
        <div className="grid grid-cols-[1fr_400px] gap-16 items-start max-lg:grid-cols-1 max-lg:gap-10">
          {/* Main */}
          <div className="min-w-0">
            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-10 font-sans">
              {stepInfo.map((si, i) => {
                const isDone = currentIndex > i;
                const isActive = currentIndex === i;
                return (
                  <div key={si.label} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center text-[13px] font-semibold shrink-0 ${
                      isDone ? "bg-green-soft border-green-soft text-bone" :
                      isActive ? "bg-brass border-brass text-bone" :
                      "border-hairline text-mute"
                    }`}>
                      {isDone ? "✓" : si.num}
                    </div>
                    <span className={`font-sans text-xs font-semibold uppercase tracking-[0.1em] ${isActive ? "text-ink" : "text-mute"}`}>{si.label}</span>
                    {i < 2 && <div className="w-6 h-px bg-hairline shrink-0" />}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="p-4 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-red-700 text-sm mb-6">
                {error}
              </div>
            )}

            {/* STEP 1 — Dates */}
            {step === "dates" && (
              <div>
                <h2 className="font-display text-[22px] font-medium text-ink mb-6">Select your dates</h2>
                <div className="grid grid-cols-2 gap-4 mb-4 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Check-in</label>
                    <input
                      type="date"
                      min={minDateStr}
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors"
                    />
                    {fieldErrors.checkIn && <span className="text-red-600 text-xs">{fieldErrors.checkIn}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Check-out</label>
                    <input
                      type="date"
                      min={checkIn || minDateStr}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors"
                    />
                    {fieldErrors.checkOut && <span className="text-red-600 text-xs">{fieldErrors.checkOut}</span>}
                  </div>
                </div>
                {fieldErrors.nights && <p className="text-red-600 text-xs mb-4">{fieldErrors.nights}</p>}

                <div className="flex flex-col gap-1 mb-6">
                  <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Guests</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                      disabled={guestCount <= 1}
                      className="w-9 h-9 rounded-full border border-hairline flex items-center justify-center text-ink disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="font-sans text-[15px] font-medium text-ink min-w-[24px] text-center">{guestCount}</span>
                    <button
                      onClick={() => setGuestCount((c) => Math.min(sleeps, c + 1))}
                      disabled={guestCount >= sleeps}
                      className="w-9 h-9 rounded-full border border-hairline flex items-center justify-center text-ink disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                    <span className="font-sans text-xs text-mute ml-1">Max {sleeps} guests</span>
                  </div>
                </div>

                <button
                  onClick={() => handleContinue("dates", "guest")}
                  className="w-full py-3.5 rounded-[var(--radius-sm)] bg-brass text-bone text-sm font-semibold transition-all hover:bg-brass-dark cursor-pointer border-none"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 2 — Guest info */}
            {step === "guest" && (
              <div>
                <h2 className="font-display text-[22px] font-medium text-ink mb-6">Guest information</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Full name</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Temi Adetola"
                      className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors placeholder:text-mute"
                    />
                    {fieldErrors.name && <span className="text-red-600 text-xs">{fieldErrors.name}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Email</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="temi@example.com"
                      className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors placeholder:text-mute"
                    />
                    {fieldErrors.email && <span className="text-red-600 text-xs">{fieldErrors.email}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Phone number</label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+44 7700 900000"
                      className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors placeholder:text-mute"
                    />
                    {fieldErrors.phone && <span className="text-red-600 text-xs">{fieldErrors.phone}</span>}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setStep("dates"); setError(null); }} className="flex-1 py-3 rounded-[var(--radius-sm)] border border-hairline text-sm font-medium text-ink-secondary hover:bg-soft transition-colors cursor-pointer">
                    Back
                  </button>
                  <button
                    onClick={() => handleContinue("guest", "payment")}
                    className="flex-1 py-3.5 rounded-[var(--radius-sm)] bg-brass text-bone text-sm font-semibold transition-all hover:bg-brass-dark cursor-pointer border-none"
                  >
                    Continue to payment
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Payment */}
            {step === "payment" && (
              <div>
                <h2 className="font-display text-[22px] font-medium text-ink mb-1">Payment method</h2>
                <p className="font-sans text-xs text-ink-secondary mb-5">Your card won&rsquo;t be charged until 48 hours before check-in.</p>

                {!chargeClientSecret ? (
                  <>
                    {/* Extended checkout option */}
                    {extendedCheckoutOffered && extendedCheckoutPriceMinor && (
                      <div className="p-5 rounded-[var(--radius-md)] border border-hairline mb-5">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <p className="font-sans text-sm font-semibold text-ink">Extended checkout — 18:00</p>
                            <p className="text-xs text-ink-secondary mt-0.5">
                              +{formatMinor(extendedCheckoutPriceMinor, currency as CurrencyCode)}
                            </p>
                          </div>
                          <input type="checkbox" checked={extendedCheckout} onChange={(e) => setExtendedCheckout(e.target.checked)} className="accent-brass w-4 h-4" />
                        </label>
                      </div>
                    )}

                    {/* Cancellation policy */}
                    <div className="p-5 bg-bone-secondary rounded-[var(--radius-sm)] mb-5">
                      <div className="font-sans text-sm font-semibold text-ink mb-2">Free cancellation</div>
                      <p className="font-sans text-[13px] leading-relaxed text-ink-secondary">
                        Cancel up to 48 hours before check-in for a full refund. After that, the first night is non-refundable. Date changes are free up to 7 days before check-in.{" "}
                        <Link href="/policy" className="text-green-soft hover:text-green-dark no-underline">Read the full policy →</Link>
                      </p>
                    </div>

                    {/* Turnstile CAPTCHA */}
                    {TURNSTILE_SITE_KEY && (
                      <div className="mb-5">
                        <Turnstile
                          ref={turnstileRef}
                          siteKey={TURNSTILE_SITE_KEY}
                          injectScript={false}
                          onSuccess={(token) => setTurnstileToken(token)}
                          onExpire={() => setTurnstileToken(null)}
                          options={{ theme: "light", size: "normal" }}
                        />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button onClick={() => { setStep("guest"); setError(null); }} className="flex-1 py-3 rounded-[var(--radius-sm)] border border-hairline text-sm font-medium text-ink-secondary hover:bg-soft transition-colors cursor-pointer">
                        Back
                      </button>
                      <button
                        disabled={submitting}
                        onClick={createBookingIntents}
                        className="flex-1 py-3.5 rounded-[var(--radius-sm)] bg-brass text-bone text-sm font-semibold transition-all hover:bg-brass-dark disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
                      >
                        {submitting ? "Processing..." : "Confirm and pay"}
                      </button>
                    </div>

                    <p className="font-sans text-xs text-center mt-5 text-mute">
                      <strong className="text-ink-secondary">You won&rsquo;t be charged yet.</strong><br />
                      Your card will be charged 48 hours before check-in. Free cancellation until then.
                    </p>
                  </>
                ) : (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret: chargeClientSecret,
                      appearance: STRIPE_APPEARANCE,
                    }}
                  >
                    <PaymentStep
                      chargeClientSecret={chargeClientSecret}
                      holdClientSecret={holdClientSecret!}
                      bookingGroupId={bookingGroupId!}
                      depositMinor={depositMinor}
                      onBack={() => { setStep("guest"); setChargeClientSecret(null); setError(null); }}
                    />
                  </Elements>
                )}
              </div>
            )}
          </div>

          {/* Sidebar (desktop) */}
          <aside className="relative max-lg:hidden">
            <BookingSidebar
              propertyName={propertyName} neighbourhood={neighbourhood} city={city}
              coverPhotoUrl={coverPhotoUrl} checkIn={checkIn} checkOut={checkOut}
              formatCheckinDate={formatCheckinDate}
              nights={nights} accommodationTotal={accommodationTotal}
              extendedFee={extendedFee} chargeTotal={chargeTotal}
              depositMinor={depositMinor} nightlyLabel={nightlyLabel}
              depositLabel={depositLabel} currency={currency as CurrencyCode}
              step={step} totalAfterCredit={totalAfterCredit}
            />
          </aside>
        </div>
      </div>
    </div>
    </>
  );
}

function PaymentStep({
  chargeClientSecret,
  holdClientSecret,
  bookingGroupId,
  depositMinor,
  onBack,
}: {
  chargeClientSecret: string;
  holdClientSecret: string;
  bookingGroupId: string;
  depositMinor: number;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) {
      router.push(`/confirmation/${bookingGroupId}`);
      return;
    }
    setLoading(true);
    setError(null);

    const { error: chargeError } = await stripe.confirmPayment({
      elements,
      clientSecret: chargeClientSecret,
      confirmParams: { return_url: `${window.location.origin}/confirmation/${bookingGroupId}` },
      redirect: "if_required",
    });
    if (chargeError) {
      setError(chargeError.message ?? "Payment failed — nothing was charged.");
      setLoading(false);
      return;
    }

    const { error: holdError } = await stripe.confirmPayment({
      elements,
      clientSecret: holdClientSecret,
      confirmParams: { return_url: `${window.location.origin}/confirmation/${bookingGroupId}` },
      redirect: "if_required",
    });
    if (holdError) {
      console.error("[booking-flow] deposit hold failed (non-fatal):", holdError.message);
    }

    setLoading(false);
    router.push(`/confirmation/${bookingGroupId}`);
  }

  return (
    <div>
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card", "apple_pay", "google_pay"],
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="flex-1 py-3 rounded-[var(--radius-sm)] border border-hairline text-sm font-medium text-ink-secondary hover:bg-soft transition-colors cursor-pointer">
          Back
        </button>
        <button
          onClick={handlePay}
          disabled={!stripe || loading}
          className="flex-1 py-3.5 rounded-[var(--radius-sm)] bg-brass text-bone text-sm font-semibold transition-all hover:bg-brass-dark disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
        >
          {loading ? "Confirming…" : "Reserve instantly"}
        </button>
      </div>

      <p className="font-sans text-xs text-center mt-5 text-mute">
        Your {formatMinor(depositMinor, "GBP")} deposit is held, not charged.
        Released within 7 days of a clean checkout.
      </p>
    </div>
  );
}

function BookingSidebar({
  propertyName, neighbourhood, city, coverPhotoUrl,
  checkIn, checkOut, formatCheckinDate,
  nights, accommodationTotal, extendedFee, chargeTotal,
  depositMinor, nightlyLabel, depositLabel,
  currency, step, totalAfterCredit,
}: {
  propertyName: string; neighbourhood: string; city: string;
  coverPhotoUrl?: string | null; checkIn: string; checkOut: string;
  formatCheckinDate: (d: string) => string;
  nights: number; accommodationTotal: number; extendedFee: number;
  chargeTotal: number; depositMinor: number;
  nightlyLabel: string; depositLabel: string;
  currency: CurrencyCode; step: Step; totalAfterCredit: number;
}) {
  return (
    <div className="p-7 bg-card rounded-[var(--radius-lg)] border border-hairline sticky top-[80px]">
      {/* Property info */}
      <div className="flex gap-4 mb-5 pb-5 border-b border-hairline">
        {coverPhotoUrl ? (
          <div className="w-[100px] h-20 rounded-[var(--radius-md)] overflow-hidden shrink-0 bg-bone-secondary">
            <img src={coverPhotoUrl} alt={propertyName} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-[100px] h-20 rounded-[var(--radius-md)] overflow-hidden bg-bone-secondary shrink-0 flex items-center justify-center text-mute/40">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
          </div>
        )}
        <div>
          <div className="font-display text-lg font-medium text-ink leading-tight mb-1">{propertyName}</div>
          <div className="font-sans text-[13px] text-mute mb-1">{neighbourhood}, {city}</div>
          <div className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="text-brass">★</span> 4.9 · <span className="text-green-soft">✓</span> Verified
          </div>
        </div>
      </div>

      {/* Dates (shown from step 2 onwards) */}
      {step !== "dates" && checkIn && checkOut && (
        <div className="flex gap-4 mb-5 pb-5 border-b border-hairline">
          <div className="flex-1">
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-mute mb-1">Check-in</div>
            <div className="font-sans text-sm font-medium text-ink" suppressHydrationWarning>{formatCheckinDate(checkIn)}</div>
            <div className="font-sans text-xs text-mute">After 2:00 PM</div>
          </div>
          <div className="flex-1 text-right">
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-mute mb-1">Check-out</div>
            <div className="font-sans text-sm font-medium text-ink" suppressHydrationWarning>{formatCheckinDate(checkOut)}</div>
            <div className="font-sans text-xs text-mute">Before 11:00 AM</div>
          </div>
        </div>
      )}

      {/* Price breakdown (shown from step 2 onwards) */}
      {step !== "dates" && nights > 0 && (
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
              <span className="font-semibold tabular-nums text-ink">{formatMinor(extendedFee, currency)}</span>
            </div>
          )}
          <div className="font-sans text-sm flex justify-between py-1 text-green-soft">
            <span>First-time guest credit</span>
            <span className="font-semibold">&minus;{formatMinor(4000, currency)}</span>
          </div>
          <div className="font-sans text-[15px] flex justify-between pt-3 mt-3 border-t border-hairline font-semibold text-ink">
            <span>Total ({currency})</span>
            <span className="tabular-nums">{formatMinor(totalAfterCredit, currency)}</span>
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
