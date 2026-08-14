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
// Unresolved completed refunds (no direct or payment-fallback order id) are
// aggregated unconditionally and surfaced as a 'meta' row rather than
// silently dropped.
assert.match(ATTRIBUTED_REVENUE_SQL, /unresolved_refund_count/);
assert.match(ATTRIBUTED_REVENUE_SQL, /unresolved_refund_amount_minor/);
assert.match(ATTRIBUTED_REVENUE_SQL, /'meta' AS row_type/);
assert.match(ATTRIBUTED_REVENUE_SQL, /UNION ALL/);
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
  // at all. Approved + Tier A alone must not be enough.
  const nullTouch = buildDetailRow({
    order_id: 'order-null-touch', provider: 'square', provider_order_id: 'ORDER-NULL-TOUCH', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved', touch_id: null,
    gclid: 'Cj0KCQjwABCDEFGHIJKLMNOP'
  });
  assert.equal(nullTouch.bucket, 'candidate');
  assert.notEqual(nullTouch.bucket, 'provenAds');

  // Failure case 2: touch_id is resolved (the link points at a real touch
  // row id) but no click ID survived the join -- e.g. the referenced touch
  // was pruned. A resolved touch_id alone must not be enough either.
  const nullClick = buildDetailRow({
    order_id: 'order-null-click', provider: 'square', provider_order_id: 'ORDER-NULL-CLICK', currency: 'USD',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved', touch_id: 'touch-2',
    gclid: null, gbraid: null, wbraid: null
  });
  assert.equal(nullClick.bucket, 'candidate');
  assert.notEqual(nullClick.bucket, 'provenAds');
  assert.equal(nullClick.clickReference, 'unattributed');
}

// ---------------------------------------------------------------------------
// buildDetailRow: proof-tier buckets -- approved A (without proof), approved
// B, candidate B, approved C, candidate C, and no-link rows. Rejected and
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
// Currency-scoped joins: a mismatched-currency refund cannot reduce a USD
// order. The canonical SQL enforces this via `rt.currency = co.currency`
// (asserted statically above -- this is what "proves" the join is scoped;
// this suite does not execute SQL, see the Task 7/8 gate note above). This
// fixture documents and exercises the JS-side contract the SQL is required
// to uphold: a USD order's refund_amount_minor must come only from
// same-currency refunds, so a currency-mismatched refund never appears in
// it and therefore never reduces net revenue.
// ---------------------------------------------------------------------------

{
  const usdOrderRow = {
    row_type: 'order', order_id: 'order-currency-scope', provider: 'square',
    provider_order_id: 'ORDER-CURRENCY-SCOPE', currency: 'USD',
    gross_amount_minor: 10000,
    // A EUR-denominated refund on this order is excluded by the SQL's
    // currency-scoped join (rt.currency = co.currency), so it never
    // contributes here -- refund_amount_minor reflects only same-currency
    // (USD) completed refunds.
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
  assert.deepEqual(report.anomalies.unresolvedRefunds, { count: 0, amountMinor: 0 });

  await assert.rejects(runAttributedRevenueReport({ query: null, from: '2026-08-04', to: '2026-08-12' }), /query function/);
}

// ---------------------------------------------------------------------------
// runAttributedRevenueReport: unresolved-refund anomaly totals surface from
// a 'meta' row, are de-duplicated (not re-summed) in JS, and survive even
// when zero completed orders exist in range.
// ---------------------------------------------------------------------------

{
  const fakeQuery = async () => [
    {
      row_type: 'order', order_id: 'order-1', provider: 'square', provider_order_id: 'ORDER-1',
      currency: 'USD', gross_amount_minor: 10000, refund_amount_minor: 0
    },
    {
      row_type: 'meta', unresolved_refund_count: 2, unresolved_refund_amount_minor: 1500
    }
  ];
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.equal(report.rows.length, 1);
  assert.deepEqual(report.anomalies.unresolvedRefunds, { count: 2, amountMinor: 1500 });
  // The meta row must never be treated as a financial order row.
  assert.equal(report.summary.totals.orderCount, 1);
  assert.equal(report.summary.totals.grossAmountMinor, 10000);
}

{
  // Zero completed orders in range: the meta row (an unconditional
  // aggregate) is still present and the anomaly totals still surface.
  const fakeQuery = async () => [
    { row_type: 'meta', unresolved_refund_count: 3, unresolved_refund_amount_minor: 4200 }
  ];
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.equal(report.rows.length, 0);
  assert.equal(report.summary.totals.orderCount, 0);
  assert.deepEqual(report.anomalies.unresolvedRefunds, { count: 3, amountMinor: 4200 });
  assert.equal(report.currency, null);
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
    anomalies: { unresolvedRefunds: { count: 1, amountMinor: 750 } },
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
  assert.match(table, /Unresolved completed refunds/);
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
