import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/bookings/route";
import { getSeedProperties } from "@/lib/seed-data";
import {
  createBookingCharge,
  createDepositHold,
  mockConfirmPaymentIntent,
  resetMockPaymentIntents,
  listMockPaymentIntents,
} from "@/lib/stripe";
import {
  classifyPaymentIntent,
  reconcilePaymentIntents,
  registerMockBookingGroup,
  resetMockBookingGroups,
  getMockBookingGroups,
  type IntentDisposition,
} from "@/lib/reconciliation";

beforeAll(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_DATA_LOADED;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.TURNSTILE_SECRET_KEY;
});

beforeEach(() => {
  resetMockPaymentIntents();
  resetMockBookingGroups();
});

function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function postBooking(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const GUEST = {
  name: "Reconcile Guest",
  email: "reconcile@example.com",
  phone: "+447700900000",
  guests: 2,
};

function getBookableProperty() {
  const prop = getSeedProperties().find((p) => p.status === "approved");
  if (!prop) throw new Error("No approved seed property");
  return prop;
}

const succeededChargeIntent = (id = "pi_charge_x", metadata: Record<string, string> = { type: "booking_charge" }) => ({
  id,
  status: "succeeded",
  metadata,
});

describe("classifyPaymentIntent (pure classification)", () => {
  const cases: Array<{ name: string; intent: ReturnType<typeof succeededChargeIntent>; group: { charge_status: string | null } | null; expected: IntentDisposition }> = [
    {
      name: "succeeded booking charge with no group → refund",
      intent: succeededChargeIntent(),
      group: null,
      expected: "refund",
    },
    {
      name: "succeeded booking charge, group confirmed → ok",
      intent: succeededChargeIntent(),
      group: { charge_status: "succeeded" },
      expected: "ok",
    },
    {
      name: "succeeded booking charge, group still pending → recover",
      intent: succeededChargeIntent(),
      group: { charge_status: "pending" },
      expected: "recover",
    },
    {
      name: "succeeded booking charge, group charge_status null → recover",
      intent: succeededChargeIntent(),
      group: { charge_status: null },
      expected: "recover",
    },
    {
      name: "requires_payment_method → skip",
      intent: { ...succeededChargeIntent(), status: "requires_payment_method" },
      group: null,
      expected: "skip",
    },
    {
      name: "canceled → skip",
      intent: { ...succeededChargeIntent(), status: "canceled" },
      group: null,
      expected: "skip",
    },
    {
      name: "refunded → skip",
      intent: { ...succeededChargeIntent(), status: "refunded" },
      group: null,
      expected: "skip",
    },
    {
      name: "succeeded but not a booking charge (deposit hold) → skip",
      intent: succeededChargeIntent("pi_hold_x", { type: "deposit_hold" }),
      group: null,
      expected: "skip",
    },
    {
      name: "succeeded with no metadata type → skip",
      intent: succeededChargeIntent("pi_plain_x", {}),
      group: null,
      expected: "skip",
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      expect(classifyPaymentIntent(c.intent, c.group)).toBe(c.expected);
    });
  }
});

describe("reconcilePaymentIntents (mock mode, full story)", () => {
  it("recovers a booking when payment succeeded but the webhook never confirmed", async () => {
    const prop = getBookableProperty();
    const res = await postBooking({
      guest: GUEST,
      items: [{ property_id: prop.id, check_in: futureDate(30), check_out: futureDate(33) }],
      turnstile_token: "mock-token",
    });
    expect(res.status).toBe(201);
    const booking = await res.json();
    const groupId = booking.booking_group_id as string;

    // Booking created, group pending, intent unconfirmed — like a live charge
    // where the customer paid but the payment_intent.succeeded webhook was
    // dropped before reaching us.
    expect(getMockBookingGroups().find((g) => g.groupId === groupId)?.status).toBe("pending_payment");

    mockConfirmPaymentIntent(`pi_mock_charge_${groupId}`);

    const outcomes = await reconcilePaymentIntents();
    const mine = outcomes.filter((o) => o.groupId === groupId);
    expect(mine).toHaveLength(1);
    expect(mine[0].disposition).toBe("recover");

    const group = getMockBookingGroups().find((g) => g.groupId === groupId);
    expect(group?.chargeStatus).toBe("succeeded");
    expect(group?.status).toBe("confirmed");
  });

  it("refunds an orphaned payment where no booking group ever persisted", async () => {
    // Customer paid, but the booking_groups insert failed and the
    // compensation never persisted — no group exists for this intent.
    const orphan = await createBookingCharge({
      amountMinor: 50000,
      currency: "gbp",
      bookingGroupId: "no-such-group",
      guestEmail: GUEST.email,
      guestName: GUEST.name,
      description: "Orphaned charge",
    });

    mockConfirmPaymentIntent(orphan.intentId);

    const outcomes = await reconcilePaymentIntents();
    const mine = outcomes.filter((o) => o.intentId === orphan.intentId);
    expect(mine).toHaveLength(1);
    expect(mine[0].disposition).toBe("refund");
    expect(mine[0].groupId).toBeNull();

    const intent = listMockPaymentIntents().find((i) => i.id === orphan.intentId);
    expect(intent?.status).toBe("refunded");
  });

  it("does nothing when the group is already confirmed", async () => {
    const groupId = "already-confirmed";
    const charge = await createBookingCharge({
      amountMinor: 50000,
      currency: "gbp",
      bookingGroupId: groupId,
      guestEmail: GUEST.email,
      guestName: GUEST.name,
      description: "Already paid",
    });
    const intentId = charge.intentId;
    registerMockBookingGroup(groupId, intentId, "succeeded", "confirmed");
    mockConfirmPaymentIntent(intentId);

    const outcomes = await reconcilePaymentIntents();
    const mine = outcomes.filter((o) => o.groupId === groupId);
    expect(mine).toHaveLength(1);
    expect(mine[0].disposition).toBe("ok");

    const group = getMockBookingGroups().find((g) => g.groupId === groupId);
    expect(group?.status).toBe("confirmed");
  });

  it("skips intents that never succeeded", async () => {
    const groupId = "group-never-paid";
    const intentId = "pi_mock_charge_never_paid";
    registerMockBookingGroup(groupId, intentId, "pending", "pending_payment");
    await createBookingCharge({
      amountMinor: 10000,
      currency: "gbp",
      bookingGroupId: groupId,
      guestEmail: GUEST.email,
      guestName: GUEST.name,
      description: "Never paid",
    });

    const outcomes = await reconcilePaymentIntents();
    expect(outcomes).toHaveLength(0);
    expect(getMockBookingGroups().find((g) => g.groupId === groupId)?.status).toBe("pending_payment");
  });

  it("leaves deposit-hold intents alone", async () => {
    const groupId = "group-with-hold";
    registerMockBookingGroup(groupId, "pi_mock_charge_group-with-hold", "succeeded", "confirmed");

    // A deposit-hold intent that succeeded — reconciliation must leave it alone.
    const hold = await createDepositHold({
      amountMinor: 10000,
      currency: "gbp",
      bookingGroupId: groupId,
      guestEmail: GUEST.email,
      description: "Security deposit",
    });
    mockConfirmPaymentIntent(hold.intentId);

    const outcomes = await reconcilePaymentIntents();
    expect(outcomes.filter((o) => o.intentId === hold.intentId)).toHaveLength(0);
    expect(listMockPaymentIntents().find((i) => i.id === hold.intentId)?.status).toBe("succeeded");
  });
});
