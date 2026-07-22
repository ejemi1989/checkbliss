# CheckinBliss — Property Media (Photos) Implementation

Implements what PRD v2.3 specifies about property/listing photos and operator damage photos. For a coding agent. Every requirement is tagged with its PRD section. **Scope discipline:** this doc implements the PDF — nothing more. Owner self-upload is Launch-Supporting and is built only as the PDF scopes it.

---

## 1. What the PRD actually mandates (source of truth)

| Who uploads | What | When | PRD |
|---|---|---|---|
| **Operator** (web dashboard) | Listing/verification photos via the **curation queue** + **verification logging interface** | Launch-Critical | §10.1, §12.1 |
| **Operator** (WhatsApp) | **Damage-report** photos (up to 5) | Launch-Critical | §7, §8, §12.1 |
| **Owner** (web dashboard) | "Upload photos **for review**" — gated by operator editorial approval | **Launch-Supporting** (weeks 2–6) | §9.2 |

Hard facts from the PDF, not assumptions:
- Owners' listing view is <q>read-only at launch — edits handled by operator</q> (§9.1). **Owners do not upload at launch.**
- Inventory is <q>fully curated… all properties are invited and verified</q> with <q>strong editorial control across content, imagery, and descriptions</q> (§1).
- Property detail page has an <q>image gallery</q> (§12.1).
- Operator dashboard has a <q>Curation queue: properties pending review for approval</q>, <q>Approve, reject, or request changes on properties</q>, and a <q>Verification logging interface: record monthly verification results, photos, notes</q> (§10.1).
- Property pipeline states are named: <q>draft, pending_review, approved, suspended</q> (§10.1).
- Backend needs a <q>Media handler for photo uploads from operators</q> (§8) — context is WhatsApp damage reporting (§7, §12.1: <q>Photo upload via WhatsApp for damage reporting</q>).
- `damage_claims` has a <q>photos array</q> (§ schema).

**The two photo pipelines are separate:** (A) listing/gallery photos via the operator web dashboard; (B) damage photos via WhatsApp. Build both. Do **not** build an owner upload form at launch.

---

## 2. Storage (Supabase) — the mechanism for both

Golden rule (matches existing stack conventions): **upload the file to Storage, store the URL + key in the database. Never store image bytes in a table.**

- Create two buckets:
  - `property-photos` — listing/gallery images. Public-read (storefront renders them); writes server-side only.
  - `damage-photos` — damage-claim images. **Private**; signed URLs only (these are sensitive, tied to a guest/booking).
- All uploads go through the **server-only admin client** (`createAdmin()`), never the browser. (Consistent with `code-standards.md`: all writes server-side.)

---

## 3. Schema additions

Additive to `0001_schema.sql`. Listing photos get their own table (ordered gallery); damage photos already live on `damage_claims.photos`.

```sql
-- Listing/gallery photos (operator-curated). PRD §10.1, §12.1 image gallery.
create table property_photos (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties (id) on delete cascade,
  storage_key  text not null,              -- object key in `property-photos` bucket
  url          text not null,              -- public render URL
  alt          text not null default '',   -- accessibility
  sort_order   int  not null default 0,    -- gallery ordering
  is_cover     boolean not null default false,
  uploaded_by  uuid references profiles (id),  -- the operator
  status       photo_status not null default 'pending_review', -- mirrors property pipeline
  created_at   timestamptz not null default now()
);
create index property_photos_property_idx on property_photos (property_id, sort_order);

create type photo_status as enum ('pending_review','approved','rejected'); -- §10.1 curation
```

`damage_claims.photos` (already specced as a photos array, § schema) stores objects like:
```jsonc
{ "storage_key": "claims/<claim>/<n>.jpg", "uploaded_at": "..." }
```
Render damage photos via **signed URLs** (private bucket), never public.

---

## 4. Pipeline A — Listing photos (operator web dashboard) · Launch-Critical

This is how editorial gallery photos enter the platform. It lives in the operator curation/verification dashboard the PRD already mandates (§10.1).

### 4a. Upload endpoint (operator only)

```
POST /api/operator/properties/:id/photos
```
1. Authorize: caller is an **operator** assigned to the property's city (§10.2 row-level scope) — else 403.
2. Validate: file is an image, size/type limits, max gallery count.
3. Upload to `property-photos` bucket via `createAdmin()` storage; get `{ key, url }`.
4. Insert `property_photos` row with `status: 'pending_review'`, `uploaded_by = operator.id`.
5. Audit `photo.uploaded`.

### 4b. Curation actions (operator, §10.1 "Approve, reject, or request changes")

```
POST /api/operator/photos/:photoId/approve     -> status: approved
POST /api/operator/photos/:photoId/reject      -> status: rejected (kept for audit)
POST /api/operator/properties/:id/photos/reorder  -> set sort_order / is_cover
```
- A property may move to `approved` (visible on storefront) only when it has ≥1 `approved` photo (editorial-quality gate, §1).
- Reorder/cover sets the gallery order used by the detail page.

### 4c. Render (swap placeholder → real photos)

- **Storefront card & detail gallery:** if the property has `approved` photos, render them (cover first, then `sort_order`). If none yet, fall back to the existing `EditorialArt` duotone placeholder. This keeps mock mode and pre-photography properties working.
- Detail page `image gallery` (§12.1) uses the approved set.

### 4d. Operator dashboard surface (§10.1)

Within the curation queue / verification logging interface:
- Upload control (drag/drop or file picker) on a property in `pending_review`.
- Thumbnail grid with approve/reject/reorder/set-cover.
- Verification logging: photos attach to the monthly verification record (notes + photos, §10.1).
- Property pipeline tracker reflects `draft → pending_review → approved → suspended` (§10.1).

---

## 5. Pipeline B — Damage photos (operator WhatsApp) · Launch-Critical

Per §7, §8, §12.1. This is the **only** photo path that runs over WhatsApp.

Flow (extends the WhatsApp bot, see `whatsapp-bot-build.md`):
1. Operator replies `DAMAGE` → bot: <q>Please send photos (up to 5), brief description, estimated cost in NGN</q> (§8.4 example).
2. Operator sends image messages in the thread. Inbound webhook receives **media messages** (type `image`) → the **media handler** (§8) fetches the media from Meta's media URL (auth header) and re-uploads it to the **private** `damage-photos` bucket.
3. Append each `{ storage_key }` to `damage_claims.photos` (max 5).
4. When description + estimate received, finalise the claim → admin review (§7.5 Path B).
5. Admin/guest view photos via **signed URLs** (§11 admin claim review; § guest portal damage viewer).

Media-handling notes:
- Meta media is fetched in two steps: `GET /{media-id}` → returns a temporary URL → `GET` that URL with the bearer token → bytes. Re-upload immediately (Meta URLs expire).
- Cap at 5 (PRD). Reject non-image media with a bot message.

---

## 6. Where photos are displayed

| Surface | Photos | Access |
|---|---|---|
| Storefront card | cover listing photo (or `EditorialArt` fallback) | public |
| Property detail gallery (§12.1) | approved listing photos, ordered | public |
| Operator curation/verification (§10.1) | all listing photos + verification photos | operator (city-scoped) |
| Admin claim review (§11) | damage photos | admin, signed URLs |
| Guest booking/dispute portal (§ schema) | damage photos for their claim | guest, signed URLs |

---

## 7. Launch-Supporting — Owner upload-for-review (§9.2)

Build **only** when moving to Tier 2. Strictly as the PDF scopes it:
- Owner web dashboard gains <q>Upload photos for review</q> and <q>Edit property details (subject to operator editorial approval)</q> (§9.2).
- Mechanism: `POST /api/owner/properties/:id/photos` → same `property-photos` bucket → `property_photos` row `status: 'pending_review'`, `uploaded_by = owner.id`.
- **Never auto-publishes.** An operator must approve (Pipeline A 4b) before it shows. Editorial control is retained (§1).
- Owners authorized to owned properties only.

Do not build this at launch. At launch, owner listing view is read-only (§9.1).

---

## 8. Hard rules (must not break)

- **Owners do not upload at launch** (§9.1 read-only). Operator-only Pipeline A.
- **All uploads server-side via `createAdmin()`** — never from the browser/anon client.
- **Listing photos public bucket; damage photos private bucket with signed URLs** (damage photos are sensitive, tied to a guest).
- **Store URL + key, never bytes in the DB.**
- **A property goes `approved` only with ≥1 approved photo** — preserves the curated/editorial standard (§1).
- **`EditorialArt` remains the fallback** when a property has no approved photos — mock mode and pre-photography inventory must still render.
- **Operator city scope enforced** on every photo action (§10.2).
- **Damage photos cap = 5** (§8.4).
- **Audit** every upload/approve/reject.

---

## 9. Definition of done

- [ ] `property-photos` (public) and `damage-photos` (private) buckets created
- [ ] `property_photos` table + `photo_status` enum migrated
- [ ] Operator upload + approve/reject/reorder endpoints (city-scoped)
- [ ] Storefront/detail render approved photos; fall back to `EditorialArt`
- [ ] Property cannot reach `approved` without ≥1 approved photo
- [ ] WhatsApp `DAMAGE` flow fetches Meta media → private bucket → `damage_claims.photos` (≤5)
- [ ] Admin + guest view damage photos via signed URLs
- [ ] All uploads server-side; audited; operator scope enforced
- [ ] Owner upload-for-review NOT built at launch (Tier 2 only)

---

## 10. One paragraph for your coding agent

> Implement property photos per PRD v2.3. Two separate pipelines. (A) **Listing photos, operator-only, Launch-Critical:** create a public `property-photos` Supabase bucket and a `property_photos` table (`property_id`, `storage_key`, `url`, `alt`, `sort_order`, `is_cover`, `uploaded_by`, `status` enum `pending_review|approved|rejected`). Operator endpoints (city-scoped per §10.2, server-side via `createAdmin()`) to upload, approve/reject, reorder/set-cover. Storefront and detail gallery render `approved` photos cover-first, falling back to the existing `EditorialArt` duotone when none exist. A property may only become `approved` with ≥1 approved photo. (B) **Damage photos, operator WhatsApp, Launch-Critical:** extend the bot's `DAMAGE` flow to receive up to 5 image messages, fetch each from Meta's media API, re-upload to a **private** `damage-photos` bucket, and append keys to `damage_claims.photos`; admin and guest view them via signed URLs. **Owners do NOT upload at launch** (their listing view is read-only, §9.1); owner upload-for-review is Launch-Supporting (§9.2) and must remain operator-approved before publishing. Store URL+key never bytes; audit everything.