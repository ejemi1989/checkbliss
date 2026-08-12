import "server-only";

const API_KEY = process.env.RAENEST_API_KEY ?? "";
const BASE_URL = process.env.RAENEST_BASE_URL ?? "https://api.raenest.com/v1";

export const raenestConfigured = Boolean(API_KEY);

export interface RaenestPayoutOpts {
  beneficiaryId: string;
  amountNgnMinor: number;
  reference: string;
  idempotencyKey: string;
  narrative?: string;
}

export interface RaenestPayoutResult {
  payoutReference: string;
  status: "processing" | "completed" | "failed";
  fxRate: number;
  amountNgnMinor: number;
}

export interface RaenestBeneficiary {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: string;
}

export type RaenestErrorKind =
  | "bank_rejected"
  | "insufficient_balance"
  | "invalid_beneficiary"
  | "api_unavailable"
  | "rate_limit"
  | "timeout"
  | "unknown";

export class RaenestError extends Error {
  kind: RaenestErrorKind;
  retryable: boolean;

  constructor(kind: RaenestErrorKind, message: string, retryable = true) {
    super(message);
    this.name = "RaenestError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

function classifyHttpError(status: number, body: string): RaenestError {
  if (status === 429) return new RaenestError("rate_limit", body, true);
  if (status >= 500) return new RaenestError("api_unavailable", body, true);
  if (status === 422 && body.includes("beneficiary")) return new RaenestError("invalid_beneficiary", body, false);
  if (status === 422) return new RaenestError("bank_rejected", body, false);
  if (status === 402) return new RaenestError("insufficient_balance", body, true);
  return new RaenestError("unknown", `HTTP ${status}: ${body}`, false);
}

const mockPayouts = new Map<string, RaenestPayoutResult>();
const mockBeneficiaries = new Map<string, RaenestBeneficiary[]>();

export async function createRaenestPayout(opts: RaenestPayoutOpts): Promise<RaenestPayoutResult> {
  if (!raenestConfigured) {
    if (mockPayouts.has(opts.idempotencyKey)) return mockPayouts.get(opts.idempotencyKey)!;
    const result: RaenestPayoutResult = {
      payoutReference: `rnst_mock_${opts.reference}`,
      status: "completed",
      fxRate: Number(process.env.NEXT_PUBLIC_GBP_TO_NGN_RATE) || 2450,
      amountNgnMinor: opts.amountNgnMinor,
    };
    mockPayouts.set(opts.idempotencyKey, result);
    console.log(`[raenest:mock] payout ${result.payoutReference} — NGN ${opts.amountNgnMinor / 100} → beneficiary ${opts.beneficiaryId}`);
    return result;
  }

  const response = await fetch(`${BASE_URL}/payouts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": opts.idempotencyKey,
    },
    body: JSON.stringify({
      beneficiary_id: opts.beneficiaryId,
      amount: opts.amountNgnMinor / 100,
      currency: "NGN",
      reference: opts.reference,
      narrative: opts.narrative ?? `CheckinBliss owner payout — ${opts.reference}`,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw classifyHttpError(response.status, body);
  }

  const data = await response.json();
  return {
    payoutReference: data.reference ?? data.id,
    status: data.status ?? "processing",
    fxRate: data.fx_rate ?? data.rate ?? 0,
    amountNgnMinor: Math.round((data.amount ?? 0) * 100),
  };
}

export async function getRaenestPayoutStatus(payoutReference: string): Promise<RaenestPayoutResult> {
  if (!raenestConfigured) {
    const mock = mockPayouts.get(payoutReference) ?? [...mockPayouts.values()].find((v) => v.payoutReference === payoutReference);
    if (mock) return { ...mock, status: "completed" };
    return { payoutReference, status: "failed", fxRate: 0, amountNgnMinor: 0 };
  }

  const response = await fetch(`${BASE_URL}/payouts/${payoutReference}`, {
    headers: { "Authorization": `Bearer ${API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw classifyHttpError(response.status, body);
  }

  const data = await response.json();
  return {
    payoutReference: data.reference ?? data.id,
    status: data.status ?? "processing",
    fxRate: data.fx_rate ?? data.rate ?? 0,
    amountNgnMinor: Math.round((data.amount ?? 0) * 100),
  };
}

export async function getRaenestBeneficiaries(): Promise<RaenestBeneficiary[]> {
  if (!raenestConfigured) {
    if (!mockBeneficiaries.has("default")) {
      mockBeneficiaries.set("default", [
        { id: "benef_mock_ow1", bankName: "GTBank", accountNumber: "****4562", accountName: "Adaora Mensah", currency: "NGN" },
        { id: "benef_mock_ow4", bankName: "Access Bank", accountNumber: "****7891", accountName: "Ngozi Okonkwo", currency: "NGN" },
        { id: "benef_mock_ow6", bankName: "Zenith Bank", accountNumber: "****2347", accountName: "Ibrahim Musa", currency: "NGN" },
      ]);
    }
    return mockBeneficiaries.get("default")!;
  }

  const response = await fetch(`${BASE_URL}/beneficiaries`, {
    headers: { "Authorization": `Bearer ${API_KEY}` },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw classifyHttpError(response.status, body);
  }

  const data = await response.json();
  return (data.data ?? data).map((b: Record<string, unknown>) => ({
    id: String(b.id ?? ""),
    bankName: String(b.bank_name ?? b.bankName ?? ""),
    accountNumber: String(b.account_number ?? b.accountNumber ?? ""),
    accountName: String(b.account_name ?? b.accountName ?? ""),
    currency: String(b.currency ?? "NGN"),
  }));
}

export function resetMockRaenest(): void {
  mockPayouts.clear();
  mockBeneficiaries.clear();
}
