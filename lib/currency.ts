export type CurrencyCode = "GBP" | "USD" | "EUR";

const SYMBOLS: Record<CurrencyCode, string> = {
  GBP: "\u00a3",
  USD: "$",
  EUR: "\u20ac",
};

const RATES: Record<CurrencyCode, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
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
];

export const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "EN", label: "English" },
];
