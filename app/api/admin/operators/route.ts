import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdmin, supabaseAdminConfigured } from "@/lib/supabase/admin";
import { checkAdminGate } from "@/lib/admin-gate";

const CreateOperatorBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  assignedCities: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  const gate = await checkAdminGate();
  if (!gate.ok) {
    return NextResponse.json({ error: "Admin gate denied", reason: gate.reason }, { status: 401 });
  }
  try {
    const body = CreateOperatorBody.parse(await request.json());

    if (!supabaseAdminConfigured) {
      return NextResponse.json({
        id: `OP${Date.now()}`,
        name: body.name,
        email: body.email,
        city: body.assignedCities[0],
        status: "onboarding",
      });
    }

    const db = createAdmin();
    const { data, error } = await db
      .from("operators")
      .insert({
        name: body.name,
        email: body.email,
        assigned_cities: body.assignedCities,
        city: body.assignedCities[0],
        status: "onboarding",
      })
      .select()
      .single();

    if (error) throw error;

    await db.from("audit_log").insert({
      action: "operator.created",
      target_id: data.id,
      detail: `Operator ${data.name} created via HTTP, assigned to ${body.assignedCities.join(", ")}`,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof z.ZodError
          ? err.issues.map((e) => e.message).join(", ")
          : "Failed to create operator",
      },
      { status: 400 },
    );
  }
}
