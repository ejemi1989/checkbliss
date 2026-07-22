# CheckinBliss Operational Structure — Guiding Our UI Structure

*Follow-up to Document 1*

CheckinBliss is a **curated marketplace**, not a freelance marketplace — everything we do is intentional and premium. This is fundamentally different from platforms like Airbnb (open marketplace) or freelance networks (transactional relationships). So: no open listing requests, no open partnership requests — all are closed and curated.

---

## Homepage Redesign

For the homepage redesign, see the attached file — this is the final version. Missing pictures will be sent in the coming weeks as soon as we get them.

*Homepage, final version — refer to attached file.*

**Next update is the property listing page.**

---

## Change 1 — Remove ratings and verified tick

**This has to go:** individual property review rating and the verified tick.

*[Image: property card showing star rating and a "verified" tick badge]*

Same logic as above — we are a closed, curated, premium marketplace, so we don't rely on reviews. All apartments are handpicked.

---

## Change 2 — Remove "verified" filter and listing count

Same issue: the verified-only filter does not align with our platform, and filters that resemble a mass-market listing site have to go.

*[Image: filter bar with a "Verified" toggle and total stay count for Lagos]*

**To be deleted:** verified filter, total number of stays in Lagos, and filters.

*[Image: filter panel]*

**To be deleted also.**

Right now we have thin supply of apartments, so showing a count at the top might discourage a user.

### Recommendation

Visit **plumguide.com** — a clean design.

*[Image: Plum Guide's minimal search bar]*

Filter hidden. Thin search bar with minimal content. No apartment count — clean and minimal.

---

## Change 3 — Change listing layout from 3-column to 1-column + map

Current apartment view is three-column.

*[Image: three-column apartment grid]*

Beautiful, but needs to change because we have little apartment supply — which might be just one page or less than a page.

**Three-column apartment listing → Delete.**

**Our recommendation:** just one column, with a map view of the apartment locations on the other side.

This is important because of how we list apartments on the site. For example: one property has 4 apartments, which brings the problem of 4 properties in an identical location — if listed in columns this might look repeated, but when stacked we can safely mix same-location properties with other same-location properties in a way a user might not notice.

### Recommendation

**Plumguide.com**

*[Image: Plum Guide's split-view layout — listings on the left, map on the right]*

Property listing on the left side, map on the other side. With this a user can scroll and scroll and go through multiple pages — this creates an illusion of a huge property listing.

---

## Change 4 — Remove the "14 days ahead" booking message

Telling end users that booking is 14 days ahead.

*[Image: notice reading "Booking opens 14+ days ahead"]*

People will still make the mistake.

**Kindly delete this in checkout.**

**Booking opens 14+ days ahead → Delete.**

### Recommended approach

Internal logic that returns no booking / no availability for any selection before 14 days. Or grey out the calendar so the user cannot click on the date.

---

## Change 5 — Diaspora-focused signup form

Interestingly, this is something we need to look at. CheckinBliss is built for diaspora people, so the signup form should reflect this positioning.

**Requirements:**
- Include **country of residence** as a dropdown.
- **No African country** should be in the country-of-residence dropdown — we will only have: Europe, USA, Canada, UK, Asia, Australia.
- Phone number verification via text message, to prevent local bookings.
- We may also need **ID verification**.
- Or **flight ticket verification** as an alternative, if a guest doesn't want to do ID verification.

*(We will need to discuss the best way to implement this.)*

---

## Change 6 — Page to be redesigned

Will design this page.

*[Image: page currently in place]*

To reflect premium positioning. Will provide this in the coming weeks while the other updates are being implemented.

---

*Fin. Thank you.*