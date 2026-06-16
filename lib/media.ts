/**
 * Media handler — property photos, damage photos, signed URL generation.
 * Mock mode: in-memory store. Production: Supabase Storage buckets.
 */

export type PhotoStatus = "pending_review" | "approved" | "rejected";

export interface PropertyPhoto {
  id: string;
  property_id: string;
  storage_key: string;
  url: string;
  alt: string;
  sort_order: number;
  is_cover: boolean;
  uploaded_by: string;
  status: PhotoStatus;
  created_at: string;
}

export interface DamagePhoto {
  storage_key: string;
  uploaded_at: string;
}

/* ---------- Mock listing photos store ---------- */
const mockPhotos: PropertyPhoto[] = [
  {
    id: "PH001", property_id: "PR001", storage_key: "property-photos/PR001/01.jpg",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    alt: "Lagoon View Loft living room", sort_order: 0, is_cover: true,
    uploaded_by: "OP1", status: "approved", created_at: "2026-06-01T10:00:00Z",
  },
  {
    id: "PH002", property_id: "PR001", storage_key: "property-photos/PR001/02.jpg",
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
    alt: "Lagoon View Loft bedroom", sort_order: 1, is_cover: false,
    uploaded_by: "OP1", status: "approved", created_at: "2026-06-01T10:05:00Z",
  },
  {
    id: "PH003", property_id: "PR002", storage_key: "property-photos/PR002/01.jpg",
    url: "https://images.unsplash.com/photo-1600566753086-00f18f6b0050?w=800&q=80",
    alt: "Sunset Dove rooftop view", sort_order: 0, is_cover: true,
    uploaded_by: "OP1", status: "approved", created_at: "2026-06-02T09:00:00Z",
  },
  {
    id: "PH004", property_id: "PR004", storage_key: "property-photos/PR004/01.jpg",
    url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    alt: "GRA Executive Suite exterior", sort_order: 0, is_cover: true,
    uploaded_by: "OP2", status: "approved", created_at: "2026-06-03T11:00:00Z",
  },
];

/* ---------- Mock damage photos store ---------- */
const mockDamagePhotos: Record<string, DamagePhoto[]> = {};

/* ---------- Listing photos ---------- */

export function getPropertyPhotos(propertyId: string, status?: PhotoStatus): PropertyPhoto[] {
  let photos = mockPhotos.filter((p) => p.property_id === propertyId);
  if (status) photos = photos.filter((p) => p.status === status);
  return photos.sort((a, b) => a.sort_order - b.sort_order);
}

export function addPropertyPhoto(photo: Omit<PropertyPhoto, "id" | "created_at">): PropertyPhoto {
  const record: PropertyPhoto = {
    ...photo,
    id: `PH${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  mockPhotos.push(record);
  return record;
}

export function updatePhotoStatus(photoId: string, status: PhotoStatus): PropertyPhoto | null {
  const photo = mockPhotos.find((p) => p.id === photoId);
  if (photo) photo.status = status;
  return photo ?? null;
}

export function reorderPhotos(propertyId: string, order: { id: string; sort_order: number; is_cover?: boolean }[]): void {
  for (const item of order) {
    const photo = mockPhotos.find((p) => p.id === item.id && p.property_id === propertyId);
    if (photo) {
      photo.sort_order = item.sort_order;
      if (item.is_cover !== undefined) photo.is_cover = item.is_cover;
    }
  }
}

export function hasApprovedPhotos(propertyId: string): boolean {
  return mockPhotos.some((p) => p.property_id === propertyId && p.status === "approved");
}

export function deletePropertyPhoto(photoId: string): boolean {
  const idx = mockPhotos.findIndex((p) => p.id === photoId);
  if (idx < 0) return false;
  mockPhotos.splice(idx, 1);
  return true;
}

/* ---------- Damage photos ---------- */

export function addDamagePhoto(claimId: string, storageKey: string): DamagePhoto[] {
  const photo: DamagePhoto = { storage_key: storageKey, uploaded_at: new Date().toISOString() };
  if (!mockDamagePhotos[claimId]) mockDamagePhotos[claimId] = [];
  mockDamagePhotos[claimId].push(photo);
  return [...mockDamagePhotos[claimId]];
}

export function getDamagePhotos(claimId: string): DamagePhoto[] {
  return mockDamagePhotos[claimId] ?? [];
}

export function damagePhotoCount(claimId: string): number {
  return (mockDamagePhotos[claimId] ?? []).length;
}

/* ---------- Signed URL mock ---------- */

export function getSignedUrl(storageKey: string): string {
  return `/api/media/signed?key=${encodeURIComponent(storageKey)}&expires=${Date.now() + 3600000}`;
}

/* ---------- Bucket existence check (mock) ---------- */

export function bucketsConfigured(): boolean {
  return true; /* always available in mock mode */
}
