import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOneTimePayment } from "@/lib/checkout";

const CreateCheckoutSessionSchema = z.object({
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  customer_email: z.string().email().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

function resolveRedirectUrl(candidate: string | undefined, fallbackPath: string): string | null {
  if (candidate) return candidate;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return base ? `${base}${fallbackPath}` : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateCheckoutSessionSchema.parse(body);

    const successUrl = resolveRedirectUrl(parsed.success_url, "/payment/complete");
    const cancelUrl = resolveRedirectUrl(parsed.cancel_url, "/");

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        {
          code: "REDIRECT_URLS_REQUIRED",
          message: "Pass success_url and cancel_url, or set NEXT_PUBLIC_APP_URL.",
        },
        { status: 400 },
      );
    }

    const result = await createOneTimePayment({
      successUrl,
      cancelUrl,
      customerEmail: parsed.customer_email,
      metadata: parsed.metadata,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: err.issues.map((e) => e.message).join(", ") },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Checkout session creation failed" },
      { status: 502 },
    );
  }
}
