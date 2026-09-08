import "server-only";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { log } from "@/lib/observability";

const API_KEY = process.env.FINCRA_API_KEY ?? "";
const BUSINESS_ID = process.env.FINCRA_BUSINESS_ID ?? "";
const BASE_URL = process.env.FINCRA_BASE_URL ?? "https://sandboxapi.fincra.com";
const WEBHOOK_SECRET = process.env.FINCRA_WEBHOOK_SECRET ?? "";

export const fincraConfigured = Boolean(API_KEY && BUSINESS_ID);

export interface FincraBeneficiary {
  firstName: string;
  lastName?: string;
  accountHolderName: string;
  accountNumber: string;
  bankCode: string;
  type: "individual" | "corporate";
  country?: string;
}

export interface FincraPayoutOpts {
  customerReference: string;
  amountNgnMinor: number;
  beneficiary: FincraBeneficiary;
  description?: string;
}

export interface FincraPayoutResult {
  payoutReference: string;
  customerReference: string;
  status: "processing" | "successful" | "failed";
  amountNgnMinor: number;
  fee?: number;
  rate?: number;
}

export type FincraErrorKind =
  | "bank_rejected"
  | "insufficient_balance"
  | "invalid_beneficiary"
  | "duplicate_reference"
  | "api_unavailable"
  | "rate_limit"
  | "timeout"
  | "validation_failed"
  | "access_denied"
  | "unknown";

export class FincraError extends Error {
  kind: FincraErrorKind;
  retryable: boolean;

  constructor(kind: FincraErrorKind, message: string, retryable = true) {
    super(message);
    this.name = "FincraError";
    this.kind = kind;
    this.retryable = retryable;
  }
}

function classifyHttpStatus(status: number, body: string): FincraError {
  if (status === 429) return new FincraError("rate_limit", body, true);
  if (status >= 500) return new FincraError("api_unavailable", body, true);
  if (status === 402) return new FincraError("insufficient_balance", body, true);
  if (status === 403) return new FincraError("access_denied", body, false);
  if (status === 422 && /beneficiary/i.test(body)) {
    return new FincraError("invalid_beneficiary", body, false);
  }
  if (status === 422 && /duplicate/i.test(body)) {
    return new FincraError("duplicate_reference", body, false);
  }
  if (status === 422) return new FincraError("bank_rejected", body, false);
  if (status >= 400) return new FincraError("validation_failed", body, false);
  return new FincraError("unknown", `HTTP ${status}: ${body}`, false);
}

function classifyFincraErrorCode(body: string): FincraError | null {
  if (!body) return null;
  const code = body.match(/"code"\s*:\s*"([^"]+)"/)?.[1] ?? body.match(/^([A-Z_]+)\b/)?.[1];
  if (!code) return null;

  switch (code) {
    case "NO_ENOUGH_MONEY_IN_WALLET":
      return new FincraError("insufficient_balance", code, true);
    case "DUPLICATE_CUSTOMER_REFERENCE":
      return new FincraError("duplicate_reference", code, false);
    case "RESOURCE_NOT_FOUND":
      return new FincraError("unknown", code, true);
    case "SERVICE_UNAVAILABLE":
    case "INTERNAL_SERVER_ERROR":
      return new FincraError("api_unavailable", code, true);
    case "ACCESS_DENIED":
    case "OPERATION_FORBIDDEN":
      return new FincraError("access_denied", code, false);
    case "VALIDATION_FAILED":
    case "UNPROCESSABLE_ENTITY":
      return new FincraError("validation_failed", code, false);
    case "INVALID_QUOTE":
    case "QUOTE_NOT_GENERATED":
      return new FincraError("validation_failed", code, false);
    default:
      return null;
  }
}

const FINCRA_PAYOUT_TIMEOUT_MS = 30_000;
const FINCRA_PENDING_STATUS_MS = 15_000;

async function fincraFetch<T>(path: string, init: RequestInit & { timeoutMs?: number }): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "api-key": API_KEY,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(init.timeoutMs ?? FINCRA_PAYOUT_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const codeBased = classifyFincraErrorCode(body);
    throw codeBased ?? classifyHttpStatus(response.status, body);
  }

  const json = await response.json() as { success?: boolean; data?: T };
  if (json.success === false) {
    throw new FincraError("validation_failed", JSON.stringify(json), false);
  }
  return (json.data ?? (json as unknown as T));
}

/* ------------------------------------------------------------------ */
/*  Mock store                                                         */
/* ------------------------------------------------------------------ */

interface MockPayoutRecord extends FincraPayoutResult {
  createdAt: string;
  polledOnce: boolean;
}

const mockPayouts = new Map<string, MockPayoutRecord>();

export async function createFincraPayout(opts: FincraPayoutOpts): Promise<FincraPayoutResult> {
  if (!fincraConfigured) {
    const existing = mockPayouts.get(opts.customerReference);
    if (existing) {
      log("fincra:mock", "info", `Idempotent re-call — ${opts.customerReference} → ${existing.status}`);
      return stripMockEnvelope(existing);
    }
    const record: MockPayoutRecord = {
      payoutReference: `fincra_mock_${opts.customerReference}`,
      customerReference: opts.customerReference,
      status: "processing",
      amountNgnMinor: opts.amountNgnMinor,
      createdAt: new Date().toISOString(),
      polledOnce: false,
    };
    mockPayouts.set(opts.customerReference, record);
    log("fincra:mock", "info", `payout ${record.payoutReference} — NGN ${opts.amountNgnMinor / 100} → ${opts.beneficiary.accountHolderName}`);
    return stripMockEnvelope(record);
  }

  const body = {
    business: BUSINESS_ID,
    sourceCurrency: "NGN",
    destinationCurrency: "NGN",
    amount: opts.amountNgnMinor / 100,
    customerReference: opts.customerReference,
    paymentDestination: "bank_account",
    description: opts.description ?? `CheckinBliss owner payout — ${opts.customerReference}`,
    beneficiary: opts.beneficiary,
  };

  const data = await fincraFetch<{
    reference: string;
    customerReference: string;
    status: FincraPayoutResult["status"];
  }>("/disbursements/payouts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    payoutReference: data.reference,
    customerReference: data.customerReference ?? opts.customerReference,
    status: data.status,
    amountNgnMinor: opts.amountNgnMinor,
  };
}

export async function getFincraPayoutStatus(payoutReference: string): Promise<FincraPayoutResult> {
  if (!fincraConfigured) {
    const record = findMockByReference(payoutReference);
    if (!record) {
      throw new FincraError("unknown", `Mock payout not found: ${payoutReference}`, false);
    }
    if (record.status === "processing" && !record.polledOnce) {
      record.polledOnce = true;
      record.status = "successful";
      log("fincra:mock", "info", `Poll flipped ${record.payoutReference} processing → successful`);
    }
    return stripMockEnvelope(record);
  }

  const data = await fincraFetch<{
    reference: string;
    customerReference?: string | null;
    status: FincraPayoutResult["status"];
    amountSent?: number;
    amountReceived?: number;
    fee?: number;
    rate?: number;
  }>(`/disbursements/payouts/reference/${payoutReference}`, {
    method: "GET",
    timeoutMs: FINCRA_PENDING_STATUS_MS,
  });

  return {
    payoutReference: data.reference,
    customerReference: data.customerReference ?? "",
    status: data.status,
    amountNgnMinor: Math.round((data.amountSent ?? data.amountReceived ?? 0) * 100),
    fee: data.fee,
    rate: data.rate,
  };
}

export async function getFincraBeneficiaries(): Promise<FincraBeneficiaryRecord[]> {
  if (!fincraConfigured) {
    return [
      { firstName: "Adaora", lastName: "Mensah", accountHolderName: "Adaora Mensah", accountNumber: "0123456789", bankCode: "058", bankName: "GTBank", type: "individual", country: "NG" },
      { firstName: "Ngozi", lastName: "Okonkwo", accountHolderName: "Ngozi Okonkwo", accountNumber: "0124775490", bankCode: "044", bankName: "Access Bank", type: "individual", country: "NG" },
      { firstName: "Ibrahim", lastName: "Musa", accountHolderName: "Ibrahim Musa", accountNumber: "0124775491", bankCode: "057", bankName: "Zenith Bank", type: "individual", country: "NG" },
    ];
  }

  const data = await fincraFetch<Array<Record<string, unknown>>>(
    `/profile/beneficiaries/business/${BUSINESS_ID}`,
    { method: "GET" },
  );

  return data.map((b) => {
    const bank = b.bank as Record<string, unknown> | undefined;
    return {
      firstName: String(b.firstName ?? ""),
      lastName: b.lastName ? String(b.lastName) : undefined,
      accountHolderName: String(b.accountHolderName ?? ""),
      accountNumber: String(b.destinationAddress ?? b.accountNumber ?? ""),
      bankCode: String(bank?.code ?? b.bankCode ?? ""),
      bankName: String(bank?.name ?? ""),
      type: (b.type === "corporate" ? "corporate" : "individual") as FincraBeneficiaryRecord["type"],
      country: b.country ? String(b.country) : undefined,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Webhook signature + payload                                        */
/* ------------------------------------------------------------------ */

/**
 * Fincra signs the webhook with HMAC-SHA512 over the compact JSON of the
 * {event, data} payload object. Their docs state the payload must be
 * "encrypted and unmodified as received" and provide a Python example using
 * `json.dumps(payload, separators=(',', ':'))`. We parse the raw body, then
 * re-emit it as compact JSON before HMACing — this strips incidental
 * whitespace differences without changing the data.
 * See https://docs.fincra.com/docs/validating-webhook
 */
function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

export function verifyFincraWebhookSignature(
  event: FincraWebhookEvent | unknown,
  signatureHeader: string | null,
): boolean {
  if (!WEBHOOK_SECRET) return false;
  if (!signatureHeader) return false;
  const expected = createHmac("SHA512", WEBHOOK_SECRET)
    .update(compactJson(event))
    .digest("hex");
  if (expected.length !== signatureHeader.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signatureHeader, "hex"));
}

/**
 * Compute the expected signature for a webhook event. Exposed for testing
 * and for server-side replay tooling.
 */
export function computeFincraWebhookSignature(event: FincraWebhookEvent | unknown): string {
  return createHmac("SHA512", WEBHOOK_SECRET).update(compactJson(event)).digest("hex");
}

export const FincraWebhookEventSchema = z.object({
  event: z.enum(["payout.successful", "payout.failed"]),
  data: z.object({
    reference: z.string(),
    customerReference: z.string().nullable().optional(),
    status: z.string(),
    amountReceived: z.number().optional(),
    fee: z.number().optional(),
    rate: z.number().optional(),
    reason: z.string().nullable().optional(),
  }),
});

export type FincraWebhookEvent = z.infer<typeof FincraWebhookEventSchema>;

export function parseFincraWebhookEvent(body: unknown): FincraWebhookEvent {
  return FincraWebhookEventSchema.parse(body);
}

export async function getFincraPayoutStatusByCustomerReference(
  customerReference: string,
): Promise<FincraPayoutResult> {
  if (!fincraConfigured) {
    const record = mockPayouts.get(customerReference);
    if (!record) {
      throw new FincraError("unknown", `Mock payout not found for customerReference=${customerReference}`, false);
    }
    if (record.status === "processing" && !record.polledOnce) {
      record.polledOnce = true;
      record.status = "successful";
    }
    return stripMockEnvelope(record);
  }

  const data = await fincraFetch<{
    reference: string;
    customerReference?: string | null;
    status: FincraPayoutResult["status"];
    amountSent?: number;
    amountReceived?: number;
    fee?: number;
    rate?: number;
  }>(`/disbursements/payouts/customer-reference/${encodeURIComponent(customerReference)}`, {
    method: "GET",
    timeoutMs: FINCRA_PENDING_STATUS_MS,
  });

  return {
    payoutReference: data.reference,
    customerReference: data.customerReference ?? customerReference,
    status: data.status,
    amountNgnMinor: Math.round((data.amountSent ?? data.amountReceived ?? 0) * 100),
    fee: data.fee,
    rate: data.rate,
  };
}

/* ------------------------------------------------------------------ */
/*  Beneficiaries                                                       */
/* ------------------------------------------------------------------ */

export interface FincraBeneficiaryCreateInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  accountHolderName: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  type?: "individual" | "corporate";
  country?: string;
  currency?: string;
  addressState?: string;
  addressCity?: string;
  addressStreet?: string;
  addressZip?: string;
  uniqueIdentifier?: string;
}

export interface FincraBeneficiaryRecord extends FincraBeneficiary {
  email?: string;
  phoneNumber?: string;
  bankName: string;
  currency?: string;
  addressState?: string;
  addressCity?: string;
  addressStreet?: string;
  addressZip?: string;
  uniqueIdentifier?: string;
}

const mockBeneficiaries = new Map<string, FincraBeneficiaryRecord>();

export async function createFincraBeneficiary(
  input: FincraBeneficiaryCreateInput,
): Promise<FincraBeneficiaryRecord> {
  if (!fincraConfigured) {
    const key = `${input.accountHolderName.toLowerCase()}:${input.accountNumber}`;
    const existing = mockBeneficiaries.get(key);
    if (existing) return existing;

    const record: FincraBeneficiaryRecord = {
      firstName: input.firstName,
      lastName: input.lastName,
      accountHolderName: input.accountHolderName,
      accountNumber: input.accountNumber,
      bankCode: input.bankCode,
      bankName: input.bankName,
      type: input.type ?? "individual",
      country: input.country ?? "NG",
      email: input.email,
      phoneNumber: input.phoneNumber,
      currency: input.currency ?? "NGN",
      addressState: input.addressState,
      addressCity: input.addressCity,
      addressStreet: input.addressStreet,
      addressZip: input.addressZip,
      uniqueIdentifier: input.uniqueIdentifier,
    };
    mockBeneficiaries.set(key, record);
    log("fincra:mock", "info", `Beneficiary ${input.accountHolderName} → ${input.bankName} ${input.accountNumber.slice(-4)}`);
    return record;
  }

  const addressBody: Record<string, string> = { country: input.country ?? "NG" };
  if (input.addressState) addressBody.state = input.addressState;
  if (input.addressCity) addressBody.city = input.addressCity;
  if (input.addressStreet) addressBody.street = input.addressStreet;
  if (input.addressZip) addressBody.zip = input.addressZip;

  const body: Record<string, unknown> = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    accountHolderName: input.accountHolderName,
    bank: {
      name: input.bankName,
      code: input.bankCode,
    },
    address: addressBody,
    type: input.type ?? "individual",
    currency: input.currency ?? "NGN",
    paymentDestination: "bank_account",
    destinationAddress: input.accountNumber,
  };
  if (input.uniqueIdentifier) body.uniqueIdentifier = input.uniqueIdentifier;

  const data = await fincraFetch<{
    id?: string;
    firstName?: string;
    lastName?: string | null;
    accountHolderName?: string;
    bank?: { name?: string; code?: string };
    destinationAddress?: string;
    type?: string;
    country?: string;
    email?: string;
    phoneNumber?: string;
    uniqueIdentifier?: string;
    address?: Record<string, string> | null;
  }>(`/profile/beneficiaries/business/${BUSINESS_ID}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const respAddress = (data as { address?: Record<string, string> | null }).address ?? {};
  return {
    firstName: data.firstName ?? input.firstName,
    lastName: data.lastName ?? input.lastName,
    accountHolderName: data.accountHolderName ?? input.accountHolderName,
    accountNumber: data.destinationAddress ?? input.accountNumber,
    bankCode: data.bank?.code ?? input.bankCode,
    bankName: data.bank?.name ?? input.bankName,
    type: (data.type === "corporate" ? "corporate" : "individual") as FincraBeneficiaryRecord["type"],
    country: data.country ?? input.country ?? "NG",
    email: data.email ?? input.email,
    phoneNumber: data.phoneNumber ?? input.phoneNumber,
    currency: input.currency ?? "NGN",
    addressState: respAddress.state ?? input.addressState,
    addressCity: respAddress.city ?? input.addressCity,
    addressStreet: respAddress.street ?? input.addressStreet,
    addressZip: respAddress.zip ?? input.addressZip,
    uniqueIdentifier: (data as { uniqueIdentifier?: string }).uniqueIdentifier ?? input.uniqueIdentifier,
  };
}

export async function getFincraBeneficiary(
  accountHolderName: string,
  accountNumber: string,
): Promise<FincraBeneficiaryRecord | null> {
  if (!fincraConfigured) {
    const key = `${accountHolderName.toLowerCase()}:${accountNumber}`;
    return mockBeneficiaries.get(key) ?? null;
  }
  const all = await getFincraBeneficiaries();
  return all.find((b) => b.accountNumber === accountNumber && b.accountHolderName === accountHolderName) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Test isolation                                                     */
/* ------------------------------------------------------------------ */

function stripMockEnvelope(record: MockPayoutRecord): FincraPayoutResult {
  const { createdAt: _createdAt, polledOnce: _polledOnce, ...result } = record;
  return result;
}

function findMockByReference(payoutReference: string): MockPayoutRecord | undefined {
  for (const record of mockPayouts.values()) {
    if (record.payoutReference === payoutReference) return record;
  }
  return undefined;
}

export function resetMockFincra(): void {
  mockPayouts.clear();
  mockBeneficiaries.clear();
}
