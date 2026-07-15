# CheckinBliss — Product Walkthrough

**Duration:** 5–7 min · **Format:** Live demo + slides · **Audience:** Investors, partners, team

---

## 1. Storefront — Editorial Browse, City Tabs

| | |
|---|---|
| **Open** | `checkinbliss.com` |
| **Action** | Scroll through hero, switch city tabs ("Lagos" / "Abuja") |
| **What they see** | Full-bleed hero image, floating search bar, "Featured stays" carousel split by city. Editorial typography. Curated grid of verified apartments with price, rating, neighbourhood. |
| **Sell** | *"We're Plum Guide for Lagos & Abuja — every listing is inspected in person before it goes live. Guests don't browse 200 listings; we surface the 12 best apartments and let them book in under 60 seconds."* |

---

## 2. Property Detail — Checkout Options, Deposit Promise

| | |
|---|---|
| **Open** | Click any featured stay, e.g. "The Ikoyi Residence" |
| **Action** | Scroll photo gallery, check amenities, expand checkout options (late checkout CTA) |
| **What they see** | Editorial image grid, room description, amenity tags, date selector, price breakdown, late-checkout toggle, deposit badge. "Deposit held, never charged — released automatically after a clean inspection." |
| **Sell** | *"No security deposit anxiety. We authorise a hold on check-in, release it after inspection. The guest never loses liquidity, and the owner is covered. This trust layer is what unlocks instant booking without a phone call."* |

---

## 3. Multi-City Booking — Atomic, 14-Day Rule, Instant Confirmation

| | |
|---|---|
| **Open** | Click "Book" on any available property |
| **Action** | Pick dates (try a stay starting 14+ days away), enter guest info, submit |
| **What they see** | Date validation enforces 14-day minimum-before-arrival rule. Booking reference is generated instantly. "No two bookings overlap — the database guarantees it." |
| **Sell** | *"Atomic multi-city bookings. A guest can book Ikoyi for three nights and Maitama for two in a single transaction — if either city fails, neither is confirmed. The 14-day window protects owners from last-minute gaps, and the database's exclusion constraint makes double-booking structurally impossible."* |

---

## 4. Payment — Hosted Fields, Deposit Hold Distinct from Charge

| | |
|---|---|
| **Open** | Proceed to payment screen (mock mode: no real card needed) |
| **Action** | Enter mock card details into Airwallex hosted fields, confirm |
| **What they see** | Airwallex-hosted card fields (card data never touches CheckinBliss servers). Charge is auto-captured immediately. Deposit hold is created as a separate manual-authorise transaction. Two distinct line items in the confirmation. |
| **Sell** | *"Card data never touches our server — Airwallex hosted fields keep us out of PCI scope. The deposit is a manual-capture hold, not a charge. Money only moves on an approved damage claim. This is the architecture that lets us insure every booking."* |

---

## 5. Owner WhatsApp — New Booking Notification, BLOCK Dates

| | |
|---|---|
| **Open** | Owner's WhatsApp inbox (simulate on phone or WhatsApp Web) |
| **Action** | Show incoming message: "New booking B001 — Chidi Okafor, 4 nights, The Palms Maisonette" |
| **What they see** | Rich WhatsApp notification with guest name, dates, unit, booking reference. Owner can reply `BLOCK B001` to instantly block those dates on their calendar. |
| **Sell** | *"Owners don't want another dashboard to check. They live in WhatsApp. Our bot notifies them of every booking and accepts natural-language commands — `BLOCK`, `PAYOUT`, `CALENDAR`. No login, no app, no friction."* |

---

## 6. Operator WhatsApp — Inspection Prompt → CLEAN → Hold Released

| | |
|---|---|
| **Open** | Operator's WhatsApp inbox |
| **Action** | Show incoming inspection prompt: "Inspection due — 14 Europa Island, check-out 11:00. Reply CLEAN, DAMAGE, NOSHOW, or GUESTPRESENT" |
| **What they see** | Operator inspects, replies `CLEAN`. The deposit hold is automatically released (within minutes). Guest gets a "Your deposit has been released" notification. |
| **Sell** | *"The inspection-to-release cycle is the engine of our trust model. Operator types `CLEAN` on WhatsApp, the deposit hold dissolves. No paperwork, no phone tag, no 14-day wait for 'pending refund'. The guest gets their liquidity back before they've left the building."* |

---

## 7. Damage Path — DAMAGE + Photos → Admin Approve → Partial Capture → Dispute

| | |
|---|---|
| **Open** | Operator WhatsApp (for report) → Admin dashboard (for decision) |
| **Action** | Operator replies `DAMAGE` with photos. Admin logs into dashboard, reviews claim, approves partial capture (e.g. £150 of £500 deposit). Guest gets a dispute window (7 days). |
| **What they see** | Operator: WhatsApp thread with photo upload confirmation. Admin: claim review panel with photos, booking details, Approve/Adjust/Reject buttons, partial-capture amount. |
| **Sell** | *"Damage happens. Our difference: the operator submits photos on WhatsApp before the cleaner enters. The admin approves or adjusts from a dashboard. The guest gets a 7-day dispute window. And the deposit was never a real charge — only the approved damage amount is captured. Everyone is protected, nobody feels cheated."* |

---

## 8. Post-Checkout — Trustpilot Feedback Email

| | |
|---|---|
| **Open** | Post-checkout cron trigger (24h after checkout) |
| **Action** | Show automated email template: "How was your stay at The Palms Maisonette?" → Trustpilot link |
| **What they see** | Editorial email with stay summary, Trustpilot review link, invite to book again. |
| **Sell** | *"We don't build our own reviews — we send guests to Trustpilot. Every review is public, verifiable, and portable. The only metric we optimise for is the Trustpilot score. And the email automation means we follow up with every single guest, zero manual effort."* |

---

## Closing

*"CheckinBliss is the first premium instant-booking platform purpose-built for the African diaspora. Verified apartments, atomic multi-city bookings, WhatsApp-native operations, and a deposit model that eliminates trust friction — all running on a stack that will never double-book, never leak card data, and never auto-capture a deposit.*

*Lagos and Abuja are the wedge, but the model — editorial curation + atomic booking + WhatsApp operations + Trustpilot reputation — is designed for every diaspora-facing city in the world."*
