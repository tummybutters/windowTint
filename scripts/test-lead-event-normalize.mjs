import assert from 'node:assert/strict';
import normalizeModule from '../lib/lead-event-normalize.js';

const { buildLeadEventRecord } = normalizeModule;
const now = new Date('2026-07-21T20:00:00.000Z');
const TOUCH_ID = /^touch_[A-Za-z0-9_-]{16,120}$/;
const LEAD_INTENT_ID = /^intent_[A-Za-z0-9_-]{16,120}$/;
const LEAD_REFERENCE = /^OA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;

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
    service: 'ceramic_coating',
    landing_variant: 'coating_cost_correction_v1',
    lead_action: 'coating_cost_text',
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
assert.equal(record.payload.service, 'ceramic_coating');
assert.equal(record.payload.landing_variant, 'coating_cost_correction_v1');
assert.equal(record.payload.lead_action, 'coating_cost_text');
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

// --- touch / lead_intent normalization ---

const VALID_TOUCH_ID = 'touch_00000000000000000001';
const VALID_TOUCH_ID_2 = 'touch_00000000000000000002';
const VALID_INTENT_ID = 'intent_0000000000000000001';
const VALID_REFERENCE = 'OA-23456789AB';

assert.match(VALID_TOUCH_ID, TOUCH_ID);
assert.match(VALID_INTENT_ID, LEAD_INTENT_ID);
assert.match(VALID_REFERENCE, LEAD_REFERENCE);

const paidTouch = {
  touch_id: VALID_TOUCH_ID,
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

// Valid paid touch snapshot with a matching lead intent (Tier A eligible).
{
  const paidRecord = buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_paid_001',
    touch: paidTouch,
    lead_intent: {
      lead_intent_id: VALID_INTENT_ID,
      reference_code: VALID_REFERENCE,
      touch_id: VALID_TOUCH_ID,
      first_channel: 'phone'
    }
  }, { now, identitySecret: 'test-identity-secret' });

  assert.deepEqual(Object.keys(paidRecord.touch).sort(), [
    'ad_group_id', 'campaign_id', 'creative_id', 'device', 'extension_id', 'gbraid', 'gclid',
    'keyword', 'landing_page', 'location_interest_id', 'location_physical_id', 'match_type',
    'network', 'placement', 'target_id', 'touch_id', 'touch_time', 'utm_campaign', 'utm_content',
    'utm_medium', 'utm_source', 'utm_term', 'wbraid'
  ].sort());
  assert.equal(paidRecord.touch.touch_id, VALID_TOUCH_ID);
  assert.equal(paidRecord.touch.gclid, 'click-1');
  assert.equal(paidRecord.touch.touch_time, '2026-07-21T19:58:00.000Z');
  assert.equal(paidRecord.lead_intent.lead_intent_id, VALID_INTENT_ID);
  assert.equal(paidRecord.lead_intent.reference_code, VALID_REFERENCE);
  assert.equal(paidRecord.lead_intent.touch_id, VALID_TOUCH_ID);
  assert.equal(paidRecord.lead_intent.first_channel, 'phone');
}

// Valid lead intent with no touch (organic).
{
  const organicRecord = buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_organic_001',
    lead_intent: {
      lead_intent_id: VALID_INTENT_ID,
      reference_code: VALID_REFERENCE,
      first_channel: 'form'
    }
  }, { now, identitySecret: 'test-identity-secret' });

  assert.equal(organicRecord.touch, null);
  assert.equal(organicRecord.lead_intent.lead_intent_id, VALID_INTENT_ID);
  assert.equal(organicRecord.lead_intent.touch_id, '');
  assert.equal(organicRecord.lead_intent.first_channel, 'form');
}

// No touch and no lead_intent at all — both remain null, nothing throws.
{
  const plainRecord = buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_plain_001'
  }, { now, identitySecret: 'test-identity-secret' });

  assert.equal(plainRecord.touch, null);
  assert.equal(plainRecord.lead_intent, null);
}

// Malformed touch_id.
assert.throws(
  () => buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_bad_touch_001',
    touch: { ...paidTouch, touch_id: 'not-a-touch-id' }
  }, { now, identitySecret: 'secret' }),
  /Invalid touch_id/
);

// Touch missing every supported click ID.
assert.throws(
  () => buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_no_click_001',
    touch: { ...paidTouch, gclid: '', gbraid: '', wbraid: '' }
  }, { now, identitySecret: 'secret' }),
  /supported click ID/
);

// Q1: an unparseable touch_time is unusable *optional* evidence, not a reason to reject the
// whole envelope -- the record persists with touch: null and the lead_intent (if any) is
// unaffected, so a real lead action is never dropped for carrying bad touch evidence.
{
  const badTouchTimeRecord = buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_bad_touch_time_001',
    touch: { ...paidTouch, touch_time: 'not-a-date' },
    lead_intent: {
      lead_intent_id: VALID_INTENT_ID,
      reference_code: VALID_REFERENCE,
      touch_id: VALID_TOUCH_ID,
      first_channel: 'phone'
    }
  }, { now, identitySecret: 'secret' });
  assert.equal(badTouchTimeRecord.touch, null, 'an unparseable touch_time degrades to no touch, not a rejection');
  assert.equal(badTouchTimeRecord.lead_intent.touch_id, VALID_TOUCH_ID, 'the lead_intent binding is untouched by the degraded touch');
}

// Q1: a touch_time older than the server's 400-day window is equally unusable evidence.
{
  const staleTime = new Date(now.getTime() - 401 * 24 * 60 * 60 * 1000).toISOString();
  const staleTouchRecord = buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_stale_touch_001',
    touch: { ...paidTouch, touch_time: staleTime }
  }, { now, identitySecret: 'secret' });
  assert.equal(staleTouchRecord.touch, null, 'a touch older than 400 days is unusable optional evidence, never a rejection');
}

// Q1: a touch_time more than 24h in the future (clock skew) is equally unusable evidence.
{
  const futureTime = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();
  const futureTouchRecord = buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_future_touch_001',
    touch: { ...paidTouch, touch_time: futureTime }
  }, { now, identitySecret: 'secret' });
  assert.equal(futureTouchRecord.touch, null, 'a touch more than 24h in the future is unusable optional evidence, never a rejection');
}

// A touch_time exactly at the boundary (within window) remains fully usable.
{
  const boundaryTime = new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000 + 1000).toISOString();
  const boundaryTouchRecord = buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_boundary_touch_001',
    touch: { ...paidTouch, touch_time: boundaryTime }
  }, { now, identitySecret: 'secret' });
  assert.ok(boundaryTouchRecord.touch, 'a touch just inside the 400-day window is still usable');
  assert.equal(boundaryTouchRecord.touch.touch_time, new Date(boundaryTime).toISOString());
}

// Malformed lead_intent_id.
assert.throws(
  () => buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_bad_intent_001',
    lead_intent: {
      lead_intent_id: 'not-an-intent-id',
      reference_code: VALID_REFERENCE,
      first_channel: 'text'
    }
  }, { now, identitySecret: 'secret' }),
  /Invalid lead_intent_id/
);

// Malformed reference_code.
assert.throws(
  () => buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_bad_reference_001',
    lead_intent: {
      lead_intent_id: VALID_INTENT_ID,
      reference_code: 'OA-lowercase1',
      first_channel: 'text'
    }
  }, { now, identitySecret: 'secret' }),
  /Invalid reference_code/
);

// Invalid first_channel.
assert.throws(
  () => buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_bad_channel_001',
    lead_intent: {
      lead_intent_id: VALID_INTENT_ID,
      reference_code: VALID_REFERENCE,
      first_channel: 'email'
    }
  }, { now, identitySecret: 'secret' }),
  /Invalid first_channel/
);

// Malformed lead_intent.touch_id reference.
assert.throws(
  () => buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_bad_intent_touch_001',
    lead_intent: {
      lead_intent_id: VALID_INTENT_ID,
      reference_code: VALID_REFERENCE,
      touch_id: 'not-a-touch-id',
      first_channel: 'text'
    }
  }, { now, identitySecret: 'secret' }),
  /Invalid lead_intent touch_id/
);

// lead_intent.touch_id must equal the normalized touch.touch_id — mismatches are rejected, never guessed.
assert.throws(
  () => buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_mismatch_001',
    touch: paidTouch,
    lead_intent: {
      lead_intent_id: VALID_INTENT_ID,
      reference_code: VALID_REFERENCE,
      touch_id: VALID_TOUCH_ID_2,
      first_channel: 'phone'
    }
  }, { now, identitySecret: 'secret' }),
  /lead_intent touch_id does not match touch/
);

// Browser-submitted outcome/revenue/qualification fields are never persisted onto touch or lead_intent.
{
  const pollutedRecord = buildLeadEventRecord({
    ...event,
    event_id: 'obsidian_event_normalize_polluted_001',
    touch: { ...paidTouch, outcome: 'won', revenue: '999.99', amount_minor: 99999 },
    lead_intent: {
      lead_intent_id: VALID_INTENT_ID,
      reference_code: VALID_REFERENCE,
      touch_id: VALID_TOUCH_ID,
      first_channel: 'phone',
      qualified: true,
      appointment_status: 'booked',
      payment_status: 'paid'
    }
  }, { now, identitySecret: 'test-identity-secret' });

  assert.equal(pollutedRecord.touch.outcome, undefined);
  assert.equal(pollutedRecord.touch.revenue, undefined);
  assert.equal(pollutedRecord.touch.amount_minor, undefined);
  assert.equal(pollutedRecord.lead_intent.qualified, undefined);
  assert.equal(pollutedRecord.lead_intent.appointment_status, undefined);
  assert.equal(pollutedRecord.lead_intent.payment_status, undefined);
}

console.log('lead-event normalization test passed');
