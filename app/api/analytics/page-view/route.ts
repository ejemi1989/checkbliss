import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendPageView } from "@/lib/analytics";

const PageViewSchema = z.object({
  path: z.string().min(1).max(2048),
  title: z.string().max(500).optional(),
  session_id: z.string().max(100).optional(),
  client_id: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = PageViewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  await sendPageView({
    path: parsed.data.path,
    title: parsed.data.title,
    sessionId: parsed.data.session_id,
    clientId: parsed.data.client_id,
  });
  return NextResponse.json({ ok: true });
}
