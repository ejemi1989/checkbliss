# UI Tokens — CheckinBliss (Full System)

> Component + content inventory per surface. Visual tokens (palette, type, spacing) live in `specs/Design-System-V1.md` and `app/globals.css` (`@theme`). This file maps every surface to its components, props, and content. Surface separation (PRD 8.1): **guests on web**, **owners/operators on WhatsApp**, **admin on web**.

---

# 🌐 Page: Storefront (Landing)

---

## 🧩 Header

component: navbar
variant: editorial, sticky

props:

* sticky: true
* minimal_chrome: true

items:

* logo:

  * text: "CHECKINBLISS"
  * mark: brass dot

* links:

  * Stays (#collection)

* trust:

  * label: "★ 4.8 on Trustpilot"

* currency_toggle:

  * options: ["£", "$", "€"]
  * default: "£"
  * note: display-only (charges settle GBP)

---

## 🧩 Hero

component: hero
variant: editorial

content:

* eyebrow: "Lagos · Abuja — September 2026"

* heading: "Come home to somewhere worthy of the journey."

* subtext: >
  Premium short-stay apartments in Nigeria — every one invited, inspected and
  verified by our own operators. Instantly bookable from London, Houston, Toronto
  or anywhere the diaspora calls home.

* seal: rotating "VERIFIED · CURATED · CHECKINBLISS" (disabled under reduced-motion)

---

## 🧩 Hero Stats

component: stat_cards
variant: inline

items:

* value: "100%"
  label: "Verified in person, monthly"

* value: "Instant"
  label: "No host approval needed"

* value: "18:00"
  label: "Extended checkout for evening flights"

---

## 🧩 City Navigation

component: tabs
variant: navigation (NOT filters — PRD 6.4)

items:

* All stays
* Lagos
* Abuja

meta:

* right_label: "{n} residences"

---

## 🧩 Property Grid

component: property_grid
variant: editorial / asymmetric magazine

card: property_card

card_props:

* feature: boolean (featured residences span wider cells)
* flip: boolean (alternating duotone art direction)

card_content (PRD 6.5 hierarchy, top → bottom):

* art: editorial duotone placeholder (per-property `hero_hues`, grain overlay)
* price: "{Price} / night"
* name: large serif
* location: "{city} · {neighbourhood}"
* meta_row: "{bedrooms}BR · Sleeps {sleeps}"
* service_indicator: "Late checkout" (brass dot, same weight as bedroom count — never a filter)

---

## 🧩 Brand Interlude

component: feature_grid
variant: lagoon panel, 4 pillars

items:

* title: "Verified, in person"
  description: "Operators inspect every property monthly and after every checkout."

* title: "Deposit held, never charged"
  description: "A pre-authorisation hold on your card — released automatically within 7 days of a clean checkout."

* title: "Built for evening flights"
  description: "Extended checkout to 18:00 — because most flights out of Lagos leave after 20:00."

* title: "Book your full homecoming"
  description: "Lagos then Abuja in one checkout, one payment — atomically confirmed or not at all."

---

## 🧩 Footer

component: footer
variant: minimal, single-row

content:

* left: "© 2026 CheckinBliss · Operated by Lyxio Curtis Ltd, UK"
* center: "Lagos · Abuja — Port Harcourt next"
* right: "Reviews live on Trustpilot · ★ 4.8"

---

# 🏠 Page: Property Detail (`/stays/[slug]`)

---

## 🧩 Header Row

component: detail_header

content:

* back_link: "← All stays"
* name: large serif
* meta: "{city} · {neighbourhood} — {bedrooms}BR · Sleeps {sleeps}"
* price: "{Price} / per night"

---

## 🧩 Gallery

component: gallery
variant: editorial mosaic

items:

* primary (2×2) + 2 secondary — duotone placeholders until photography

---

## 🧩 Residence Info

component: prose_section

sections:

* "The residence" — description
* "Amenities" — two-column list, brass bullet

---

## 🧩 Checkout Options

component: checkout_options (PRD 6.6)

rows:

* label: "Standard checkout"
  detail: "All stays"
  value: "11:00 AM — included"

* label: "Extended checkout"
  detail: "For evening flights out of {city}" | "Not offered at this residence"
  value: "to 18:00 — {Price}" | "—"

note: >
  Extended checkout must be confirmed at least 48 hours before scheduled checkout,
  and is subject to availability based on the next booking.

---

## 🧩 Route Note

component: callout
variant: getting-there

content:

* heading: "Getting there"
* body: property route_note (brass left-border, bone bg)

---

## 🧩 Booking Panel

component: booking_panel
variant: sticky, lagoon

content:

* from_price: "{Price} / night"
* line: "Checkout (standard) — 11:00 AM"
* line: "Extended checkout to 18:00 — {Price}" (if offered)
* line: "Security deposit — {Price} hold"
* cta: "Reserve instantly"
* reassurance: "Instant confirmation — no host approval. Your deposit is a card hold, not a charge, released within 7 days of a clean checkout."
* trust: "★ 4.8 on Trustpilot"

---

# 🧾 Page: Booking Flow (`/book/[slug]`)

component: booking_flow
variant: 3-step (client)

---

## 🧩 Step 1 — Dates & Guest

fields:

* check_in (date) — constrained by **14-day advance rule** (surfaced as a trust feature)
* check_out (date)
* guest_name, guest_email, guest_phone
* guests (count)

multi_city:

* add_stay: up to 5 stays ("book your full homecoming")

---

## 🧩 Step 2 — Checkout Option

options:

* Standard — 11:00 AM (included)
* Extended — to 18:00 ({Price}) — only if property offers it

---

## 🧩 Step 3 — Payment

component: payment
variant: Airwallex hosted fields (in-page, no redirect)

methods:

* Card (Visa / Mastercard / Amex)
* Apple Pay
* Google Pay
* (No BNPL)

summary:

* accommodation: {Price}
* extended_checkout_fee: {Price} (if selected)
* deposit_hold: {Price} — "held, not a charge"
* total_charged: {Price}

---

# ✅ Page: Confirmation (`/confirmation/[reference]`)

component: confirmation

content:

* reference: booking reference
* per_stay: property · dates · confirmed checkout time · total
* charged_total: {Price}
* deposit_explainer: "Held, not a charge. Released within 7 days of a clean checkout."
* owner_note: "The owner has been notified."

---

# 🛠️ Page: Admin / Claims (`/admin/claims`)

---

## 🧩 Claim Queue

component: table
variant: pending review

columns:

* Property
* Guest
* Dates
* Estimate
* Status

rows (example):

* "Lagoon View Loft" | "Adaeze O." | "15–19 Sep" | "₦15,000" | "Pending"

---

## 🧩 Claim Detail

component: claim_detail

content:

* photos: up to 5 (basic viewer)
* operator_description
* estimated_cost: {Price} / ₦
* booking_details: guest, dates, property, payment reference
* guest_contact

actions:

* Approve (capture full estimate from hold)
* Adjust (capture {amount}; remainder released)
* Reject (release full hold)

post_action:

* guest notified with photos + **7-day dispute window**

---

# ⚙️ System Tokens (Global Logic)

---

## 🧩 Currency State

component: currency_state

behavior:

* options: GBP / USD / EUR
* scope: **display only** (ephemeral client context)
* invariant: charges always settle in GBP; NGN excluded from display

---

## 🧩 Surface / Auth State

component: surface_state

states:

* guest (web):

  * may browse freely; book without an account
  * primary_cta: "Reserve instantly"

* owner (WhatsApp):

  * identified by E.164; notifications + BLOCK/UNBLOCK/AVAILABILITY/BOOKINGS

* operator (WhatsApp + web):

  * inspection prompts (CLEAN/DAMAGE/NOSHOW/GUESTPRESENT); city-scoped review surface

* admin (web):

  * claim review, suspend, operators; founder-only at launch (`ADMIN_DASH_KEY`)

---

## 🧩 WhatsApp Bot

component: whatsapp_bot
variant: command-based (AI conversational = Phase 2)

security:

* X-Hub-Signature-256 HMAC verified
* sender E.164 must match a registered owner/operator (unknown → ignored)
* strict parse — malformed rejected, not guessed
* one thread per owner; 12-month audit retention

owner_commands: BLOCK · UNBLOCK · AVAILABILITY · BOOKINGS · HELP

operator_commands: YES · REASSIGN · CLEAN · DAMAGE · NOSHOW · GUESTPRESENT

outbound: template library only (new booking, pre/post-checkout, damage resolution, payout, verification)

---

## 🧩 Notifications

component: toast

behavior:

* position: bottom-center
* auto-dismiss: true

use_cases:

* booking success / failure ("nothing was charged")
* validation feedback (14-day rule, unavailable dates)
* currency / navigation updates

---

## 🧩 Data Model (Implied)

entities:

* property:

  * slug, city, neighbourhood, amenities
  * nightly_rate_minor, deposit_minor
  * extended_checkout_offered, extended_checkout_price_minor
  * status (draft → pending_review → approved → suspended)

* reservation:

  * booking_group_id (multi-city, atomic)
  * stay (daterange — GiST exclusion: no double-booking)
  * confirmed_checkout_time (11:00 / 18:00)
  * accommodation_minor, total_minor, status

* deposit_hold:

  * airwallex_authorisation_id, hold_amount_minor
  * status (held → released / partially_captured / fully_captured / expired)
  * expires_at (7-day backstop)

* inspection:

  * operator_id, result (clean/damage/noshow/guestpresent)
  * scheduler timestamps (pre-notice / prompt / reminder / escalation)

* damage_claim:

  * photos, estimated_cost_minor
  * admin_decision (approved/adjusted/rejected)
  * guest_dispute_status, resolved_amount_minor

* profile:

  * role (guest/owner/operator/admin)
  * whatsapp_e164, operator_assignments (city scope)

---