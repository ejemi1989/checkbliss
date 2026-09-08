import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/bookings/route";
import { getSeedProperties } from "@/lib/seed-data";
import { getNotifications } from "@/lib/notifications";

beforeAll(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_DATA_LOADED;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.TURNSTILE_SECRET_KEY;
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

describe("POST /api/bookings — booking-confirmed notifications (mock mode)", () => {
  it("enqueues admin, guest, and owner notifications on a confirmed booking", async () => {
    const prop = getSeedProperties().find((p) => p.status === "approved");
    if (!prop) throw new Error("No approved seed property");

    const res = await postBooking({
      guest: { name: "Ada Obi", email: "ada.obi@example.com", phone: "+447700900001", guests: 2 },
      items: [{ property_id: prop.id, check_in: futureDate(30), check_out: futureDate(33) }],
      turnstile_token: "mock-token",
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    const ref = data.reference as string;

    // Admin — role-scoped, always visible to any admin.
    const admin = getNotifications("admin");
    const adminNotif = admin.find((n) => n.title === "New booking confirmed");
    expect(adminNotif).toBeTruthy();
    expect(adminNotif?.link).toBe("/admin");
    expect(adminNotif?.body).toContain(prop.name);
    expect(adminNotif?.body).toContain(`Ref ${ref}`);

    // Guest — the mock guest sees booking confirmations.
    const guest = getNotifications("guest", "mock-guest");
    const guestNotif = guest.find((n) => n.title === "Booking confirmed");
    expect(guestNotif).toBeTruthy();
    expect(guestNotif?.link).toBe("/account/notifications");
    expect(guestNotif?.body).toContain(prop.name);
    expect(guestNotif?.body).toContain(`Ref ${ref}`);

    // Owner — role-scoped in mock mode (mock owner session differs from seed
    // owner ids), so the mock-owner bell shows it.
    const owner = getNotifications("owner", "mock-owner");
    const ownerNotif = owner.find((n) => n.title === "New booking" && n.body.includes(ref));
    expect(ownerNotif).toBeTruthy();
    expect(ownerNotif?.user_id).toBeUndefined();
  });

  it("scopes the guest notification to the mock guest account for guest@checkbliss.com", async () => {
    const prop = getSeedProperties().find((p) => p.status === "approved");
    if (!prop) throw new Error("No approved seed property");

    const res = await postBooking({
      guest: { name: "Temi Adetola", email: "guest@checkbliss.com", phone: "+447700900002", guests: 1 },
      items: [{ property_id: prop.id, check_in: futureDate(35), check_out: futureDate(38) }],
      turnstile_token: "mock-token",
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    const ref = data.reference as string;

    const guestNotif = getNotifications("guest", "mock-guest").find(
      (n) => n.title === "Booking confirmed" && n.body.includes(ref),
    );
    expect(guestNotif).toBeTruthy();
    expect(guestNotif?.user_id).toBe("mock-guest");
  });
});