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
// Canonical SQL: lock in date bounds, timestamp fallback, metadata fallback,
// refund dedup/preference, and fixed link ranking without a live database.
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
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.link_status = 'candidate' AND l\.proof_tier = 'C' THEN 4/);
assert.match(ATTRIBUTED_REVENUE_SQL, /rank = 1/);
assert.match(ATTRIBUTED_REVENUE_SQL, /l\.entity_type = 'order'/);
// Never add payment totals to order totals -- the SELECT list contains no payments.amount_minor.
assert.doesNotMatch(ATTRIBUTED_REVENUE_SQL, /attribution_payments\.amount_minor/);

// ---------------------------------------------------------------------------
// buildDetailRow: partial, full, and excess refunds; anomaly flag
// ---------------------------------------------------------------------------

{
  const partial = buildDetailRow({
    order_id: 'order-1', provider: 'square', provider_order_id: 'ORDER-0000000001',
    gross_amount_minor: 10000, refund_amount_minor: 4000
  });
  assert.equal(partial.netRevenueMinor, 6000);
  assert.equal(partial.commissionAmountMinor, 600);
  assert.equal(partial.refundExceedsOrder, false);
  assert.equal(partial.bucket, 'unattributed');

  const full = buildDetailRow({
    order_id: 'order-2', provider: 'square', provider_order_id: 'ORDER-0000000002',
    gross_amount_minor: 10000, refund_amount_minor: 10000
  });
  assert.equal(full.netRevenueMinor, 0);
  assert.equal(full.commissionAmountMinor, 0);
  assert.equal(full.refundExceedsOrder, false);

  const excess = buildDetailRow({
    order_id: 'order-3', provider: 'square', provider_order_id: 'ORDER-0000000003',
    gross_amount_minor: 10000, refund_amount_minor: 15000
  });
  assert.equal(excess.netRevenueMinor, 0);
  assert.equal(excess.commissionAmountMinor, 0);
  assert.equal(excess.refundExceedsOrder, true);
}

// ---------------------------------------------------------------------------
// buildDetailRow: proof-tier buckets -- approved A, approved B, candidate B/C,
// and no-link rows. Rejected/unsupported combinations never reach this
// function because the SQL rank filter excludes them at the source.
// ---------------------------------------------------------------------------

{
  const provenAds = buildDetailRow({
    order_id: 'order-a', provider: 'square', provider_order_id: 'ORDER-A',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved',
    campaign_id: 'campaign-1', ad_group_id: 'adgroup-1', keyword: 'window tint', device: 'mobile',
    gclid: 'Cj0KCQjwABCDEFGHIJKLMNOP'
  });
  assert.equal(provenAds.bucket, 'provenAds');
  assert.equal(provenAds.proofTier, 'A');
  assert.equal(provenAds.campaignId, 'campaign-1');
  assert.notEqual(provenAds.clickReference, 'Cj0KCQjwABCDEFGHIJKLMNOP');

  const approvedB = buildDetailRow({
    order_id: 'order-b', provider: 'square', provider_order_id: 'ORDER-B',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'reviewed_match', proof_tier: 'B', link_status: 'approved'
  });
  assert.equal(approvedB.bucket, 'candidate');

  const candidateB = buildDetailRow({
    order_id: 'order-c', provider: 'square', provider_order_id: 'ORDER-C',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'reviewed_match', proof_tier: 'B', link_status: 'candidate'
  });
  assert.equal(candidateB.bucket, 'candidate');

  const candidateC = buildDetailRow({
    order_id: 'order-d', provider: 'square', provider_order_id: 'ORDER-D',
    gross_amount_minor: 50000, refund_amount_minor: 0,
    link_method: 'directional_match', proof_tier: 'C', link_status: 'candidate'
  });
  assert.equal(candidateC.bucket, 'candidate');

  const unattributed = buildDetailRow({
    order_id: 'order-e', provider: 'square', provider_order_id: 'ORDER-E',
    gross_amount_minor: 50000, refund_amount_minor: 0
  });
  assert.equal(unattributed.bucket, 'unattributed');
  assert.equal(unattributed.clickReference, 'unattributed');
  assert.equal(unattributed.proofTier, null);
}

// ---------------------------------------------------------------------------
// aggregateAttributedRevenue: buckets sum independently, no double counting
// ---------------------------------------------------------------------------

{
  const rows = [
    buildDetailRow({
      order_id: 'order-1', provider: 'square', provider_order_id: 'ORDER-1',
      gross_amount_minor: 10000, refund_amount_minor: 0,
      link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved'
    }),
    buildDetailRow({
      order_id: 'order-2', provider: 'square', provider_order_id: 'ORDER-2',
      gross_amount_minor: 20000, refund_amount_minor: 5000,
      link_method: 'directional_match', proof_tier: 'C', link_status: 'candidate'
    }),
    buildDetailRow({
      order_id: 'order-3', provider: 'square', provider_order_id: 'ORDER-3',
      gross_amount_minor: 30000, refund_amount_minor: 0
    })
  ];
  const { totals, buckets } = aggregateAttributedRevenue(rows);
  assert.equal(totals.orderCount, 3);
  assert.equal(totals.grossAmountMinor, 60000);
  assert.equal(totals.refundAmountMinor, 5000);
  assert.equal(totals.netRevenueMinor, 55000);
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
        order_id: 'order-1', provider: 'square', provider_order_id: 'ORDER-0000000001',
        gross_amount_minor: 10000, refund_amount_minor: 0
      }
    ];
  };

  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });
  assert.equal(capturedSql, ATTRIBUTED_REVENUE_SQL);
  assert.deepEqual(capturedParams, ['2026-08-04T07:00:00.000Z', '2026-08-13T07:00:00.000Z']);
  assert.equal(report.summary.totals.orderCount, 1);
  assert.equal(report.summary.totals.grossAmountMinor, 10000);
  assert.equal(report.rows.length, 1);

  await assert.rejects(runAttributedRevenueReport({ query: null, from: '2026-08-04', to: '2026-08-12' }), /query function/);
}

// ---------------------------------------------------------------------------
// Acceptance fixture (Aug 4-12): a synthetic 13-row completed-order fixture,
// run purely through the aggregation pipeline with a fake query function.
// These are test fixture values, never production totals.
// ---------------------------------------------------------------------------

{
  const fixtureRows = Array.from({ length: 13 }, (_, index) => ({
    order_id: `order-fixture-${index + 1}`,
    provider: 'square',
    provider_order_id: `ORDER-FIXTURE-${String(index + 1).padStart(4, '0')}`,
    gross_amount_minor: 62000,
    refund_amount_minor: 0
  }));
  const fakeQuery = async () => fixtureRows;
  const report = await runAttributedRevenueReport({ query: fakeQuery, from: '2026-08-04', to: '2026-08-12' });

  assert.equal(report.summary.totals.orderCount, 13);
  assert.equal(report.summary.totals.grossAmountMinor, 806000);
  assert.equal(report.summary.totals.refundAmountMinor, 0);
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
// formatReportTable / formatReportJson: masked output only
// ---------------------------------------------------------------------------

{
  const rows = [buildDetailRow({
    order_id: 'order-x', provider: 'square', provider_order_id: 'ORDER-RAW-SECRET-0001',
    gross_amount_minor: 10000, refund_amount_minor: 0,
    link_method: 'lead_intent_touch', proof_tier: 'A', link_status: 'approved',
    gclid: 'Cj0KCQjw-RAW-CLICK-ID-VALUE'
  })];
  const report = {
    from: '2026-08-04', to: '2026-08-12', timeZone: 'America/Los_Angeles',
    generatedRangeUtc: { start: '2026-08-04T07:00:00.000Z', end: '2026-08-13T07:00:00.000Z' },
    summary: aggregateAttributedRevenue(rows),
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
