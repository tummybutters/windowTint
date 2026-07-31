# VIP Paid Hero Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all seven paid-search variants use the exact centered `/vip-booking` hero composition and spanning photo-deck treatment while preserving their intent-specific sections and tracking.

**Architecture:** Keep each extensionless HTML page and the shared `paid-landing.css`. Add one shared VIP hero/photo-strip contract, then update only the hero markup and redundant photo-proof sections on each variant.

**Tech Stack:** Static HTML, shared CSS, Node contract tests, Playwright browser verification.

## Global Constraints

- Preserve each page's `data-lead-service`, `data-lead-variant`, click IDs, Google Ads account, and conversion labels.
- Preserve call-first and prefilled-text-second CTA order.
- Keep package, process, FAQ, proof, and final CTA sections.
- Keep every paid variant `noindex, nofollow`.
- Use only existing real Obsidian vehicle photos.
- Do not change Ads bids, budgets, keywords, or final URLs.

---

### Task 1: Lock The VIP Hero Contract

**Files:**
- Modify: `scripts/test-paid-landing-variants.mjs`

**Interfaces:**
- Consumes: the seven paid variant HTML files.
- Produces: assertions for `.paid-hero--vip`, centered content, and `.paid-hero-strip`.

- [ ] **Step 1: Write failing assertions**

Require each page to contain:

```js
assert.match(page, /class="paid-hero paid-hero--vip"/);
assert.match(page, /class="paid-shell paid-hero__content paid-hero__content--centered"/);
assert.match(page, /<section class="paid-hero-strip"/);
assert.equal((page.match(/class="paid-hero-strip__item/g) || []).length, 3);
```

- [ ] **Step 2: Run the contract test**

Run: `node scripts/test-paid-landing-variants.mjs`

Expected: FAIL because the old background-image hero is still present.

### Task 2: Build The Shared VIP Hero System

**Files:**
- Modify: `paid-landing.css`

**Interfaces:**
- Consumes: `.paid-hero--vip`, `.paid-hero__content--centered`, and `.paid-hero-strip`.
- Produces: a centered dark hero and responsive three-card photo deck.

- [ ] **Step 1: Replace the old left-overlay hero rules**

Implement a dark centered hero, orange offer tag, silver second-line treatment, centered CTA row, and a bordered/rotated three-image deck spanning the viewport.

- [ ] **Step 2: Add responsive behavior**

At `760px` and below, keep the headline centered, stack CTAs, and render a horizontally spanning three-column photo strip without overflow.

### Task 3: Convert All Seven Variants

**Files:**
- Modify: `mobile-window-tinting-near-me`
- Modify: `tesla-tint-quote`
- Modify: `windshield-ceramic-tint`
- Modify: `ceramic-window-tint-pricing`
- Modify: `ceramic-coating-cost-paint-correction`
- Modify: `ceramic-coating-irvine`
- Modify: `luxury-ev-ceramic-coating`

**Interfaces:**
- Consumes: the shared VIP hero classes and each page's existing three real photos.
- Produces: seven centered heroes followed immediately by three-image decks.

- [ ] **Step 1: Convert tint variants**

Remove the background hero image, preserve intent copy and CTA attributes, and move the three existing page images into the hero photo deck.

- [ ] **Step 2: Convert coating variants**

Apply the same markup while retaining the coating account configuration and labels.

- [ ] **Step 3: Remove redundant later photo grids**

Keep their explanatory copy where useful, but do not repeat the same images later on the page.

### Task 4: Verify And Publish

**Files:**
- Test: `scripts/test-paid-landing-variants.mjs`
- Test: `scripts/test-lead-tracking.mjs`

**Interfaces:**
- Consumes: the finished HTML/CSS.
- Produces: verified local and pushed branch state.

- [ ] **Step 1: Run automated verification**

Run:

```bash
npm run test:tracking
git diff --check
```

- [ ] **Step 2: Run browser verification**

Check all seven variants at `390x844` and `1440x1000`: centered hero, three loaded photos, no horizontal overflow, no CTA overlap, and no console errors.

- [ ] **Step 3: Commit and push**

Stage only the intended HTML, CSS, test, spec, and plan files. Commit and push `codex/obsidian-unified-brand-2026-07-24`.
