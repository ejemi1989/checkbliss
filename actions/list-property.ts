"use server";

import { z } from "zod";
import type { ActionResponse } from "@/lib/types";

const ListPropertySchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(1, "Phone is required"),
  city: z.enum(["Lagos", "Abuja"], { message: "Select Lagos or Abuja" }),
  address: z.string().min(1, "Property address is required"),
  bedrooms: z.coerce.number().int().min(1).max(10),
  description: z.string().optional(),
});

export async function submitPropertyInterest(
  formData: FormData,
): Promise<ActionResponse> {
  const parsed = ListPropertySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    address: formData.get("address"),
    bedrooms: formData.get("bedrooms"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const data = parsed.data;

  // In production: write to Supabase `property_interests` table and trigger
  // WhatsApp notification to the city operator.
  console.log("[mock] Property interest:", {
    name: data.name,
    email: data.email,
    phone: data.phone,
    city: data.city,
    address: data.address,
    bedrooms: data.bedrooms,
    description: data.description,
  });

  return { ok: true };
}
