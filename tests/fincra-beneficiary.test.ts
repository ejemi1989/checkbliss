import { describe, it, expect, beforeEach } from "vitest";

beforeEach(() => {
  delete process.env.FINCRA_API_KEY;
  delete process.env.FINCRA_BUSINESS_ID;
});

const { createFincraBeneficiary, resetMockFincra } = await import("@/lib/fincra");
const { splitAccountHolderName, resetMockPayoutLedger } = await import("@/lib/payouts");

describe("createFincraBeneficiary (mock mode)", () => {
  beforeEach(() => {
    resetMockFincra();
  });

  it("defaults currency to NGN when not provided", async () => {
    const rec = await createFincraBeneficiary({
      firstName: "Adaora",
      lastName: "Mensah",
      accountHolderName: "Adaora Mensah",
      bankName: "GTBank",
      bankCode: "058",
      accountNumber: "0123456789",
      type: "individual",
    });
    expect(rec.currency).toBe("NGN");
  });

  it("preserves caller-supplied currency", async () => {
    const rec = await createFincraBeneficiary({
      firstName: "Adaora",
      accountHolderName: "Adaora",
      bankName: "Zenith Bank",
      bankCode: "057",
      accountNumber: "0123456780",
      type: "individual",
      currency: "USD",
    });
    expect(rec.currency).toBe("USD");
  });

  it("stores optional address fields when provided", async () => {
    const rec = await createFincraBeneficiary({
      firstName: "Ibrahim",
      accountHolderName: "Ibrahim Musa",
      bankName: "Zenith Bank",
      bankCode: "057",
      accountNumber: "0123456781",
      type: "individual",
      addressState: "Lagos",
      addressCity: "Ikeja",
      addressStreet: "12 Allen Avenue",
      addressZip: "100001",
    });
    expect(rec.addressState).toBe("Lagos");
    expect(rec.addressCity).toBe("Ikeja");
    expect(rec.addressStreet).toBe("12 Allen Avenue");
    expect(rec.addressZip).toBe("100001");
  });

  it("omits address fields when not provided (no hard-coded Lagos)", async () => {
    const rec = await createFincraBeneficiary({
      firstName: "Chidinma",
      accountHolderName: "Chidinma Okafor",
      bankName: "First Bank",
      bankCode: "011",
      accountNumber: "0123456782",
      type: "individual",
    });
    expect(rec.addressState).toBeUndefined();
    expect(rec.addressCity).toBeUndefined();
    expect(rec.addressStreet).toBeUndefined();
    expect(rec.addressZip).toBeUndefined();
  });

  it("stores uniqueIdentifier when provided", async () => {
    const rec = await createFincraBeneficiary({
      firstName: "Ngozi",
      accountHolderName: "Ngozi Okonkwo",
      bankName: "Access Bank",
      bankCode: "044",
      accountNumber: "0124775490",
      type: "individual",
      uniqueIdentifier: "owner-NGN-001",
    });
    expect(rec.uniqueIdentifier).toBe("owner-NGN-001");
  });

  it("is idempotent in mock mode for the same account holder + number", async () => {
    const first = await createFincraBeneficiary({
      firstName: "Adaora",
      accountHolderName: "Adaora Mensah",
      bankName: "GTBank",
      bankCode: "058",
      accountNumber: "0123456789",
      type: "individual",
    });
    const second = await createFincraBeneficiary({
      firstName: "Adaora",
      accountHolderName: "Adaora Mensah",
      bankName: "GTBank",
      bankCode: "058",
      accountNumber: "0123456789",
      type: "individual",
    });
    expect(second).toBe(first);
  });
});

describe("splitAccountHolderName", () => {
  beforeEach(() => {
    resetMockPayoutLedger();
  });

  it("splits a two-word name into firstName + lastName", () => {
    const { firstName, lastName } = splitAccountHolderName("Adaora Mensah");
    expect(firstName).toBe("Adaora");
    expect(lastName).toBe("Mensah");
  });

  it("splits a three-word name — first word is firstName, rest is lastName", () => {
    const { firstName, lastName } = splitAccountHolderName("Hassan Sarz Olayinka");
    expect(firstName).toBe("Hassan");
    expect(lastName).toBe("Sarz Olayinka");
  });

  it("returns undefined lastName for a single-word name", () => {
    const { firstName, lastName } = splitAccountHolderName("Madonna");
    expect(firstName).toBe("Madonna");
    expect(lastName).toBeUndefined();
  });

  it("collapses extra whitespace between words", () => {
    const { firstName, lastName } = splitAccountHolderName("  Ibrahim   Musa  ");
    expect(firstName).toBe("Ibrahim");
    expect(lastName).toBe("Musa");
  });

  it("returns the input as firstName for an empty string (defensive)", () => {
    const { firstName, lastName } = splitAccountHolderName("");
    expect(firstName).toBe("");
    expect(lastName).toBeUndefined();
  });
});
