import assert from 'node:assert/strict';
import retentionModule from '../lib/attribution-retention-store.js';

const { createAttributionRetentionStore, normalizeRetentionDays } = retentionModule;

assert.deepEqual(normalizeRetentionDays({ eventRetentionDays: 2, failureRetentionDays: 1 }), {
  eventRetentionDays: 30,
  failureRetentionDays: 7
});
assert.deepEqual(normalizeRetentionDays({ eventRetentionDays: 400, failureRetentionDays: 30 }), {
  eventRetentionDays: 400,
  failureRetentionDays: 30
});

const calls = [];
const results = [
  [{ failure_id: 1 }, { failure_id: 2 }],
  [{ event_id: 'event-1' }],
  [{ bucket_key: 'bucket-1' }, { bucket_key: 'bucket-2' }, { bucket_key: 'bucket-3' }]
];
const store = createAttributionRetentionStore({
  query: async (queryText, params) => {
    calls.push({ queryText, params });
    return results[calls.length - 1];
  }
});

assert.deepEqual(await store.prune({ eventRetentionDays: 400, failureRetentionDays: 30 }), {
  deletedEvents: 1,
  deletedFailures: 2,
  deletedRateLimitBuckets: 3
});
assert.equal(calls.length, 3);
assert.match(calls[0].queryText, /attribution_ingest_failures/);
assert.match(calls[1].queryText, /attribution_events/);
assert.match(calls[2].queryText, /attribution_ingest_rate_limits/);
assert.deepEqual(calls[0].params, [30]);
assert.deepEqual(calls[1].params, [400]);

console.log('attribution retention store test passed');
