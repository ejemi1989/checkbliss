import { NextRequest, NextResponse } from "next/server";
import { deletePropertyPhoto } from "@/lib/media";
import { log } from "@/lib/observability";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> },
) {
  const { photoId } = await params;
  const deleted = deletePropertyPhoto(photoId);
  if (!deleted) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  log("photo-delete", "info", `Photo ${photoId} deleted`);
  return NextResponse.json({ ok: true });
}
