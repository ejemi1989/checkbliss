import { describe, it, expect } from "vitest";
import { routeStripeEvent, type StripeEventLike } from "@/lib/stripe-events";

function evt(
  type: string,
  object: { id?: string | null; metadata?: Record<string, string> | null; charge?: string | null } = {},
  id = "evt_test_1",
): StripeEventLike {
  return {
    type,
    id,
    data: { object: { id: object.id ?? null, metadata: object.metadata ?? null } as { id?: string | null; metadata?: Record<string, string> | null } },
  };
}

describe("Stripe event router — payment_intent.succeeded", () => {
  it("marks booking_groups.charge_status succeeded for any intent", () => {
    const result = routeStripeEvent(
      evt("payment_intent.succeeded", { id: "pi_charge_123" }),
    );
    expect(result).toEqual([
      { kind: "update_booking_group_charge", intentId: "pi_charge_123", chargeStatus: "succeeded" },
    ]);
  });

  it("also marks deposit_holds.held when purpose is hold", () => {
    const result = routeStripeEvent(
      evt("payment_intent.succeeded", {
        id: "pi_hold_456",
        metadata: { purpose: "hold" },
      }),
    );
    expect(result).toEqual([
      { kind: "update_booking_group_charge", intentId: "pi_hold_456", chargeStatus: "succeeded" },
      { kind: "update_deposit_hold_status", intentId: "pi_hold_456", holdStatus: "held" },
    ]);
  });

  it("does NOT touch deposit_holds when purpose is charge", () => {
    const result = routeStripeEvent(
      evt("payment_intent.succeeded", {
        id: "pi_charge_789",
        metadata: { purpose: "charge" },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      kind: "update_booking_group_charge",
      intentId: "pi_charge_789",
      chargeStatus: "succeeded",
    });
  });

  it("does NOT touch deposit_holds when metadata is missing", () => {
    const result = routeStripeEvent(
      evt("payment_intent.succeeded", { id: "pi_legacy_111" }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("update_booking_group_charge");
  });
});

describe("Stripe event router — payment_intent.payment_failed", () => {
  it("marks booking_groups.charge_status failed for any intent", () => {
    const result = routeStripeEvent(
      evt("payment_intent.payment_failed", { id: "pi_charge_222" }),
    );
    expect(result[0]).toEqual({
      kind: "update_booking_group_charge",
      intentId: "pi_charge_222",
      chargeStatus: "failed",
    });
  });

  it("emits noop marker (caller enqueues email) when purpose is charge", () => {
    const result = routeStripeEvent(
      evt("payment_intent.payment_failed", {
        id: "pi_charge_333",
        metadata: { purpose: "charge" },
      }),
    );
    expect(result).toContainEqual({ kind: "noop" });
  });

  it("does NOT emit noop when purpose is hold (no email for hold failures)", () => {
    const result = routeStripeEvent(
      evt("payment_intent.payment_failed", {
        id: "pi_hold_444",
        metadata: { purpose: "hold" },
      }),
    );
    expect(result.find((a) => a.kind === "noop")).toBeUndefined();
  });
});

describe("Stripe event router — payment_intent.canceled", () => {
  it("marks deposit_holds released with timestamp", () => {
    const result = routeStripeEvent(
      evt("payment_intent.canceled", { id: "pi_hold_555" }),
    );
    expect(result).toHaveLength(1);
    const action = result[0];
    expect(action?.kind).toBe("update_deposit_hold_status");
    if (action?.kind === "update_deposit_hold_status") {
      expect(action.intentId).toBe("pi_hold_555");
      expect(action.holdStatus).toBe("released");
      expect(action.releasedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });
});

describe("Stripe event router — payment_intent.amount_capturable_updated", () => {
  it("marks deposit_holds held", () => {
    const result = routeStripeEvent(
      evt("payment_intent.amount_capturable_updated", { id: "pi_hold_666" }),
    );
    expect(result).toEqual([
      { kind: "update_deposit_hold_status", intentId: "pi_hold_666", holdStatus: "held" },
    ]);
  });
});

describe("Stripe event router — charge.dispute.created", () => {
  it("logs the dispute and returns the charge id", () => {
    const event: StripeEventLike = {
      type: "charge.dispute.created",
      id: "evt_dupe_1",
      data: {
        object: {
          id: "dp_123",
          metadata: null,
        } as { id?: string | null; metadata?: Record<string, string> | null },
      },
    };
    (event.data.object as unknown as { charge?: string }).charge = "ch_999";
    const result = routeStripeEvent(event);
    expect(result).toEqual([
      { kind: "log_dispute", disputeId: "dp_123", chargeId: "ch_999" },
    ]);
  });
});

describe("Stripe event router — unknown events", () => {
  it("returns ignore for unhandled event types", () => {
    const result = routeStripeEvent(
      evt("customer.subscription.created", { id: "sub_1" }),
    );
    expect(result).toEqual([{ kind: "ignore" }]);
  });
});

describe("Stripe event router — id missing", () => {
  it("returns empty actions when intent id is missing on succeeded event", () => {
    const result = routeStripeEvent(
      evt("payment_intent.succeeded", { id: null, metadata: { purpose: "hold" } }),
    );
    expect(result).toEqual([]);
  });
});
