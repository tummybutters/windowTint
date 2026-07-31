# Tesla and Ceramic Tint Intent Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy five conversion-focused, ad-only Tesla and ceramic-tint landing pages.

**Architecture:** Add five static route files that reuse the existing `paid-landing.css`, proof assets, and `lead-tracking.js` contract. Extend the existing paid-variant test and server/Vercel route registration without changing shared tracking behavior.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node contract tests, Python local server, Playwright, Vercel.

## Global Constraints

- Pages remain `noindex, nofollow`, outside main navigation and sitemap.
- Use mobile-tint Ads tag `AW-17846304809` only.
- Call first, prefilled text second, intent action third.
- Use only confirmed prices and truthful photo labels.
- Do not change Google Ads in this implementation.

---

### Task 1: Paid Variant Contract

**Files:**
- Modify: `scripts/test-paid-landing-variants.mjs`

**Interfaces:**
- Consumes: static route files, `dev_server.py`, and `vercel.json`.
- Produces: assertions for route existence, tracking, copy, prices, proof honesty, and production registration.

- [ ] Add all five route reads and define their expected service/variant/H1 values.
- [ ] Assert mobile-tint tag isolation, call/text ordering, noindex, no booking/Square links, and seven proof-wall items.
- [ ] Assert Model Y and Model 3 confirmed prices; assert Cybertruck has no dollar price.
- [ ] Run `node scripts/test-paid-landing-variants.mjs` and confirm it fails because the routes are missing.

### Task 2: Static Pages And Routes

**Files:**
- Create: `tesla-model-y-window-tint`
- Create: `tesla-model-3-window-tint`
- Create: `tesla-cybertruck-window-tint`
- Create: `mobile-ceramic-window-tint-near-me`
- Create: `nano-ceramic-window-tint`
- Modify: `dev_server.py`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `/paid-landing.css`, `/style.css`, `/lead-tracking.js`, and existing optimized proof assets.
- Produces: five registered static HTML routes with unique attribution variants.

- [ ] Build the Model Y page with Model Y proof and `$700`, `$950`, and `$550` approved prices.
- [ ] Build the Model 3 page with `$950` and `$1,150` approved prices and general Tesla proof labels.
- [ ] Build the Cybertruck quote-first page without a dollar price.
- [ ] Build the mobile ceramic near-me page with real mobile-install proof and current ceramic package prices.
- [ ] Build the nano ceramic page with truthful performance copy and current ceramic package prices.
- [ ] Register all routes in `dev_server.py` and ensure Vercel HTML headers cover them.
- [ ] Run `node scripts/test-paid-landing-variants.mjs` and confirm it passes.

### Task 3: Full Verification

**Files:**
- Modify only if a verified defect requires correction.

**Interfaces:**
- Consumes: completed pages and existing test suite.
- Produces: test output, responsive screenshots, and production-ready commit.

- [ ] Run `npm run test:tracking` and require exit code 0.
- [ ] Start the local server and verify all five routes and referenced assets return HTTP 200.
- [ ] Capture desktop and mobile Playwright screenshots for each page.
- [ ] Verify no console errors, no overlapping UI, readable H1s, and visible call/text actions.
- [ ] Review `git diff --check` and the scoped diff.

### Task 4: Publish Exact Commit

**Files:**
- Commit only the spec, plan, tests, route registration, and five pages.

**Interfaces:**
- Consumes: verified worktree state.
- Produces: pushed branch, exact production deployment, and five public URLs.

- [ ] Commit the verified files and push the existing branch.
- [ ] Create an exact clean archive of the pushed commit with the isolated Obsidian Vercel project metadata.
- [ ] Deploy preview and verify the five routes plus existing `/tesla-tint-quote`, `/ceramic-window-tint-pricing`, and `/vip-booking` routes.
- [ ] Promote the exact preview to production.
- [ ] Verify every new production route returns HTTP 200 and contains the expected H1, mobile-tint tag, and noindex directive.

