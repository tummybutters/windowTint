import assert from 'node:assert/strict';
import storeModule from '../lib/lead-event-store.js';

const { PERSIST_EVENT_SQL, attributionLinkId, buildParams, createLeadEventStore, leadIdForSession } = storeModule;

const baseLead = {
  first_seen_at: '2026-07-21T19:59:00.000Z',
  last_seen_at: '2026-07-21T20:00:00.000Z',
  first_landing_page: 'https://www.obsidianautoworksoc.com/?gclid=click-1',
  first_referrer: 'https://www.google.com/search',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_term: '',
  utm_content: '',
  gclid: 'click-1',
  gbraid: '',
  wbraid: '',
  campaignid: '23899221542',
  adgroupid: '111',
  creative: '',
  keyword: 'mobile window tint',
  matchtype: 'e',
  device: 'm',
  network: 'g',
  loc_physical_ms: '',
  loc_interest_ms: '',
  placement: '',
  targetid: '',
  extensionid: ''
};

const paidTouch = {
  touch_id: 'touch_00000000000000000001',
  touch_time: '2026-07-21T19:58:00.000Z',
  landing_page: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=click-1',
  utm_source: 'google',
  utm_medium: 'cpc',
  utm_campaign: 'agency-build',
  utm_term: 'window tint',
  utm_content: 'ad-1',
  gclid: 'click-1',
  gbraid: 'gbraid-value-1',
  wbraid: 'wbraid-value-1',
  campaign_id: '23899221542',
  ad_group_id: '111',
  creative_id: '222',
  keyword: 'mobile window tint',
  match_type: 'e',
  device: 'm',
  network: 'g',
  location_physical_id: '9031686',
  location_interest_id: '2200000',
  placement: 'placement-1',
  target_id: 'target-1',
  extension_id: 'extension-1'
};

const unrelatedTouch = {
  ...paidTouch,
  touch_id: 'touch_00000000000000000099',
  gclid: 'click-unrelated'
};

const paidLeadIntent = {
  lead_intent_id: 'intent_00000000000000001',
  reference_code: 'OA-23456789AB',
  touch_id: paidTouch.touch_id,
  first_channel: 'phone'
};

const buildRecord = (overrides = {}) => ({
  event_id: 'obsidian_event_store_001',
  event_name: 'phone_click',
  event_time: '2026-07-21T20:00:00.000Z',
  received_at: '2026-07-21T20:00:01.000Z',
  session_id: 'obsidian_session_store_001',
  page_path: '/vip-booking',
  page_url: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=click-1',
  referrer: 'https://www.google.com/search',
  source: 'google_ads',
  lead: baseLead,
  identities: [],
  payload: { link_url: 'tel:' },
  touch: null,
  lead_intent: null,
  ...overrides
});

// --- SQL shape: every required clause is present in the single persistence statement ---

assert.match(PERSIST_EVENT_SQL, /INSERT INTO attribution_sessions/);
assert.match(PERSIST_EVENT_SQL, /INSERT INTO attribution_touches/);
assert.match(PERSIST_EVENT_SQL, /ON CONFLICT \(touch_id\) DO NOTHING/);
assert.match(PERSIST_EVENT_SQL, /INSERT INTO attribution_lead_intents/);
assert.match(PERSIST_EVENT_SQL, /ON CONFLICT \(lead_intent_id\) DO NOTHING/);
assert.match(PERSIST_EVENT_SQL, /INSERT INTO attribution_links/);
assert.match(PERSIST_EVENT_SQL, /'lead_intent'/);
assert.match(PERSIST_EVENT_SQL, /'lead_intent_touch'/);
assert.match(PERSIST_EVENT_SQL, /'A'/);
assert.match(PERSIST_EVENT_SQL, /'approved'/);
assert.match(PERSIST_EVENT_SQL, /FROM touch_lookup/);
assert.match(PERSIST_EVENT_SQL, /ON CONFLICT \(entity_type, entity_id, method\) DO NOTHING/);
assert.match(PERSIST_EVENT_SQL, /ON CONFLICT \(event_id\) DO NOTHING/);

// --- SQL shape: touch_lookup is keyed off the intent's declared binding ($63), not the
// event's current touch ($38), on both arms -- an organic intent sharing an event with an
// unrelated paid touch must never resolve to that touch. ---

assert.match(
  PERSIST_EVENT_SQL,
  /SELECT touch_id, gclid, gbraid, wbraid FROM touch_insert\s*\n\s*WHERE touch_id = NULLIF\(\$63, ''\)/,
  'touch_lookup arm 1 (same-statement insert) must filter on $63, not accept any inserted touch'
);
assert.match(
  PERSIST_EVENT_SQL,
  /SELECT touch_id, gclid, gbraid, wbraid FROM attribution_touches\s*\n\s*WHERE touch_id = NULLIF\(\$63, ''\) AND session_id = \$1/,
  'touch_lookup arm 2 (pre-existing row) must require both the exact touch_id and session ownership'
);

// --- SQL shape: the lead intent's stored touch_id FK is sourced from the session-scoped
// touch_lookup, never from the raw $63 param -- an unresolvable or cross-session touch must
// degrade to organic instead of aborting the statement via a foreign-key violation. ---

assert.match(
  PERSIST_EVENT_SQL,
  /SELECT \$61, \$62, \$1, \(SELECT touch_id FROM touch_lookup LIMIT 1\), \$30, \$64, NOW\(\)/,
  'lead_intent_upsert.touch_id must resolve through touch_lookup, not a raw $63 literal'
);
assert.doesNotMatch(
  PERSIST_EVENT_SQL.replace(/SELECT touch_id FROM touch_lookup LIMIT 1/g, ''),
  /NULLIF\(\$63, ''\)\s*,\s*\$30,\s*\$64,\s*NOW\(\)/,
  'lead_intent_upsert must not fall back to writing $63 straight into the touch_id column'
);

// --- SQL shape: lead_intent_lookup mirrors touch_lookup so a freshly-inserted intent (this
// statement) and a pre-existing intent (an earlier call/retry) both resolve to their real,
// immutable, session-owned touch_id -- required for the link JOIN below to prove "exact intent
// ownership" rather than trusting the raw $61/$63 params. ---

assert.match(PERSIST_EVENT_SQL, /lead_intent_lookup AS \(/);
assert.match(
  PERSIST_EVENT_SQL,
  /SELECT lead_intent_id, touch_id FROM lead_intent_upsert/,
  'lead_intent_lookup arm 1 must see this statement\'s own fresh insert via RETURNING'
);
assert.match(
  PERSIST_EVENT_SQL,
  /SELECT lead_intent_id, touch_id FROM attribution_lead_intents\s*\n\s*WHERE lead_intent_id = NULLIF\(\$61, ''\) AND session_id = \$1/,
  'lead_intent_lookup arm 2 (pre-existing row) must require both the exact lead_intent_id and session ownership'
);
assert.match(
  PERSIST_EVENT_SQL,
  /RETURNING lead_intent_id, touch_id/,
  'lead_intent_upsert must return touch_id so lead_intent_lookup can resolve it in the same statement'
);

// --- SQL shape: the Tier A link is only ever created when the intent's own resolved touch_id
// (from lead_intent_lookup) matches an exact, session-owned touch (from touch_lookup). An
// organic intent has touch_id = NULL, which never JOIN-matches any row, so a paid touch present
// elsewhere in the same event can never attach a link to it. ---

assert.match(
  PERSIST_EVENT_SQL,
  /FROM lead_intent_lookup li\s*\n\s*JOIN touch_lookup tl ON tl\.touch_id = li\.touch_id/,
  'lead_intent_link_insert must require both the exact touch and the exact intent ownership via an explicit JOIN'
);

// --- Live-database verification requirement (cannot be proven against a mocked query) ---
//
// A duplicate reference_code submitted under a *different* lead_intent_id must fail the whole
// statement rather than silently reassigning the reference: lead_intent_upsert's ON CONFLICT
// arbiter is (lead_intent_id) only, so a colliding reference_code is not caught by DO NOTHING --
// it falls through to the real INSERT and must raise the `attribution_lead_intents_reference_code_key`
// UNIQUE violation from db/migrations/004_attribution_foundation.sql:55. The mock query in this
// suite returns a canned row unconditionally and never evaluates constraints, so it cannot
// distinguish "insert succeeded" from "insert violated a UNIQUE constraint". This must be
// exercised against a live Postgres database (Task 7/8 verification) before it can be trusted:
// insert lead_intent_id A with reference_code R, then attempt lead_intent_id B with the same
// reference_code R in a second statement, and assert the second call rejects.

// --- buildParams: paid case (touch + matching lead intent) ---

const paidRecord = buildRecord({ touch: paidTouch, lead_intent: paidLeadIntent });
const paidParams = buildParams(paidRecord);

assert.equal(paidParams.length, 65);
assert.equal(paidParams[0], paidRecord.session_id);
assert.equal(paidParams[26], leadIdForSession(paidRecord.session_id));
assert.equal(paidParams[29], paidRecord.event_id);
assert.equal(paidParams[60], paidLeadIntent.lead_intent_id);
assert.equal(paidParams[61], paidLeadIntent.reference_code);
assert.equal(paidParams[62], paidLeadIntent.touch_id);
assert.equal(paidParams[63], paidLeadIntent.first_channel);
assert.match(paidParams[64], /^link_[a-f0-9]{32}$/);
assert.equal(paidParams[64], attributionLinkId('lead_intent', paidLeadIntent.lead_intent_id, 'lead_intent_touch'));

// --- Full touch placeholder mapping: every one of the 23 touch columns, in the exact order
// touch_insert declares them, must land at its corresponding buildParams index ($38..$60).
// This locks the column-list order in PERSIST_EVENT_SQL to the value order in buildParams --
// e.g. a gbraid/wbraid swap in either list fails this loop, since the fixtures above use
// distinct non-empty values for every touch field. ---

const TOUCH_COLUMNS_IN_ORDER = [
  'touch_id', 'touch_time', 'landing_page', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'campaign_id', 'ad_group_id',
  'creative_id', 'keyword', 'match_type', 'device', 'network', 'location_physical_id',
  'location_interest_id', 'placement', 'target_id', 'extension_id'
];

const touchInsertColumnListMatch = PERSIST_EVENT_SQL.match(
  /INSERT INTO attribution_touches \(\n([\s\S]*?)\n\s*\)\s*\n\s*SELECT/
);
assert.ok(touchInsertColumnListMatch, 'touch_insert column list must be present');
const touchInsertColumns = touchInsertColumnListMatch[1]
  .split(',')
  .map((column) => column.trim())
  .filter(Boolean);
assert.deepEqual(
  touchInsertColumns,
  ['touch_id', 'session_id', ...TOUCH_COLUMNS_IN_ORDER.slice(1), 'updated_at'],
  'touch_insert column list order must match the expected schema order'
);

TOUCH_COLUMNS_IN_ORDER.forEach((column, index) => {
  const paramIndex = 37 + index; // touch_id is buildParams[37] == $38
  assert.equal(
    paidParams[paramIndex],
    paidTouch[column],
    `touch.${column} must map to buildParams[${paramIndex}] ($${paramIndex + 1})`
  );
});

// --- buildParams: organic case (lead intent with no current paid touch) ---

const organicLeadIntent = {
  lead_intent_id: 'intent_00000000000000002',
  reference_code: 'OA-23456789AC',
  touch_id: '',
  first_channel: 'form'
};
const organicRecord = buildRecord({
  event_id: 'obsidian_event_store_organic_001',
  session_id: 'obsidian_session_store_organic_001',
  touch: null,
  lead_intent: organicLeadIntent
});
const organicParams = buildParams(organicRecord);

assert.equal(organicParams[37], '');
assert.equal(organicParams[60], organicLeadIntent.lead_intent_id);
assert.equal(organicParams[62], '');

// --- buildParams: organic intent sharing an event with an unrelated paid touch. The normalizer
// legally allows this (the mismatch guard only fires when lead_intent.touch_id is non-empty),
// so the SQL itself -- not the normalizer -- must be the thing that stops a Tier A link from
// forming. buildParams faithfully carries both values through; the structural JOIN assertions
// above are what prove the link cannot form (li.touch_id is NULL for this lead_intent, and
// NULL never matches tl.touch_id). ---

const organicWithUnrelatedTouchRecord = buildRecord({
  event_id: 'obsidian_event_store_organic_with_touch_001',
  session_id: 'obsidian_session_store_organic_with_touch_001',
  touch: unrelatedTouch,
  lead_intent: organicLeadIntent
});
const organicWithUnrelatedTouchParams = buildParams(organicWithUnrelatedTouchRecord);

assert.equal(organicWithUnrelatedTouchParams[37], unrelatedTouch.touch_id, 'the event still carries the unrelated touch');
assert.equal(organicWithUnrelatedTouchParams[60], organicLeadIntent.lead_intent_id);
assert.equal(organicWithUnrelatedTouchParams[62], '', 'the organic lead_intent must never inherit the unrelated touch_id');
assert.notEqual(
  organicWithUnrelatedTouchParams[37],
  organicWithUnrelatedTouchParams[62],
  'touch and lead_intent.touch_id are legitimately different values in this case'
);

// --- Missing touch not used as a raw FK: a lead_intent.touch_id ($63) that resolves to nothing
// in touch_lookup (touch never landed, e.g. dropped by a prior rate-limited/failed submit) must
// not be written into attribution_lead_intents.touch_id verbatim -- see the SQL-shape assertion
// above proving lead_intent_upsert sources the FK from `(SELECT touch_id FROM touch_lookup
// LIMIT 1)`, which yields NULL (not a dangling reference) when nothing resolves. At the
// buildParams level this is the same shape as the paid case: the raw param is still sent as-is
// (buildParams does no DB-aware filtering), and it is the SQL's job to degrade it safely. ---

const unresolvableTouchLeadIntent = {
  lead_intent_id: 'intent_00000000000000003',
  reference_code: 'OA-23456789AD',
  touch_id: 'touch_00000000000000099999', // never submitted as `touch`, never in the DB
  first_channel: 'text'
};
const unresolvableTouchRecord = buildRecord({
  event_id: 'obsidian_event_store_unresolvable_touch_001',
  session_id: 'obsidian_session_store_unresolvable_touch_001',
  touch: null,
  lead_intent: unresolvableTouchLeadIntent
});
const unresolvableTouchParams = buildParams(unresolvableTouchRecord);

assert.equal(unresolvableTouchParams[37], '', 'no touch was submitted in this event');
assert.equal(unresolvableTouchParams[62], unresolvableTouchLeadIntent.touch_id, 'the raw declared touch_id is still sent as a param');

// --- Cross-session touch exclusion: proven at the SQL-shape level above (touch_lookup arm 2
// requires `session_id = $1`, so a touch_id that exists but belongs to a different session
// resolves to zero rows, same as a missing touch -- degrades to organic, never a raw FK write
// and never a link). buildParams itself has no session-awareness to assert on directly; the
// session scoping is entirely a property of the SQL text asserted above. ---

// --- store.persist: paid, retry, and repeated-distinct-event cases ---

const calls = [];
let inserted = true;
const store = createLeadEventStore({
  query: async (queryText, params) => {
    calls.push({ queryText, params });
    return [{ inserted }];
  }
});

assert.deepEqual(await store.persist(paidRecord), { inserted: true });
inserted = false;
assert.deepEqual(await store.persist(paidRecord), { inserted: false });
assert.equal(calls.length, 2);
assert.deepEqual(calls[0].params, calls[1].params);

inserted = true;
const secondTouchEvent = buildRecord({
  event_id: 'obsidian_event_store_repeat_001',
  session_id: paidRecord.session_id,
  event_name: 'text_click',
  touch: null,
  lead_intent: paidLeadIntent
});
await store.persist(secondTouchEvent);
assert.equal(calls.length, 3);
assert.equal(calls[2].params[37], '');
assert.equal(calls[2].params[60], paidLeadIntent.lead_intent_id);
assert.equal(calls[2].params[62], paidLeadIntent.touch_id);
assert.equal(calls[2].params[64], calls[0].params[64], 'repeated distinct lead actions reuse one Tier A link id');

await store.persist(organicRecord);
assert.equal(calls.length, 4);
assert.equal(calls[3].params[64], attributionLinkId('lead_intent', organicLeadIntent.lead_intent_id, 'lead_intent_touch'));

assert.equal(buildParams(organicRecord).length, 65);

console.log('lead-event store test passed');
