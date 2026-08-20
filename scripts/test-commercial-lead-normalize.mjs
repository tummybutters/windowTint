import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildCommercialLeadRecord, CommercialLeadValidationError } = require('../lib/commercial-lead-normalize.js');

const payload = {
  submission_id: 'commercial_submission_0123456789abcdef',
  session_id: 'obsidian_session_test',
  lead_intent_id: 'intent_0123456789abcdef',
  reference_code: 'OA-ABCDEFGH23',
  name: '  Tommy   Test  ',
  phone: '(714) 555-0123',
  property_city: ' Irvine ',
  additional_notes: '  South-facing conference room.  ',
  answers: {
    property: 'office',
    goal: 'privacy_decorative',
    scope: 'small_building',
    timing: 'within_30_days'
  },
  attribution: {
    gclid: 'click-123',
    campaignid: '24117892229',
    adgroupid: '196849750257',
    keyword: 'commercial window tinting',
    device: 'm'
  },
  touch: {
    touch_id: 'touch_0123456789abcdef',
    gclid: 'click-123'
  }
};

const record = buildCommercialLeadRecord(payload, { now: new Date('2026-08-20T20:00:00.000Z') });
assert.equal(record.submission_id, payload.submission_id);
assert.equal(record.name, 'Tommy Test');
assert.equal(record.phone, '7145550123');
assert.equal(record.property_city, 'Irvine');
assert.equal(record.additional_notes, 'South-facing conference room.');
assert.deepEqual(record.answers, payload.answers);
assert.equal(record.attribution.gclid, 'click-123');
assert.equal(record.attribution.campaignid, '24117892229');
assert.equal(record.attribution.evidence_status, 'client_snapshot_unverified');
assert.equal(record.touch.touch_id, 'touch_0123456789abcdef');
assert.equal(record.created_at, '2026-08-20T20:00:00.000Z');

for (const missing of ['name', 'phone', 'property_city']) {
  assert.throws(
    () => buildCommercialLeadRecord({ ...payload, [missing]: '' }),
    CommercialLeadValidationError,
    `${missing} must be required`
  );
}

assert.throws(
  () => buildCommercialLeadRecord({ ...payload, phone: '123' }),
  /phone/i,
  'A non-callable phone number must be rejected.'
);
assert.throws(
  () => buildCommercialLeadRecord({ ...payload, answers: { ...payload.answers, goal: 'invalid' } }),
  /answers/i,
  'Unknown quiz choices must be rejected server-side.'
);

console.log('commercial lead normalization contracts passed');
