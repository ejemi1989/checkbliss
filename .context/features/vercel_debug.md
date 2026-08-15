---
name: vercel-cdn-debugger
description: Diagnose and resolve Vercel CDN, edge-cache, and deployment-asset issues for the CheckinBliss Next.js (App Router, Tailwind v4, Turbopack) project — including flashes of unstyled content (FOUC) on first load, stale CSS/JS chunks after a deploy, mismatched deployment aliases, stuck ISR/data-cache pages, and asset-hash 404s. Use this whenever the user reports a page that "looks broken/unstyled/incomplete on first load then fixes itself on refresh," a live site showing old content after deploying, CSS or JS chunks 404ing on Vercel, custom domain vs .vercel.app showing different builds, or asks to debug/fix a Vercel CDN, caching, or deployment issue. Also trigger if the user says "this could be a Vercel CDN issue" or similar, even if they haven't confirmed it yet — this skill's job is to confirm or rule it out with real evidence, not assume.
---

# Vercel CDN Debugger

A structured diagnostic workflow for CDN/deployment-caching problems on Vercel, built around the CheckinBliss stack (Next.js App Router, Tailwind v4 `@theme`, `next/font/google`, Turbopack in dev). The core discipline of this skill is: **never conclude "it's the CDN" without a piece of evidence that rules out the alternatives.** Vague CDN blame is a dead end; this skill exists to replace it with a specific, fixable cause.

## Core principle: separate dev-only symptoms from real production bugs

The single most common false alarm on this project is mistaking a **Turbopack dev-server compile/CSS-chunk lag** for a real bug. Symptoms:
- Page looks unstyled/smaller/wrong-font on first hit of a route
- Fixes itself on refresh
- Chunk URL looks like `[root-of-the-server]__<hash>._.css`

This is dev-only Turbopack behavior and does **not** ship to production. Always confirm with a production test (Step 2) before chasing a "CDN bug" — most of the time there isn't one.

## Step 1: Establish what "broken" actually looks like

Ask the user (or check directly if you have the page/screenshots) for:
1. Which URL — `.vercel.app` domain, custom domain (checkbliss.vercel.app, or production custom domain), or `localhost`?
2. Does it happen on first visit only, or every time?
3. Any red errors in the browser console (real hydration mismatch) vs. a silent visual flash (styling/timing issue)?
4. Screenshot or description of "broken" vs "correct" state.

Do not proceed to CDN-specific fixes until you know whether this is dev, prod, or both.

## Step 2: The incognito production test (mandatory before blaming Vercel)

This is the single test that disambiguates dev-artifact vs. real production bug. Do not skip it.

1. Open a fresh **incognito/private window** — this guarantees no cached assets from a prior visit.
2. Navigate directly to the production URL (not localhost).
3. DevTools → Network tab → check **Disable cache** → hard reload.
4. Watch the very first paint. Does it show correctly, or is there a visible flash/unstyled frame?
5. In the Network waterfall, check whether the `.css` file(s):
   - Return `200` (fresh fetch) vs `304`/`(from disk cache)` (means it wasn't actually a cold load — repeat with a truly fresh incognito window)
   - Complete **before** the document paint, or noticeably after

If the incognito hard-load renders correctly every time → **this is not a CDN issue.** Stop here; if it was previously seen wrong, it was either a stale local browser cache, a dev-mode artifact, or a since-resolved propagation delay from a recent deploy (see Step 3).

If it still reproduces on a genuinely cold incognito load → continue to Step 3.

## Step 3: Real CDN/deployment causes (only after Step 2 confirms reproduction)

Work through these in order — each has a fast way to confirm or rule out.

### 3a. Deployment alias mismatch
Different domains (`.vercel.app`, staging, production custom domain) can point to different deployments if aliases weren't updated.
- Check: Vercel dashboard → Project → Deployments → confirm which deployment is aliased to which domain.
- Or via CLI: `vercel ls` and `vercel inspect <deployment-url>` to see alias assignments.
- Fix: `vercel alias set <deployment-url> <domain>` to force the correct deployment onto the domain in question.

### 3b. Stale edge cache mid-propagation
Right after a deploy, different edge regions can briefly serve different builds (HTML from build N referencing an asset hash from build N-1, or vice versa).
- Check: Compare response headers `x-vercel-id` and `age` across repeated requests from the same region — if the deployment ID in `x-vercel-id` doesn't match the latest deployment, it's stale.
- Fix: This normally self-resolves within minutes. If it doesn't, purge via dashboard (Project → Settings → Data Cache, or redeploy) or `vercel --prod --force` to force a clean rebuild and cache bust.

### 3c. Asset-hash 404s (CSS/JS chunk not found)
If a `.css`/`.js` chunk 404s in production, it usually means the HTML being served references a build that no longer exists on the CDN — classic symptom of an in-flight deploy caught mid-swap, or a `vercel.json` / custom cache-control header holding an old HTML response past its actual validity.
- Check response headers on the **document** request (not the asset) for `cache-control`, `cdn-cache-control`, and `vercel-cache`.
- Fix: If you have custom `Cache-Control` headers set in `next.config.js` or `vercel.json` for HTML routes, make sure HTML itself isn't being cached longer than intended — static assets (`_next/static/*`) should be cached aggressively (they're content-hashed and immutable), but HTML documents generally should not be, unless you're deliberately using ISR.

### 3d. ISR / data cache serving stale content
If this is an ISR page (`revalidate` set) or using `fetch` with Next's data cache, "looks wrong then fixes on refresh/later" can mean it's serving a stale cached render, not a styling bug at all.
- Check: Does the route have `export const revalidate = ...` or fetch calls with `next: { revalidate }` / `cache: 'force-cache'`?
- Fix: Either lower/adjust the revalidate window, call `revalidatePath()`/`revalidateTag()` after the deploy that should invalidate it, or switch the route to dynamic rendering if staleness is unacceptable.

### 3e. Multiple/duplicate CSS imports causing async chunk splitting
If `globals.css` (or any global stylesheet) is imported in more than one place — e.g. once in root `layout.tsx` and again inside a client component — Next/Turbopack can split it into a separately-loaded async chunk instead of a single render-blocking stylesheet, which can genuinely cause a flash in production too, not just dev.
- Check: `grep -rn "globals.css" --include="*.tsx" --include="*.ts" app/ src/` (adjust path) — should return exactly one import, in the root layout.
- Fix: Remove any duplicate imports; only the root layout should import the global stylesheet.

## Step 4: Confirm the fix

After applying any Step 3 fix:
1. Redeploy.
2. Repeat the Step 2 incognito test on the new deployment.
3. Confirm clean first paint across at least two cold loads (sometimes from different networks/devices, since CDN edge behavior can vary by region).

## Useful commands reference

```bash
# See recent deployments and their URLs
vercel ls

# Inspect a specific deployment (build info, aliases, headers)
vercel inspect <deployment-url>

# Force a clean production redeploy (bypasses build cache)
vercel --prod --force

# Reassign a domain to a specific deployment
vercel alias set <deployment-url> <domain>

# Pull current env/project config to sanity check settings locally
vercel pull
```

## What NOT to do

- Don't propose CDN-side fixes (purging, alias changes, header changes) without first completing the Step 2 incognito test — most "CDN issues" on this project turn out to be dev-mode Turbopack artifacts or local browser cache.
- Don't confuse a real React hydration error (red console error, DOM mismatch) with a CSS-timing flash — they look similar to a non-technical eye but have completely different causes and fixes. Check the console before assuming either one.
- Don't recommend disabling caching broadly ("just turn off all caching") — that fixes the symptom by destroying the CDN's actual value. Fixes should be scoped to the specific stale asset/route.