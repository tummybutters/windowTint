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

// Q4: attribution_touches and attribution_lead_intents predate this retention job and are never
// pruned, so a browser's paid click IDs and landing URLs outlive the event they described
// indefinitely. Reuse the same standard event retention window (400 days by default) for both,
// and delete in FK-safe order: dependent attribution_links (entity_type = 'lead_intent') first,
// then the lead intents themselves, then the touches -- excluding any touch still referenced by
// a retained (in-window) intent or link, since attribution_lead_intents.touch_id and
// attribution_links.touch_id both carry a plain (non-cascading) foreign key to
// attribution_touches(touch_id) that would otherwise abort the delete.
const DELETE_LEAD_INTENT_LINKS_SQL = `
DELETE FROM attribution_links
WHERE entity_type = 'lead_intent'
  AND entity_id IN (
    SELECT lead_intent_id FROM attribution_lead_intents
    WHERE created_at < NOW() - make_interval(days => $1::int)
  )
RETURNING attribution_link_id;
`;

const DELETE_LEAD_INTENTS_SQL = `
DELETE FROM attribution_lead_intents
WHERE created_at < NOW() - make_interval(days => $1::int)
RETURNING lead_intent_id;
`;

const DELETE_TOUCHES_SQL = `
DELETE FROM attribution_touches
WHERE touch_time < NOW() - make_interval(days => $1::int)
  AND NOT EXISTS (
    SELECT 1 FROM attribution_lead_intents li WHERE li.touch_id = attribution_touches.touch_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM attribution_links al WHERE al.touch_id = attribution_touches.touch_id
  )
RETURNING touch_id;
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
      // FK-safe order: dependent lead-intent links, then the lead intents, then the touches
      // (which excludes any touch still referenced by a retained intent or link), then events.
      const deletedLeadIntentLinks = await query(DELETE_LEAD_INTENT_LINKS_SQL, [eventRetentionDays]);
      const deletedLeadIntents = await query(DELETE_LEAD_INTENTS_SQL, [eventRetentionDays]);
      const deletedTouches = await query(DELETE_TOUCHES_SQL, [eventRetentionDays]);
      const deletedEvents = await query(DELETE_EVENTS_SQL, [eventRetentionDays]);
      const deletedRateLimitBuckets = await query(DELETE_RATE_LIMIT_BUCKETS_SQL, []);

      return {
        deletedEvents: rowsFromResult(deletedEvents).length,
        deletedFailures: rowsFromResult(deletedFailures).length,
        deletedRateLimitBuckets: rowsFromResult(deletedRateLimitBuckets).length,
        deletedLeadIntentLinks: rowsFromResult(deletedLeadIntentLinks).length,
        deletedLeadIntents: rowsFromResult(deletedLeadIntents).length,
        deletedTouches: rowsFromResult(deletedTouches).length
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
  DELETE_LEAD_INTENTS_SQL,
  DELETE_LEAD_INTENT_LINKS_SQL,
  DELETE_RATE_LIMIT_BUCKETS_SQL,
  DELETE_TOUCHES_SQL,
  createAttributionRetentionStore,
  createNeonAttributionRetentionStore,
  normalizeRetentionDays
};
