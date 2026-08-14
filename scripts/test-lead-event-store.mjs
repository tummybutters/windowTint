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
  gbraid: '',
  wbraid: '',
  campaign_id: '23899221542',
  ad_group_id: '111',
  creative_id: '222',
  keyword: 'mobile window tint',
  match_type: 'e',
  device: 'm',
  network: 'g',
  location_physical_id: '9031686',
  location_interest_id: '',
  placement: '',
  target_id: '',
  extension_id: ''
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

// --- buildParams: paid case (touch + matching lead intent) ---

const paidRecord = buildRecord({ touch: paidTouch, lead_intent: paidLeadIntent });
const paidParams = buildParams(paidRecord);

assert.equal(paidParams.length, 65);
assert.equal(paidParams[0], paidRecord.session_id);
assert.equal(paidParams[26], leadIdForSession(paidRecord.session_id));
assert.equal(paidParams[29], paidRecord.event_id);
assert.equal(paidParams[37], paidTouch.touch_id);
assert.equal(paidParams[38], paidTouch.touch_time);
assert.equal(paidParams[39], paidTouch.landing_page);
assert.equal(paidParams[45], paidTouch.gclid);
assert.equal(paidParams[48], paidTouch.campaign_id);
assert.equal(paidParams[60], paidLeadIntent.lead_intent_id);
assert.equal(paidParams[61], paidLeadIntent.reference_code);
assert.equal(paidParams[62], paidLeadIntent.touch_id);
assert.equal(paidParams[63], paidLeadIntent.first_channel);
assert.match(paidParams[64], /^link_[a-f0-9]{32}$/);
assert.equal(paidParams[64], attributionLinkId('lead_intent', paidLeadIntent.lead_intent_id, 'lead_intent_touch'));

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
