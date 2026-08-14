# Obsidian Closed-Loop Attribution Foundation Design

**Date:** 2026-08-14

**Status:** Approved in chat; written-spec review pending

## Objective

Build the local, testable foundation that can eventually prove a chain from a specific Google Ads click to a completed Square order and a 10% commission calculation.

This tranche implements the low-dependency work that is safe to complete without deploying the website, changing Google Ads, sending customer messages, configuring a call-tracking vendor, or mutating Tint Wiz/Square production data.

## Verified Identities and Baseline

- Google Ads conversion customer: `8605345590`
- Auto-tint campaign: `23899221542`
- Commercial-window-film campaign: `24117892229`
- Production domain: `https://www.obsidianautoworksoc.com`
- Actual production Vercel project ID: `prj_mGo067aGnOyc2v4HCoPhPPBHXEfI`
- Actual production Vercel project name: `obsidianautoworks`
- Isolated Kislev Vercel working identity/profile: `obsidianautoworksoc-1617`
- Production-matching source baseline: this repository at commit `e24ca83de00490112b6a5720f4cedbefcd39c6be`

The worktree's current local `.vercel/project.json` points to the separate, failed Thomas-owned project `prj_EvuhBoGZhbqjsqjAYugMNnwm50Am`. This design adds a fail-closed target guard but does not relink or deploy the project.

The baseline `npm run test:tracking` suite passes before this tranche begins.

## Existing Components to Reuse

- `lead-tracking.js` captures `gclid`, `gbraid`, `wbraid`, ValueTrack fields, browser session context, and soft phone/text/booking events.
- `api/lead-events.js`, `lib/lead-event-normalize.js`, and `lib/lead-event-store.js` validate and persist first-party events.
- `db/migrations/001_attribution.sql` provides sessions, events, identities, leads, calls, bookings, payments, and `attribution_links`.
- `db/migrations/002_square_lifecycle.sql` and `003_ingest_hardening.sql` provide orders, refunds, webhook deduplication, and out-of-order protection.
- Square webhook and reconciliation modules already normalize bookings, payments, orders, and refunds.
- The local guarded P9 utility proves Google Data Manager payload construction and action routing, but it is not integrated with a genuine matched outcome or an export ledger.

## Current Breaks This Tranche Addresses

1. A later paid visit overwrites the saved click ID while the first landing-page metadata remains first-touch.
2. No immutable ad-touch record exists.
3. Text messages and forms do not carry an opaque lead reference.
4. `attribution_links` exists but no application code writes deterministic links.
5. Square `payment.order_id` is stored only in JSON metadata.
6. There is no canonical completed-order revenue and 10% commission report.
7. The local Vercel binding can target the wrong project without a fail-closed check.

## Scope

### Included

- Immutable paid-touch capture and persistence.
- One opaque lead-intent reference per browser session, created at the first lead action.
- SMS reference decoration and hidden-form reference fields.
- A dedicated Square payment `provider_order_id` column and backfill-compatible persistence.
- Deterministic link creation for the website lead-intent-to-touch relationship and the Square payment-to-order provider-ID relationship.
- A completed-order revenue, refund, attribution, and 10% commission query/report.
- A production Vercel project-ID guard.
- Automated tests and operational documentation for every component.

### Excluded

- Dynamic-number insertion or selection of a call-tracking vendor.
- Claiming that a phone click proves an answered or qualified call.
- Tint Wiz API, Zapier, CSV, or custom-field integration.
- Square customer phone/email hydration.
- Probabilistic phone/email/time auto-linking.
- Google Data Manager authorization, live validation, or event upload.
- Google Ads conversion-action changes.
- Vercel relinking, preview deployment, or production deployment.
- Customer communication or retroactive production-data mutation.

## Attribution Semantics

### Sessions and touches

`session_id` identifies one browser installation. It is not an ad click and must not be used as the exact revenue-attribution key.

An immutable `touch_id` identifies one paid landing event. When a landing URL contains at least one of `gclid`, `gbraid`, or `wbraid`, the browser creates a new touch record containing:

- click ID type and value;
- session ID;
- landing timestamp and URL;
- campaign, ad group, creative, keyword, match type, device, and network;
- UTM and location/placement context already captured by the site.

A later paid click creates a second touch. It never mutates the first touch. Pages without a new click ID reuse the current touch for lead-action context but do not create another paid touch.

The existing first-landing session fields remain diagnostic first-touch context. Exact attribution reads from the immutable touch selected at lead-intent creation.

### Lead intents and OA references

The first phone, text, form, or booking action creates one `lead_intent_id` for the browser session and binds it to the current `touch_id`, if one exists.

The browser also creates a unique display reference formatted as `OA-XXXXXXXXXX`. The ten-character suffix uses an unambiguous uppercase Base32 alphabet (`A-Z` without `I`, `L`, or `O`, plus `2-9`) and at least 50 bits from `window.crypto.getRandomValues`; `Math.random()` is prohibited. A database uniqueness constraint rejects a reference reused by a different lead intent. The display reference is opaque and contains no phone, email, click ID, campaign ID, or other customer information. If Web Crypto is unavailable, the original customer action proceeds without decoration and remains a soft, unattributed action rather than emitting a weak reference.

- SMS links append `Ref: OA-XXXXXX` to the prefilled message body.
- Website forms receive hidden `lead_intent_id`, `lead_reference`, `lead_session_id`, and `lead_touch_id` fields.
- Phone links remain unchanged. The lead intent records the soft phone click, but the design does not claim the visitor completed or answered a call.
- Repeated actions during the same session reuse the existing lead intent and reference.

### Proof tiers

- **Tier A — deterministic:** exact touch/session/reference or explicit provider-ID chain. This may be labeled proven click-attributed revenue.
- **Tier B — reviewed strong match:** shared normalized identity plus one unambiguous operational job and time/service context. This tranche reserves the tier but does not generate it automatically.
- **Tier C — directional:** time, channel, or aggregate-only evidence. This is never labeled exact revenue and is never included in proven Ads commission.

Only Tier A links are created automatically in this tranche.

## Data Model

Migration `004_attribution_foundation.sql` adds the following structures.

### `attribution_touches`

- `touch_id text primary key`
- `session_id text not null references attribution_sessions(session_id)`
- `touch_time timestamptz not null`
- `landing_page text`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content`
- separate nullable `gclid`, `gbraid`, and `wbraid`
- `campaign_id`, `ad_group_id`, `creative_id`, `keyword`, `match_type`, `device`, and `network`
- `location_physical_id`, `location_interest_id`, `placement`, `target_id`, and `extension_id`
- `created_at` and `updated_at`

Indexes support session/time lookup and click-ID lookup. A database constraint requires at least one supported click ID.

### `attribution_lead_intents`

- `lead_intent_id text primary key`
- `reference_code text not null unique`
- `session_id text not null references attribution_sessions(session_id)`
- `touch_id text references attribution_touches(touch_id)`
- `first_event_id text`
- `first_channel text not null`, constrained to `phone`, `text`, `form`, or `booking`
- `created_at` and `updated_at`

The table stores no raw phone or email.

### Existing-table changes

- Add `provider_order_id text` to `attribution_payments` plus an index.
- Add nullable `touch_id` to `attribution_links`.
- Add `proof_tier text`, constrained to `A`, `B`, or `C`.
- Add `link_status text`, constrained to `approved`, `candidate`, or `rejected`.

Existing `session_id`, entity type/ID, method, confidence, click IDs, matched time, and metadata remain the durable audit record.

An order is attributed at most once in financial aggregation. If multiple link records exist, the report selects one link by the fixed rank `approved A`, `approved B`, `candidate B`, `C`, then latest `matched_at`. Rejected links, unsupported status/tier combinations, and orders without a ranked link are unattributed. The report never joins and sums every link row.

### No job table yet

For this tranche, a completed Square order is the financial job key. Multiple payments sharing the same `provider_order_id` reconcile to that order and are never summed on top of the order total.

A later Tint Wiz integration may introduce a canonical operational job that groups multiple Square orders. Until then, the report labels orders without a deterministic lead/touch link as unattributed rather than guessing.

## Server Components

### Touch and lead-intent normalization

Extend the first-party event contract to accept:

- `touch_id` and immutable touch snapshot;
- `lead_intent_id`;
- `lead_reference`.

Validation permits only generated identifier formats and allow-listed attribution fields. Client-declared outcomes, revenue, qualification, appointment status, and payment status remain prohibited.

### Persistence

The lead-event store performs, within the existing statement/transaction pattern:

1. session upsert;
2. touch insert with idempotency by `touch_id`;
3. lead-intent insert/reuse;
4. Tier A `attribution_links` insert for the lead intent only when an exact `touch_id` exists;
5. event insert with existing `event_id` deduplication.

The deterministic link uses `entity_type = 'lead_intent'`, `entity_id = lead_intent_id`, and `method = 'lead_intent_touch'`. The existing unique `(entity_type, entity_id, method)` constraint makes retries and repeated distinct lead actions idempotent; persistence uses conflict-safe upsert semantics and never adds a second financial contribution.

Organic lead intents with no current paid touch are stored for funnel counting but receive no Tier A attribution link.

Duplicate browser retries return success without creating duplicate touches, lead intents, links, or events.

### Square payment/order relationship

Square payment normalization promotes `payment.order_id` to `provider_order_id`. Persistence writes the dedicated column while retaining the metadata copy for backward compatibility.

The migration and report remain compatible with historical rows by using:

`COALESCE(attribution_payments.provider_order_id, attribution_payments.metadata->>'provider_order_id')`.

No payment is assigned to a booking using customer/time inference.

This tranche does not create an order-to-touch link. It only makes the website touch/intent and Square payment/order halves internally durable. The revenue report can consume an approved order link when a future authenticated Tint Wiz, call-provider, or reviewed-link tranche supplies one; until then, the completed order remains unattributed and proven Ads commission remains zero.

## Revenue and Commission Contract

The report supports an inclusive local date range and uses `America/Los_Angeles` day boundaries.

### Business-wide completed-job revenue

- Include Square orders whose state is `COMPLETED` and whose financial timestamp falls in the selected range. The financial timestamp is `closed_at`, falling back to `provider_updated_at` and then `provider_created_at` only when the earlier field is absent.
- Count each provider order once using `attribution_orders.amount_minor`.
- Deduplicate completed refunds by `(provider, provider_refund_id)`, then subtract each refund once: prefer its direct provider order ID, otherwise resolve its provider payment ID to one provider order ID.
- Never add payment totals to order totals.
- Do not count open orders, canceled bookings, quotes, deposits on incomplete orders, or soft website events as completed-job revenue.

### Commission

- Commission rate: `1000` basis points, exactly 10%.
- `net_revenue_minor = max(0, completed_order_amount_minor - completed_refund_amount_minor)`.
- `commission_minor = round_half_up(net_revenue_minor * 1000 / 10000)`.
- Business-wide commission includes all completed orders.
- Proven Ads commission includes only orders with one approved Tier A touch link.
- Tier B, Tier C, and unmatched orders are reported separately and excluded from proven Ads commission.

Refunds above the recorded order amount clamp net revenue and commission to zero and add a dynamically computed `refund_exceeds_order` anomaly flag to the report detail row; no schema column is added for the flag. They never create negative revenue in the summary. A future payout ledger may represent negative cross-period adjustments, but that is outside this tranche.

For the verified August 4–12 snapshot, the report should be capable of representing:

- business-wide completed orders: `$8,060.00`;
- completed refunds: `$0.00`;
- business-wide 10% commission: `$806.00`;
- proven click-attributed commission: currently `$0.00` because no durable order-to-touch link exists.

Those values are acceptance fixtures, not hard-coded production totals.

## Reporting Interface

Create a read-only command:

```text
node scripts/report-attributed-revenue.mjs --from=2026-08-04 --to=2026-08-12 --format=table
```

Supported output formats are `table` and `json`.

Summary output includes:

- completed order count;
- gross completed-order revenue;
- completed refunds;
- net completed-job revenue;
- business-wide 10% commission;
- Tier A attributed revenue and commission;
- Tier B/C candidate totals;
- unattributed revenue.

Detail rows include:

- masked provider order reference;
- masked click-ID reference or `unattributed`;
- campaign/ad group/keyword/device when a touch is proven;
- proof tier and link method;
- gross, refund, net, and commission amounts.

The command never prints raw phone, email, HMAC identity, database URL, access token, webhook secret, full click ID, or full Square customer/payment/order ID.

## Production Target Guard

Add a read-only command that parses `.vercel/project.json` and succeeds only when:

```text
projectId == prj_mGo067aGnOyc2v4HCoPhPPBHXEfI
projectName == obsidianautoworks
```

Missing files, malformed JSON, the known wrong project ID, or any unrecognized project fail closed with a nonzero exit code and a secret-safe error.

The guard does not relink Vercel. It documents and blocks the current wrong binding until an explicitly authorized relink is performed.

## Error Handling and Auditability

- Browser identifiers are validated and length-limited server-side.
- Event, touch, reference, provider-event, provider-order, payment, and refund identifiers are idempotency keys.
- Unsupported or ambiguous relationships stay unmatched.
- Out-of-order Square events continue using `last_provider_event_at` protection.
- Refunds received before their order/payment may remain temporarily unmatched and resolve on later report/reconciliation runs.
- Every approved attribution link records method, proof tier, confidence, matched time, and non-sensitive metadata.
- Reports derive values from persisted provider entities and links; they never accept a browser-submitted revenue value.

## Testing Strategy

Implementation follows test-driven development. Each behavior gets a failing test before production code.

Required coverage:

1. A new paid click creates a distinct immutable touch; a later click does not mutate it.
2. A non-paid page view reuses the current touch without creating another.
3. The first lead action creates one OA reference; repeated actions reuse it.
4. SMS text safely appends the reference without altering the destination number.
5. Forms receive the four hidden lead-reference fields.
6. Normalization rejects malformed touch, intent, and reference identifiers.
7. Event retries create one touch, intent, link, and event.
8. Repeated distinct lead actions in one session reuse one intent and one Tier A link.
9. Organic lead intents with no paid touch create no Tier A link.
10. Square payment normalization and persistence expose `provider_order_id` directly.
11. Historical metadata-only payment rows still reconcile.
12. Multiple deposit/balance payments against one order do not alter or duplicate the order's completed revenue.
13. Completed orders are counted once; deposits and balances are not added again.
14. Each refund is subtracted once even when both its order and payment paths resolve.
15. Partial/full/excess refunds reduce or clamp net revenue and commission correctly and expose the dynamic anomaly flag.
16. Approved Tier A, candidate, rejected, unsupported, and unmatched link states aggregate into the correct separate buckets without multiplying order revenue.
17. Report output contains no raw identity or full provider/click IDs.
18. Web-Crypto absence preserves the customer action without producing a weak OA reference.
19. The Vercel guard accepts only the actual production project fixture and rejects the known wrong fixture.
20. The full existing `npm run test:tracking` suite remains green.

## Acceptance Criteria

- Every new paid landing can be represented as an immutable touch.
- Every new text/form lead action can carry a stable OA reference tied to the exact current touch.
- Soft phone clicks remain explicitly separate from qualified calls.
- Square payment-to-order relationships are queryable without JSON-only extraction.
- The system writes only deterministic Tier A links automatically.
- The report calculates completed-order gross, refunds, net revenue, and 10% commission without double counting.
- The report separately exposes business-wide, proven Ads, candidate, and unattributed totals.
- The deployment guard prevents the current wrong local Vercel binding from passing verification.
- No deployment, live Google upload, Ads mutation, customer message, or production-data mutation occurs during implementation.

## Future Tranches

After this foundation is locally complete and reviewed:

1. Add authenticated Tint Wiz/Zapier lifecycle ingestion using the OA reference and project ID.
2. Hydrate Square customer phone/email into the shared private HMAC identity namespace.
3. Select and integrate a dynamic-number call provider for deterministic session-to-caller joins.
4. Add reviewed Tier B candidate resolution.
5. Add the Google Data Manager export ledger, `validateOnly` diagnostics, and later explicitly authorized secondary uploads.
6. Relink and deploy only after exact Vercel identity readback and separate production approval.
