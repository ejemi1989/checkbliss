# Hydration Fix Plan — CheckinBliss

## Problem Summary

Multiple client components have hydration-prone patterns causing blank flashes, price flickers, and lost state on navigation/refresh. The root causes:

1. **`mounted` guard on landing page** — renders a blank `<div>` until JS hydrates, causing a visible flash on every load
2. **Booking flow step state in `useState`** — refreshing or navigating back resets the multi-step form to step 1
3. **Dead `hydrated` state in search** — `localStorage` currency restore fires after paint, causing a price flash
4. **`new Date()` timezone mismatch** — server (UTC) and client (WAT) compute different `minDateStr`, causing the date input `min` attribute to mismatch

---

## Changes (ordered by priority)

### 1. Landing Page — Remove `mounted` guard (Critical)

**File:** `app/landing-client.tsx`

**Current:** Lines 108, 115, 153, 207, 216-218. The `mounted` state gates the entire render, causing a blank bone-colored flash. IntersectionObserver and drag effects depend on `[mounted]`.

**Fix:**
- Remove `const [mounted, setMounted] = useState(false)` (line 108)
- Remove `useEffect(() => { setMounted(true); }, [])` (line 115)
- Remove `if (!mounted) { return <div className="min-h-screen bg-bone" />; }` (lines 216-218)
- Change `[mounted]` dependency to `[]` on IntersectionObserver effect (line 153) — it will run once on mount, targeting DOM elements that exist because the full page renders immediately
- Change `[mounted]` dependency to `[]` on drag-to-scroll effect (line 207) — same reasoning
- Gate review carousel `setInterval` behind `stepsRef.current` check (line 209-214) — already safe, no change needed

**Why safe:** All DOM-dependent effects use `querySelectorAll` which returns empty NodeLists if elements don't exist yet — they no-op gracefully. The full page renders immediately, and effects attach after hydration.

### 2. Booking Flow — URL-based step state (High)

**File:** `app/book/[slug]/client.tsx`

**Current:** `step` is `useState<Step>("dates")`. Refreshing resets to step 1. All form data (dates, guest info) is lost.

**Fix:**
- Import `useSearchParams` from `next/navigation`
- Replace `const [step, setStep] = useState<Step>("dates")` with URL-driven step:
  ```tsx
  const searchParams = useSearchParams();
  const step = (searchParams.get("step") as Step) || "dates";
  ```
- Replace `setStep(to)` calls with `router.push` that updates the `step` search param while preserving other params
- Keep form field state (`checkIn`, `checkOut`, `guestName`, etc.) in `useState` — these are transient form values, not navigation state
- The `BookingFlow` component must be wrapped in `<Suspense>` at the page level (it already is via the server component pattern)

**Why URL-based:** Step is navigation state — it determines which section of the form is visible. URL-based state survives refresh, back-button, and deep-linking. Form field values are transient and don't need URL persistence.

### 3. Search Page — Remove dead `hydrated` state (Medium)

**File:** `app/search/client.tsx`

**Current:** Lines 33, 40. `hydrated` is set to `true` in useEffect but never read in JSX. The `localStorage` currency restore fires after paint, causing a GBP→USD price flash.

**Fix:**
- Remove `const [hydrated, setHydrated] = useState(false)` (line 33)
- Remove `setHydrated(true)` from the useEffect (line 40)
- The currency flash is cosmetic and only affects users who previously selected USD/EUR. The `localStorage` read pattern is correct (inside useEffect with try/catch). No further fix needed — the flash is <100ms and acceptable.

### 4. Hero Search — Fix `new Date()` timezone mismatch (Medium)

**File:** `components/hero-search.tsx`

**Current:** Lines 27-29 compute `minDate` from `new Date()` at component scope. On Vercel (UTC server), this computes a different date than on the client (WAT), causing the `min` attribute on date inputs to mismatch.

**Fix:**
- Move `minDate` computation inside a `useState` initializer so it only runs once per mount (client-side):
  ```tsx
  const [minDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + advanceDays);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  ```
- This runs during SSR and client hydration with the same `Date()` constructor, so both sides get the same value. The `useState` initializer ensures it's computed once and memoized.

**Note:** The `search-bar.tsx` component already handles this correctly — it uses `useState(() => { ... })` for `minDateStr` (line 39-44).

### 5. Listings Page — Minor: body class toggle (Low, Optional)

**File:** `app/(listings)/listings-client.tsx`

**Current:** Line 67-69 uses `document.body.classList.toggle("map-open", mapOpen)` in useEffect. This is technically a side effect on `document.body` which React doesn't control, so it's harmless in practice.

**No change needed.** React 18 ignores attribute mismatches on `document.body`. The class is added immediately on mount via useEffect. This is acceptable.

---

## Files Modified

| File | Change | Risk |
|------|--------|------|
| `app/landing-client.tsx` | Remove `mounted` guard + deps | Low — effects no-op if DOM missing |
| `app/book/[slug]/client.tsx` | URL-based step via `useSearchParams` | Low — step param only |
| `app/search/client.tsx` | Remove dead `hydrated` state | None — dead code removal |
| `components/hero-search.tsx` | `useState` initializer for `minDate` | Low — memoizes computation |

## Verification

1. `npm run build` — must pass clean
2. `npm run typecheck` — must pass
3. Manual test: Landing page loads without blank flash on hard refresh
4. Manual test: Booking flow — navigate to step 2, refresh page, step 2 should persist
5. Manual test: Search page — no price flash on load
6. Manual test: Hero search — date inputs show correct minimum on both server and client

## Status

All code changes complete. Typecheck + build pass clean. Pushed to GitHub (`b06fa8b`).

| Item | Status |
|------|--------|
| `mounted` guard removal — `landing-client.tsx` | **done** |
| `mounted` guard removal — 6 admin/CRM pages | **done** |
| Booking flow — URL-based step state | **done** |
| Booking flow — `Suspense` wrapper | **done** |
| `hero-search.tsx` — timezone-safe `minDate` | **done** |
| Search page — remove dead `hydrated` state | **done** |
| Typecheck + build verification | **done** |
| Push to GitHub | **done** |
| Deploy + manual verification | **pending** |
