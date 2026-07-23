"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

type Step = "dates" | "guest" | "payment";

export function BookingFlow(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    propertyId, propertySlug, propertyName, city, neighbourhood,
    neighbourhoodSlug, buildingSlug,
    nightlyRateMinor, depositMinor, currency,
    extendedCheckoutOffered, extendedCheckoutPriceMinor,
    sleeps, coverPhotoUrl,
  } = props;

  const steps: Step[] = ["dates", "guest", "payment"];
  const rawStep = searchParams.get("step");
  const step: Step = steps.includes(rawStep as Step) ? (rawStep as Step) : "dates";
  const currentIndex = steps.indexOf(step);

  function setStep(s: Step) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", s);
    router.push(`?${params.toString()}`, { scroll: false });
  }
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

  const [minDateStr] = useState(() => {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 14);
    return `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, "0")}-${String(minDate.getDate()).padStart(2, "0")}`;
  });

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

  const totalAfterCredit = Math.max(0, chargeTotal - 4000);

  const stepInfo = [
    { label: "Dates", num: 1 },
    { label: "Guest info", num: 2 },
    { label: "Payment", num: 3 },
  ];

  return (
    <>
      <style>{`
        :root {
          --color-bone: #E9ECE2; --color-ink: #171915; --color-ink-secondary: #44483D;
          --color-card: #FCFDFB; --color-mute: #6A6E63; --color-hairline: #D8DBCF;
          --color-soft: #F4F6F0; --color-brass: #2F3D2C; --color-brass-dark: #232E22;
          --color-green-soft: #5C6B4F; --color-bone-secondary: #F4F6F0;
          --color-primary-bg: #F4F6F0; --color-primary: #5C6B4F;
          --color-error: #C62828;
          --font-display: var(--font-newsreader), Georgia, serif;
          --font-sans: var(--font-inter), system-ui, sans-serif;
          --radius-sm: 3px; --radius-md: 10px; --radius-lg: 18px; --radius-xl: 28px; --radius-full: 9999px;
        }
      `}</style>
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

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-error/5 border border-error/20 text-sm text-error font-medium font-sans">
                {error}
              </div>
            )}

            {/* Sidebar (mobile only) */}
            <div className="hidden max-lg:block mb-8">
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
            </div>

            {/* STEP 1 — Dates */}
            {step === "dates" && (
              <div>
                <div className="form-section" style={{ marginBottom: "var(--s10, 48px)" }}>
                  <h2 className="font-display text-[22px] font-medium text-ink mb-5">Choose your dates</h2>
                  <div className="grid grid-cols-2 gap-4 mb-5 max-sm:grid-cols-1">
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Check-in</label>
                      <input
                        type="date"
                        min={minDateStr}
                        value={checkIn}
                        onChange={(e) => { setCheckIn(e.target.value); setFieldErrors((f) => ({ ...f, checkIn: "", checkOut: "", nights: "" })); }}
                        className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors ${fieldErrors.checkIn ? "border-error" : "border-hairline focus:border-green-soft"}`}
                      />
                      {fieldErrors.checkIn && <p className="font-sans text-[10px] text-error mt-0.5">{fieldErrors.checkIn}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Check-out</label>
                      <input
                        type="date"
                        min={checkIn || minDateStr}
                        value={checkOut}
                        onChange={(e) => { setCheckOut(e.target.value); setFieldErrors((f) => ({ ...f, checkOut: "", nights: "" })); }}
                        className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors ${fieldErrors.checkOut || fieldErrors.nights ? "border-error" : "border-hairline focus:border-green-soft"}`}
                      />
                      {fieldErrors.checkOut && <p className="font-sans text-[10px] text-error mt-0.5">{fieldErrors.checkOut}</p>}
                      {fieldErrors.nights && !fieldErrors.checkOut && <p className="font-sans text-[10px] text-error mt-0.5">{fieldErrors.nights}</p>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mb-5">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Guests</label>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(parseInt(e.target.value))}
                      className="w-32 px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none cursor-pointer appearance-none"
                    >
                      {Array.from({ length: sleeps }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>

                  <p className="font-sans text-xs text-mute mb-5">Bookings open 14+ days ahead. 2 nights minimum.</p>

                  <button
                    onClick={() => handleContinue("dates", "guest")}
                    className="w-full py-4 rounded-[var(--radius-sm)] bg-brass text-bone font-sans text-base font-semibold transition-all hover:bg-brass-dark cursor-pointer border-none"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 — Guest info */}
            {step === "guest" && (
              <div>
                <div className="form-section" style={{ marginBottom: "var(--s10, 48px)" }}>
                  <h2 className="font-display text-[22px] font-medium text-ink mb-5">Guest details</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4 max-sm:grid-cols-1">
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">First name</label>
                      <input
                        type="text" placeholder="Temi"
                        value={guestName}
                        onChange={(e) => { setGuestName(e.target.value); setFieldErrors((f) => ({ ...f, name: "" })); }}
                        className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-mute ${fieldErrors.name ? "border-error" : "border-hairline focus:border-green-soft"}`}
                      />
                      {fieldErrors.name && <p className="font-sans text-[10px] text-error mt-0.5">Required</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Last name</label>
                      <input type="text" placeholder="Adetola" className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors placeholder:text-mute" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4 max-sm:grid-cols-1">
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Email address</label>
                      <input
                        type="email" placeholder="temi@email.com"
                        value={guestEmail}
                        onChange={(e) => { setGuestEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: "" })); }}
                        className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-mute ${fieldErrors.email ? "border-error" : "border-hairline focus:border-green-soft"}`}
                      />
                      {fieldErrors.email && <p className="font-sans text-[10px] text-error mt-0.5">{fieldErrors.email}</p>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Phone number</label>
                      <input
                        type="tel" placeholder="+234 801 234 5678"
                        value={guestPhone}
                        onChange={(e) => { setGuestPhone(e.target.value); setFieldErrors((f) => ({ ...f, phone: "" })); }}
                        className={`px-4 py-3 rounded-[var(--radius-md)] border bg-card font-sans text-[15px] text-ink outline-none transition-colors placeholder:text-mute ${fieldErrors.phone ? "border-error" : "border-hairline focus:border-green-soft"}`}
                      />
                      {fieldErrors.phone && <p className="font-sans text-[10px] text-error mt-0.5">Required</p>}
                    </div>
                  </div>
                </div>

                <div className="form-section" style={{ marginBottom: "var(--s10, 48px)" }}>
                  <h2 className="font-display text-[22px] font-medium text-ink mb-5">Trip details</h2>
                  <div className="flex flex-col gap-1 mb-4">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">What brings you to {city}?</label>
                    <select className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none cursor-pointer appearance-none focus:border-green-soft transition-colors">
                      <option>Business travel</option>
                      <option>Leisure / holiday</option>
                      <option>Relocation</option>
                      <option>Visiting family</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Special requests (optional)</label>
                    <input type="text" placeholder="Early check-in, airport transfer, dietary needs…" className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors placeholder:text-mute" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { setStep("dates"); setError(null); }} className="flex-1 py-3 rounded-[var(--radius-sm)] border border-hairline text-sm font-medium text-ink-secondary hover:bg-soft transition-colors cursor-pointer">
                    Back
                  </button>
                  <button onClick={() => handleContinue("guest", "payment")} className="flex-1 py-3 rounded-[var(--radius-sm)] bg-brass text-bone text-sm font-semibold transition-all hover:bg-brass-dark cursor-pointer border-none">
                    Continue to payment
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Payment */}
            {step === "payment" && (
              <div>
                <div className="form-section" style={{ marginBottom: "40px" }}>
                  <h2 className="font-display text-[22px] font-medium text-ink mb-1">Payment method</h2>
                  <p className="font-sans text-xs text-ink-secondary mb-5">Your card won&rsquo;t be charged until 48 hours before check-in.</p>

                  <div className="space-y-3 mb-5">
                    <label className="flex items-center gap-4 p-5 rounded-[var(--radius-md)] border cursor-pointer border-brass bg-bone-secondary hover:border-green-soft transition-colors">
                      <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-brass shrink-0 flex items-center justify-center">
                        <div className="w-[9px] h-[9px] rounded-full bg-brass" />
                      </div>
                      <svg className="w-6 h-6 text-mute shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      <span className="font-sans text-sm font-medium text-ink">Credit or debit card</span>
                    </label>
                    <label className="flex items-center gap-4 p-5 rounded-[var(--radius-md)] border cursor-pointer border-hairline hover:border-green-soft transition-colors">
                      <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-hairline shrink-0" />
                      <svg className="w-6 h-6 text-mute shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M12 8v8"/></svg>
                      <span className="font-sans text-sm font-medium text-ink">Bank transfer</span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-1 mb-4">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Card number</label>
                    <input type="text" placeholder="1234 5678 9012 3456" className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors placeholder:text-mute" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4 max-sm:grid-cols-1">
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Expiry date</label>
                      <input type="text" placeholder="MM / YY" className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors placeholder:text-mute" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">CVC</label>
                      <input type="text" placeholder="123" className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors placeholder:text-mute" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 mb-4">
                    <label className="font-sans text-xs font-semibold uppercase tracking-[0.1em] text-mute">Cardholder name</label>
                    <input type="text" placeholder="Temi Adetola" className="px-4 py-3 rounded-[var(--radius-md)] border border-hairline bg-card font-sans text-[15px] text-ink outline-none focus:border-green-soft transition-colors placeholder:text-mute" />
                  </div>
                </div>

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

                <div className="flex gap-3">
                  <button onClick={() => { setStep("guest"); setError(null); }} className="flex-1 py-3 rounded-[var(--radius-sm)] border border-hairline text-sm font-medium text-ink-secondary hover:bg-soft transition-colors cursor-pointer">
                    Back
                  </button>
                  <button
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="flex-1 py-3.5 rounded-[var(--radius-sm)] bg-brass text-bone text-sm font-semibold transition-all hover:bg-brass-dark disabled:opacity-50 disabled:cursor-wait cursor-pointer border-none"
                  >
                    {submitting ? "Processing..." : "Confirm and pay"}
                  </button>
                </div>

                <p className="font-sans text-xs text-center mt-5 text-mute">
                  <strong className="text-ink-secondary">You won&rsquo;t be charged yet.</strong><br />
                  Your card will be charged 48 hours before check-in. Free cancellation until then.
                </p>
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

      <Footer />
    </div>
    </>
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
            <div className="font-sans text-sm font-medium text-ink">{formatCheckinDate(checkIn)}</div>
            <div className="font-sans text-xs text-mute">After 2:00 PM</div>
          </div>
          <div className="flex-1 text-right">
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-mute mb-1">Check-out</div>
            <div className="font-sans text-sm font-medium text-ink">{formatCheckinDate(checkOut)}</div>
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
