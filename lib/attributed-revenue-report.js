const TIME_ZONE = 'America/Los_Angeles';
const COMMISSION_RATE_BASIS_POINTS = 1000;

// One canonical read-only query: at most one row per completed Square order.
//
// Ranking assumption: order-to-touch attribution links reuse the same
// entity_type/entity_id convention as lead-intent links (lib/lead-event-store.js) --
// entity_type = 'order' and entity_id = attribution_orders.order_id, the
// internal primary key, not the provider order ID. No application code writes
// this kind of link yet (see the design doc), so today every completed order
// resolves through the LEFT JOIN as unattributed; the query is ready for a
// future tranche that starts writing approved order links.
const ATTRIBUTED_REVENUE_SQL = `
WITH bounds AS (
  SELECT $1::timestamptz AS range_start, $2::timestamptz AS range_end
),
completed_orders AS (
  SELECT
    o.order_id,
    o.provider,
    o.provider_order_id,
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
    r.amount_minor
  FROM attribution_refunds r
  WHERE r.status = 'COMPLETED'
  ORDER BY r.provider, r.provider_refund_id, r.provider_updated_at DESC NULLS LAST
),
refund_orders AS (
  SELECT
    dr.provider,
    dr.amount_minor,
    COALESCE(dr.provider_order_id, po.resolved_provider_order_id) AS resolved_provider_order_id
  FROM completed_refunds dr
  LEFT JOIN payment_orders po
    ON po.provider = dr.provider AND po.provider_payment_id = dr.provider_payment_id
  WHERE COALESCE(dr.provider_order_id, po.resolved_provider_order_id) IS NOT NULL
),
refund_totals AS (
  SELECT
    provider,
    resolved_provider_order_id AS provider_order_id,
    SUM(amount_minor) AS refund_amount_minor
  FROM refund_orders
  GROUP BY provider, resolved_provider_order_id
),
ranked_links AS (
  SELECT
    l.entity_id AS order_id,
    l.method AS link_method,
    l.proof_tier,
    l.link_status,
    l.matched_at,
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
          WHEN l.link_status = 'candidate' AND l.proof_tier = 'C' THEN 4
          ELSE 5
        END ASC,
        l.matched_at DESC
    ) AS rank
  FROM attribution_links l
  LEFT JOIN attribution_touches t ON t.touch_id = l.touch_id
  WHERE l.entity_type = 'order'
    AND (
      (l.link_status = 'approved' AND l.proof_tier IN ('A', 'B'))
      OR (l.link_status = 'candidate' AND l.proof_tier IN ('B', 'C'))
    )
),
best_link AS (
  SELECT * FROM ranked_links WHERE rank = 1
)
SELECT
  co.order_id,
  co.provider,
  co.provider_order_id,
  co.gross_amount_minor,
  COALESCE(rt.refund_amount_minor, 0) AS refund_amount_minor,
  co.financial_at,
  bl.link_method,
  bl.proof_tier,
  bl.link_status,
  bl.campaign_id,
  bl.ad_group_id,
  bl.keyword,
  bl.device,
  bl.gclid,
  bl.gbraid,
  bl.wbraid
FROM completed_orders co
LEFT JOIN refund_totals rt
  ON rt.provider = co.provider AND rt.provider_order_id = co.provider_order_id
LEFT JOIN best_link bl
  ON bl.order_id = co.order_id
ORDER BY co.financial_at ASC, co.order_id ASC;
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

const bucketFor = (row) => {
  if (!row.link_method) return 'unattributed';
  if (row.link_status === 'approved' && row.proof_tier === 'A') return 'provenAds';
  return 'candidate';
};

const buildDetailRow = (row) => {
  const grossAmountMinor = Number(row.gross_amount_minor) || 0;
  const refundAmountMinor = Number(row.refund_amount_minor) || 0;
  const netRevenueMinor = Math.max(0, grossAmountMinor - refundAmountMinor);
  const bucket = bucketFor(row);
  const hasLink = bucket !== 'unattributed';

  return {
    orderReference: maskProviderOrderReference(row.provider_order_id),
    clickReference: maskClickReference(row),
    campaignId: hasLink ? row.campaign_id || null : null,
    adGroupId: hasLink ? row.ad_group_id || null : null,
    keyword: hasLink ? row.keyword || null : null,
    device: hasLink ? row.device || null : null,
    proofTier: hasLink ? row.proof_tier : null,
    linkMethod: hasLink ? row.link_method : null,
    bucket,
    grossAmountMinor,
    refundAmountMinor,
    netRevenueMinor,
    commissionAmountMinor: commissionMinor(netRevenueMinor),
    refundExceedsOrder: refundAmountMinor > grossAmountMinor
  };
};

const emptyBucketTotal = () => ({
  orderCount: 0,
  grossAmountMinor: 0,
  refundAmountMinor: 0,
  netRevenueMinor: 0,
  commissionAmountMinor: 0
});

const addRowToTotal = (total, row) => {
  total.orderCount += 1;
  total.grossAmountMinor += row.grossAmountMinor;
  total.refundAmountMinor += row.refundAmountMinor;
  total.netRevenueMinor += row.netRevenueMinor;
  total.commissionAmountMinor += row.commissionAmountMinor;
};

const aggregateAttributedRevenue = (detailRows) => {
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
  const rows = rowsFromResult(result).map(buildDetailRow);
  return {
    from,
    to,
    timeZone,
    generatedRangeUtc: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
    summary: aggregateAttributedRevenue(rows),
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

const formatMinorAsCurrency = (minor) => `$${(minor / 100).toFixed(2)}`;

const formatReportJson = (report) => JSON.stringify(report, null, 2);

const formatBucketLine = (label, bucket) =>
  `  ${label}: ${bucket.orderCount} orders, net ${formatMinorAsCurrency(bucket.netRevenueMinor)}, ` +
  `commission ${formatMinorAsCurrency(bucket.commissionAmountMinor)}`;

const formatReportTable = (report) => {
  const { totals, buckets } = report.summary;
  const lines = [];
  lines.push(`Attributed revenue report: ${report.from} to ${report.to} (${report.timeZone})`);
  lines.push('');
  lines.push('Summary:');
  lines.push(`  Completed orders: ${totals.orderCount}`);
  lines.push(`  Gross revenue: ${formatMinorAsCurrency(totals.grossAmountMinor)}`);
  lines.push(`  Refunds: ${formatMinorAsCurrency(totals.refundAmountMinor)}`);
  lines.push(`  Net revenue: ${formatMinorAsCurrency(totals.netRevenueMinor)}`);
  lines.push(`  Business-wide commission (10%): ${formatMinorAsCurrency(totals.commissionAmountMinor)}`);
  lines.push(formatBucketLine('provenAds', buckets.provenAds));
  lines.push(formatBucketLine('candidate', buckets.candidate));
  lines.push(formatBucketLine('unattributed', buckets.unattributed));
  lines.push('');
  lines.push('Detail:');
  for (const row of report.rows) {
    lines.push(
      `  ${row.orderReference} | ${row.bucket} | tier=${row.proofTier || '-'} | ` +
      `gross=${formatMinorAsCurrency(row.grossAmountMinor)} | refund=${formatMinorAsCurrency(row.refundAmountMinor)} | ` +
      `net=${formatMinorAsCurrency(row.netRevenueMinor)} | commission=${formatMinorAsCurrency(row.commissionAmountMinor)} | ` +
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
