# Super Admin Dashboard — Complete All Gaps

## Context
The admin dashboard (`app/admin/client.tsx`, 735 lines) has 9 views. Audit found 3 missing features and 4 partially implemented. User wants all 6 gaps closed.

## Gaps to Implement (ordered by dependency)

### 1. City Performance Drill-Down
**What:** Per-city metrics card on the home view, clickable to a city detail view showing properties, bookings, revenue, and operator performance for that city only.
**Files:** `lib/data.ts` (new `getCityStats()` helper), `app/admin/client.tsx` (new `cityDetail` view + home view city cards)
**Approach:** Add `getCityStats()` that aggregates properties, bookings, revenue by city from existing mock data. Add city cards to home view. Add `cityDetail` view that filters properties/bookings/finance by selected city.

### 2. Global Cross-Entity Search
**What:** Search bar in the admin header that searches across properties, users, and bookings by name/email/ref.
**Files:** `app/admin/client.tsx` (new `globalSearch` state + search bar in header + search results view)
**Approach:** Add a search input in the header. On type, filter across `properties`, `users`, and `getAdminBookings()` by name/email/ref. Show results grouped by entity type in a dropdown or dedicated view.

### 3. Payout Management
**What:** Payout queue with create, approve, and status tracking.
**Files:** `lib/types.ts` (new `Payout` interface), `lib/data.ts` (new `getAdminPayouts()` + mock data), `actions/payouts.ts` (new Server Action), `app/admin/client.tsx` (new `payouts` view replacing mock finance cards)
**Approach:** Add `Payout` type with status `pending | approved | paid | rejected`. Add mock payout data. Create `approvePayout` Server Action. Replace the hardcoded finance summary cards with computed values from `getAdminPayouts()`. Add payout queue view with approve/reject buttons.

### 4. Wire Finance to Real Data
**What:** Replace hardcoded "£24,000" / "£19,000" / "£4,200" with computed values from `getAdminFinance()`.
**Files:** `app/admin/client.tsx` (finance view), `lib/data.ts` (maybe add `getFinanceSummary()`)
**Approach:** Compute payments/payouts/deposits from `getAdminFinance()` records instead of hardcoded strings. Add a `getFinanceSummary()` helper that sums by type/status.

### 5. Wire User Suspend to Real Action
**What:** Replace the mock toast on user Suspend with an actual Server Action.
**Files:** `actions/users.ts` (new), `lib/data.ts` (add `suspendUser()`), `app/admin/client.tsx` (users view)
**Approach:** Create `suspendUser` Server Action that updates user status in mock data. Wire the Suspend button to call it and update local state.

### 6. Wire Settings Save to Persistence
**What:** Settings modal save should persist to a mock config store (localStorage in mock mode, DB in prod).
**Files:** `app/admin/client.tsx` (settings modal), `lib/data.ts` (new `getPlatformConfig()` / `savePlatformConfig()`)
**Approach:** Use `localStorage` for mock mode persistence. Create `getPlatformConfig()` / `savePlatformConfig()` helpers. Wire the Save button to call `savePlatformConfig()` and show real feedback.

## Implementation Order
1. City drill-down (new view, no conflicts)
2. Global search (header addition, no conflicts)
3. Payout management (new view + type + action)
4. Wire finance data (edit existing finance view)
5. Wire user suspend (edit existing users view)
6. Wire settings save (edit existing settings modal)

## Verification
- `npm run typecheck` — must pass
- `npm run lint` — must pass (pre-existing errors excluded)
- `npm run build` — must pass
- `npm test` — 184/184 must pass
- Visual: all 9+ views render without errors in mock mode
