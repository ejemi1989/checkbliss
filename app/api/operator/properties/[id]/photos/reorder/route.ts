import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { reorderPhotos, getPropertyPhotos } from "@/lib/media";
import { log } from "@/lib/observability";

const ReorderSchema = z.object({
  order: z.array(z.object({
    id: z.string(),
    sort_order: z.number().int().min(0),
    is_cover: z.boolean().optional(),
  })),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: propertyId } = await params;

  try {
    const body = ReorderSchema.parse(await request.json());
    reorderPhotos(propertyId, body.order);
    const photos = getPropertyPhotos(propertyId);

    log("photo-reorder", "info", `Photos reordered for property ${propertyId}`);
    return NextResponse.json({ ok: true, photos });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid order format" }, { status: 422 });
    }
    return NextResponse.json({ error: "Reorder failed" }, { status: 500 });
  }
}
