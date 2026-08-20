import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createCommercialLeadStore } = require('../lib/commercial-lead-store.js');

const calls = [];
const store = createCommercialLeadStore({
  async query(sql, params) {
    calls.push({ sql, params });
    if (/attribution_ingest_rate_limits/i.test(sql)) return [{ request_count: 1 }];
    return [{
      lead_id: 'commercial_lead_abc', inserted: true,
      name: 'Tommy Test', phone: '7145550123', property_city: 'Irvine',
      additional_notes: 'South-facing conference room.',
      answers: { property: 'office', goal: 'privacy_decorative', scope: 'small_building', timing: 'within_30_days' }
    }];
  }
});

assert.deepEqual(await store.checkRateLimit('bucket', 10), { allowed: true, requestCount: 1, limit: 10 });

const result = await store.persist({
  lead_id: 'commercial_lead_abc',
  submission_id: 'commercial_submission_0123456789abcdef',
  session_id: 'obsidian_session_test',
  lead_intent_id: 'intent_0123456789abcdef',
  reference_code: 'OA-ABCDEFGH23',
  name: 'Tommy Test',
  phone: '7145550123',
  property_city: 'Irvine',
  additional_notes: 'South-facing conference room.',
  answers: { property: 'office', goal: 'privacy_decorative', scope: 'small_building', timing: 'within_30_days' },
  attribution: { gclid: 'click-123', campaignid: '24117892229' },
  touch: { touch_id: 'touch_0123456789abcdef', gclid: 'click-123' },
  created_at: '2026-08-20T20:00:00.000Z'
});

assert.deepEqual(result, { leadId: 'commercial_lead_abc', inserted: true });
const insert = calls.find((call) => /INSERT INTO commercial_leads/i.test(call.sql));
assert.ok(insert, 'The store must insert into the dedicated commercial lead table.');
for (const value of ['Tommy Test', '7145550123', 'Irvine', 'South-facing conference room.', 'click-123']) {
  assert.ok(insert.params.some((param) => String(param).includes(value)), `The durable insert must retain ${value}.`);
}

const conflictStore = createCommercialLeadStore({
  async query() {
    return [{
      lead_id: 'commercial_lead_abc', inserted: false,
      name: 'Original Name', phone: '7145559999', property_city: 'Irvine',
      additional_notes: '',
      answers: { property: 'office', goal: 'privacy_decorative', scope: 'small_building', timing: 'within_30_days' }
    }];
  }
});
await assert.rejects(
  conflictStore.persist({
    lead_id: 'commercial_lead_abc', submission_id: 'commercial_submission_0123456789abcdef',
    session_id: '', lead_intent_id: '', reference_code: '', name: 'Changed Name', phone: '7145550123',
    property_city: 'Irvine', additional_notes: '',
    answers: { property: 'office', goal: 'privacy_decorative', scope: 'small_building', timing: 'within_30_days' },
    attribution: {}, touch: {}, created_at: '2026-08-20T20:00:00.000Z'
  }),
  (error) => error && error.code === 'commercial_lead_conflict',
  'A reused submission ID with changed contact data must fail instead of opening SMS with unsaved values.'
);

console.log('commercial lead store contracts passed');
