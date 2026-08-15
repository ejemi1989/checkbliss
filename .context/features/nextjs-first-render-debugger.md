---
name: nextjs-first-render-debugger
description: Professional Next.js incident-resolution skill for pages that render incorrectly on first navigation/load but become correct after refresh, including hydration mismatches, SSR/client divergence, loading-state flashes, authentication/session timing, CSS/font/image layout shifts, route-cache differences, and client-side initialization bugs. Use when a Next.js page has a broken initial render, visual flash, incorrect layout, missing styles, stale state, or any first-load-versus-refresh inconsistency.
---

# Next.js First-Render & Hydration Incident Resolver

## Mission

Resolve first-render inconsistencies in Next.js applications at root cause.

The canonical symptom is:

```text
FIRST LOAD / NAVIGATION
        ↓
incorrect UI / layout / state
        ↓
refresh
        ↓
correct UI
```

The agent MUST NOT treat this as a cosmetic CSS problem until server/client rendering, hydration, state initialization, caching, asset loading, and authentication have been investigated.

The objective is:

```text
OBSERVE
  ↓
REPRODUCE
  ↓
DIFFERENTIATE SERVER VS CLIENT
  ↓
TRACE RENDER PIPELINE
  ↓
IDENTIFY ROOT CAUSE
  ↓
APPLY MINIMAL FIX
  ↓
VALIDATE PRODUCTION BEHAVIOUR
  ↓
REGRESSION TEST
```

Do not declare the issue fixed merely because the page looks correct once.

---

# 1. Incident Definition

Classify the incident when any of these are reported:

- Page looks broken on first visit.
- Page becomes correct after refresh.
- Page looks different after client navigation.
- Page looks different when opened directly.
- UI flashes into the correct state after loading.
- Layout changes after hydration.
- Styles appear late.
- Content appears twice or changes after hydration.
- Authentication-dependent UI changes after initial render.
- Mobile/desktop layout is incorrect until refresh.
- A route behaves differently after a hard reload.
- A page is correct in development but incorrect in production.
- A page is correct in production but incorrect during client navigation.

Treat these as **render lifecycle incidents**, not automatically as CSS bugs.

---

# 2. Required Investigation Model

Trace the page through this pipeline:

```text
Request
  ↓
Middleware
  ↓
Route resolution
  ↓
Server Component rendering
  ↓
Server data fetching
  ↓
HTML/RSC payload
  ↓
Browser receives document
  ↓
CSS / font / image loading
  ↓
Client JavaScript
  ↓
React hydration
  ↓
Client state initialization
  ↓
useEffect / useLayoutEffect
  ↓
Authentication/session resolution
  ↓
Router/cache state
  ↓
Final UI
```

Identify the exact stage where the UI diverges.

---

# 3. Evidence First

Before changing code, collect evidence.

Inspect:

```text
package.json
next.config.*
tsconfig.json
middleware.*
app/**
components/**
src/**
lib/**
styles/**
public/**
```

Identify:

- Next.js version
- React version
- App Router or Pages Router
- Server Components
- Client Components
- authentication provider
- data-fetching architecture
- CSS framework
- font strategy
- image strategy
- deployment platform
- caching strategy

Inspect available scripts before running commands.

Prefer the project's package manager.

---

# 4. Reproduce the Exact Failure

Create a precise reproduction matrix.

Test:

```text
A. Direct URL → first load
B. Direct URL → hard refresh
C. Internal Next.js navigation
D. Browser back/forward
E. New tab
F. Incognito/private window
G. Logged out
H. Logged in
I. Desktop viewport
J. Mobile viewport
K. Development build
L. Production build
```

Record:

```text
Scenario
Expected result
Actual result
Difference
```

Do not change code until the original behaviour is understood unless an obvious blocking error prevents reproduction.

---

# 5. Establish Whether the Problem Is Server or Client

This is the most important diagnostic split.

Determine:

```text
Does the server-generated HTML already contain the broken state?

OR

Is the server HTML correct and does the browser become incorrect during hydration?

OR

Is the initial HTML correct but CSS/assets change the layout?

OR

Does a client-side effect change the UI after hydration?
```

Use browser DevTools where available.

Compare:

```text
View Source
DOM after hydration
React component state
Computed CSS
Network requests
Console
```

Do not rely solely on the final DOM.

---

# 6. Hydration Investigation

Search the affected route and its dependencies for:

```tsx
window
document
localStorage
sessionStorage
navigator
matchMedia
innerWidth
innerHeight
location
Date.now()
new Date()
Math.random()
crypto.randomUUID()
```

Also inspect:

```tsx
useState()
useEffect()
useLayoutEffect()
```

Investigate any value that can differ between server and browser.

Examples:

```tsx
const isMobile = window.innerWidth < 768;
```

```tsx
const theme = localStorage.getItem("theme");
```

```tsx
const now = new Date();
```

```tsx
const id = Math.random();
```

```tsx
if (typeof window !== "undefined") {
  return <DifferentUI />;
}
```

Do not automatically remove browser APIs.

Determine whether their use causes different rendered output.

---

# 7. Server/Client Component Boundary

For every component in the failing render path determine:

```text
Server Component?
Client Component?
Why does it need to be client-side?
What props cross the boundary?
Are props serializable?
Does a server component depend on client state?
Does a client component unnecessarily own the whole page?
```

Prefer:

```text
Server page
   ↓
deterministic layout
   ↓
server data
   ↓
small interactive Client Component
```

Avoid:

```text
entire page
   ↓
"use client"
   ↓
client initialization
   ↓
hydration-dependent layout
```

Do not add `"use client"` as a generic fix.

---

# 8. Loading-State Investigation

Search for:

```tsx
loading
isLoading
isPending
mounted
hydrated
ready
initialized
isLoaded
isSignedIn
session
user
```

Identify whether the first render uses a temporary UI.

Example:

```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);
```

Ask:

```text
Does the temporary UI have different dimensions?
Does it use different CSS?
Does it change the DOM structure?
Does it cause layout shift?
Does it disappear after hydration?
```

If yes, determine whether the state can be resolved on the server instead.

---

# 9. Authentication and Session Timing

If authentication is involved, trace:

```text
request
 ↓
middleware
 ↓
server session
 ↓
client session
 ↓
loading state
 ↓
authenticated UI
```

Investigate:

```text
server sees authenticated user
browser initially sees unknown user
browser resolves session after hydration
redirect occurs after hydration
```

Do not render substantially different layouts based on an unknown authentication state unless explicitly designed for it.

Prefer server-known authentication state where the authentication architecture permits it.

---

# 10. CSS Investigation

Only after rendering/state differences have been investigated, inspect CSS.

Check:

```text
global CSS
Tailwind classes
CSS modules
styled-components
MUI/emotion
className composition
CSS import order
specificity
media queries
container dimensions
positioning
display
visibility
opacity
```

Look specifically for classes that change after hydration.

Compare:

```text
BROKEN STATE className
CORRECT STATE className
```

If the classes differ, determine why.

Do not solve a state problem by hardcoding dimensions.

---

# 11. Tailwind Investigation

Check for dynamic class construction:

```tsx
`bg-${color}-500`
`w-${width}`
`text-${size}`
```

Tailwind cannot reliably detect arbitrary runtime-generated classes.

Prefer explicit mappings:

```tsx
const variants = {
  primary: "bg-green-600",
  secondary: "bg-gray-200",
};
```

Also inspect:

```text
tailwind.config.*
content paths
safelist
class merging
cn()
clsx()
```

---

# 12. Font Investigation

If typography or spacing changes after load, investigate fonts.

Check:

```text
next/font
Google fonts
local fonts
font-face
font-display
font fallback
font loading timing
```

Determine whether the first render uses a fallback font and the final render uses a custom font.

Prefer `next/font` where appropriate.

The fix should minimize cumulative layout shift.

---

# 13. Image Investigation

For visual shifts inspect:

```tsx
next/image
width
height
fill
sizes
priority
objectFit
container position
```

Ensure images have stable dimensions.

A late-loading image must not unexpectedly change the dimensions of the surrounding layout.

---

# 14. Data-Fetching Investigation

Trace:

```text
page
 ↓
fetch/server action
 ↓
cache
 ↓
database/API
 ↓
response
 ↓
component
```

Check:

```text
loading state
null state
error state
stale data
cache
revalidate
no-store
router cache
request timing
```

Determine whether refresh changes the data source or cache state.

Do not add `no-store` everywhere as a blind fix.

---

# 15. Next.js Cache Investigation

If refresh changes behaviour, inspect:

```text
Data Cache
Full Route Cache
Router Cache
browser cache
CDN cache
ISR
fetch cache
revalidate
dynamic rendering
```

Determine exactly which layer contains the stale or incorrect state.

Ask:

```text
Why does navigation use one state while refresh uses another?
```

Fix the responsible cache layer rather than disabling caching globally.

---

# 16. Middleware Investigation

Inspect middleware for:

```text
redirects
rewrites
authentication
cookies
headers
locale detection
device detection
route matching
```

Test whether:

```text
direct request
```

and

```text
client navigation
```

pass through the same logic.

Remember that client navigation may not execute the exact same lifecycle as a full document request.

---

# 17. React Effect Investigation

Inspect every effect in the render path.

For each `useEffect` ask:

```text
What does it read?
What does it write?
What state does it change?
Can it run after hydration?
Can it run multiple times?
Can it race another effect?
Can it change layout?
Can it trigger another render?
```

Look for:

```text
effect loops
stale closures
incorrect dependencies
duplicate fetches
state synchronization bugs
race conditions
```

Do not remove dependency arrays simply to stop an effect from running.

---

# 18. Race-Condition Investigation

If the issue is intermittent, assume a race may exist.

Example:

```text
Request A starts
Request B starts
Request B finishes
UI becomes correct
Request A finishes later
UI becomes incorrect
```

Use:

```text
AbortController
request identity
stable query keys
proper effect cleanup
server-side data loading
```

where appropriate.

---

# 19. Browser Console

Classify every console message:

```text
ROOT CAUSE
SECONDARY
WARNING
THIRD-PARTY
ENVIRONMENTAL
NOISE
```

For example:

```text
ERR_BLOCKED_BY_CLIENT
```

may indicate an ad blocker or browser privacy extension rather than an application defect.

Do not "fix" unrelated third-party console noise.

---

# 20. Accessibility Warnings

Accessibility issues should be corrected separately.

For form controls:

```tsx
<label htmlFor="email">
  Email address
</label>

<input
  id="email"
  name="email"
  type="email"
  autoComplete="email"
/>
```

Do not confuse:

```text
missing label
missing autocomplete
```

with:

```text
hydration failure
layout failure
server rendering failure
```

unless evidence connects them.

---

# 21. Production Reproduction

After identifying a likely cause, reproduce using a production build:

```bash
npm run build
npm run start
```

or the equivalent project commands.

Compare:

```text
development
vs
production
```

This is mandatory for SSR/hydration issues where possible.

---

# 22. Fix Principles

The fix MUST:

1. Address the root cause.
2. Preserve the existing architecture where possible.
3. Minimize changed files.
4. Avoid unrelated refactoring.
5. Avoid unnecessary dependencies.
6. Preserve accessibility.
7. Preserve security.
8. Preserve server/client boundaries.
9. Avoid hiding errors.
10. Avoid artificial delays.

Never use these as a generic solution:

```text
setTimeout()
window.location.reload()
router.refresh()
"use client" everywhere
as any
suppressHydrationWarning
no-store everywhere
```

These may occasionally be correct, but only when evidence proves they address the actual cause.

---

# 23. `suppressHydrationWarning` Rule

Never use:

```tsx
suppressHydrationWarning
```

to hide a hydration mismatch unless the mismatch is:

1. intentional,
2. isolated,
3. understood,
4. harmless,
5. documented.

It is not a root-cause fix.

---

# 24. Validation Protocol

After implementing a fix, execute:

```text
1. TypeScript check
2. Lint
3. Tests
4. Production build
5. Production start
6. Original reproduction
7. Hard refresh
8. Internal navigation
9. New tab
10. Mobile viewport
11. Desktop viewport
12. Authenticated state
13. Unauthenticated state
```

Only perform states relevant to the application, but do not skip the original reproduction scenario.

---

# 25. Visual Regression Verification

For visual issues compare:

```text
Before
After
```

and specifically verify:

```text
position
width
height
spacing
typography
visibility
colors
borders
responsive behaviour
loading state
```

Do not consider the issue fixed merely because the screenshot "looks better."

Verify the same route under the same initial conditions.

---

# 26. Root Cause Confidence

Assign a confidence level:

```text
HIGH
MEDIUM
LOW
```

HIGH means the cause was reproduced and the fix directly removed the failing condition.

MEDIUM means evidence strongly supports the cause but full reproduction or production validation was unavailable.

LOW means the issue could not be reproduced and the change is based on static analysis.

Never describe a LOW-confidence fix as confirmed.

---

# 27. Failure Recovery

If the first fix does not work:

```text
Do NOT repeat the same change.

Return to evidence.

Compare:
- server HTML
- hydrated DOM
- state
- className
- network
- cache
- timing
```

Then create a new hypothesis.

Use controlled experiments rather than random modifications.

---

# 28. Git Safety

Before modifying:

```bash
git status
```

After modifying:

```bash
git diff
```

Do not overwrite unrelated user work.

Do not reset the repository unless explicitly instructed.

Do not delete files merely to make the build pass.

---

# 29. Definition of Done

The incident is resolved only when:

```text
[ ] Original issue reproduced
[ ] Root cause identified
[ ] Root cause fixed
[ ] Original reproduction no longer occurs
[ ] First load works
[ ] Refresh works
[ ] Client navigation works
[ ] TypeScript passes
[ ] Lint passes
[ ] Tests pass where available
[ ] Production build passes
[ ] No new runtime errors
[ ] No accessibility regression
[ ] No security regression
[ ] No unnecessary dependencies
[ ] No unrelated refactoring
```

If any item cannot be verified, state exactly why.

---

# 30. Required Final Incident Report

When finished, provide:

```text
## Incident
<what the user experienced>

## Root Cause
<technical cause>

## Evidence
<what proved the cause>

## Changes
<files and important changes>

## Validation
<commands and scenarios tested>

## Result
<confirmed fixed / partially validated / unresolved>

## Remaining Issues
<any unrelated or unresolved warnings>
```

Be precise.

Do not report unrelated browser-extension errors as application failures.

Do not report warnings as root causes without evidence.

---

# 31. Core Principle

A professional Next.js debugging agent does not ask:

> "What CSS can I change?"

It asks:

> "Why did the application render state A initially and state B after hydration or refresh?"

Then it proves the answer.

The standard is:

```text
Symptom
  ↓
Evidence
  ↓
Root cause
  ↓
Minimal corrective change
  ↓
Production validation
  ↓
Regression protection
```

Never hide the symptom.

Fix the rendering system that produced it.
