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

// Task 7 / Q4: the standard event retention window (400 days) now also prunes
// attribution_lead_intents and attribution_touches, and their dependent attribution_links, in
// FK-safe order: lead-intent-linked attribution_links first, then old lead intents, then old
// touches (excluding any touch still referenced by a retained intent or link), then old events.
// Existing failure/rate-limit pruning is unchanged.
const calls = [];
const results = [
  [{ failure_id: 1 }, { failure_id: 2 }], // deleteFailures
  [{ attribution_link_id: 'link-1' }], // deleteLeadIntentLinks
  [{ lead_intent_id: 'intent-1' }, { lead_intent_id: 'intent-2' }], // deleteLeadIntents
  [{ touch_id: 'touch-1' }], // deleteTouches
  [{ event_id: 'event-1' }], // deleteEvents
  [{ bucket_key: 'bucket-1' }, { bucket_key: 'bucket-2' }, { bucket_key: 'bucket-3' }] // deleteRateLimitBuckets
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
  deletedRateLimitBuckets: 3,
  deletedLeadIntentLinks: 1,
  deletedLeadIntents: 2,
  deletedTouches: 1
});

assert.equal(calls.length, 6);
assert.match(calls[0].queryText, /attribution_ingest_failures/);
assert.match(calls[1].queryText, /attribution_links/);
assert.match(calls[1].queryText, /attribution_lead_intents/);
assert.match(calls[2].queryText, /DELETE FROM attribution_lead_intents/);
assert.match(calls[3].queryText, /DELETE FROM attribution_touches/);
assert.match(calls[4].queryText, /attribution_events/);
assert.match(calls[5].queryText, /attribution_ingest_rate_limits/);

assert.deepEqual(calls[0].params, [30]);
assert.deepEqual(calls[1].params, [400]);
assert.deepEqual(calls[2].params, [400]);
assert.deepEqual(calls[3].params, [400]);
assert.deepEqual(calls[4].params, [400]);

// The lead-intent-link delete only targets entity_type = 'lead_intent' links tied to an
// intent beyond the window -- it must never touch a future order-link or an in-window intent.
assert.match(calls[1].queryText, /entity_type\s*=\s*'lead_intent'/);

// The touch delete must exclude any touch still referenced by a retained lead intent or link,
// so it can never violate the touch_id foreign keys on attribution_lead_intents/attribution_links.
assert.match(calls[3].queryText, /NOT EXISTS/);
assert.match(calls[3].queryText, /attribution_lead_intents/);
assert.match(calls[3].queryText, /attribution_links/);

// All new statements use parameterized SQL (a $1 days placeholder), never string
// interpolation of the retention window into the query text.
[calls[1], calls[2], calls[3]].forEach((call) => {
  assert.match(call.queryText, /\$1/);
});

console.log('attribution retention store test passed');
