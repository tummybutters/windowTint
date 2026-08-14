import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const reportModule = require('../lib/attributed-revenue-report.js');

const {
  ATTRIBUTED_REVENUE_SQL,
  COMMISSION_RATE_BASIS_POINTS,
  isValidCalendarDate,
  localDateRangeToUtcBounds,
  roundHalfUp,
  commissionMinor,
  maskValue,
  maskProviderOrderReference,
  maskClickReference,
  buildDetailRow,
  aggregateAttributedRevenue,
  runAttributedRevenueReport,
  parseReportArgs,
  formatReportTable,
  formatReportJson,
  formatCliErrorMessage,
  ReportUsageError
} = reportModule;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(__dirname, 'report-attributed-revenue.mjs');

// ---------------------------------------------------------------------------
// Pure helpers: date validation and local America/Los_Angeles bounds
// ---------------------------------------------------------------------------

assert.equal(isValidCalendarDate('2026-08-04'), true);
assert.equal(isValidCalendarDate('2026-13-01'), false);
assert.equal(isValidCalendarDate('2026-02-30'), false);
assert.equal(isValidCalendarDate('not-a-date'), false);
assert.equal(isValidCalendarDate(''), false);

{
  // August is PDT (UTC-7): local midnight Aug 4 -> 07:00 UTC, and the range is
  // inclusive of the whole Aug 12 local day, so the exclusive upper bound is
  // local midnight Aug 13 -> 07:00 UTC the next day.
  const { rangeStart, rangeEnd } = localDateRangeToUtcBounds('2026-08-04', '2026-08-12', 'America/Los_Angeles');
  assert.equal(rangeStart.toISOString(), '2026-08-04T07:00:00.000Z');
  assert.equal(rangeEnd.toISOString(), '2026-08-13T07:00:00.000Z');
}

{
  // January is PST (UTC-8) -- confirms the helper tracks DST, not a fixed offset.
  const { rangeStart, rangeEnd } = localDateRangeToUtcBounds('2026-01-05', '2026-01-05', 'America/Los_Angeles');
  assert.equal(rangeStart.toISOString(), '2026-01-05T08:00:00.000Z');
  assert.equal(rangeEnd.toISOString(), '2026-01-06T08:00:00.000Z');
}

{
  // Spring-forward transition: 2026-03-08 02:00 local skips to 03:00, so the
  // local day is only 23 hours long. Proves the two-pass offset lookup
  // converges correctly at the one input where a naive single-pass guess
  // would be off by an hour.
  const { rangeStart, rangeEnd } = localDateRangeToUtcBounds('2026-03-08', '2026-03-08', 'America/Los_Angeles');
  assert.equal(rangeStart.toISOString(), '2026-03-08T08:00:00.000Z');
  assert.equal(rangeEnd.toISOString(), '2026-03-09T07:00:00.000Z');
}

{
  // Fall-back transition: 2026-11-01 01:00 local repeats, so the local day is
  // 25 hours long.
  const { rangeStart, rangeEnd } = localDateRangeToUtcBounds('2026-11-01', '2026-11-01', 'America/Los_Angeles');
  assert.equal(rangeStart.toISOString(), '2026-11-01T07:00:00.000Z');
  assert.equal(rangeEnd.toISOString(), '2026-11-02T08:00:00.000Z');
}

assert.throws(() => localDateRangeToUtcBounds('bad', '2026-08-12'), /Invalid date range/);

// ---------------------------------------------------------------------------
// Pure helpers: round-half-up commission
// ---------------------------------------------------------------------------

assert.equal(roundHalfUp(5, 10), 1);
assert.equal(roundHalfUp(4, 10), 0);
assert.equal(roundHalfUp(15, 10), 2);
assert.throws(() => roundHalfUp(1.5, 10), /integer/);
assert.throws(() => roundHalfUp(10, 0), /integer/);

assert.equal(COMMISSION_RATE_BASIS_POINTS, 1000);
assert.equal(commissionMinor(62000), 6200);
assert.equal(commissionMinor(0), 0);
// net * 1000 / 10000 = net / 10 -- exercise a genuine half-up boundary: 25 minor -> 2.5 -> 3
assert.equal(commissionMinor(25), 3);
assert.equal(commissionMinor(24), 2);
assert.throws(() => commissionMinor(-1), /non-negative/);

// Commission stays per-order, not a single rounding of the aggregate net:
// six orders each with 5 minor net revenue must sum to 6 minor commission
// (6 x round_half_up(5000, 10000) = 6 x 1), not round_half_up(30000, 10000)
// = 3, which is what "round the aggregate once" would produce.
{
  const perOrderCommission = commissionMinor(5);
  assert.equal(perOrderCommission, 1);
  const sumOfPerOrderCommission = perOrderCommission * 6;
  assert.equal(sumOfPerOrderCommission, 6);
  const roundOfAggregateNet = commissionMinor(5 * 6);
  assert.equal(roundOfAggregateNet, 3);
  assert.notEqual(sumOfPerOrderCommission, roundOfAggregateNet);

  const sixOrders = Array.from({ length: 6 }, (_, index) => buildDetailRow({
    order_id: `order-commission-${index}`, provider: 'square', provider_order_id: `ORDER-COMM-${index}`,
    currency: 'USD', gross_amount_minor: 5, refund_amount_minor: 0
  }));
  const { totals } = aggregateAttributedRevenue(sixOrders);
  assert.equal(totals.netRevenueMinor, 30);
  assert.equal(totals.commissionAmountMinor, 6);
  assert.notEqual(totals.commissionAmountMinor, 3);
}

// ---------------------------------------------------------------------------
// Pure helpers: masking -- no raw identifiers ever survive
// ---------------------------------------------------------------------------

assert.equal(maskValue('ORDER-1234567890'), '************7890');
assert.equal(maskValue('abcd'), '****');
assert.equal(maskValue(null), null);
assert.equal(maskValue(undefined), null);
assert.equal(maskValue(''), null);

assert.equal(maskProviderOrderReference('ORDER-1234567890'), '************7890');
assert.equal(maskProviderOrderReference(null), null);

assert.equal(maskClickReference({ gclid: 'Cj0KCQjw1234567890ABCDEFG' }), maskValue('Cj0KCQjw1234567890ABCDEFG'));
assert.equal(maskClickReference({ gclid: null, gbraid: null, wbraid: null }), 'unattributed');
assert.equal(maskClickReference({}), 'unattributed');

// ---------------------------------------------------------------------------
// Canonical SQL: static shape assertions only.
//
// These assert.match/doesNotMatch checks prove the query TEXT contains the
// expected joins, columns, and predicates. They do NOT execute the SQL
// against PostgreSQL and cannot catch a syntax error, a wrong join key, or
// an accidental cross join. Live PostgreSQL execution against migrated
// fixtures is an explicit Task 7/8 gate, not part of this suite.
// ---------------------------------------------------------------------------

assert.match(ATTRIBUTED_REVENUE_SQL, /state\s*=\s*'COMPLETED'/);
// The generic assertion above is satisfied by the orders predicate
// (o.state = 'COMPLETED') alone and proves nothing about refunds -- this one
// is anchored specifically to the refunds CTE so deleting or widening the
// refund-side status filter fails the suite.
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /FROM attribution_refunds r\s*\n\s*WHERE r\.status = 'COMPLETED'/
);
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /COALESCE\(\s*o\.closed_at\s*,\s*o\.provider_updated_at\s*,\s*o\.provider_created_at\s*\)/
);
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /COALESCE\(\s*p\.provider_order_id\s*,\s*p\.metadata\s*->>\s*'provider_order_id'\s*\)/
);
assert.match(ATTRIBUTED_REVENUE_SQL, /DISTINCT ON\s*\(\s*r\.provider\s*,\s*r\.provider_refund_id\s*\)/);
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /COALESCE\(\s*dr\.provider_order_id\s*,\s*po\.resolved_provider_order_id\s*\)/
);
assert.match(ATTRIBUTED_REVENUE_SQL, /ROW_NUMBER\(\)\s*OVER\s*\(\s*PARTITION BY l\.entity_id/);
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.link_status = 'approved' AND l\.proof_tier = 'A' THEN 1/);
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.link_status = 'approved' AND l\.proof_tier = 'B' THEN 2/);
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.link_status = 'candidate' AND l\.proof_tier = 'B' THEN 3/);
// Rank 4 covers any non-rejected Tier C (approved C or candidate C) -- the
// WHERE clause below is what actually restricts this to non-rejected rows.
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.proof_tier = 'C' THEN 4/);
// Stable final tie-break so re-running the report over unchanged data
// cannot flip which link wins between two links with identical rank and
// matched_at.
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.matched_at DESC,\s*l\.attribution_link_id ASC/);
assert.match(ATTRIBUTED_REVENUE_SQL, /rank = 1/);
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.entity_type = 'order'/);
// Approved A/B/C and candidate B/C are rankable; candidate A and every
// rejected combination are excluded at the source, not merely deprioritized.
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.link_status = 'approved' AND l\.proof_tier IN \('A', 'B', 'C'\)/);
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.link_status = 'candidate' AND l\.proof_tier IN \('B', 'C'\)/);
// touch_id travels from the link all the way to the outer SELECT so
// provenAds can require a resolved touch, not just an approved Tier A link.
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.touch_id/);
assert.match(ATTRIBUTED_REVENUE_SQL, /bl\.touch_id/);
// Currency-scoped joins: refund totals are grouped by currency and only
// applied to an order when the refund's currency matches the order's --
// this is the mechanism that keeps a mismatched-currency refund from
// reducing a same-provider order denominated in a different currency.
assert.match(ATTRIBUTED_REVENUE_SQL, /GROUP BY\s+provider,\s*resolved_provider_order_id,\s*currency/);
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /rt\.provider = co\.provider AND rt\.provider_order_id = co\.provider_order_id AND rt\.currency = co\.currency/
);
assert.match(ATTRIBUTED_REVENUE_SQL, /co\.currency/);

// refund_classified: every completed refund is matched (LEFT JOIN, so
// non-matches survive as NULL) against the in-range completed-order cohort
// by provider + resolved provider order id. This is the exact join the
// three anomaly CTEs below key off of.
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /LEFT JOIN completed_orders co\s*\n\s*ON co\.provider = ro\.provider AND co\.provider_order_id = ro\.resolved_provider_order_id/
);
assert.match(ATTRIBUTED_REVENUE_SQL, /co\.order_id AS matched_order_id/);
assert.match(ATTRIBUTED_REVENUE_SQL, /co\.currency AS matched_order_currency/);

// Anomaly 1 (currency_mismatch): in scope whenever the refund resolves to
// an order in the completed-order cohort (matched_order_id IS NOT NULL) but
// the currencies differ -- unconditional on the refund's own timestamp,
// per ruling 3, and grouped by currency so it can never sum unlike
// currencies into one total (ruling 2).
assert.match(ATTRIBUTED_REVENUE_SQL, /'currency_mismatch' AS anomaly_type/);
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /FROM refund_classified rc\s*\n\s*WHERE rc\.matched_order_id IS NOT NULL\s*\n\s*AND rc\.currency <> rc\.matched_order_currency\s*\n\s*GROUP BY rc\.currency/
);

// Anomaly 2 (order_not_in_report): resolved to a real provider order id
// that does NOT match an in-range completed order, scoped to the report's
// own date bounds via the refund's financial timestamp -- never
// unconditional, unlike anomaly 1, because this refund isn't tied to
// anything already in the report. Explicitly excludes a NULL timestamp
// (rather than relying on NULL's three-valued WHERE semantics to do it
// implicitly) so it is disjoint from anomaly 4 (missing_timestamp) by
// construction, not by accident.
assert.match(ATTRIBUTED_REVENUE_SQL, /'order_not_in_report' AS anomaly_type/);
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /WHERE rc\.resolved_provider_order_id IS NOT NULL\s*\n\s*AND rc\.matched_order_id IS NULL\s*\n\s*AND rc\.refund_financial_at IS NOT NULL\s*\n\s*AND rc\.refund_financial_at >= b\.range_start\s*\n\s*AND rc\.refund_financial_at < b\.range_end\s*\n\s*GROUP BY rc\.currency/
);

// Anomaly 3 (unresolved): no resolvable provider order at all, also scoped
// to the report's own date bounds via the refund's financial timestamp, and
// likewise explicit about excluding a NULL timestamp.
assert.match(ATTRIBUTED_REVENUE_SQL, /'unresolved' AS anomaly_type/);
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /WHERE rc\.resolved_provider_order_id IS NULL\s*\n\s*AND rc\.refund_financial_at IS NOT NULL\s*\n\s*AND rc\.refund_financial_at >= b\.range_start\s*\n\s*AND rc\.refund_financial_at < b\.range_end\s*\n\s*GROUP BY rc\.currency/
);

// The refund's own financial timestamp follows the same
// updated-then-created precedence as order resolution, just on the refund
// row instead of the order row.
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /COALESCE\(\s*r\.provider_updated_at\s*,\s*r\.provider_created_at\s*\)\s*AS refund_financial_at/
);

// Anomaly 4 (missing_timestamp): the refund resolves to no in-range order
// (matched_order_id IS NULL, same precondition as anomaly 2/3) and its own
// financial timestamp is NULL, so neither anomaly 2's nor anomaly 3's date
// bound could ever be satisfied -- without this branch the row would vanish
// from every report, for every date range, forever. Unconditional on the
// report's bounds by design (it is a data-quality fact about the refund's
// source record, not a fact about the selected range), and grouped by
// currency like every other anomaly.
assert.match(ATTRIBUTED_REVENUE_SQL, /'missing_timestamp' AS anomaly_type/);
assert.match(
  ATTRIBUTED_REVENUE_SQL,
  /FROM refund_classified rc\s*\n\s*WHERE rc\.matched_order_id IS NULL\s*\n\s*AND rc\.refund_financial_at IS NULL\s*\n\s*GROUP BY rc\.currency/
);
// It must never carry a date-bound predicate -- that would defeat the whole
// point of surfacing timestamp-less refunds unconditionally.
{
  const missingTimestampCte = ATTRIBUTED_REVENUE_SQL.split('anomaly_missing_timestamp AS (')[1].split(')')[0];
  assert.doesNotMatch(missingTimestampCte, /b\.range_start/);
  assert.doesNotMatch(missingTimestampCte, /b\.range_end/);
}

// Anomaly rows are a distinct row_type from order rows and are unioned in,
// never merged into or subtracted from a financial order row.
assert.match(ATTRIBUTED_REVENUE_SQL, /'anomaly' AS row_type/);
assert.doesNotMatch(ATTRIBUTED_REVENUE_SQL, /'meta' AS row_type/);
assert.equal((ATTRIBUTED_REVENUE_SQL.match(/UNION ALL/g) || []).length, 4);
// Never add payment totals to order totals -- guard against both the
// aliased and fully-qualified spelling, since the query aliases the table
// as `p` and a naive regex on the fully-qualified name alone is vacuous.
assert.doesNotMatch(ATTRIBUTED_REVENUE_SQL, /\bp\.amount_minor\b/);
assert.doesNotMatch(ATTRIBUTED_REVENUE_SQL, /\battribution_payments\.amount_minor\b/);

// ---------------------------------------------------------------------------
// buildDetailRow: currency is required on every row (financial code must
// not guess or default a currency it was not told)
// ---------------------------------------------------------------------------

assert.throws(
  () => buildDetailRow({
    order_id: 'order-no-currency', provider: 'square', provider_order_id: 'ORDER-NO-CURRENCY',
    gross_amount_minor: 1000, refund_amount_minor: 0
  }),
  /currency/
);

// ---------------------------------------------------------------------------
// buildDetailRow: refund reconciliation -- raw, applied, excess, net, anomaly
// ---------------------------------------------------------------------------

{
  const partial = buildDetailRow({
    order_id: 'order-1', provider: 'square', provider_order_id: 'ORDER-0000000001', currency: 'USD',
    gross_amount_minor: 10000, refund_amount_minor: 4000
  });
  assert.equal(partial.rawRefundAmountMinor, 4000);
  assert.equal(partial.appliedRefundAmountMinor, 4000);
  assert.equal(partial.excessRefundAmountMinor, 0);
  assert.equal(partial.netRevenueMinor, 6000);
  assert.equal(partial.commissionAmountMinor, 600);
  assert.equal(partial.refundExceedsOrder, false);
  assert.equal(partial.bucket, 'unattributed');
  assert.equal(partial.grossAmountMinor - partial.appliedRefundAmountMinor, partial.netRevenueMinor);

  const full = buildDetailRow({
    order_id: 'order-2', provider: 'square', provider_order_id: 'ORDER-0000000002', currency: 'USD',
    gross_amount_minor: 10000, refund_amount_minor: 10000
  });
  assert.equal(full.rawRefundAmountMinor, 10000);
  assert.equal(full.appliedRefundAmountMinor, 10000);
  assert.equal(full.excessRefundAmountMinor, 0);
  assert.equal(full.netRevenueMinor, 0);
  assert.equal(full.commissionAmountMinor, 0);
  assert.equal(full.refundExceedsOrder, false);

  // Excess refund: raw completed-refund total is preserved for audit
  // (rawRefundAmountMinor stays 15000), but applied/net/commission are
  // clamped, and the excess is broken out explicitly rather than being
  // folded invisibly into the raw total.
  const excess = buildDetailRow({
    order_id: 'order-3', provider: 'square', provider_order_id: 'ORDER-0000000003', currency: 'USD',
    gross_amount_minor: 10000, refund_amount_minor: 15000
  });
  assert.equal(excess.rawRefundAmountMinor, 15000);
  assert.equal(excess.appliedRefundAmountMinor, 10000);
  assert.equal(excess.excessRefundAmountMinor, 5000);
  assert.equal(excess.netRevenueMinor, 0);
  assert.equal(excess.commissionAmountMinor, 0);
  assert.equal(excess.refundExceedsOrder, true);
  assert.equal(excess.grossAmountMinor - excess.appliedRefundAmountMinor, excess.netRevenueMinor);
}

// ---------------------------------------------------------------------------
// buildDetailRow: provenAds requires approved + Tier A + resolved touch_id +
// an actual click ID. Exact null-touch and null-click failure cases.
//
// F5 regression: an approved Tier A link that fails the touch/click check
// must bucket as `unattributed`, never `candidate` -- printing it as
// `candidate` while proofTier still read 'A' was a contradiction (candidate
// totals are reserved for actual Tier B/C link states; see the proof-tier
// bucket block below). Bucketing it unattributed also correctly nulls out
// proofTier/campaignId/etc via buildDetailRow's `hasLink` gate, so an
// unproven Tier A row never prints tier=A anywhere in the report output.
// ---------------------------------------------------------------------------

{
  // Positive control: approved A, resolved touch_id, and a click ID present.
  const provenAds = buildDetailRow({
    order_id: 'order-a', provider: 'square', provider_order_id: 'ORDER-A', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved', touch_id: 'touch-1',
    campaign_id: 'campaign-1', ad_group_id: 'adgroup-1', keyword: 'window tint', device: 'mobile',
    gclid: 'Cj0KCQjwABCDEFGHIJKLMNOP'
  });
  assert.equal(provenAds.bucket, 'provenAds');
  assert.equal(provenAds.proofTier, 'A');
  assert.equal(provenAds.campaignId, 'campaign-1');
  assert.notEqual(provenAds.clickReference, 'Cj0KCQjwABCDEFGHIJKLMNOP');

  // Failure case 1: touch_id is null -- the link never resolved to a touch
  // at all. Approved + Tier A alone must not be enough, and it must not
  // fall into candidate either -- an unresolved Tier A touch is unattributed.
  const nullTouch = buildDetailRow({
    order_id: 'order-null-touch', provider: 'square', provider_order_id: 'ORDER-NULL-TOUCH', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved', touch_id: null,
    gclid: 'Cj0KCQjwABCDEFGHIJKLMNOP'
  });
  assert.equal(nullTouch.bucket, 'unattributed');
  assert.notEqual(nullTouch.bucket, 'provenAds');
  assert.notEqual(nullTouch.bucket, 'candidate');
  assert.equal(nullTouch.proofTier, null, 'an unattributed row must never report tier=A');

  // Failure case 2: touch_id is resolved (the link points at a real touch
  // row id) but no click ID survived the join -- e.g. the referenced touch
  // was pruned. A resolved touch_id alone must not be enough either, and
  // this must also land in unattributed, not candidate.
  const nullClick = buildDetailRow({
    order_id: 'order-null-click', provider: 'square', provider_order_id: 'ORDER-NULL-CLICK', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved', touch_id: 'touch-2',
    gclid: null, gbraid: null, wbraid: null
  });
  assert.equal(nullClick.bucket, 'unattributed');
  assert.notEqual(nullClick.bucket, 'provenAds');
  assert.notEqual(nullClick.bucket, 'candidate');
  assert.equal(nullClick.proofTier, null, 'an unattributed row must never report tier=A');
  assert.equal(nullClick.clickReference, 'unattributed');
}

// ---------------------------------------------------------------------------
// buildDetailRow: proof-tier buckets -- approved B, candidate B, approved C,
// candidate C, and no-link rows. (Approved Tier A without a resolved
// touch/click is covered above and lands in `unattributed`, not here --
// candidate is reserved for actual Tier B/C link states.) Rejected and
// candidate-A rows never reach this function because the SQL rank filter
// excludes them at the source (see the WHERE-clause static assertions
// above); bucketFor is still exercised directly here as a defensive check.
// ---------------------------------------------------------------------------

{
  const approvedB = buildDetailRow({
    order_id: 'order-b', provider: 'square', provider_order_id: 'ORDER-B', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'reviewed_match', proof_tier: 'B', link_status: 'approved'
  });
  assert.equal(approvedB.bucket, 'candidate');

  const candidateB = buildDetailRow({
    order_id: 'order-c', provider: 'square', provider_order_id: 'ORDER-C', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'reviewed_match', proof_tier: 'B', link_status: 'candidate'
  });
  assert.equal(candidateB.bucket, 'candidate');

  // Approved + Tier C is candidate/directional, never proven Ads -- even
  // though the link is approved, Tier C is not strong enough proof.
  const approvedC = buildDetailRow({
    order_id: 'order-approved-c', provider: 'square', provider_order_id: 'ORDER-APPROVED-C', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'directional_match', proof_tier: 'C', link_status: 'approved', touch_id: 'touch-3',
    gclid: 'Cj0KCQjwABCDEFGHIJKLMNOP'
  });
  assert.equal(approvedC.bucket, 'candidate');
  assert.notEqual(approvedC.bucket, 'provenAds');

  const candidateC = buildDetailRow({
    order_id: 'order-d', provider: 'square', provider_order_id: 'ORDER-D', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'directional_match', proof_tier: 'C', link_status: 'candidate'
  });
  assert.equal(candidateC.bucket, 'candidate');

  const unattributed = buildDetailRow({
    order_id: 'order-e', provider: 'square', provider_order_id: 'ORDER-E', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0
  });
  assert.equal(unattributed.bucket, 'unattributed');
  assert.equal(unattributed.clickReference, 'unattributed');
  assert.equal(unattributed.proofTier, null);
}

// ---------------------------------------------------------------------------
// aggregateAttributedRevenue: buckets sum independently, no double counting,
// and gross - applied refunds = net at both the total and bucket level.
// ---------------------------------------------------------------------------

{
  const rows = [
    buildDetailRow({
      order_id: 'order-1', provider: 'square', provider_order_id: 'ORDER-1', currency: 'USD',
      gross_amount_minor: 10000, refund_amount_minor: 0,
      link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved', touch_id: 'touch-1',
      gclid: 'Cj0KCQjwABCDEFGHIJKLMNOP'
    }),
    buildDetailRow({
      order_id: 'order-2', provider: 'square', provider_order_id: 'ORDER-2', currency: 'USD',
      gross_amount_minor: 20000, refund_amount_minor: 5000,
      link_method: 'directional_match', proof_tier: 'C', link_status: 'candidate'
    }),
    buildDetailRow({
      order_id: 'order-3', provider: 'square', provider_order_id: 'ORDER-3', currency: 'USD',
      gross_amount_minor: 30000, refund_amount_minor: 0
    })
  ];
  const { totals, buckets } = aggregateAttributedRevenue(rows);
  assert.equal(totals.orderCount, 3);
  assert.equal(totals.grossAmountMinor, 60000);
  assert.equal(totals.rawRefundAmountMinor, 5000);
  assert.equal(totals.appliedRefundAmountMinor, 5000);
  assert.equal(totals.excessRefundAmountMinor, 0);
  assert.equal(totals.netRevenueMinor, 55000);
  assert.equal(totals.grossAmountMinor - totals.appliedRefundAmountMinor, totals.netRevenueMinor);
  assert.equal(totals.commissionAmountMinor, 1000 + 1500 + 3000);

  assert.equal(buckets.provenAds.orderCount, 1);
  assert.equal(buckets.provenAds.netRevenueMinor, 10000);
  assert.equal(buckets.provenAds.commissionAmountMinor, 1000);

  assert.equal(buckets.candidate.orderCount, 1);
  assert.equal(buckets.candidate.netRevenueMinor, 15000);
  assert.equal(buckets.candidate.commissionAmountMinor, 1500);

  assert.equal(buckets.unattributed.orderCount, 1);
  assert.equal(buckets.unattributed.netRevenueMinor, 30000);
  assert.equal(buckets.unattributed.commissionAmountMinor, 3000);
}

// ---------------------------------------------------------------------------
// aggregateAttributedRevenue: fails closed on mixed-currency aggregation
// rather than silently summing unlike currencies under one label.
// ---------------------------------------------------------------------------

{
  const usdRow = buildDetailRow({
    order_id: 'order-usd', provider: 'square', provider_order_id: 'ORDER-USD', currency: 'USD',
    gross_amount_minor: 10000, refund_amount_minor: 0
  });
  const eurRow = buildDetailRow({
    order_id: 'order-eur', provider: 'square', provider_order_id: 'ORDER-EUR', currency: 'EUR',
    gross_amount_minor: 10000, refund_amount_minor: 0
  });
  assert.throws(() => aggregateAttributedRevenue([usdRow, eurRow]), /[Mm]ixed-currency/);
  // Single currency, any number of rows, still aggregates normally.
  assert.doesNotThrow(() => aggregateAttributedRevenue([usdRow]));
}

// ---------------------------------------------------------------------------
// V9 (round-3 fix): a mixed-order-currency database result must reach the
// operator through the same secret-safe collapsing path the real CLI uses,
// proven end-to-end from the orchestrator (runAttributedRevenueReport, not
// just the aggregateAttributedRevenue unit) through to the exact function
// scripts/report-attributed-revenue.mjs calls to render its stderr message
// (formatCliErrorMessage) -- not a re-implementation of that logic in the
// test, but the real production function.
//
// True subprocess-level coverage (spawning the actual CLI against a live
// mixed-currency dataset) is impractical without either a real Postgres
// connection or a test-only hook into production code -- both of which are
// out of scope here (Task 7/8 gate; no test-only production hooks). This is
// the practical substitute the round-3 fix prompt calls for: it exercises
// every line of the real code the live CLI would run except the Neon driver
// call itself, and it is the strongest test available without a live
// database. Live-CLI-against-Postgres coverage of this exact scenario
// remains an explicit Task 7/8 gate, same as the rest of this suite's SQL
// execution disclosure.
// ---------------------------------------------------------------------------

{
  const fakeQuery = async () => [
    {
      row_type: 'order', order_id: 'order-usd', provider: 'square', provider_order_id: 'ORD-USD',
      currency: 'USD', gross_amount_minor: 10000, refund_amount_minor: 0
    },
    {
      row_type: 'order', order_id: 'order-eur', provider: 'square', provider_order_id: 'ORD-EUR',
      currency: 'EUR', gross_amount_minor: 10000, refund_amount_minor: 0
    }
  ];
  await assert.rejects(
    runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' }),
    (error) => {
      assert.match(error.message, /[Mm]ixed-currency/);
      assert.match(error.message, /EUR/);
      assert.match(error.message, /USD/);
      // Not marked safe -- the CLI must collapse it, not echo it verbatim.
      assert.notEqual(error.safeToDisplay, true);
      const cliMessage = formatCliErrorMessage(error);
      assert.equal(cliMessage, 'report-attributed-revenue: failed to generate report');
      assert.doesNotMatch(cliMessage, /EUR/);
      assert.doesNotMatch(cliMessage, /USD/);
      assert.doesNotMatch(cliMessage, /mixed-currency/i);
      return true;
    }
  );
}

// ---------------------------------------------------------------------------
// buildDetailRow: a zero refund_amount_minor leaves net revenue equal to
// gross (V4 -- this fixture used to claim it proved the SQL's currency
// scoping join; it doesn't, since it hand-feeds refund_amount_minor: 0
// rather than exercising the join at all). The actual currency-scoping
// contract -- that a currency-mismatched refund never reduces net revenue
// and resurfaces instead as a `currency_mismatch` anomaly -- is proven
// end-to-end via runAttributedRevenueReport below, and the SQL side is
// covered by the anchored static assertions further up this file.
// ---------------------------------------------------------------------------

{
  const usdOrderRow = {
    row_type: 'order', order_id: 'order-currency-scope', provider: 'square',
    provider_order_id: 'ORDER-CURRENCY-SCOPE', currency: 'USD',
    gross_amount_minor: 10000,
    refund_amount_minor: 0
  };
  const detailRow = buildDetailRow(usdOrderRow);
  assert.equal(detailRow.currency, 'USD');
  assert.equal(detailRow.netRevenueMinor, 10000);
  assert.equal(detailRow.rawRefundAmountMinor, 0);
}

// ---------------------------------------------------------------------------
// runAttributedRevenueReport: fake query function, deterministic fixture rows
// ---------------------------------------------------------------------------

{
  let capturedSql = null;
  let capturedParams = null;
  const fakeQuery = async (sql, params) => {
    capturedSql = sql;
    capturedParams = params;
    return [
      {
        row_type: 'order', order_id: 'order-1', provider: 'square', provider_order_id: 'ORDER-0000000001',
        currency: 'USD', gross_amount_minor: 10000, refund_amount_minor: 0
      }
    ];
  };

  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.equal(capturedSql, ATTRIBUTED_REVENUE_SQL);
  assert.deepEqual(capturedParams, ['2026-08-04T07:00:00.000Z', '2026-08-13T07:00:00.000Z']);
  assert.equal(report.currency, 'USD');
  assert.equal(report.summary.totals.orderCount, 1);
  assert.equal(report.summary.totals.grossAmountMinor, 10000);
  assert.equal(report.rows.length, 1);
  assert.deepEqual(report.anomalies, {
    currencyMismatch: [], orderNotInReport: [], unresolvedRefunds: [], missingTimestamp: []
  });

  await assert.rejects(runAttributedRevenueReport({ query: null, from: '2026-08-04', to: '2026-08-12' }), /query function/);
}

// ---------------------------------------------------------------------------
// Ruling 1/6: a USD order with a resolved but currency-mismatched EUR
// refund must not have that refund applied (net stays at gross), and the
// refund must resurface as a distinct `currency_mismatch` anomaly carrying
// its own currency, count, and amount -- never silently dropped, never
// summed into a USD figure. This is the end-to-end fixture proving the R1
// finding is closed: the SQL's currency-scoped join (rt.currency =
// co.currency) would zero out refund_amount_minor on the order row exactly
// like this, and the anomaly_currency_mismatch CTE is what carries the
// EUR refund forward instead of losing it.
// ---------------------------------------------------------------------------

{
  const fakeQuery = async () => [
    {
      row_type: 'order', order_id: 'order-mismatch', provider: 'square', provider_order_id: 'ORD-1',
      currency: 'USD', gross_amount_minor: 100000, refund_amount_minor: 0
    },
    {
      row_type: 'anomaly', anomaly_type: 'currency_mismatch', anomaly_currency: 'EUR',
      anomaly_count: 1, anomaly_amount_minor: 40000
    }
  ];
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].currency, 'USD');
  assert.equal(report.rows[0].rawRefundAmountMinor, 0);
  assert.equal(report.rows[0].netRevenueMinor, 100000);
  assert.equal(report.rows[0].commissionAmountMinor, 10000);
  assert.deepEqual(report.anomalies.currencyMismatch, [{ currency: 'EUR', count: 1, amountMinor: 40000 }]);
  assert.deepEqual(report.anomalies.orderNotInReport, []);
  assert.deepEqual(report.anomalies.unresolvedRefunds, []);
  // Net revenue and commission are not overstated by a silently dropped
  // refund -- the anomaly total (40000) is visible and separate.
  assert.equal(report.summary.totals.netRevenueMinor, 100000);

  const table = formatReportTable(report);
  assert.match(table, /Currency mismatch/);
  assert.match(table, /1 refunds, 400\.00 EUR/);
}

// ---------------------------------------------------------------------------
// Ruling 3: a refund resolved to an order id that is not in the in-range
// completed-order cohort surfaces as `order_not_in_report`, not applied to
// any order revenue.
// ---------------------------------------------------------------------------

{
  const fakeQuery = async () => [
    {
      row_type: 'order', order_id: 'order-1', provider: 'square', provider_order_id: 'ORD-1',
      currency: 'USD', gross_amount_minor: 10000, refund_amount_minor: 0
    },
    {
      row_type: 'anomaly', anomaly_type: 'order_not_in_report', anomaly_currency: 'USD',
      anomaly_count: 1, anomaly_amount_minor: 2500
    }
  ];
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.equal(report.rows[0].netRevenueMinor, 10000);
  assert.deepEqual(report.anomalies.orderNotInReport, [{ currency: 'USD', count: 1, amountMinor: 2500 }]);
  assert.deepEqual(report.anomalies.currencyMismatch, []);
}

// ---------------------------------------------------------------------------
// V1 (round-3 fix): a completed refund that resolves to no in-range order
// AND has no usable provider timestamp must never vanish. It surfaces as
// its own `missing_timestamp` anomaly, grouped by currency like every other
// anomaly, and it never changes order revenue or commission -- proven here
// by an order row whose net/commission are unaffected by the presence of
// the anomaly.
// ---------------------------------------------------------------------------

{
  const fakeQuery = async () => [
    {
      row_type: 'order', order_id: 'order-1', provider: 'square', provider_order_id: 'ORD-1',
      currency: 'USD', gross_amount_minor: 10000, refund_amount_minor: 0
    },
    {
      row_type: 'anomaly', anomaly_type: 'missing_timestamp', anomaly_currency: 'USD',
      anomaly_count: 1, anomaly_amount_minor: 4000
    }
  ];
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.equal(report.rows[0].netRevenueMinor, 10000);
  assert.equal(report.rows[0].commissionAmountMinor, 1000);
  assert.deepEqual(report.anomalies.missingTimestamp, [{ currency: 'USD', count: 1, amountMinor: 4000 }]);
  assert.deepEqual(report.anomalies.orderNotInReport, []);
  assert.deepEqual(report.anomalies.unresolvedRefunds, []);
  assert.deepEqual(report.anomalies.currencyMismatch, []);

  const table = formatReportTable(report);
  assert.match(table, /Missing refund timestamp/);
  assert.match(table, /global data quality, not scoped to this date range/);
  assert.match(table, /1 refunds, \$40\.00/);
}

// ---------------------------------------------------------------------------
// Ruling 4: a same-currency completed refund linked to an in-range order is
// applied to that order's net revenue and commission, independent of any
// anomaly rows present in the same result set.
// ---------------------------------------------------------------------------

{
  const fakeQuery = async () => [
    {
      row_type: 'order', order_id: 'order-applied', provider: 'square', provider_order_id: 'ORD-APPLIED',
      currency: 'USD', gross_amount_minor: 50000, refund_amount_minor: 20000
    }
  ];
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.equal(report.rows[0].rawRefundAmountMinor, 20000);
  assert.equal(report.rows[0].appliedRefundAmountMinor, 20000);
  assert.equal(report.rows[0].netRevenueMinor, 30000);
  assert.equal(report.summary.totals.netRevenueMinor, 30000);
}

// ---------------------------------------------------------------------------
// Ruling 2/5/6: zero completed orders in range with two anomaly currencies
// -- each currency surfaces as its own entry, currencies are never summed
// together, and no currency is guessed (report.currency stays null, and the
// formatted table never claims USD for a figure it was never told the
// currency of).
// ---------------------------------------------------------------------------

{
  const fakeQuery = async () => [
    { row_type: 'anomaly', anomaly_type: 'unresolved', anomaly_currency: 'EUR', anomaly_count: 2, anomaly_amount_minor: 9999 },
    { row_type: 'anomaly', anomaly_type: 'unresolved', anomaly_currency: 'GBP', anomaly_count: 1, anomaly_amount_minor: 500 }
  ];
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.equal(report.rows.length, 0);
  assert.equal(report.summary.totals.orderCount, 0);
  assert.equal(report.currency, null);
  assert.deepEqual(report.anomalies.unresolvedRefunds, [
    { currency: 'EUR', count: 2, amountMinor: 9999 },
    { currency: 'GBP', count: 1, amountMinor: 500 }
  ]);

  const table = formatReportTable(report);
  const json = formatReportJson(report);
  assert.match(table, /Currency: n\/a/);
  assert.doesNotMatch(table, /\bUSD\b/);
  // Strengthened per V3: the report's own USD notation is the `$` sign, not
  // the letters "USD" -- a guard that only checks for the string USD would
  // pass even if the null-currency branch of formatMinorAsCurrency were
  // mutated to prepend `$` to a total whose currency is unknown. Assert the
  // exact zero-currency lines so no `$` (or any other currency claim) can
  // sneak into a total the report was never told the currency of.
  assert.doesNotMatch(table, /\$/);
  assert.doesNotMatch(json, /\$/);
  assert.match(table, /^  Gross revenue: 0\.00$/m);
  assert.match(table, /^  Refunds, raw completed total \(audit\): 0\.00$/m);
  assert.match(table, /^  Refunds applied \(capped at order gross\): 0\.00$/m);
  assert.match(table, /^  Net revenue \(gross - applied refunds\): 0\.00$/m);
  assert.match(table, /2 refunds, 99\.99 EUR/);
  assert.match(table, /1 refunds, 5\.00 GBP/);
}

// ---------------------------------------------------------------------------
// Ruling 3: date-bound scoping for order_not_in_report/unresolved anomalies
// is enforced entirely inside the SQL (the `rc.refund_financial_at >=
// b.range_start AND rc.refund_financial_at < b.range_end` predicates
// asserted statically above, on both anomaly_order_not_in_report and
// anomaly_unresolved). This suite does not execute SQL (Task 7/8 gate), so
// the "out-of-range unresolved refund excluded" and "in-range unresolved
// refund included" behaviors cannot be proven by a fake-query fixture --
// a fake query can only assert what JS does with rows it is handed, and an
// out-of-range refund never reaches JS as a row at all under a correct
// query. The JS-side half of the contract -- that whatever anomaly rows
// the SQL does emit survive unmodified through to report.anomalies,
// regardless of how many or few there are -- is covered by the two fixtures
// immediately above (one anomaly row, two anomaly rows, zero anomaly rows).
// ---------------------------------------------------------------------------

{
  // Zero anomaly rows at all (nothing unresolved, nothing mismatched, one
  // in-range order) must not fabricate an anomaly entry out of thin air.
  const fakeQuery = async () => [
    {
      row_type: 'order', order_id: 'order-clean', provider: 'square', provider_order_id: 'ORD-CLEAN',
      currency: 'USD', gross_amount_minor: 10000, refund_amount_minor: 0
    }
  ];
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.deepEqual(report.anomalies, {
    currencyMismatch: [], orderNotInReport: [], unresolvedRefunds: [], missingTimestamp: []
  });
}

// ---------------------------------------------------------------------------
// V6 (round-3 fix): an unrecognized row_type or anomaly_type from the
// database must fail closed, not be silently dropped. Neither discriminator
// is reachable from today's static SQL, but the next tranche that adds a
// fourth row_type or fifth anomaly_type without updating this module must
// not ship a silent revenue/anomaly leak.
// ---------------------------------------------------------------------------

{
  const fakeQuery = async () => [
    {
      row_type: 'summary_v2', order_id: 'order-unknown-row-type', provider: 'square',
      provider_order_id: 'ORD-UNKNOWN', currency: 'USD', gross_amount_minor: 50000, refund_amount_minor: 0
    }
  ];
  await assert.rejects(
    runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' }),
    /Unrecognized row_type/
  );
}

{
  const fakeQuery = async () => [
    {
      row_type: 'anomaly', anomaly_type: 'brand_new_class', anomaly_currency: 'USD',
      anomaly_count: 9, anomaly_amount_minor: 99999
    }
  ];
  await assert.rejects(
    runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' }),
    /Unrecognized anomaly_type/
  );
}

// ---------------------------------------------------------------------------
// V5 (round-3 fix): per-currency anomaly ordering is deterministic
// regardless of the order rows arrive in. The outer SQL's ORDER BY leaves
// anomaly rows mutually unordered (row_type/financial_at/order_id are
// identical or NULL across every anomaly row), so this sort is the only
// thing keeping report output stable across runs over unchanged data. Feed
// rows in reverse currency order (GBP, then EUR, then AUD) across two
// different anomaly types so a fixture whose input already happened to be
// sorted couldn't accidentally pass without a working comparator.
// ---------------------------------------------------------------------------

{
  const fakeQuery = async () => [
    { row_type: 'anomaly', anomaly_type: 'unresolved', anomaly_currency: 'GBP', anomaly_count: 1, anomaly_amount_minor: 100 },
    { row_type: 'anomaly', anomaly_type: 'unresolved', anomaly_currency: 'EUR', anomaly_count: 1, anomaly_amount_minor: 200 },
    { row_type: 'anomaly', anomaly_type: 'unresolved', anomaly_currency: 'AUD', anomaly_count: 1, anomaly_amount_minor: 300 },
    { row_type: 'anomaly', anomaly_type: 'order_not_in_report', anomaly_currency: 'JPY', anomaly_count: 1, anomaly_amount_minor: 400 },
    { row_type: 'anomaly', anomaly_type: 'order_not_in_report', anomaly_currency: 'CAD', anomaly_count: 1, anomaly_amount_minor: 500 }
  ];
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.deepEqual(report.anomalies.unresolvedRefunds.map((entry) => entry.currency), ['AUD', 'EUR', 'GBP']);
  assert.deepEqual(report.anomalies.orderNotInReport.map((entry) => entry.currency), ['CAD', 'JPY']);
}

// ---------------------------------------------------------------------------
// Acceptance fixture (Aug 4-12): a synthetic 13-row completed-order fixture,
// run purely through the aggregation pipeline with a fake query function.
// These are test fixture values, never production totals.
// ---------------------------------------------------------------------------

{
  const fixtureRows = Array.from({ length: 13 }, (_, index) => ({
    row_type: 'order',
    order_id: `order-fixture-${index + 1}`,
    provider: 'square',
    provider_order_id: `ORDER-FIXTURE-${String(index + 1).padStart(4, '0')}`,
    currency: 'USD',
    gross_amount_minor: 62000,
    refund_amount_minor: 0
  }));
  const fakeQuery = async () => fixtureRows;
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });

  assert.equal(report.summary.totals.orderCount, 13);
  assert.equal(report.summary.totals.grossAmountMinor, 806000);
  assert.equal(report.summary.totals.rawRefundAmountMinor, 0);
  assert.equal(report.summary.totals.appliedRefundAmountMinor, 0);
  assert.equal(report.summary.totals.netRevenueMinor, 806000);
  assert.equal(report.summary.totals.commissionAmountMinor, 80600);
  assert.equal(report.summary.buckets.provenAds.commissionAmountMinor, 0);

  const json = formatReportJson(report);
  assert.doesNotMatch(json, /ORDER-FIXTURE-0001/);
  const table = formatReportTable(report);
  assert.doesNotMatch(table, /ORDER-FIXTURE-0001/);
}

// ---------------------------------------------------------------------------
// parseReportArgs: date/CLI validation
// ---------------------------------------------------------------------------

assert.deepEqual(
  parseReportArgs(['--from=2026-08-04', '--to=2026-08-12']),
  { from: '2026-08-04', to: '2026-08-12', format: 'table' }
);
assert.deepEqual(
  parseReportArgs(['--from=2026-08-04', '--to=2026-08-12', '--format=json']),
  { from: '2026-08-04', to: '2026-08-12', format: 'json' }
);
assert.throws(() => parseReportArgs(['--from=bad-date', '--to=2026-08-12']), ReportUsageError);
assert.throws(() => parseReportArgs(['--from=2026-08-12', '--to=2026-08-04']), ReportUsageError);
assert.throws(() => parseReportArgs(['--from=2026-08-04']), ReportUsageError);
assert.throws(() => parseReportArgs(['--from=2026-08-04', '--to=2026-08-12', '--unknown=1']), ReportUsageError);
assert.throws(() => parseReportArgs(['--from=2026-08-04', '--to=2026-08-12', '--format=xml']), ReportUsageError);

// ---------------------------------------------------------------------------
// formatReportTable / formatReportJson: masked output only, refund
// breakdown clearly labeled, currency and anomalies present.
// ---------------------------------------------------------------------------

{
  const rows = [buildDetailRow({
    order_id: 'order-x', provider: 'square', provider_order_id: 'ORDER-RAW-SECRET-0001', currency: 'USD',
    gross_amount_minor: 10000, refund_amount_minor: 0,
    link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved', touch_id: 'touch-x',
    gclid: 'Cj0KCQjw-RAW-CLICK-ID-VALUE'
  })];
  const report = {
    from: '2026-08-04', to: '2026-08-12', timeZone: 'America/Los_Angeles', currency: 'USD',
    generatedRangeUtc: { start: '2026-08-04T07:00:00.000Z', end: '2026-08-13T07:00:00.000Z' },
    summary: aggregateAttributedRevenue(rows),
    anomalies: {
      currencyMismatch: [{ currency: 'EUR', count: 1, amountMinor: 4000 }],
      orderNotInReport: [],
      unresolvedRefunds: [{ currency: 'USD', count: 1, amountMinor: 750 }],
      missingTimestamp: [{ currency: 'JPY', count: 2, amountMinor: 300 }]
    },
    rows
  };
  const table = formatReportTable(report);
  const json = formatReportJson(report);
  for (const output of [table, json]) {
    assert.doesNotMatch(output, /ORDER-RAW-SECRET-0001/);
    assert.doesNotMatch(output, /Cj0KCQjw-RAW-CLICK-ID-VALUE/);
    assert.doesNotMatch(output, /DATABASE_URL/);
  }
  assert.match(table, /provenAds/);
  assert.match(json, /"bucket": "provenAds"/);
  assert.match(table, /Refunds, raw completed total \(audit\)/);
  assert.match(table, /Refunds applied \(capped at order gross\)/);
  assert.match(table, /Refunds in excess of order gross/);
  assert.match(table, /Currency mismatch/);
  assert.match(table, /Resolved order outside this report/);
  assert.match(table, /Resolved order outside this report: none/);
  assert.match(table, /Unresolved completed refunds/);
  assert.match(table, /Missing refund timestamp/);
  assert.match(table, /Missing refund timestamp.*: 2 refunds, 3\.00 JPY/);
  assert.match(table, /Currency: USD/);
}

// ---------------------------------------------------------------------------
// CLI: secret-safe rejection of invalid dates, reversed ranges, unknown
// flags, and missing DATABASE_URL -- run as a real subprocess.
// ---------------------------------------------------------------------------

const runCli = (args, envOverrides = {}) => {
  const env = { ...process.env, ...envOverrides };
  if (envOverrides.DATABASE_URL === undefined) delete env.DATABASE_URL;
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8', env });
};

{
  const result = runCli(['--from=bad', '--to=2026-08-12']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /report-attributed-revenue/);
  assert.doesNotMatch(result.stderr, /DATABASE_URL=/);
}

{
  const result = runCli(['--from=2026-08-12', '--to=2026-08-04']);
  assert.notEqual(result.status, 0);
}

{
  const result = runCli(['--from=2026-08-04', '--to=2026-08-12', '--bogus=1']);
  assert.notEqual(result.status, 0);
}

{
  const result = runCli(['--from=2026-08-04', '--to=2026-08-12']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DATABASE_URL is not configured/);
  assert.doesNotMatch(result.stderr, /postgres:\/\//);
}

console.log('attributed revenue report test passed');
