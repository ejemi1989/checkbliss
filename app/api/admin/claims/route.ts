import { NextResponse } from "next/server";
import { supabaseAdminConfigured, createAdmin } from "@/lib/supabase";
import { getAdminClaims } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!supabaseAdminConfigured) {
    return NextResponse.json({ claims: getAdminClaims() });
  }

  try {
    const db = createAdmin();
    const { data, error } = await db
      .from("damage_claims")
      .select(`
        *,
        reservations (
          guest_name, guest_email, check_in, check_out, property_name
        )
      `)
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ claims: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 },
    );
  }
}
