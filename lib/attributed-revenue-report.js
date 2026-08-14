const TIME_ZONE = 'America/Los_Angeles';
const COMMISSION_RATE_BASIS_POINTS = 1000;

// One canonical read-only query: at most one row per completed Square order,
// plus exactly one report-metadata row (row_type = 'meta') carrying anomaly
// totals that must survive even when zero completed orders exist in range.
//
// Ranking assumption: order-to-touch attribution links reuse the same
// entity_type/entity_id convention as lead-intent links (lib/lead-event-store.js) --
// entity_type = 'order' and entity_id = attribution_orders.order_id, the
// internal primary key, not the provider order ID. No application code writes
// this kind of link yet (see the design doc), so today every completed order
// resolves through the LEFT JOIN as unattributed; the query is ready for a
// future tranche that starts writing approved order links.
//
// NOTE: This query is validated only by the static-shape (regex) assertions
// in scripts/test-attributed-revenue-report.mjs. Those assertions prove the
// query TEXT has the expected joins/columns/predicates; they do not execute
// the SQL against PostgreSQL and cannot catch a syntax error, a wrong join
// key, or an accidental cross join. Live PostgreSQL execution against
// migrated fixtures remains an explicit Task 7/8 gate -- do not treat a
// passing regex as proof this query runs correctly.
const ATTRIBUTED_REVENUE_SQL = `
WITH bounds AS (
  SELECT $1::timestamptz AS range_start, $2::timestamptz AS range_end
),
completed_orders AS (
  SELECT
    o.order_id,
    o.provider,
    o.provider_order_id,
    o.currency,
    o.amount_minor AS gross_amount_minor,
    COALESCE(o.closed_at, o.provider_updated_at, o.provider_created_at) AS financial_at
  FROM attribution_orders o, bounds b
  WHERE o.state = 'COMPLETED'
    AND COALESCE(o.closed_at, o.provider_updated_at, o.provider_created_at) >= b.range_start
    AND COALESCE(o.closed_at, o.provider_updated_at, o.provider_created_at) < b.range_end
),
payment_orders AS (
  SELECT
    p.provider,
    p.provider_payment_id,
    COALESCE(p.provider_order_id, p.metadata ->> 'provider_order_id') AS resolved_provider_order_id
  FROM attribution_payments p
),
completed_refunds AS (
  SELECT DISTINCT ON (r.provider, r.provider_refund_id)
    r.provider,
    r.provider_refund_id,
    r.provider_order_id,
    r.provider_payment_id,
    r.currency,
    r.amount_minor
  FROM attribution_refunds r
  WHERE r.status = 'COMPLETED'
  ORDER BY r.provider, r.provider_refund_id, r.provider_updated_at DESC NULLS LAST
),
refund_orders AS (
  SELECT
    dr.provider,
    dr.currency,
    dr.amount_minor,
    COALESCE(dr.provider_order_id, po.resolved_provider_order_id) AS resolved_provider_order_id
  FROM completed_refunds dr
  LEFT JOIN payment_orders po
    ON po.provider = dr.provider AND po.provider_payment_id = dr.provider_payment_id
),
-- Completed refunds that resolve to no provider order at all (neither a
-- direct provider_order_id nor a payment -> order fallback). These would
-- otherwise vanish with no trace; surfaced as a report-level anomaly instead
-- of being silently subtracted from nothing. This is independent of
-- currency: a refund resolved to a real order id but a mismatched currency
-- is excluded from that order's total by the currency-scoped join below,
-- not counted here, because it did resolve to a real order.
unresolved_refunds AS (
  SELECT
    COUNT(*) AS unresolved_refund_count,
    COALESCE(SUM(amount_minor), 0) AS unresolved_refund_amount_minor
  FROM refund_orders
  WHERE resolved_provider_order_id IS NULL
),
refund_totals AS (
  SELECT
    provider,
    resolved_provider_order_id AS provider_order_id,
    currency,
    SUM(amount_minor) AS refund_amount_minor
  FROM refund_orders
  WHERE resolved_provider_order_id IS NOT NULL
  GROUP BY provider, resolved_provider_order_id, currency
),
ranked_links AS (
  SELECT
    l.attribution_link_id,
    l.entity_id AS order_id,
    l.method AS link_method,
    l.proof_tier,
    l.link_status,
    l.matched_at,
    l.touch_id,
    t.campaign_id,
    t.ad_group_id,
    t.keyword,
    t.device,
    t.gclid,
    t.gbraid,
    t.wbraid,
    ROW_NUMBER() OVER (
      PARTITION BY l.entity_id
      ORDER BY
        CASE
          WHEN l.link_status = 'approved' AND l.proof_tier = 'A' THEN 1
          WHEN l.link_status = 'approved' AND l.proof_tier = 'B' THEN 2
          WHEN l.link_status = 'candidate' AND l.proof_tier = 'B' THEN 3
          WHEN l.proof_tier = 'C' THEN 4
          ELSE 5
        END ASC,
        l.matched_at DESC,
        l.attribution_link_id ASC
    ) AS rank
  FROM attribution_links l
  LEFT JOIN attribution_touches t ON t.touch_id = l.touch_id
  WHERE l.entity_type = 'order'
    AND (
      (l.link_status = 'approved' AND l.proof_tier IN ('A', 'B', 'C'))
      OR (l.link_status = 'candidate' AND l.proof_tier IN ('B', 'C'))
    )
),
best_link AS (
  SELECT * FROM ranked_links WHERE rank = 1
)
SELECT
  'order' AS row_type,
  co.order_id,
  co.provider,
  co.provider_order_id,
  co.currency,
  co.gross_amount_minor,
  COALESCE(rt.refund_amount_minor, 0) AS refund_amount_minor,
  co.financial_at,
  bl.link_method,
  bl.proof_tier,
  bl.link_status,
  bl.touch_id,
  bl.campaign_id,
  bl.ad_group_id,
  bl.keyword,
  bl.device,
  bl.gclid,
  bl.gbraid,
  bl.wbraid,
  NULL::bigint AS unresolved_refund_count,
  NULL::bigint AS unresolved_refund_amount_minor
FROM completed_orders co
LEFT JOIN refund_totals rt
  ON rt.provider = co.provider AND rt.provider_order_id = co.provider_order_id AND rt.currency = co.currency
LEFT JOIN best_link bl
  ON bl.order_id = co.order_id

UNION ALL

-- Report-metadata row: unresolved_refunds is an unconditional aggregate
-- (COUNT/SUM with no GROUP BY always yields exactly one row), so this row
-- is present even when completed_orders is empty. This is the documented
-- safe shape for surfacing anomaly totals without turning them into a
-- financial order row -- row_type = 'meta' rows must never be aggregated
-- as revenue and must be filtered out before any financial summation.
SELECT
  'meta' AS row_type,
  NULL::text AS order_id,
  NULL::text AS provider,
  NULL::text AS provider_order_id,
  NULL::text AS currency,
  NULL::integer AS gross_amount_minor,
  NULL::bigint AS refund_amount_minor,
  NULL::timestamptz AS financial_at,
  NULL::text AS link_method,
  NULL::text AS proof_tier,
  NULL::text AS link_status,
  NULL::text AS touch_id,
  NULL::text AS campaign_id,
  NULL::text AS ad_group_id,
  NULL::text AS keyword,
  NULL::text AS device,
  NULL::text AS gclid,
  NULL::text AS gbraid,
  NULL::text AS wbraid,
  ur.unresolved_refund_count,
  ur.unresolved_refund_amount_minor
FROM unresolved_refunds ur

ORDER BY row_type ASC, financial_at ASC, order_id ASC;
`;

class ReportUsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReportUsageError';
    this.safeToDisplay = true;
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidCalendarDate = (value) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const timeZoneOffsetMs = (utcInstant, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(utcInstant).reduce((accumulator, part) => {
    if (part.type !== 'literal') accumulator[part.type] = part.value;
    return accumulator;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
  return asUtc - utcInstant.getTime();
};

// Fixed-point offset lookup: the local wall-clock instant is found by
// re-deriving the zone offset at an increasingly accurate guess. Two passes
// are sufficient outside the handful of hours spanning a DST transition.
const startOfLocalDayUtc = (dateStr, timeZone) => {
  const naiveUtc = new Date(`${dateStr}T00:00:00.000Z`);
  const firstPassOffset = timeZoneOffsetMs(naiveUtc, timeZone);
  const firstPass = new Date(naiveUtc.getTime() - firstPassOffset);
  const secondPassOffset = timeZoneOffsetMs(firstPass, timeZone);
  return new Date(naiveUtc.getTime() - secondPassOffset);
};

const addCalendarDays = (dateStr, days) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const localDateRangeToUtcBounds = (fromDate, toDate, timeZone = TIME_ZONE) => {
  if (!isValidCalendarDate(fromDate) || !isValidCalendarDate(toDate)) {
    throw new Error('Invalid date range');
  }
  return {
    rangeStart: startOfLocalDayUtc(fromDate, timeZone),
    rangeEnd: startOfLocalDayUtc(addCalendarDays(toDate, 1), timeZone)
  };
};

const roundHalfUp = (numerator, denominator) => {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator <= 0) {
    throw new Error('roundHalfUp requires an integer numerator and a positive integer denominator');
  }
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
};

const commissionMinor = (netRevenueMinor, rateBasisPoints = COMMISSION_RATE_BASIS_POINTS) => {
  if (!Number.isInteger(netRevenueMinor) || netRevenueMinor < 0) {
    throw new Error('commissionMinor requires a non-negative integer net revenue');
  }
  return roundHalfUp(netRevenueMinor * rateBasisPoints, 10000);
};

const maskValue = (value, { visibleChars = 4 } = {}) => {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value);
  if (str.length <= visibleChars) return '*'.repeat(str.length);
  return `${'*'.repeat(str.length - visibleChars)}${str.slice(-visibleChars)}`;
};

const maskProviderOrderReference = (providerOrderId) => maskValue(providerOrderId);

const maskClickReference = (row) => {
  const clickId = (row && (row.gclid || row.gbraid || row.wbraid)) || null;
  if (!clickId) return 'unattributed';
  return maskValue(clickId);
};

const BUCKET_KEYS = ['provenAds', 'candidate', 'unattributed'];

// provenAds requires all four: approved status, Tier A, a resolved touch_id
// on the link itself, and at least one actual click ID from the joined
// touch. A link can have a non-null touch_id yet still fail to join a touch
// row (e.g. the referenced touch was pruned), which is exactly the case
// this must not count as proven -- hence checking row.touch_id AND a click
// ID separately rather than inferring one from the other.
const bucketFor = (row) => {
  if (!row.link_method) return 'unattributed';
  const hasClickId = Boolean(row.gclid || row.gbraid || row.wbraid);
  const isProvenAds = row.link_status === 'approved'
    && row.proof_tier === 'A'
    && Boolean(row.touch_id)
    && hasClickId;
  return isProvenAds ? 'provenAds' : 'candidate';
};

const buildDetailRow = (row) => {
  if (!row.currency) {
    throw new Error('buildDetailRow requires a currency for every completed-order row');
  }
  const grossAmountMinor = Number(row.gross_amount_minor) || 0;
  const rawRefundAmountMinor = Number(row.refund_amount_minor) || 0;
  const appliedRefundAmountMinor = Math.min(grossAmountMinor, rawRefundAmountMinor);
  const excessRefundAmountMinor = rawRefundAmountMinor - appliedRefundAmountMinor;
  const netRevenueMinor = grossAmountMinor - appliedRefundAmountMinor;
  const bucket = bucketFor(row);
  const hasLink = bucket !== 'unattributed';

  return {
    orderReference: maskProviderOrderReference(row.provider_order_id),
    clickReference: maskClickReference(row),
    currency: row.currency,
    campaignId: hasLink ? row.campaign_id || null : null,
    adGroupId: hasLink ? row.ad_group_id || null : null,
    keyword: hasLink ? row.keyword || null : null,
    device: hasLink ? row.device || null : null,
    proofTier: hasLink ? row.proof_tier : null,
    linkMethod: hasLink ? row.link_method : null,
    bucket,
    grossAmountMinor,
    rawRefundAmountMinor,
    appliedRefundAmountMinor,
    excessRefundAmountMinor,
    netRevenueMinor,
    commissionAmountMinor: commissionMinor(netRevenueMinor),
    refundExceedsOrder: rawRefundAmountMinor > grossAmountMinor
  };
};

const emptyBucketTotal = () => ({
  orderCount: 0,
  grossAmountMinor: 0,
  rawRefundAmountMinor: 0,
  appliedRefundAmountMinor: 0,
  excessRefundAmountMinor: 0,
  netRevenueMinor: 0,
  commissionAmountMinor: 0
});

const addRowToTotal = (total, row) => {
  total.orderCount += 1;
  total.grossAmountMinor += row.grossAmountMinor;
  total.rawRefundAmountMinor += row.rawRefundAmountMinor;
  total.appliedRefundAmountMinor += row.appliedRefundAmountMinor;
  total.excessRefundAmountMinor += row.excessRefundAmountMinor;
  total.netRevenueMinor += row.netRevenueMinor;
  total.commissionAmountMinor += row.commissionAmountMinor;
};

// Fails closed rather than silently summing unlike currencies under one
// label: every detail row must share a single currency before any totals
// are produced. The Square business operates in USD today, so this only
// ever fires as a defensive guard against a future multi-currency provider.
const aggregateAttributedRevenue = (detailRows) => {
  const currencies = [...new Set(detailRows.map((row) => row.currency).filter(Boolean))].sort();
  if (currencies.length > 1) {
    throw new Error(`Unsupported mixed-currency aggregation: found currencies ${currencies.join(', ')}`);
  }

  const totals = emptyBucketTotal();
  const buckets = BUCKET_KEYS.reduce((accumulator, key) => {
    accumulator[key] = emptyBucketTotal();
    return accumulator;
  }, {});

  for (const row of detailRows) {
    addRowToTotal(totals, row);
    addRowToTotal(buckets[row.bucket], row);
  }

  return { totals, buckets };
};

const rowsFromResult = (result) => {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
};

const runAttributedRevenueReport = async ({ query, from, to, timeZone = TIME_ZONE }) => {
  if (typeof query !== 'function') throw new Error('A database query function is required');
  const { rangeStart, rangeEnd } = localDateRangeToUtcBounds(from, to, timeZone);
  const result = await query(ATTRIBUTED_REVENUE_SQL, [rangeStart.toISOString(), rangeEnd.toISOString()]);
  const allRows = rowsFromResult(result);
  // The meta row's anomaly totals are scalar and identical on every copy
  // the query could in principle emit; take the first and ignore the rest
  // rather than re-summing (re-summing would multiply a scalar by row count).
  const metaRow = allRows.find((row) => row.row_type === 'meta') || null;
  const rows = allRows.filter((row) => row.row_type !== 'meta').map(buildDetailRow);
  const unresolvedRefunds = {
    count: metaRow ? Number(metaRow.unresolved_refund_count) || 0 : 0,
    amountMinor: metaRow ? Number(metaRow.unresolved_refund_amount_minor) || 0 : 0
  };

  return {
    from,
    to,
    timeZone,
    currency: rows.length ? rows[0].currency : null,
    generatedRangeUtc: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
    summary: aggregateAttributedRevenue(rows),
    anomalies: { unresolvedRefunds },
    rows
  };
};

const createAttributedRevenueReport = ({ query }) => {
  if (typeof query !== 'function') throw new Error('A database query function is required');
  return {
    run: (options) => runAttributedRevenueReport({ query, ...options })
  };
};

const createNeonAttributedRevenueReport = (connectionString) => {
  if (!connectionString) {
    const error = new Error('DATABASE_URL is not configured');
    error.code = 'storage_not_configured';
    throw error;
  }
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(connectionString);
  return createAttributedRevenueReport({ query: (queryText, params) => sql.query(queryText, params) });
};

const SUPPORTED_FLAGS = new Set(['--from', '--to', '--format']);
const SUPPORTED_FORMATS = new Set(['table', 'json']);

const parseReportArgs = (argv) => {
  const parsed = { format: 'table' };
  for (const arg of argv) {
    const equalsIndex = arg.indexOf('=');
    if (!arg.startsWith('--') || equalsIndex === -1) {
      throw new ReportUsageError('Unknown argument');
    }
    const flag = arg.slice(0, equalsIndex);
    const value = arg.slice(equalsIndex + 1);
    if (!SUPPORTED_FLAGS.has(flag)) throw new ReportUsageError('Unknown argument');
    if (flag === '--from') parsed.from = value;
    if (flag === '--to') parsed.to = value;
    if (flag === '--format') parsed.format = value;
  }
  if (!parsed.from || !isValidCalendarDate(parsed.from)) throw new ReportUsageError('Invalid --from date');
  if (!parsed.to || !isValidCalendarDate(parsed.to)) throw new ReportUsageError('Invalid --to date');
  if (parsed.from > parsed.to) throw new ReportUsageError('--from must not be after --to');
  if (!SUPPORTED_FORMATS.has(parsed.format)) throw new ReportUsageError('Invalid --format value');
  return parsed;
};

const formatMinorAsCurrency = (minor, currency = 'USD') => {
  const amount = (minor / 100).toFixed(2);
  return currency === 'USD' ? `$${amount}` : `${amount} ${currency}`;
};

const formatReportJson = (report) => JSON.stringify(report, null, 2);

const formatBucketLine = (label, bucket, currency) =>
  `  ${label}: ${bucket.orderCount} orders, net ${formatMinorAsCurrency(bucket.netRevenueMinor, currency)}, ` +
  `commission ${formatMinorAsCurrency(bucket.commissionAmountMinor, currency)}`;

const formatReportTable = (report) => {
  const { totals, buckets } = report.summary;
  const currency = report.currency || 'USD';
  const lines = [];
  lines.push(`Attributed revenue report: ${report.from} to ${report.to} (${report.timeZone})`);
  lines.push(`Currency: ${currency}`);
  lines.push('');
  lines.push('Summary:');
  lines.push(`  Completed orders: ${totals.orderCount}`);
  lines.push(`  Gross revenue: ${formatMinorAsCurrency(totals.grossAmountMinor, currency)}`);
  lines.push(`  Refunds, raw completed total (audit): ${formatMinorAsCurrency(totals.rawRefundAmountMinor, currency)}`);
  lines.push(`  Refunds applied (capped at order gross): ${formatMinorAsCurrency(totals.appliedRefundAmountMinor, currency)}`);
  lines.push(`  Refunds in excess of order gross: ${formatMinorAsCurrency(totals.excessRefundAmountMinor, currency)}`);
  lines.push(`  Net revenue (gross - applied refunds): ${formatMinorAsCurrency(totals.netRevenueMinor, currency)}`);
  lines.push(`  Business-wide commission (10%): ${formatMinorAsCurrency(totals.commissionAmountMinor, currency)}`);
  lines.push(formatBucketLine('provenAds', buckets.provenAds, currency));
  lines.push(formatBucketLine('candidate', buckets.candidate, currency));
  lines.push(formatBucketLine('unattributed', buckets.unattributed, currency));
  lines.push('');
  lines.push('Anomalies:');
  lines.push(
    `  Unresolved completed refunds (no matching provider order): ` +
    `${report.anomalies.unresolvedRefunds.count} refunds, ` +
    `${formatMinorAsCurrency(report.anomalies.unresolvedRefunds.amountMinor, currency)}`
  );
  lines.push('');
  lines.push('Detail:');
  for (const row of report.rows) {
    lines.push(
      `  ${row.orderReference} | ${row.bucket} | tier=${row.proofTier || '-'} | ` +
      `gross=${formatMinorAsCurrency(row.grossAmountMinor, currency)} | ` +
      `refund_raw=${formatMinorAsCurrency(row.rawRefundAmountMinor, currency)} | ` +
      `refund_applied=${formatMinorAsCurrency(row.appliedRefundAmountMinor, currency)} | ` +
      `refund_excess=${formatMinorAsCurrency(row.excessRefundAmountMinor, currency)} | ` +
      `net=${formatMinorAsCurrency(row.netRevenueMinor, currency)} | commission=${formatMinorAsCurrency(row.commissionAmountMinor, currency)} | ` +
      `campaign=${row.campaignId || '-'} | ad_group=${row.adGroupId || '-'} | keyword=${row.keyword || '-'} | ` +
      `device=${row.device || '-'} | click=${row.clickReference}` +
      (row.refundExceedsOrder ? ' | refund_exceeds_order' : '')
    );
  }
  return lines.join('\n');
};

module.exports = {
  TIME_ZONE,
  COMMISSION_RATE_BASIS_POINTS,
  ATTRIBUTED_REVENUE_SQL,
  ReportUsageError,
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
  createAttributedRevenueReport,
  createNeonAttributedRevenueReport,
  parseReportArgs,
  formatReportTable,
  formatReportJson
};
