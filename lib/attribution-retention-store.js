const DELETE_FAILURES_SQL = `
DELETE FROM attribution_ingest_failures
WHERE occurred_at < NOW() - make_interval(days => $1::int)
RETURNING failure_id;
`;

const DELETE_EVENTS_SQL = `
DELETE FROM attribution_events
WHERE event_time < NOW() - make_interval(days => $1::int)
RETURNING event_id;
`;

const DELETE_RATE_LIMIT_BUCKETS_SQL = `
DELETE FROM attribution_ingest_rate_limits
WHERE updated_at < NOW() - INTERVAL '2 days'
RETURNING bucket_key;
`;

const rowsFromResult = (result) => {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
};

const retentionDays = (value, fallback, minimum) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.floor(parsed));
};

const normalizeRetentionDays = (options = {}) => ({
  eventRetentionDays: retentionDays(options.eventRetentionDays, 400, 30),
  failureRetentionDays: retentionDays(options.failureRetentionDays, 30, 7)
});

const createAttributionRetentionStore = ({ query }) => {
  if (typeof query !== 'function') throw new Error('A database query function is required');

  return {
    async prune(options = {}) {
      const { eventRetentionDays, failureRetentionDays } = normalizeRetentionDays(options);
      const deletedFailures = await query(DELETE_FAILURES_SQL, [failureRetentionDays]);
      const deletedEvents = await query(DELETE_EVENTS_SQL, [eventRetentionDays]);
      const deletedRateLimitBuckets = await query(DELETE_RATE_LIMIT_BUCKETS_SQL, []);

      return {
        deletedEvents: rowsFromResult(deletedEvents).length,
        deletedFailures: rowsFromResult(deletedFailures).length,
        deletedRateLimitBuckets: rowsFromResult(deletedRateLimitBuckets).length
      };
    }
  };
};

const createNeonAttributionRetentionStore = (connectionString) => {
  if (!connectionString) {
    const error = new Error('DATABASE_URL is not configured');
    error.code = 'storage_not_configured';
    throw error;
  }

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(connectionString);
  return createAttributionRetentionStore({
    query: (queryText, params) => sql.query(queryText, params)
  });
};

module.exports = {
  DELETE_EVENTS_SQL,
  DELETE_FAILURES_SQL,
  DELETE_RATE_LIMIT_BUCKETS_SQL,
  createAttributionRetentionStore,
  createNeonAttributionRetentionStore,
  normalizeRetentionDays
};
