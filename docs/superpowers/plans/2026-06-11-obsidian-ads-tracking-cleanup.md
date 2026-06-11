# Obsidian Ads Tracking Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Obsidian Autoworks Google Ads tracking distinguish real lead actions from page views: ad calls, website phone clicks, Square booking clicks, and local lead-event storage.

**Architecture:** Keep the existing static site and Google tag. Add explicit Google Ads conversion dispatch for phone and Square clicks once conversion labels are available, preserve first-party event logging, and clean Google Ads campaign goals so the campaign optimizes to phone leads instead of broken form goals.

**Tech Stack:** Static HTML, `lead-tracking.js`, Vercel static/functions deployment, Google Ads UI, Google tag `AW-17846304809`, GA4 `G-TR9ET60HX3`.

---

### Task 1: Protect Current Production Tracking Before Editing

**Files:**
- Inspect: `lead-tracking.js`
- Inspect: `api/lead-events.js`
- Inspect: `vercel.json`

- [x] Confirm local repo is not behind production or remote before modifying tracking files.
- [x] Fast-forward local `main` to `origin/main`.
- [x] Preserve unrelated local `dev_server.py` changes.

### Task 2: Add Explicit Conversion Dispatch Hooks

**Files:**
- Modify: `lead-tracking.js`
- Modify/Test: `scripts/test-lead-tracking.mjs`

- [x] Add a configurable conversion map for `phone_click`, `vip_quiz_call_click`, `ai_booking_click`, and `vip_quiz_square_click`.
- [x] Keep GA4 event logging intact.
- [x] Keep first-party `/api/lead-events` logging intact.
- [x] Ensure conversion events can be enabled by adding Google Ads conversion labels without rewriting the site again.

### Task 3: Verify Website Behavior Locally

**Files:**
- Test through local script and static server.

- [x] Verify lead/session attribution persists in the tracking smoke test.
- [x] Confirm non-lead quiz answers do not send Google Ads conversions.
- [x] Confirm mapped phone and Square booking lead actions send Google Ads conversions.
- [x] Confirm Square/phone lead events still reach GA4-style `gtag` flow and `/api/lead-events`.

### Task 4: Deploy Website Tracking Safely

**Files:**
- Deploy current site repo.

- [x] Push only intentional site tracking changes.
- [x] Confirm production `/vip-booking` returns 200.
- [x] Confirm production `/lead-tracking.js` contains the new conversion map and no production tracking regression.
- [x] Confirm `/api/lead-events` still accepts valid events.

### Task 5: Clean Google Ads Conversion Goals

**Google Ads:**
- Campaign: `Search | OC | Mobile Ceramic Tint | Agency Build`

- [x] Remove or stop using broken `Submit lead form` as a campaign optimization goal.
- [x] Keep `Phone call lead` as primary.
- [ ] Keep `Booking page visit - Obsidian` secondary only.
- [x] Create or configure website `Phone click` and `Square booking click` conversion actions.
- [x] Copy conversion labels into the site conversion map if Google requires direct `send_to` labels.

### Task 6: Verify Live Ads + Website Loop

**Google Ads + Production:**
- [x] Confirm call asset `7146007134` remains enabled and eligible.
- [x] Confirm phone asset metrics still show Phone impressions / Phone calls.
- [ ] Confirm website events appear in the browser network/gtag flow.
- [x] Confirm Ads conversion goals are campaign-specific: `Contacts` and `Phone call leads`.
- [ ] Confirm Ads conversion actions show active/no recent conversions rather than misconfigured/inactive where expected.
