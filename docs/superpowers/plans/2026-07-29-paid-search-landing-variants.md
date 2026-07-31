# Paid Search Landing Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an eight-destination paid-search landing system for the highest-value window-tint and ceramic-coating intents using real customer photos and the existing call-first attribution contract.

**Architecture:** Use seven extensionless paid-search routes plus the existing general coating page, backed by one shared paid-landing stylesheet. Reuse `lead-tracking.js` for click-ID persistence and phone/text events, keep experimental routes out of the sitemap with `noindex`, and use focused contract coverage for CTA order, account isolation, prohibited copy, assets, and route registration.

**Tech Stack:** Static HTML, CSS, existing vanilla JavaScript attribution tracker, Python development server, Node.js contract tests, Playwright visual verification.

## Global Constraints

- Do not deploy or change live Google Ads in this implementation.
- Primary action is call; secondary action is prefilled SMS.
- Do not expose Square booking links or count page interactions as primary conversions.
- Preserve `gclid`, `wbraid`, `gbraid`, campaign, ad-group, keyword, and device attribution through the existing tracker.
- Do not use `Pure`, `First Class`, or unverified coating prices in customer-facing copy.
- Use the first three supplied photos only for Tesla and the final three for the near-me mobile variant.
- All experimental routes must use `noindex, nofollow`.
- Tint pages use Google Ads account `AW-17846304809`.
- Coating pages use Google Ads account `AW-18301955625` and its website phone/text conversion labels.
- Coating prices must be written as starting prices and remain conditional on paint condition.

---

### Task 1: Optimize Customer Photo Assets

**Files:**
- Create: `assets/paid-landing/tesla-model-y-front.webp`
- Create: `assets/paid-landing/tesla-model-y-rear.webp`
- Create: `assets/paid-landing/tesla-glass-roof.webp`
- Create: `assets/paid-landing/mobile-porsche-front.webp`
- Create: `assets/paid-landing/mobile-porsche-rear.webp`
- Create: `assets/paid-landing/mobile-porsche-side.webp`

**Interfaces:**
- Consumes: six supplied HEIC customer photos.
- Produces: six web-sized images referenced by the two landing pages.

- [ ] **Step 1: Convert each source to WebP**

Resize the portrait sources to a maximum long edge of 1800 pixels and encode as WebP at approximately 82 quality. Preserve portrait orientation.

- [ ] **Step 2: Verify asset dimensions and file size**

Run:

```bash
sips -g pixelWidth -g pixelHeight assets/paid-landing/*.webp
du -h assets/paid-landing/*.webp
```

Expected: every image is readable, no long edge exceeds 1800 pixels, and each image remains practical for mobile delivery.

### Task 2: Build the Shared Paid-Landing Presentation

**Files:**
- Create: `paid-landing.css`

**Interfaces:**
- Consumes: existing `style.css` color and typography variables.
- Produces: full-bleed image hero, proof strip, price band, photo gallery, FAQ, and fixed mobile call/text controls.

- [ ] **Step 1: Add the shared responsive layout**

Create CSS for:

- A full-bleed photographic hero with readable text overlay.
- Stable two-column desktop and single-column mobile content.
- Unframed package and proof bands.
- A two-image proof gallery.
- A fixed mobile action bar that does not cover page content.
- Focus-visible states and reduced-motion handling.

- [ ] **Step 2: Check responsive constraints**

Ensure all headings, package labels, CTA text, and navigation fit at 390px, 768px, and 1440px widths without overlap.

### Task 3: Build the Tesla Action Variant

**Files:**
- Create: `tesla-tint-quote`
- Modify: `dev_server.py`

**Interfaces:**
- Consumes: Tesla photo assets, current package prices from `tesla-window-tinting`, and `lead-tracking.js`.
- Produces: `/tesla-tint-quote`, an ad-only call/text variant.

- [ ] **Step 1: Add the Tesla page**

The page must include:

- `data-lead-service="tesla_tint"` and `data-lead-variant="tesla_action_v1"`.
- `noindex, nofollow`.
- Real Model Y hero, exterior proof, and glass-roof detail.
- Existing current Tesla prices from the live source page.
- Primary `tel:7146007134` action.
- Secondary prefilled `sms:+17146007134` action asking for model, year, package, city, and shade goal.
- No booking or Square links.
- Existing GA4, Google Ads, and shared lead tracking tags.

- [ ] **Step 2: Register the local route**

Add `"/tesla-tint-quote": "/tesla-tint-quote"` to `REWRITE_PATHS`.

### Task 4: Build the Near-Me Mobile Variant

**Files:**
- Create: `mobile-window-tinting-near-me`
- Modify: `dev_server.py`

**Interfaces:**
- Consumes: Porsche photo assets, mobile-install qualification copy, and `lead-tracking.js`.
- Produces: `/mobile-window-tinting-near-me`, an ad-only local-intent variant.

- [ ] **Step 1: Add the near-me page**

The page must include:

- `data-lead-service="mobile_tint"` and `data-lead-variant="near_me_mobile_v1"`.
- `noindex, nofollow`.
- Real at-home installation imagery.
- Clear Orange County service language.
- Qualification details for vehicle, city, shade, driveway/garage, weather, and access.
- Primary call and secondary prefilled text actions.
- No unverified price claims, booking links, or Square links.

- [ ] **Step 2: Register the local route**

Add `"/mobile-window-tinting-near-me": "/mobile-window-tinting-near-me"` to `REWRITE_PATHS`.

### Task 5: Add Variant Contract Coverage

**Files:**
- Create: `scripts/test-paid-landing-variants.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: both new HTML files, shared CSS, route map, and asset directory.
- Produces: deterministic pass/fail coverage in `npm run test:tracking`.

- [ ] **Step 1: Write the contract test**

Test both pages for:

- Correct `data-lead-service` and `data-lead-variant`.
- `noindex, nofollow`.
- Call before text in hero and final CTA.
- No `/booking`, Square URL, `Pure`, or `First Class`.
- Expected image references and existing asset files.
- Correct local route registrations.
- Tesla pricing and near-me qualification copy.

- [ ] **Step 2: Run the new test**

Run:

```bash
node scripts/test-paid-landing-variants.mjs
```

Expected: `paid landing variant contract test passed`.

- [ ] **Step 3: Add the test to the tracking suite**

Append `node scripts/test-paid-landing-variants.mjs` to `test:tracking`.

### Task 6: Verify Behavior and Layout

**Files:**
- Modify only if verification reveals a defect.

**Interfaces:**
- Consumes: completed routes and assets.
- Produces: tested local pages ready for a later guarded deployment.

- [ ] **Step 1: Run the full tracking suite**

Run:

```bash
npm run test:tracking
```

Expected: all existing and new tests pass.

- [ ] **Step 2: Start the development server**

Run:

```bash
npm run dev
```

Expected: site available at `http://localhost:5173`.

- [ ] **Step 3: Verify both routes with Playwright**

Capture each page at 390x844 and 1440x1000. Confirm:

- Hero images render and show the relevant vehicle.
- Text and CTAs do not overlap.
- The next content band is visible from the first viewport.
- Mobile fixed actions do not cover final content.
- Phone and SMS hrefs are correct.
- No console or network errors occur.

### Task 7: Add the Windshield and Ceramic-Tint Intent Pages

**Files:**
- Create: `windshield-ceramic-tint`
- Create: `ceramic-window-tint-pricing`
- Modify: `dev_server.py`
- Modify: `vercel.json`
- Modify: `scripts/test-paid-landing-variants.mjs`

**Interfaces:**
- Consumes: tint-account tracking defaults, current published tint prices, paid landing assets, and `paid-landing.css`.
- Produces: two noindex call/text destinations for windshield and ceramic-tint price searches.

- [ ] **Step 1: Add failing contracts for both routes**

Require unique `data-lead-variant` values, tint-account configuration, call-first CTAs, relevant pricing/copy, real assets, and route registration.

- [ ] **Step 2: Run the contract test and confirm it fails because the pages are missing**

Run:

```bash
node scripts/test-paid-landing-variants.mjs
```

- [ ] **Step 3: Implement both static pages and route registrations**

Use the shared paid-page structure, current tint pricing, real supplied vehicle photos, and prefilled texts that request the vehicle, city, requested glass, and shade goal.

- [ ] **Step 4: Run the contract test and confirm it passes**

Run:

```bash
node scripts/test-paid-landing-variants.mjs
```

### Task 8: Add the Three Coating Intent Pages

**Files:**
- Create: `ceramic-coating-cost-paint-correction`
- Create: `ceramic-coating-irvine`
- Create: `luxury-ev-ceramic-coating`
- Modify: `ceramic-coating`
- Modify: `dev_server.py`
- Modify: `vercel.json`
- Modify: `scripts/test-paid-landing-variants.mjs`

**Interfaces:**
- Consumes: coating-account tracking configuration, approved coating price ladder, coating image assets, and `paid-landing.css`.
- Produces: three noindex coating destinations and an explicit variant identity on the general coating page.

- [ ] **Step 1: Add failing contracts for all coating variants**

Require the Pure-billed coating Ads ID and phone/text labels, unique variant identities, relevant intent copy, real coating images, call-first CTA order, and route registration.

- [ ] **Step 2: Run the contract test and confirm it fails because the pages are missing**

Run:

```bash
node scripts/test-paid-landing-variants.mjs
```

- [ ] **Step 3: Implement the coating pages**

Use `$550`, `$700`, and `$900` only as conditional starting prices on the cost/correction page. Keep Irvine claims limited to service availability, and use one shared luxury/EV page for Tesla, BMW, Porsche, and Audi.

- [ ] **Step 4: Run the contract test and confirm it passes**

Run:

```bash
node scripts/test-paid-landing-variants.mjs
```

### Task 9: Verify the Complete Eight-Destination System

**Files:**
- Modify only if verification reveals a defect.

**Interfaces:**
- Consumes: all eight paid-search destinations.
- Produces: a locally verified page set ready for guarded deployment and Ads routing.

- [ ] **Step 1: Run the complete tracking suite**

Run:

```bash
npm run test:tracking
```

- [ ] **Step 2: Capture all routes at 390x844 and 1440x1000**

Confirm real media renders, no text or CTA overlap occurs, mobile fixed controls do not cover content, and no browser console or network errors occur.

- [ ] **Step 3: Verify account-specific conversion routing**

Confirm tint pages initialize only `AW-17846304809` and coating pages initialize only `AW-18301955625`, with coating phone/text clicks using their dedicated labels.
