import retentionModule from '../lib/attribution-retention-store.js';

const {
  createNeonAttributionRetentionStore,
  normalizeRetentionDays
} = retentionModule;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const { eventRetentionDays, failureRetentionDays } = normalizeRetentionDays({
  eventRetentionDays: process.env.ATTRIBUTION_EVENT_RETENTION_DAYS,
  failureRetentionDays: process.env.ATTRIBUTION_FAILURE_RETENTION_DAYS
});
const store = createNeonAttributionRetentionStore(process.env.DATABASE_URL);
const result = await store.prune({ eventRetentionDays, failureRetentionDays });

console.log(JSON.stringify({
  ok: true,
  deleted_failures: result.deletedFailures,
  deleted_events: result.deletedEvents,
  deleted_rate_limit_buckets: result.deletedRateLimitBuckets,
  event_retention_days: eventRetentionDays,
  failure_retention_days: failureRetentionDays
}, null, 2));
