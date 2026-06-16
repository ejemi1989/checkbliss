import { NextRequest, NextResponse } from "next/server";
import { updatePhotoStatus } from "@/lib/media";
import { log } from "@/lib/observability";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const { photoId } = await params;
  const photo = updatePhotoStatus(photoId, "rejected");
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  log("photo-reject", "info", `Photo ${photoId} rejected`);
  return NextResponse.json({ ok: true, photo });
}
