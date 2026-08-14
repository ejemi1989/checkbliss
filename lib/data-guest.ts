import "server-only";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase/admin";
import { getOwnerBookings as getMockOwnerBookings } from "@/lib/data";
import type { OwnerBookingView } from "@/lib/types";

/**
 * Guest dashboard reads — fetch reservations belonging to the signed-in guest.
 *
 * Identity model: the booking row stores `guest_email` (the address the guest
 * used at checkout). We use that to filter, since `guest_id` is nullable for
 * bookings made before the guest had an account.
 *
 * Mock-mode fallback: when Supabase is unconfigured, return the static demo
 * bookings (already keyed to the mock guest email).
 */
export async function getGuestBookingsFromDB(
  guestEmail: string,
): Promise<OwnerBookingView[]> {
  if (!supabaseAdminConfigured) return getMockGuestBookings(guestEmail);

  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("reservations")
      .select(
        `id, guest_name, guest_email, guest_count,
         check_in, check_out, status, total_minor,
         properties(name, city, neighbourhood)`
      )
      .eq("guest_email", guestEmail.toLowerCase())
      .neq("status", "cancelled")
      .order("check_in", { ascending: false })
      .limit(50);

    if (error || !data) return getMockGuestBookings(guestEmail);

    return data.map((r: Record<string, unknown>) => {
      const prop = (r.properties as Record<string, unknown>) ?? {};
      const checkIn = (r.check_in as string) ?? "";
      const checkOut = (r.check_out as string) ?? "";
      const nights = nightsBetween(checkIn, checkOut);
      return {
        id: r.id as string,
        unit: (prop.name as string) ?? "",
        guest: (r.guest_name as string) ?? "",
        check_in: checkIn,
        check_out: checkOut,
        status: r.status as string,
        amount_minor: (r.total_minor as number) ?? 0,
        nights,
        guest_count: (r.guest_count as number) ?? 1,
        property: (prop.name as string) ?? "",
        city: (prop.city as string) ?? "",
        neighbourhood: (prop.neighbourhood as string) ?? "",
        guests: (r.guest_count as number) ?? 1,
      };
    });
  } catch {
    return getMockGuestBookings(guestEmail);
  }
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

/**
 * In mock mode the static demo bookings are keyed to the seeded guest
 * ("Temi Adetola" / guest@checkbliss.com). Any other email gets an empty
 * list — same behaviour as a fresh guest on a real DB.
 */
function getMockGuestBookings(email: string): OwnerBookingView[] {
  if (email.toLowerCase() !== "guest@checkbliss.com") return [];
  return getMockOwnerBookings();
}
