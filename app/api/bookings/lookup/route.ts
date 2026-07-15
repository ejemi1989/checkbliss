import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSeedReservations } from "@/lib/seed-data";
import { log } from "@/lib/observability";

const LookupSchema = z.object({
  email: z.string().email(),
});

function createToken(email: string): string {
  const payload = `${email}|${Date.now() + 3600000}`; /* 1 hour expiry */
  return Buffer.from(payload).toString("base64url");
}

function parseToken(token: string): { email: string; expiresAt: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [email, expires] = decoded.split("|");
    const expiresAt = parseInt(expires, 10);
    if (!email || !expiresAt || Date.now() > expiresAt) return null;
    return { email, expiresAt };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = LookupSchema.parse(await request.json());

    if (!supabaseAdminConfigured) {
      const reservations = getSeedReservations();
      const hasBooking = reservations.length > 0;

      if (!hasBooking) {
        return NextResponse.json({ error: "No bookings found for this email." }, { status: 404 });
      }

      const token = createToken(body.email);
      log("booking-lookup", "info", `Magic link generated for ${body.email}`);

      return NextResponse.json({
        ok: true,
        token,
        message: "We found your booking. Follow the link to view your stay and deposit status.",
      });
    }

    const db = createAdmin();
    const { data: reservations } = await db
      .from("reservations")
      .select("id, booking_group_id")
      .eq("guest_email", body.email.toLowerCase())
      .neq("status", "cancelled");

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ error: "No bookings found for this email." }, { status: 404 });
    }

    const token = createToken(body.email);
    log("booking-lookup", "info", `Magic link generated for ${body.email}`);

    return NextResponse.json({
      ok: true,
      token,
      message: "We found your booking. Follow the link to view your stay and deposit status.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 422 });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
