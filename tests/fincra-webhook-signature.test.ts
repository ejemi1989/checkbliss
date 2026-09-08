import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";

process.env.FINCRA_WEBHOOK_SECRET = "test-fincra-webhook-secret-please-rotate";

const { verifyFincraWebhookSignature, computeFincraWebhookSignature, parseFincraWebhookEvent } = await import("@/lib/fincra");

beforeAll(() => {
  if (!process.env.FINCRA_WEBHOOK_SECRET) {
    throw new Error("Test fixture: FINCRA_WEBHOOK_SECRET must be set");
  }
});

function signRaw(rawJson: string, secret: string = process.env.FINCRA_WEBHOOK_SECRET!): string {
  return createHmac("SHA512", secret).update(rawJson).digest("hex");
}

const sampleEvent = {
  event: "payout.successful" as const,
  data: {
    reference: "5dcf24700a9a4f67",
    customerReference: "fincra-BG-abc-OP-xyz",
    status: "successful",
    amountReceived: 52800000,
    fee: 50,
    rate: 1,
    reason: "Payout was successful",
  },
};

describe("Fincra webhook signature", () => {
  it("verifies a payload whose raw bytes happen to be compact JSON", () => {
    const raw = JSON.stringify(sampleEvent);
    const signature = signRaw(raw);
    expect(verifyFincraWebhookSignature(JSON.parse(raw), signature)).toBe(true);
  });

  it("verifies when the body contains extra whitespace / different indentation", () => {
    const prettyRaw = JSON.stringify(sampleEvent, null, 4);
    const signature = signRaw(JSON.stringify(sampleEvent));
    expect(verifyFincraWebhookSignature(JSON.parse(prettyRaw), signature)).toBe(true);
  });

  it("rejects when the body was tampered with after signing", () => {
    const raw = JSON.stringify(sampleEvent);
    const signature = signRaw(raw);
    const tampered = { ...sampleEvent, data: { ...sampleEvent.data, status: "failed" } };
    expect(verifyFincraWebhookSignature(tampered, signature)).toBe(false);
  });

  it("rejects when the signature header is missing", () => {
    expect(verifyFincraWebhookSignature(sampleEvent, null)).toBe(false);
  });

  it("rejects an empty signature header", () => {
    expect(verifyFincraWebhookSignature(sampleEvent, "")).toBe(false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    expect(verifyFincraWebhookSignature(sampleEvent, "deadbeef")).toBe(false);
  });

  it("rejects when computed with a different secret", () => {
    const raw = JSON.stringify(sampleEvent);
    const badSig = signRaw(raw, "attacker-controlled-secret");
    expect(verifyFincraWebhookSignature(JSON.parse(raw), badSig)).toBe(false);
  });

  it("computeFincraWebhookSignature produces a matching hex digest", () => {
    const expected = signRaw(JSON.stringify(sampleEvent));
    expect(computeFincraWebhookSignature(sampleEvent)).toBe(expected);
  });

  it("parseFincraWebhookEvent round-trips with the same compact shape used for signing", () => {
    const raw = JSON.stringify(sampleEvent);
    const parsed = parseFincraWebhookEvent(JSON.parse(raw));
    const signature = signRaw(raw);
    expect(verifyFincraWebhookSignature(parsed, signature)).toBe(true);
  });

  it("rejects when the event field is mutated (must be re-signed)", () => {
    const raw = JSON.stringify(sampleEvent);
    const signature = signRaw(raw);
    const wrongEvent = { ...sampleEvent, event: "payout.failed" as const };
    expect(verifyFincraWebhookSignature(wrongEvent, signature)).toBe(false);
  });
});
