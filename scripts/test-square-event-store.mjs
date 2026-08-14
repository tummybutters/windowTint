import assert from 'node:assert/strict';
import storeModule from '../lib/square-event-store.js';

const {
  BOOKING_SQL,
  ORDER_SQL,
  PAYMENT_SQL,
  REFUND_SQL,
  createSquareEventStore
} = storeModule;
const calls = [];
let inserted = true;
const store = createSquareEventStore({
  query: async (queryText, params) => {
    calls.push({ queryText, params });
    return [{ inserted, applied: inserted, entity_id: params[4] }];
  }
});

const baseRecord = {
  provider_event_id: 'square-event-001',
  event_type: 'booking.created',
  payload_digest: 'a'.repeat(64),
  provider_created_at: '2026-07-21T21:00:00.000Z',
  received_at: '2026-07-21T21:00:01.000Z',
  entity_type: 'booking',
  entity: {
    booking_id: 'square_booking_booking-001',
    provider_booking_id: 'booking-001',
    customer_identity_hash: 'b'.repeat(64),
    status: 'ACCEPTED',
    staff_created: true,
    booking_origin: 'staff',
    provider_created_at: '2026-07-21T20:55:00.000Z',
    appointment_start_at: '2026-07-22T18:00:00.000Z',
    service_summary: 'service-001',
    metadata: { source: 'FIRST_PARTY_MERCHANT' }
  }
};

assert.deepEqual(await store.persist(baseRecord), {
  inserted: true,
  applied: true,
  entityType: 'booking',
  entityId: 'square_booking_booking-001'
});
assert.match(calls[0].queryText, /attribution_webhook_receipts/);
assert.match(calls[0].queryText, /ON CONFLICT \(provider, provider_event_id\) DO NOTHING/);
assert.match(calls[0].queryText, /attribution_bookings/);
assert.equal(calls[0].params[0], 'square-event-001');
assert.equal(calls[0].params[4], 'square_booking_booking-001');
assert.equal(calls[0].params.at(-1), '2026-07-21T21:00:00.000Z');

for (const sql of [BOOKING_SQL, PAYMENT_SQL, ORDER_SQL, REFUND_SQL]) {
  assert.match(sql, /last_provider_event_at/);
  assert.match(sql, /WHERE EXCLUDED\.last_provider_event_at >= COALESCE\(/);
}

assert.match(PAYMENT_SQL, /INSERT INTO attribution_payments \(\s*payment_id, provider, provider_payment_id, provider_order_id,/);
assert.match(
  PAYMENT_SQL,
  /provider_order_id = COALESCE\(EXCLUDED\.provider_order_id, attribution_payments\.provider_order_id\)/
);

inserted = true;
const paymentRecord = {
  ...baseRecord,
  provider_event_id: 'square-event-payment-order-link',
  event_type: 'payment.updated',
  entity_type: 'payment',
  entity: {
    payment_id: 'square_payment_payment-001',
    provider_payment_id: 'payment-001',
    provider_order_id: 'order-001',
    status: 'COMPLETED',
    amount_minor: 48000,
    currency: 'USD',
    metadata: { provider_order_id: 'order-001' }
  }
};
await store.persist(paymentRecord);
const paymentCall = calls.at(-1);
assert.match(paymentCall.queryText, /attribution_payments/);
assert.equal(paymentCall.params.includes('order-001'), true);

inserted = false;
assert.deepEqual(await store.persist(baseRecord), {
  inserted: false,
  applied: false,
  entityType: 'booking',
  entityId: 'square_booking_booking-001'
});

for (const entityType of ['payment', 'order', 'refund']) {
  inserted = true;
  const record = {
    ...baseRecord,
    provider_event_id: `square-event-${entityType}`,
    event_type: `${entityType}.updated`,
    entity_type: entityType,
    entity: {
      [`${entityType}_id`]: `square_${entityType}_${entityType}-001`,
      [`provider_${entityType}_id`]: `${entityType}-001`,
      status: 'COMPLETED',
      state: 'COMPLETED',
      amount_minor: 48000,
      currency: 'USD',
      metadata: {}
    }
  };
  const result = await store.persist(record);
  assert.equal(result.inserted, true);
  assert.equal(result.applied, true);
  assert.equal(result.entityType, entityType);
  assert.match(calls.at(-1).queryText, new RegExp(`attribution_${entityType}s`));
}

await assert.rejects(
  () => store.persist({ ...baseRecord, entity_type: 'customer' }),
  /Unsupported Square entity type/
);

console.log('square event store test passed');
