export type CurrencyCode = "GBP" | "USD" | "EUR";

export function formatMinor(amount: number, currency: CurrencyCode = "GBP"): string {
  const major = amount / 100;
  const symbols: Record<CurrencyCode, string> = {
    GBP: "\u00a3",
    USD: "$",
    EUR: "\u20ac",
  };
  return `${symbols[currency]}${major.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function minorToMajor(amount: number): number {
  return amount / 100;
}

export function majorToMinor(amount: number): number {
  return Math.round(amount * 100);
}
