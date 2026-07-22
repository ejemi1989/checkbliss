# Late Checkout — Version 1 (Launch)

**CheckinBliss** · PRD v2.3 §6 (updated in v2.3). V1 ships a **single** late-checkout option — Extended Checkout to 18:00 at a flat **40% of daily rate** (Launch-Critical). The full four-tier structure is deferred to Launch-Supporting (see V2).

---

## 1. Launch Offering (PRD 6.1)

| Option | Time | Price | Availability |
|---|---|---|---|
| Standard | 11:00 AM | Included | All properties |
| **Extended Checkout** | **18:00 (6:00 PM)** | **40% of daily rate** | Properties opting in |

Example on a £100/night property: Standard included, Extended Checkout £40.

## 2. Why a Single Tier at Launch (PRD 6.2)

- Solves the primary diaspora pain point: most international flights from Lagos depart **20:00–01:00**, requiring evening accommodation.
- 18:00 covers ~**80%** of evening-flight scenarios.
- Reduces booking-flow complexity and operator configuration overhead.
- Launch demand data informs whether further tiers are worth building.

## 3. Not a Search Filter — Either Phase (PRD 6.4)

Late checkout is a **property service indicator, not a search filter**:

- Filtering would hide properties from filter users, shrinking perceived inventory.
- Filter checkboxes read mass-market (Booking.com), not curated (Plum Guide).
- Premium properties showcase services in detail, not via sorting controls.

## 4. UI — Property Card (PRD 6.5)

Card hierarchy: price (top) → name (serif) → city · neighbourhood → metadata row. **"Late checkout"** appears as a small inline indicator at the **same visual weight as bedroom count and capacity** — understated, never a badge or filter.

## 5. UI — Property Detail (PRD 6.6)

A **Checkout options** section lists what this property offers. At launch (single tier):

> Standard checkout — 11:00 AM (included)
> Extended checkout to 18:00 — £[40% of nightly]
> Extended checkout must be confirmed at least **48 hours** before scheduled checkout. Subject to availability based on the next booking.

## 6. Booking Flow Integration (PRD 6.7)

- Default: Standard 11:00 AM (in the booking total).
- Optional: Extended Checkout selection if the property offers it.
- Extended fee **added to the booking total and captured at booking confirmation**.
- *(Launch-Supporting)* Post-booking opt-in: an email/notification 24–48h after booking offering Extended Checkout if not selected.

## 7. Owner Configuration (PRD 6.8)

Per property, during onboarding or via WhatsApp bot:
- Extended Checkout offered: yes/no.
- Pricing (default 40% of daily rate; owner-adjustable within platform guidance).
- Subject-to-availability rules (e.g. not available when next booking is same-day).

## 8. Operational Implication for Inspection (PRD 6.9)

If a guest confirms Extended Checkout, the inspection workflow triggers at **18:00 instead of 11:00** for that booking. The system uses `confirmed_checkout_time` from the reservation record — never an assumed default.

## 9. Backend (PRD 6.10)

- `properties.extended_checkout_offered` (bool), `properties.extended_checkout_price_minor`.
- `reservations.confirmed_checkout_time`, `reservations.late_checkout_fee_minor`.
- Optional extended-checkout step in the booking flow.
- Inspection scheduler keys off `confirmed_checkout_time`, not the standard time.