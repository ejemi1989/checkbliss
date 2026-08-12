export type CurrencyCode = "GBP" | "USD" | "EUR" | "CAD";

const SYMBOLS: Record<CurrencyCode, string> = {
  GBP: "\u00a3",
  USD: "$",
  EUR: "\u20ac",
  CAD: "C$",
};

const RATES: Record<CurrencyCode, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  CAD: 1.72,
};

export function formatMinor(amount: number, currency: CurrencyCode = "GBP"): string {
  const major = amount / 100;
  const [intPart, fracPart] = major.toFixed(2).split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + fracPart;
  return `${SYMBOLS[currency]}${formatted}`;
}

/** Convert a GBP minor-unit amount to another currency's minor units */
export function convertMinor(amountGbpMinor: number, to: CurrencyCode): number {
  const gbpMajor = amountGbpMinor / 100;
  const targetMajor = gbpMajor * RATES[to];
  return Math.round(targetMajor * 100);
}

export function minorToMajor(amount: number): number {
  return amount / 100;
}

export function majorToMinor(amount: number): number {
  return Math.round(amount * 100);
}

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; flag: string }[] = [
  { code: "GBP", label: "GBP", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "USD", label: "USD", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "EUR", label: "EUR", flag: "\u{1F1EA}\u{1F1FA}" },
  { code: "CAD", label: "CAD", flag: "\u{1F1E8}\u{1F1E6}" },
];

/* ------------------------------------------------------------------ */
/*  NGN payout-side (informational only — never shown to guests)      */
/* ------------------------------------------------------------------ */

export const GBP_TO_NGN_RATE =
  Number(process.env.NEXT_PUBLIC_GBP_TO_NGN_RATE) || 2450;

/** Convert GBP minor units to NGN minor units (kobo) */
export function convertGbpToNgnMinor(amountGbpMinor: number, rate: number = GBP_TO_NGN_RATE): number {
  const gbpMajor = amountGbpMinor / 100;
  return Math.round(gbpMajor * rate * 100);
}

export function isFxWithinRange(rate: number, expectedMin = 2000, expectedMax = 3500): boolean {
  return rate >= expectedMin && rate <= expectedMax;
}

export const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "EN", label: "English" },
];
