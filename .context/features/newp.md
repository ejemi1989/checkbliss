# URGENT: Fix CheckinBliss Booking Page — Refresh Required After Navigation

## Live Problem

Production URL:

https://checkbliss-gamma.vercel.app/book/lagoon-view-loft

The booking page behaves incorrectly when users navigate to it normally.

Current behaviour:

    Home/property page
          ↓
    Click "Book"
          ↓
    /book/lagoon-view-loft
          ↓
    INCORRECT / INCOMPLETE STATE
          ↓
    User manually refreshes
          ↓
    CORRECT STATE

A browser refresh fixes the page.

This means the application must be tested specifically through Next.js CLIENT-SIDE NAVIGATION, not only by opening the URL directly.

---

# DO NOT ASSUME THIS IS ONLY A HYDRATION WARNING

Do NOT simply:

- add suppressHydrationWarning
- add router.refresh()
- add window.location.reload()
- add setTimeout()
- add arbitrary useEffect()
- disable SSR
- add dynamic(..., { ssr: false }) everywhere

Find the actual reason why:

    CLIENT NAVIGATION != REFRESH

---

# STEP 1 — REPRODUCE THE BUG

Run:

```bash
npm run dev

Then reproduce exactly:

/
↓
property page
↓
click Book
↓
/book/lagoon-view-loft

Then compare against:

Directly open:
/book/lagoon-view-loft

Then:

Open booking page
↓
refresh browser

Document exactly what differs between:

Client navigation
Direct navigation
Refresh
STEP 2 — DETERMINE APP ROUTER STRUCTURE

Inspect:

app/
pages/
src/app/
src/pages/

Determine whether the project uses:

App Router
Pages Router
both

Inspect:

app/layout.tsx
app/book/layout.tsx
app/book/[slug]/page.tsx

and all parent layouts.

Do not assume the structure.

STEP 3 — TRACE BOOKING PAGE DATA

Trace the complete data path:

property slug
      ↓
property lookup
      ↓
property data
      ↓
booking page
      ↓
booking component
      ↓
date state
      ↓
guest state
      ↓
availability
      ↓
pricing

Identify exactly where each value originates.

The following values must be logged during debugging:

slug
property.id
property.name
property.price
checkIn
checkOut
guests
availability
total
STEP 4 — CHECK FOR STALE STATE FROM THE PREVIOUS ROUTE

This is HIGH PRIORITY.

Next.js App Router uses soft navigation and preserves shared layouts/client state between routes.

Inspect whether booking state is stored in:

Context
Zustand
Redux
React Context
localStorage
sessionStorage
URL search params
layout-level useState

Search the project:

grep -R "useState" app src components
grep -R "localStorage" app src components
grep -R "sessionStorage" app src components
grep -R "createContext" app src components
grep -R "zustand" .

Look specifically for state that survives navigation.

STEP 5 — CHECK WHETHER BOOKING FORM IS INSIDE A PERSISTENT LAYOUT

If the structure is similar to:

app
 ├── layout.tsx
 └── book
      ├── layout.tsx
      └── [slug]
           └── page.tsx

determine whether the booking component is mounted inside a persistent layout.

If state belonging to a previous booking/property survives navigation, isolate the booking state by property.

For example, if appropriate:

<BookingForm
  key={property.id}
  property={property}
/>

Do not add this blindly. Confirm that stale component state is actually occurring.

STEP 6 — CHECK PROPERTY SLUG PROPAGATION

Verify that the slug is correct at EVERY stage.

For:

/book/lagoon-view-loft

the following must all equal:

lagoon-view-loft

Check:

URL slug
params.slug
API request slug
database query slug
returned property.slug
BookingForm property.slug

Add temporary development logging:

console.log("[BOOKING DEBUG]", {
  slug,
  propertySlug: property?.slug,
  propertyId: property?.id,
});

If the first navigation produces:

slug = lagoon-view-loft
property = undefined

while refresh produces:

slug = lagoon-view-loft
property = lagoon-view-loft

then the bug is DATA INITIALIZATION, not hydration.

STEP 7 — CHECK ASYNC RACE CONDITIONS

Search for multiple requests that can update the booking state.

For example:

property request
availability request
pricing request
user/session request

Potential race:

Navigation
   ↓
Request A starts
   ↓
Request B starts
   ↓
B completes
   ↓
Correct state
   ↓
A completes later
   ↓
OLD STATE overwrites correct state

Inspect:

useEffect(...)
fetch(...)
axios(...)

especially effects depending on:

slug
property
dates
guests

Every effect must have correct dependencies.

STEP 8 — CANCEL STALE REQUESTS

If an effect performs asynchronous fetching, protect it against stale results.

Example:

useEffect(() => {
  const controller = new AbortController();

  async function loadAvailability() {
    try {
      const response = await fetch(
        `/api/availability?property=${property.id}`,
        {
          signal: controller.signal,
        }
      );

      const data = await response.json();

      setAvailability(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      throw error;
    }
  }

  loadAvailability();

  return () => controller.abort();
}, [property.id]);

Adapt this to the existing architecture.

Do not introduce duplicate API calls.

STEP 9 — CHECK EFFECTS THAT RUN ONLY ON MOUNT

Search for:

useEffect(() => {
  ...
}, []);

These are HIGH PRIORITY.

If the effect depends on the property/slug, an empty dependency array can be wrong.

Example of a potential bug:

useEffect(() => {
  loadProperty(slug);
}, []);

If slug changes through client navigation, the effect may not execute for the new property.

Correct:

useEffect(() => {
  loadProperty(slug);
}, [slug]);

Apply only where the dependency is genuinely required.

STEP 10 — CHECK CLIENT NAVIGATION WITH useParams()

If the booking component is a Client Component and obtains the slug using routing APIs, inspect:

useParams()
usePathname()
useSearchParams()

Make sure the booking UI reacts when the route changes.

Example:

const params = useParams();

const slug =
  typeof params.slug === "string"
    ? params.slug
    : undefined;

Do not use a pathname parser if Next.js route params can be used directly.

STEP 11 — CHECK usePathname()

Search:

grep -R "usePathname" app src components

If the booking UI depends on:

usePathname()

determine whether rewrites/proxy configuration exists.

Inspect:

next.config.*
proxy.ts
middleware.ts

Next.js documents that usePathname() combined with rewrites can produce server/client differences and hydration mismatches. In that case, isolate pathname-dependent UI and provide a stable server fallback.

STEP 12 — CHECK next.config

Inspect:

next.config.js
next.config.mjs
next.config.ts

Look for:

rewrites
redirects
basePath
trailingSlash
experimental
turbopack

Especially:

rewrites

because the public URL:

/book/lagoon-view-loft

could potentially be mapped to another internal route.

STEP 13 — CHECK LINK

Find the button/link that takes users to:

/book/lagoon-view-loft

It should normally use:

<Link href={`/book/${property.slug}`}>

or equivalent.

Check whether it instead does something like:

router.push(...)

or:

window.location.href = ...

or constructs an incorrect URL.

If using router.push, verify the target is exactly:

/book/lagoon-view-loft

Do not change navigation merely for the sake of changing it.

STEP 14 — CHECK PREFETCHING / ROUTER CACHE

Because the issue occurs during navigation but refresh works, test whether the prefetched route data is stale.

Temporarily change the booking link to:

<Link
  href={`/book/${property.slug}`}
  prefetch={false}
>

TEST ONLY.

If disabling prefetch makes the bug disappear, the problem is likely related to:

prefetched RSC payload
or
router cache
or
data caching

Do NOT leave prefetch={false} as the final solution unless there is a demonstrated reason.

Instead identify why the prefetched route receives stale/incorrect data.

STEP 15 — CHECK SERVER DATA CACHE

Inspect all booking/property fetches.

Search:

grep -R "fetch(" app src lib
grep -R "unstable_cache" app src lib
grep -R "cache(" app src lib
grep -R "revalidate" app src lib

Determine whether property/availability data is cached incorrectly.

For booking-critical availability data, ensure stale cache is not being used.

Do not globally disable caching.

Use the narrowest appropriate cache strategy.

STEP 16 — CHECK DATABASE LOOKUP

Inspect:

getPropertyBySlug()
getProperty()
findUnique()
findFirst()

Ensure the lookup is deterministic.

For example:

const property = await prisma.property.findUnique({
  where: {
    slug,
  },
});

Make sure no global mutable variable is being used:

let currentProperty;

or:

global.property

or module-level state that can leak between requests.

STEP 17 — CHECK DATE INITIALIZATION

Do not initialize booking dates using browser/server-dependent values during render.

Avoid:

const today = new Date();

if it changes the server/client rendered structure.

Prefer a stable server-provided value or explicit:

YYYY-MM-DD

representation.

Also inspect:

minDate
maxDate
disabledDates
availability dates

for timezone conversion.

STEP 18 — CHECK FORM DEFAULT STATE

The live server page currently shows:

Guests: 1
Max 2 guests

Verify that these values are not being initialized differently after client navigation.

For example:

const [guests, setGuests] = useState(
  property.maxGuests ? 1 : 0
);

could produce different state depending on when property becomes available.

Prefer deterministic initialization followed by an explicit property-dependent update where necessary.

STEP 19 — CHECK COMPONENT KEYING

If the same booking component is reused across properties:

<BookingForm property={property} />

React may preserve state.

If the booking form represents a distinct property instance, test:

<BookingForm
  key={property.id}
  property={property}
/>

This is particularly important when navigating:

Property A
↓
Book A
↓
Back
↓
Property B
↓
Book B

Verify that A's state cannot leak into B.

STEP 20 — ADD TEMPORARY DEBUGGING

Add temporary logs around:

BookingPage
BookingForm
property loading
availability loading
pricing
slug changes

Use:

console.log("[BOOKING]", {
  slug,
  propertyId: property?.id,
  propertySlug: property?.slug,
  guests,
  checkIn,
  checkOut,
});

Also log:

useEffect(() => {
  console.log("[BOOKING MOUNT]", property?.id);

  return () => {
    console.log("[BOOKING UNMOUNT]", property?.id);
  };
}, [property?.id]);

This will reveal whether the component is:

not mounting
mounting with undefined data
mounting with stale data
mounting with previous property
mounting correctly but UI state is stale

Remove debug logging after the root cause is identified.

STEP 21 — DO NOT PATCH THE SYMPTOM

The following are NOT acceptable fixes:

window.location.reload()
router.refresh()
setTimeout(...)
suppressHydrationWarning
dynamic(..., { ssr: false })
window.location.href = window.location.href

unless the investigation proves that a specific browser-only third-party component requires client-only rendering.

STEP 22 — REQUIRED ROOT-CAUSE REPORT

Before saying the issue is fixed, report:

ROOT CAUSE:
<exact cause>

WHY REFRESH FIXED IT:
<exact explanation>

WHY CLIENT NAVIGATION FAILED:
<exact explanation>

AFFECTED FILE:
<file>

AFFECTED COMPONENT:
<component>

FIX:
<exact implementation>

WHY THE FIX WORKS:
<technical explanation>
STEP 23 — REQUIRED TESTS

Test:

Test A
Open homepage
→ property
→ Book

Expected:

Correct booking page immediately
Test B
Direct:
/book/lagoon-view-loft

Expected:

Correct
Test C
Navigate to booking
→ no refresh

Expected:

Correct
Test D
Navigate away
→ return to booking

Expected:

Correct
Test E
Property A
→ booking A
→ back
→ Property B
→ booking B

Expected:

No state leakage
Test F
Slow network

Expected:

Loading state
→ correct booking page
Test G
Production build

Run:

npm run build
npm run start

Expected:

PASS