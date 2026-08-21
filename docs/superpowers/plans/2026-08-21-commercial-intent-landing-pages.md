# Commercial Intent Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build four search-intent-matched commercial paid landing pages that retain the current production page's design, lead flow, and tracking.

**Architecture:** Keep the current static Vercel delivery model. Generate and commit four extensionless HTML artifacts from the existing paid commercial shell and a small route-content configuration; all pages share the existing CSS and JavaScript. Extend tests, local routing, Vercel headers, and qualifier attribution without changing the organic page or sitemap.

**Tech Stack:** Static HTML/CSS, browser JavaScript, Node contract tests, Python local server, Vercel static routing, Neon-backed commercial lead endpoint.

**Spec:** `docs/superpowers/specs/2026-08-21-commercial-intent-landing-pages-design.md`

## Global Constraints

- Preserve the exact current centered-H1/gallery visual system and shared `commercial-window-film.css`.
- Use the four route names and lead-variant IDs exactly as specified.
- Every new route is `noindex,follow`, canonical to `/commercial-window-film`, and absent from `sitemap.xml`.
- Preserve call-first/text-second/quiz-third hierarchy, Neon save-before-SMS behavior, commercial tracking IDs, and `(714) 600-7134`.
- Never show internal visualization disclaimers or make unverifiable performance claims.
- Do not deploy, push, or mutate Google Ads.

---

### Task 1: Add failing contracts for the four variants

**Files:**
- Modify: `scripts/test-commercial-window-film-pages.mjs`
- Modify if attribution persistence requires it: `scripts/test-commercial-window-film-qualifier.mjs`, `scripts/test-commercial-lead-normalize.mjs`, `scripts/test-commercial-lead-store.mjs`

**Interfaces:**
- Consumes: existing page-contract helpers and current paid-page invariants.
- Produces: failing route-matrix, search-copy, routing, noindex, and dynamic-variant contracts.

- [ ] Add a four-route matrix with exact route, variant, title intent, H1, and meta-description intent.
- [ ] Assert each file exists, reuses the paid layout/gallery/scripts, keeps call → text → qualifier order, and excludes prohibited language.
- [ ] Assert canonical/noindex/sitemap behavior and local/Vercel route coverage.
- [ ] Assert the qualifier reads the page variant dynamically rather than hard-coding the control variant.
- [ ] Run the focused tests and record the expected failures caused by missing routes and dynamic attribution.

### Task 2: Implement the pages and dynamic attribution

**Files:**
- Create: `scripts/generate-commercial-window-film-variants.mjs`
- Create: `commercial-window-tinting-orange-county`
- Create: `office-privacy-window-film`
- Create: `commercial-heat-glare-window-film`
- Create: `storefront-security-window-film`
- Modify: `commercial-window-film-qualifier.js`
- Modify only if needed: `lib/commercial-lead-normalize.js`, `lib/commercial-lead-store.js`

**Interfaces:**
- Consumes: the current `/commercial-window-film-socal` shell and shared commercial scripts/styles.
- Produces: four deterministic static artifacts and correctly attributed quiz/save events.

- [ ] Create a deterministic content configuration containing the approved copy for each route.
- [ ] Generate four static pages that preserve the current shell and only tailor intent-specific content and metadata.
- [ ] Read `data-lead-variant` from the document for qualifier tracking and lead saves.
- [ ] Carry `landing_variant` through the existing lead endpoint in a backwards-compatible way if the persistence contract permits it.
- [ ] Run the generator twice and verify it is deterministic.
- [ ] Run the focused tests until green.

### Task 3: Wire routes and verify the complete local build

**Files:**
- Modify: `dev_server.py`
- Modify: `vercel.json`
- Verify unchanged: `sitemap.xml`, `commercial-window-film.css`

**Interfaces:**
- Consumes: four generated route artifacts.
- Produces: local and Vercel extensionless routing plus noindex headers.

- [ ] Add all four routes to the local rewrite map and Vercel self-rewrites.
- [ ] Add all four routes to the HTML content-type rule and paid-page noindex header rule.
- [ ] Run focused commercial page, qualifier, lead-normalizer, and lead-store tests.
- [ ] Run the repository's relevant tracking suite.
- [ ] Start the local server and verify all four routes return 200 with the intended title, H1, canonical, robots, scripts, and assets.
- [ ] Capture desktop and mobile screenshots and compare their structure with the current control page.
- [ ] Review the final diff, ensuring no generated caches, secrets, or unrelated files are staged.
