import assert from 'node:assert/strict';
import normalizeModule from '../lib/lead-event-normalize.js';

const { buildLeadEventRecord } = normalizeModule;
const now = new Date('2026-07-21T20:00:00.000Z');
const event = {
  event_id: 'obsidian_event_normalize_001',
  event_name: 'vip_quiz_call_click',
  event_time: '2026-07-21T19:59:00.000Z',
  session_id: 'obsidian_session_normalize_001',
  page_path: '/vip-booking',
  page_url: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=click-1&phone=7146007134&utm_campaign=agency-build',
  referrer: 'https://www.google.com/search?q=private-query',
  lead: {
    phone: '(714) 600-7134',
    cid: 'Conversation-123',
    gclid: 'click-1',
    campaignid: '23899221542',
    first_landing_page: 'https://www.obsidianautoworksoc.com/?gclid=click-1&phone=7146007134',
    first_referrer: 'https://www.google.com/search?q=private-query'
  },
  payload: {
    link_url: 'sms:7146007134?body=private message',
    service_title: 'Full Car Tint',
    ignored_private_field: 'do not keep me'
  }
};

const record = buildLeadEventRecord(event, {
  now,
  identitySecret: 'test-identity-secret'
});

assert.equal(record.event_id, event.event_id);
assert.equal(record.source, 'google_ads');
assert.equal(record.payload.link_url, 'sms:');
assert.equal(record.payload.service_title, 'Full Car Tint');
assert.equal(record.payload.ignored_private_field, undefined);
assert.doesNotMatch(record.page_url, /phone=/);
assert.match(record.page_url, /gclid=click-1/);
assert.equal(record.referrer, 'https://www.google.com/search');
assert.equal(record.lead.phone, undefined);
assert.equal(record.lead.cid, undefined);
assert.equal(record.identities.length, 2);
assert.ok(record.identities.every((identity) => /^[a-f0-9]{64}$/.test(identity.identity_hash)));
assert.equal(record.identities.find((identity) => identity.identity_type === 'phone').identity_hint, '7134');

assert.throws(
  () => buildLeadEventRecord({ ...event, event_id: '' }, { now, identitySecret: 'secret' }),
  /Invalid event_id/
);
assert.throws(
  () => buildLeadEventRecord({ ...event, event_time: '2020-01-01T00:00:00.000Z' }, { now, identitySecret: 'secret' }),
  /outside accepted window/
);

console.log('lead-event normalization test passed');
