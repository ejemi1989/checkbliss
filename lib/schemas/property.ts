import { z } from "zod";

/* Zod schemas for property server actions.
   Lives outside the "use server" file because Next.js disallows
   non-function exports from use-server files. */

export const CreatePropertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  city: z.string().min(1),
  neighbourhood: z.string().optional().default(""),
  address: z.string().optional().default(""),
  bedrooms: z.number().int().min(1).default(1),
  bathrooms: z.number().int().min(1).default(1),
  max_guests: z.number().int().min(1).default(2),
  nightly_rate_minor: z.number().int().min(0).default(0),
  description: z.string().optional().default(""),
  owner_name: z.string().min(1, "Owner name is required"),
  owner_email: z.string().email("Valid owner email required"),
  owner_phone: z.string().optional().default(""),
});

export const UpdatePropertySchema = z.object({
  propertyId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  nightly_rate_minor: z.number().int().positive().optional(),
  extended_checkout_offered: z.boolean().optional(),
  extended_checkout_price_minor: z.number().int().positive().optional(),
});

export const VerifyPropertySchema = z.object({
  propertyId: z.string().min(1),
  operatorId: z.string().min(1),
  photos: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const BlockDatesSchema = z.object({
  propertyId: z.string().min(1),
  starts: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
