import assert from 'node:assert/strict';
import storeModule from '../lib/lead-event-store.js';

const { buildParams, createLeadEventStore, leadIdForSession } = storeModule;
const record = {
  event_id: 'obsidian_event_store_001',
  event_name: 'phone_click',
  event_time: '2026-07-21T20:00:00.000Z',
  received_at: '2026-07-21T20:00:01.000Z',
  session_id: 'obsidian_session_store_001',
  page_path: '/vip-booking',
  page_url: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=click-1',
  referrer: 'https://www.google.com/search',
  source: 'google_ads',
  lead: {
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
  },
  identities: [],
  payload: { link_url: 'tel:' }
};

const calls = [];
let inserted = true;
const store = createLeadEventStore({
  query: async (queryText, params) => {
    calls.push({ queryText, params });
    return [{ inserted }];
  }
});

assert.deepEqual(await store.persist(record), { inserted: true });
inserted = false;
assert.deepEqual(await store.persist(record), { inserted: false });
assert.equal(calls.length, 2);
assert.match(calls[0].queryText, /ON CONFLICT \(event_id\) DO NOTHING/);
assert.equal(calls[0].params[0], record.session_id);
assert.equal(calls[0].params[26], leadIdForSession(record.session_id));
assert.equal(calls[0].params[29], record.event_id);
assert.equal(buildParams(record).length, 37);

console.log('lead-event store test passed');
