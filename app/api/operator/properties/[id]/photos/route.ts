import { NextRequest, NextResponse } from "next/server";
import { getPropertyPhotos, addPropertyPhoto } from "@/lib/media";
import { log } from "@/lib/observability";

/* GET — list photos for a property */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const photos = getPropertyPhotos(id);
  return NextResponse.json({ photos });
}

/* POST — upload a new photo (operator-only, city-scoped) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: propertyId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const alt = (formData.get("alt") as string) || "";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "File must be an image" }, { status: 422 });

    const existing = getPropertyPhotos(propertyId);
    if (existing.length >= 20) return NextResponse.json({ error: "Maximum 20 photos per property" }, { status: 422 });

    /* mock upload — in production, upload to Supabase Storage */
    const storageKey = `property-photos/${propertyId}/${Date.now()}-${file.name}`;
    const url = `/api/media/mock-photo?key=${encodeURIComponent(storageKey)}`;

    const photo = addPropertyPhoto({
      property_id: propertyId,
      storage_key: storageKey,
      url,
      alt,
      sort_order: existing.length,
      is_cover: existing.length === 0,
      uploaded_by: "OP1", /* in production: from auth session */
      status: "pending_review",
    });

    log("photo-upload", "info", `Photo uploaded for property ${propertyId}`, { photoId: photo.id });

    return NextResponse.json({ ok: true, photo }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
