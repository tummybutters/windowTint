# Obsidian Closed-Loop Attribution Foundation Implementation Plan

> **For Claude subagents:** Execute each task in order with `--permission-mode bypassPermissions`. Use test-driven development: add the failing test, prove the expected failure, implement the smallest correct change, rerun the focused test, then commit only the task-owned paths.

**Goal:** Put a production-safe attribution foundation live that preserves immutable paid touches and OA lead references, directly joins Square payments to orders, reports completed-order revenue and 10% commission without double counting, and refuses deployment to the wrong Vercel project.

**Architecture:** Extend the existing browser event envelope and single-statement Neon persistence path rather than creating a parallel ingestion service. Add immutable touch and lead-intent rows behind idempotent keys, promote Square `provider_order_id` to a column, and calculate financial truth from completed orders plus deduplicated refunds. Keep website lead-intent-to-touch links and Square payment-to-order links deterministic, while leaving order-to-touch revenue unattributed until a future authenticated operational bridge exists.

**Tech Stack:** Browser JavaScript, Node.js CommonJS/ESM, PostgreSQL/Neon, Square webhooks, Vercel, Node assertion-based test scripts.

**Approved rollout ruling:** The written design excluded production deployment and production mutation. Tommy's later instruction on 2026-08-14—“Go finish this end to end and come back to me with a stronger system live in production”—explicitly authorizes the database migration, exact-project Vercel production deployment, and read-only production verification in Tasks 7–8. It does not authorize Google Ads changes, Google Data Manager uploads, customer messages, Square billing changes, or speculative customer-record linking.

---

## Global invariants

- Production target must be project ID `prj_mGo067aGnOyc2v4HCoPhPPBHXEfI`, name `obsidianautoworks`, under the isolated Kislev identity/profile `obsidianautoworksoc-1617`.
- The known wrong local binding `prj_EvuhBoGZhbqjsqjAYugMNnwm50Am` must fail closed and must never receive a deployment.
- Do not stage, revert, or modify pre-existing tracked `node_modules` changes.
- Never print or commit database URLs, access tokens, webhook secrets, raw customer identity values, or full click/provider IDs.
- Do not label phone/text/booking clicks as qualified calls, confirmed appointments, or revenue.
- Proven Ads revenue remains zero until an approved Tier A order-to-touch link exists.
- Every implementation task ends with a focused commit; stage exact paths only.

## Task 1: Add the attribution-foundation schema

**Files:**

- Create: `db/migrations/004_attribution_foundation.sql`
- Create: `scripts/test-attribution-foundation-migration.mjs`
- Modify: `package.json`

### Step 1: Write a failing migration contract test

The test reads migration 004 and asserts the required durable contract:

```js
assert.match(sql, /CREATE TABLE IF NOT EXISTS attribution_touches/i);
assert.match(sql, /CHECK \(gclid IS NOT NULL OR gbraid IS NOT NULL OR wbraid IS NOT NULL\)/i);
assert.match(sql, /CREATE TABLE IF NOT EXISTS attribution_lead_intents/i);
assert.match(sql, /reference_code text NOT NULL UNIQUE/i);
assert.match(sql, /ADD COLUMN IF NOT EXISTS provider_order_id text/i);
assert.match(sql, /ADD COLUMN IF NOT EXISTS touch_id text/i);
assert.match(sql, /proof_tier.*CHECK/i);
assert.match(sql, /link_status.*CHECK/i);
```

Run `node scripts/test-attribution-foundation-migration.mjs` and confirm it fails because migration 004 does not exist.

### Step 2: Implement an idempotent migration

Create the two new tables, foreign keys, constraints, indexes, link columns, and payment order column. Use `IF NOT EXISTS` and the repository's `-- migrate:split` convention. Add an explicit `attribution_schema_migrations` upsert for migration ID `004_attribution_foundation`.

Constraints:

```sql
CHECK (gclid IS NOT NULL OR gbraid IS NOT NULL OR wbraid IS NOT NULL)
CHECK (first_channel IN ('phone', 'text', 'form', 'booking'))
CHECK (proof_tier IS NULL OR proof_tier IN ('A', 'B', 'C'))
CHECK (link_status IS NULL OR link_status IN ('approved', 'candidate', 'rejected'))
```

Add indexes for touch session/time, all three click IDs, lead-intent session/reference, payment provider order, and link touch ID.

### Step 3: Run and register the test

Run the focused test, add it to `test:tracking`, then run `npm run test:tracking`.

### Step 4: Commit

```bash
git add db/migrations/004_attribution_foundation.sql scripts/test-attribution-foundation-migration.mjs package.json
git commit -m "feat: add attribution foundation schema"
```

## Task 2: Normalize and persist immutable touches and lead intents

**Files:**

- Modify: `lib/lead-event-normalize.js`
- Modify: `lib/lead-event-store.js`
- Modify: `scripts/test-lead-event-normalize.mjs`
- Modify: `scripts/test-lead-event-store.mjs`

### Step 1: Add failing normalization tests

Cover valid paid touch snapshots, valid lead intents, organic intents without a touch, all malformed identifier/reference cases, invalid channel values, and attempted browser-submitted outcome/revenue fields being ignored.

Required formats:

```js
const TOUCH_ID = /^touch_[A-Za-z0-9_-]{16,120}$/;
const LEAD_INTENT_ID = /^intent_[A-Za-z0-9_-]{16,120}$/;
const LEAD_REFERENCE = /^OA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;
```

The normalized record must expose `touch` and `lead_intent` as separate top-level structures, never inside arbitrary payload metadata.

### Step 2: Implement allow-listed normalization

Accept only immutable touch fields named in the approved design. Require at least one supported click ID for a touch. Ensure `lead_intent.touch_id`, when present, equals the normalized `touch.touch_id`; reject mismatches instead of guessing.

### Step 3: Add failing persistence tests

Assert that the one statement contains:

- session upsert;
- `touch_insert` with conflict-safe immutability;
- `lead_intent_insert` with reference uniqueness protection;
- Tier A `lead_intent_touch` link only when an exact touch exists;
- event insertion and retry idempotency.

Test param positions and results for paid, organic, retry, and repeated-distinct-event cases. A duplicate `reference_code` tied to another intent must fail rather than silently reassign.

### Step 4: Extend the persistence CTE

Insert touches with `ON CONFLICT (touch_id) DO NOTHING`. Insert/reuse the lead intent only when present. Insert an `attribution_links` row with:

```text
entity_type = lead_intent
method = lead_intent_touch
proof_tier = A
link_status = approved
confidence = 1.0
```

The link includes the exact session, touch, and click IDs and uses the existing unique `(entity_type, entity_id, method)` constraint for idempotency. Organic intents create no link.

### Step 5: Verify and commit

Run both focused test scripts and the full tracking suite.

```bash
git add lib/lead-event-normalize.js lib/lead-event-store.js scripts/test-lead-event-normalize.mjs scripts/test-lead-event-store.mjs
git commit -m "feat: persist paid touches and lead intents"
```

## Task 3: Create immutable browser touches and OA references

**Files:**

- Modify: `lead-tracking.js`
- Modify: `scripts/test-lead-tracking.mjs`

### Step 1: Add failing browser tests

Test these behaviors in the existing browser harness:

1. A paid landing creates a new immutable touch snapshot.
2. A second distinct paid landing creates a second touch and leaves the first unchanged.
3. A non-paid page reuses the current touch without creating a new touch.
4. The first phone/text/form/booking action creates one intent and OA reference.
5. Repeated actions reuse the intent/reference.
6. SMS bodies append `Ref: OA-XXXXXXXXXX` without changing the destination.
7. Forms receive hidden `lead_intent_id`, `lead_reference`, `lead_session_id`, and `lead_touch_id` fields.
8. Phone `href` remains unchanged.
9. Web Crypto absence preserves the original action and emits no weak reference.

### Step 2: Implement secure identifiers and session state

Generate IDs and the 50-bit OA suffix using only `window.crypto.getRandomValues`. Persist the current touch and the session's single lead intent in first-party storage. Never use `Math.random` as a fallback.

When the page URL has a new click ID, create and enqueue a `paid_touch` event with the immutable snapshot. On the first lead action, create/enqueue the intent, bind it to the current touch, and decorate SMS/forms. Ensure retry behavior uses the same IDs.

### Step 3: Verify and commit

Run `node scripts/test-lead-tracking.mjs` and `npm run test:tracking`.

```bash
git add lead-tracking.js scripts/test-lead-tracking.mjs
git commit -m "feat: add secure OA lead references"
```

## Task 4: Promote Square payment-to-order identity

**Files:**

- Modify: `lib/square-webhook-normalize.js`
- Modify: `lib/square-event-store.js`
- Modify: `scripts/test-square-webhook-normalize.mjs`
- Modify: `scripts/test-square-event-store.mjs`

### Step 1: Add failing tests

Assert `normalizePayment()` exposes `provider_order_id` directly while retaining the metadata copy. Assert payment SQL inserts and updates the dedicated column and preserves out-of-order event protection.

### Step 2: Implement the direct column write

Add `provider_order_id` to the payment insert column list, params, and conflict update:

```sql
provider_order_id = COALESCE(EXCLUDED.provider_order_id, attribution_payments.provider_order_id)
```

Do not infer a booking ID.

### Step 3: Verify and commit

Run both Square focused tests and the full tracking suite.

```bash
git add lib/square-webhook-normalize.js lib/square-event-store.js scripts/test-square-webhook-normalize.mjs scripts/test-square-event-store.mjs
git commit -m "feat: persist Square payment order links"
```

## Task 5: Add the completed-order revenue and commission report

**Files:**

- Create: `lib/attributed-revenue-report.js`
- Create: `scripts/report-attributed-revenue.mjs`
- Create: `scripts/test-attributed-revenue-report.mjs`
- Modify: `package.json`

### Step 1: Write failing financial-contract tests

Use deterministic fixture rows and a fake query function to cover:

- local inclusive date bounds in `America/Los_Angeles`;
- completed orders only, each counted once;
- timestamp precedence `closed_at`, `provider_updated_at`, `provider_created_at`;
- metadata-only historical payment/order resolution;
- direct refund order link preferred over payment fallback;
- refund deduplication by provider/refund ID;
- partial, full, and excess refunds;
- `round_half_up(net * 1000 / 10000)`;
- fixed link ranking and no multiplication by multiple links;
- approved Tier A, candidate Tier B/C, rejected/unsupported, and unattributed buckets;
- masked output and no secret/raw-identifier leakage;
- Aug 4–12 acceptance fixture: 13 completed orders, 806000 gross minor, 0 refunds, 80600 commission minor, 0 proven Ads commission.

### Step 2: Implement one canonical SQL query

The query must:

1. isolate completed Square orders in the date range;
2. resolve one provider order per payment using `COALESCE(provider_order_id, metadata->>'provider_order_id')`;
3. dedupe completed refunds and map each to one order;
4. select one ranked link per order with `ROW_NUMBER()`;
5. join at most one touch;
6. emit one row per completed order with gross/refund/net/commission and anomaly flag.

Keep aggregation in JavaScript small and deterministic. Export pure helpers for masking, commission rounding, and summary aggregation.

### Step 3: Implement the secret-safe CLI

Support:

```bash
node scripts/report-attributed-revenue.mjs --from=2026-08-04 --to=2026-08-12 --format=table
node scripts/report-attributed-revenue.mjs --from=2026-08-04 --to=2026-08-12 --format=json
```

Reject invalid dates, reversed ranges, unknown flags, or missing `DATABASE_URL` with secret-safe messages. Never log the connection string.

### Step 4: Verify and commit

Add `report:attributed-revenue` and the focused test to `package.json`. Run the focused test and full suite.

```bash
git add lib/attributed-revenue-report.js scripts/report-attributed-revenue.mjs scripts/test-attributed-revenue-report.mjs package.json
git commit -m "feat: report completed revenue and commission"
```

## Task 6: Add the exact Vercel production-target guard and runbook

**Files:**

- Create: `lib/vercel-project-guard.js`
- Create: `scripts/verify-production-target.mjs`
- Create: `scripts/test-vercel-project-guard.mjs`
- Create: `docs/attribution-production-runbook.md`
- Modify: `package.json`

### Step 1: Write failing guard tests

Test the exact good fixture, known wrong ID, wrong name, malformed JSON, and missing file. Failures must be nonzero and expose no tokens/config contents.

### Step 2: Implement a fail-closed guard

Default to `.vercel/project.json`, with a testable `--project-file` override. Success requires both:

```js
projectId === 'prj_mGo067aGnOyc2v4HCoPhPPBHXEfI'
projectName === 'obsidianautoworks'
```

The command is read-only and never relinks a project.

### Step 3: Document the operational truth boundary

The runbook must cover:

- source-of-truth identities;
- exact predeploy gates;
- production migration and rollback posture;
- report usage and commission definitions;
- how to distinguish a soft click, inquiry, appointment, completed order, business-wide revenue, and proven Ads revenue;
- known remaining gap: no order-to-touch connector;
- prohibited secret handling;
- no Ads upload until a real approved order link exists.

### Step 4: Verify and commit

Add `verify:production-target` and the focused test to `package.json`. Run focused and full tests.

```bash
git add lib/vercel-project-guard.js scripts/verify-production-target.mjs scripts/test-vercel-project-guard.mjs docs/attribution-production-runbook.md package.json
git commit -m "feat: guard attribution production rollout"
```

## Task 7: Integration review and production-ready branch verification

**Files:**

- Modify only files required by verified integration defects.

### Step 1: Run clean integration gates

Run:

```bash
npm run test:tracking
npm run build --if-present
git diff --check
git status --short
```

Verify every planned file is committed and only the pre-existing `node_modules` dirt remains unstaged.

### Step 2: Conduct two independent reviews

Use one Claude bypassPermissions review for spec compliance and one for code quality/security. Reviewers must not edit files. Fix only evidence-backed findings, rerun focused/full tests, and commit fixes in exact paths.

### Step 3: Verify database migration against a disposable/transaction-safe database target

If a non-production database target exists, run `npm run db:migrate` and query the schema contract there. If not, statically verify the migration and defer the live application to Task 8. Do not expose the URL.

### Step 4: Commit integration fixes

Use a narrowly scoped message such as:

```bash
git commit -m "fix: harden attribution foundation integration"
```

## Task 8: Guarded production migration, deployment, and readback

**Files:**

- No planned source changes; create local ignored evidence artifacts only if the established repository workflow already provides a safe evidence directory.

### Step 1: Independently resolve deployment identity

Using the isolated Kislev Vercel profile, read the authenticated user/team and exact project metadata. Verify the production domain currently maps to `obsidianautoworks` and project ID `prj_mGo067aGnOyc2v4HCoPhPPBHXEfI`.

Do not trust the worktree's current wrong `.vercel/project.json`. Create an isolated temporary deployment directory or scoped Vercel config that is explicitly linked to the exact production project, then run `npm run verify:production-target` against that resolved project file. Abort on any mismatch.

### Step 2: Pull production environment without printing secrets

Use the authenticated Vercel project context to supply required environment variables to child commands. Confirm only variable names/presence, never values. Verify `DATABASE_URL` exists before migration.

### Step 3: Apply migration 004 and read it back

Run the idempotent migration command against the exact production database. Then perform read-only schema checks confirming:

- migration `004_attribution_foundation` recorded;
- touch and lead-intent tables exist;
- new payment/link columns and required constraints/indexes exist.

Do not insert synthetic customer-like production data.

### Step 4: Deploy the verified commit to production

Deploy from the exact verified source commit through the isolated Kislev project context. Record the deployment ID/URL and wait for Ready. Confirm the deployment is assigned to `https://www.obsidianautoworksoc.com`.

### Step 5: Independently read back production

Verify:

- canonical domain returns success;
- deployed static `lead-tracking.js` contains the expected immutable-touch/OA code markers and differs from the old baseline;
- `/api/lead-events` rejects invalid input but remains reachable;
- Square webhook endpoint retains its secure method/signature behavior;
- database schema readback remains green after deployment;
- production revenue report runs read-only and reports internally consistent bucket sums without printing raw identifiers.

Avoid a synthetic production event unless a test-only, non-customer path already exists and leaves no durable record.

### Step 6: Final truth report

Report:

- exact source commit and deployment ID;
- exact production project/domain readback;
- tests/build/migration status;
- current completed-order business-wide revenue and 10% commission for the requested Aug 4–12 window;
- current proven Ads revenue/commission separately;
- what is now durable and what still needs Tint Wiz/call/customer-identity linkage.

Do not claim a click-to-revenue chain until an order has an approved Tier A touch link.

