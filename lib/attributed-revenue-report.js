const TIME_ZONE = 'America/Los_Angeles';
const COMMISSION_RATE_BASIS_POINTS = 1000;

// One canonical read-only query: at most one row per completed Square order
// (row_type = 'order'), plus zero or more anomaly rows (row_type = 'anomaly')
// carrying refund anomaly totals grouped by (anomaly_type, currency). Anomaly
// rows must survive even when zero completed orders exist in range, and must
// never be summed across currencies -- each row is scoped to exactly one
// currency, so mixed-currency refund anomalies always surface as separate
// rows rather than one misleading scalar.
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
    r.amount_minor,
    COALESCE(r.provider_updated_at, r.provider_created_at) AS refund_financial_at
  FROM attribution_refunds r
  WHERE r.status = 'COMPLETED'
  ORDER BY r.provider, r.provider_refund_id, r.provider_updated_at DESC NULLS LAST
),
refund_orders AS (
  SELECT
    dr.provider,
    dr.currency,
    dr.amount_minor,
    dr.refund_financial_at,
    COALESCE(dr.provider_order_id, po.resolved_provider_order_id) AS resolved_provider_order_id
  FROM completed_refunds dr
  LEFT JOIN payment_orders po
    ON po.provider = dr.provider AND po.provider_payment_id = dr.provider_payment_id
),
-- Classifies every completed refund against the in-range completed-order
-- cohort so the three anomaly CTEs below can each select their own slice:
-- matched_order_id/matched_order_currency are non-NULL only when the
-- refund's resolved provider order id lines up with an in-range completed
-- order (regardless of whether the currency also matches).
refund_classified AS (
  SELECT
    ro.provider,
    ro.currency,
    ro.amount_minor,
    ro.refund_financial_at,
    ro.resolved_provider_order_id,
    co.order_id AS matched_order_id,
    co.currency AS matched_order_currency
  FROM refund_orders ro
  LEFT JOIN completed_orders co
    ON co.provider = ro.provider AND co.provider_order_id = ro.resolved_provider_order_id
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
-- Anomaly 1: the refund resolves to a real order in the selected completed-
-- order cohort, but its currency does not match that order's currency. It
-- is never applied to the order (the currency-scoped join below excludes
-- it) and must not vanish -- it is in scope unconditionally because it is
-- tied to an order that is already in this report, independent of the
-- refund's own timestamp.
anomaly_currency_mismatch AS (
  SELECT
    'currency_mismatch' AS anomaly_type,
    rc.currency AS anomaly_currency,
    COUNT(*) AS anomaly_count,
    COALESCE(SUM(rc.amount_minor), 0) AS anomaly_amount_minor
  FROM refund_classified rc
  WHERE rc.matched_order_id IS NOT NULL
    AND rc.currency <> rc.matched_order_currency
  GROUP BY rc.currency
),
-- Anomaly 2: the refund resolves to a provider order id, but that id does
-- not match any in-range completed order (different lifecycle state,
-- outside the date range, or simply unknown). It must never alter in-range
-- order revenue, and it is only in scope when its own financial timestamp
-- falls inside the report bounds -- otherwise every report would keep
-- re-surfacing the same historical backlog forever.
anomaly_order_not_in_report AS (
  SELECT
    'order_not_in_report' AS anomaly_type,
    rc.currency AS anomaly_currency,
    COUNT(*) AS anomaly_count,
    COALESCE(SUM(rc.amount_minor), 0) AS anomaly_amount_minor
  FROM refund_classified rc, bounds b
  WHERE rc.resolved_provider_order_id IS NOT NULL
    AND rc.matched_order_id IS NULL
    AND rc.refund_financial_at IS NOT NULL
    AND rc.refund_financial_at >= b.range_start
    AND rc.refund_financial_at < b.range_end
  GROUP BY rc.currency
),
-- Anomaly 3: the refund resolves to no provider order at all (neither a
-- direct provider_order_id nor a payment -> order fallback). Scoped by its
-- own financial timestamp for the same reason as anomaly 2.
anomaly_unresolved AS (
  SELECT
    'unresolved' AS anomaly_type,
    rc.currency AS anomaly_currency,
    COUNT(*) AS anomaly_count,
    COALESCE(SUM(rc.amount_minor), 0) AS anomaly_amount_minor
  FROM refund_classified rc, bounds b
  WHERE rc.resolved_provider_order_id IS NULL
    AND rc.refund_financial_at IS NOT NULL
    AND rc.refund_financial_at >= b.range_start
    AND rc.refund_financial_at < b.range_end
  GROUP BY rc.currency
),
-- Anomaly 4: the refund resolves to no in-range order (matched_order_id IS
-- NULL, the same precondition as anomaly 2 and 3 combined) and its own
-- financial timestamp is NULL -- both provider_updated_at and
-- provider_created_at are missing or unparseable at the source. Without this
-- branch such a refund would satisfy neither anomaly 2's nor anomaly 3's
-- date-bound predicate (NULL >= / < anything is NULL, never TRUE) and would
-- vanish from every report for every date range, forever. This is
-- deliberately unconditional on the report's bounds: a missing timestamp is
-- a data-quality fact about the refund's source record, not a fact about
-- the selected range, so every report surfaces the full backlog rather than
-- falsely scoping a global problem to whichever range happens to be
-- requested. It never changes order revenue or commission -- matched_order_id
-- IS NULL means it was never a candidate for application to any order.
anomaly_missing_timestamp AS (
  SELECT
    'missing_timestamp' AS anomaly_type,
    rc.currency AS anomaly_currency,
    COUNT(*) AS anomaly_count,
    COALESCE(SUM(rc.amount_minor), 0) AS anomaly_amount_minor
  FROM refund_classified rc
  WHERE rc.matched_order_id IS NULL
    AND rc.refund_financial_at IS NULL
  GROUP BY rc.currency
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
  NULL::text AS anomaly_type,
  NULL::text AS anomaly_currency,
  NULL::bigint AS anomaly_count,
  NULL::bigint AS anomaly_amount_minor
FROM completed_orders co
LEFT JOIN refund_totals rt
  ON rt.provider = co.provider AND rt.provider_order_id = co.provider_order_id AND rt.currency = co.currency
LEFT JOIN best_link bl
  ON bl.order_id = co.order_id

UNION ALL

-- Anomaly rows: each of the three anomaly CTEs is already grouped by
-- currency, so this yields zero or more rows per anomaly type -- never one
-- scalar total mixing unlike currencies. row_type = 'anomaly' rows must
-- never be aggregated as revenue and must be filtered out before any
-- financial summation.
SELECT
  'anomaly' AS row_type,
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
  anomaly_type,
  anomaly_currency,
  anomaly_count,
  anomaly_amount_minor
FROM anomaly_currency_mismatch

UNION ALL

SELECT
  'anomaly' AS row_type,
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
  anomaly_type,
  anomaly_currency,
  anomaly_count,
  anomaly_amount_minor
FROM anomaly_order_not_in_report

UNION ALL

SELECT
  'anomaly' AS row_type,
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
  anomaly_type,
  anomaly_currency,
  anomaly_count,
  anomaly_amount_minor
FROM anomaly_unresolved

UNION ALL

SELECT
  'anomaly' AS row_type,
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
  anomaly_type,
  anomaly_currency,
  anomaly_count,
  anomaly_amount_minor
FROM anomaly_missing_timestamp

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
//
// An approved Tier A link that fails the touch/click check is NOT a Tier
// B/C candidate -- Tier A is not "reviewed strong match" or "directional"
// evidence, it is deterministic evidence with a missing/unresolved touch.
// Printing it as `candidate` while buildDetailRow still reports `tier=A`
// would read as a contradiction (a Tier A row that isn't proven yet sits in
// the candidate bucket meant for B/C). It falls through to `unattributed`
// instead; candidate totals are reserved for the actual Tier B/C states the
// ranked_links CTE selects (`approved`+B/C, `candidate`+B/C).
const bucketFor = (row) => {
  if (!row.link_method) return 'unattributed';
  const hasClickId = Boolean(row.gclid || row.gbraid || row.wbraid);
  const isProvenAds = row.link_status === 'approved'
    && row.proof_tier === 'A'
    && Boolean(row.touch_id)
    && hasClickId;
  if (isProvenAds) return 'provenAds';
  if (row.proof_tier === 'A') return 'unattributed';
  return 'candidate';
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

const ANOMALY_TYPE_KEYS = {
  currency_mismatch: 'currencyMismatch',
  order_not_in_report: 'orderNotInReport',
  unresolved: 'unresolvedRefunds',
  missing_timestamp: 'missingTimestamp'
};

// Sorts anomaly entries within one anomaly type by currency so
// formatReportJson/formatReportTable produce stable output across runs over
// unchanged data -- the outer SQL's ORDER BY leaves anomaly rows mutually
// unordered (row_type, financial_at, order_id are identical/NULL across all
// anomaly rows), so this is the only thing keeping anomaly output
// deterministic. Guarded against a non-string currency: every anomaly row is
// grouped by a NOT NULL currency column, so this should never happen, but a
// comparator that throws on an unexpected shape would turn a data surprise
// into a report-generation crash, which is worse than a merely imperfect
// sort position.
const compareAnomalyEntriesByCurrency = (a, b) => {
  const currencyA = typeof a.currency === 'string' ? a.currency : '';
  const currencyB = typeof b.currency === 'string' ? b.currency : '';
  return currencyA.localeCompare(currencyB);
};

// Anomaly rows are already grouped by (anomaly_type, currency) in SQL, so
// this never sums unlike currencies -- each anomaly type surfaces as an
// array with one entry per currency actually present, not one scalar. Fails
// closed on an anomaly_type this module doesn't recognize rather than
// silently discarding it: an unrecognized anomaly_type means either a schema
// drift between this module and the SQL, or a future anomaly class the SQL
// started emitting that this module was never taught to format -- and
// refund anomalies must never vanish, including when the cause is a bug
// here rather than in the SQL.
const groupAnomalyRows = (anomalyRows) => {
  const grouped = {};
  for (const key of Object.values(ANOMALY_TYPE_KEYS)) grouped[key] = [];
  for (const row of anomalyRows) {
    const key = ANOMALY_TYPE_KEYS[row.anomaly_type];
    if (!key) {
      throw new Error(`Unrecognized anomaly_type from attributed revenue query: ${row.anomaly_type}`);
    }
    grouped[key].push({
      currency: row.anomaly_currency,
      count: Number(row.anomaly_count) || 0,
      amountMinor: Number(row.anomaly_amount_minor) || 0
    });
  }
  for (const key of Object.values(ANOMALY_TYPE_KEYS)) {
    grouped[key].sort(compareAnomalyEntriesByCurrency);
  }
  return grouped;
};

const KNOWN_ROW_TYPES = new Set(['order', 'anomaly']);

const runAttributedRevenueReport = async ({ query, from, to, timeZone = TIME_ZONE }) => {
  if (typeof query !== 'function') throw new Error('A database query function is required');
  const { rangeStart, rangeEnd } = localDateRangeToUtcBounds(from, to, timeZone);
  const result = await query(ATTRIBUTED_REVENUE_SQL, [rangeStart.toISOString(), rangeEnd.toISOString()]);
  const allRows = rowsFromResult(result);
  // Fail closed on an unrecognized row_type rather than silently dropping
  // it: a row that is neither 'order' nor 'anomaly' would otherwise vanish
  // from both the revenue detail rows and the anomaly totals without trace.
  for (const row of allRows) {
    if (!KNOWN_ROW_TYPES.has(row.row_type)) {
      throw new Error(`Unrecognized row_type from attributed revenue query: ${row.row_type}`);
    }
  }
  const rows = allRows.filter((row) => row.row_type === 'order').map(buildDetailRow);
  const anomalies = groupAnomalyRows(allRows.filter((row) => row.row_type === 'anomaly'));

  return {
    from,
    to,
    timeZone,
    currency: rows.length ? rows[0].currency : null,
    generatedRangeUtc: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() },
    summary: aggregateAttributedRevenue(rows),
    anomalies,
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

// currency may be null (no order rows to read a currency from -- must never
// be guessed as USD); in that case the amount is printed with no currency
// symbol or code, since no currency claim can be supported.
const formatMinorAsCurrency = (minor, currency) => {
  const amount = (minor / 100).toFixed(2);
  if (!currency) return amount;
  return currency === 'USD' ? `$${amount}` : `${amount} ${currency}`;
};

const formatReportJson = (report) => JSON.stringify(report, null, 2);

const formatBucketLine = (label, bucket, currency) =>
  `  ${label}: ${bucket.orderCount} orders, net ${formatMinorAsCurrency(bucket.netRevenueMinor, currency)}, ` +
  `commission ${formatMinorAsCurrency(bucket.commissionAmountMinor, currency)}`;

// Every anomaly entry carries its own explicit currency (grouped in SQL),
// so it is always formatted with that currency -- never the order report's
// currency, which may not even exist for a zero-order report.
const formatAnomalyLines = (label, entries) => {
  if (!entries.length) return [`  ${label}: none`];
  return entries.map((entry) =>
    `  ${label} (${entry.currency}): ${entry.count} refunds, ${formatMinorAsCurrency(entry.amountMinor, entry.currency)}`
  );
};

const formatReportTable = (report) => {
  const { totals, buckets } = report.summary;
  const currency = report.currency;
  const lines = [];
  lines.push(`Attributed revenue report: ${report.from} to ${report.to} (${report.timeZone})`);
  lines.push(`Currency: ${currency || 'n/a (no completed orders in range)'}`);
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
  lines.push(...formatAnomalyLines(
    'Currency mismatch (resolved to an in-range order, different currency, not applied)',
    report.anomalies.currencyMismatch
  ));
  lines.push(...formatAnomalyLines(
    'Resolved order outside this report',
    report.anomalies.orderNotInReport
  ));
  lines.push(...formatAnomalyLines(
    'Unresolved completed refunds (no matching provider order)',
    report.anomalies.unresolvedRefunds
  ));
  lines.push(...formatAnomalyLines(
    'Missing refund timestamp (cannot be dated -- global data quality, not scoped to this date range)',
    report.anomalies.missingTimestamp
  ));
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

// The CLI must echo only messages known to be secret-safe: our own
// validation errors (ReportUsageError, marked safeToDisplay) and the fixed
// "DATABASE_URL is not configured" message. Anything else -- including a
// driver/query failure that could embed a connection string, or an internal
// invariant violation like an unrecognized row_type -- collapses to a
// generic message so no secret ever reaches stderr. Exported (rather than
// kept inline in scripts/report-attributed-revenue.mjs) so this exact
// collapsing behavior is directly testable without spawning a subprocess.
const formatCliErrorMessage = (error) => {
  const isKnownSafeError = Boolean(error) && (
    error.safeToDisplay === true || error.message === 'DATABASE_URL is not configured'
  );
  return `report-attributed-revenue: ${isKnownSafeError ? error.message : 'failed to generate report'}`;
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
  formatReportJson,
  formatCliErrorMessage
};
