import assert from 'node:assert/strict';
import normalizeModule from '../lib/square-webhook-normalize.js';

const {
  SquareWebhookValidationError,
  normalizeSquareWebhook
} = normalizeModule;

const secret = 'square-normalize-test-secret';
const receivedAt = '2026-07-21T21:00:01.000Z';

const envelope = (type, object, id = 'square-event-001') => ({
  merchant_id: 'merchant-001',
  type,
  event_id: id,
  created_at: '2026-07-21T21:00:00.000Z',
  data: {
    type: type.split('.')[0],
    id: object.id,
    object: { [type.split('.')[0]]: object }
  }
});

const staffBooking = normalizeSquareWebhook(envelope('booking.created', {
  id: 'booking-001',
  status: 'ACCEPTED',
  created_at: '2026-07-21T20:55:00.000Z',
  updated_at: '2026-07-21T20:56:00.000Z',
  start_at: '2026-07-22T18:00:00.000Z',
  location_id: 'location-001',
  customer_id: 'customer-sensitive-001',
  customer_note: 'Do not persist this customer note',
  seller_note: 'Do not persist this seller note',
  source: 'FIRST_PARTY_MERCHANT',
  creator_details: {
    creator_type: 'TEAM_MEMBER',
    team_member_id: 'team-member-sensitive-001'
  },
  appointment_segments: [
    { service_variation_id: 'service-001', duration_minutes: 120 }
  ],
  version: 3
}), {
  identitySecret: secret,
  rawBody: '{"booking":"redacted-body"}',
  receivedAt
});

assert.equal(staffBooking.entity_type, 'booking');
assert.equal(staffBooking.entity.provider_booking_id, 'booking-001');
assert.equal(staffBooking.entity.staff_created, true);
assert.equal(staffBooking.entity.booking_origin, 'staff');
assert.equal(staffBooking.entity.status, 'ACCEPTED');
assert.equal(staffBooking.entity.appointment_start_at, '2026-07-22T18:00:00.000Z');
assert.equal(staffBooking.entity.service_summary, 'service-001');
assert.equal(staffBooking.entity.customer_identity_hash.length, 64);
assert.equal(staffBooking.payload_digest.length, 64);
assert.doesNotMatch(JSON.stringify(staffBooking), /customer-sensitive-001|team-member-sensitive-001|customer note|seller note/i);

const customerBooking = normalizeSquareWebhook(envelope('booking.updated', {
  id: 'booking-002',
  status: 'CANCELLED_BY_CUSTOMER',
  source: 'FIRST_PARTY_BUYER',
  creator_details: { creator_type: 'CUSTOMER', customer_id: 'customer-sensitive-002' }
}, 'square-event-002'), {
  identitySecret: secret,
  rawBody: '{"booking":"customer"}',
  receivedAt
});
assert.equal(customerBooking.entity.staff_created, false);
assert.equal(customerBooking.entity.booking_origin, 'customer');

const unknownBooking = normalizeSquareWebhook(envelope('booking.updated', {
  id: 'booking-003',
  status: 'PENDING',
  source: 'API'
}, 'square-event-003'), {
  identitySecret: secret,
  rawBody: '{"booking":"api"}',
  receivedAt
});
assert.equal(unknownBooking.entity.staff_created, null);
assert.equal(unknownBooking.entity.booking_origin, 'unknown');

const payment = normalizeSquareWebhook(envelope('payment.updated', {
  id: 'payment-001',
  status: 'COMPLETED',
  created_at: '2026-07-21T20:00:00.000Z',
  updated_at: '2026-07-21T20:10:00.000Z',
  order_id: 'order-001',
  customer_id: 'customer-sensitive-001',
  buyer_email_address: 'private@example.com',
  source_type: 'CARD',
  total_money: { amount: 48000, currency: 'USD' },
  card_details: { card: { cardholder_name: 'Private Person', last_4: '1234' } }
}, 'square-event-004'), {
  identitySecret: secret,
  rawBody: '{"payment":"completed"}',
  receivedAt
});
assert.equal(payment.entity_type, 'payment');
assert.equal(payment.entity.provider_payment_id, 'payment-001');
assert.equal(payment.entity.amount_minor, 48000);
assert.equal(payment.entity.currency, 'USD');
assert.equal(payment.entity.provider_order_id, 'order-001');
assert.doesNotMatch(JSON.stringify(payment), /private@example.com|Private Person|1234/);

const order = normalizeSquareWebhook(envelope('order.fulfillment.updated', {
  id: 'order-001',
  state: 'COMPLETED',
  created_at: '2026-07-21T19:00:00.000Z',
  updated_at: '2026-07-21T21:00:00.000Z',
  closed_at: '2026-07-21T21:00:00.000Z',
  location_id: 'location-001',
  customer_id: 'customer-sensitive-001',
  total_money: { amount: 48000, currency: 'USD' },
  line_items: [{ name: 'Full Ceramic Tint', quantity: '1' }],
  fulfillments: [{ state: 'COMPLETED', type: 'PICKUP' }]
}, 'square-event-005'), {
  identitySecret: secret,
  rawBody: '{"order":"completed"}',
  receivedAt
});
assert.equal(order.entity_type, 'order');
assert.equal(order.entity.service_summary, 'Full Ceramic Tint');
assert.equal(order.entity.fulfillment_state, 'COMPLETED');

const refund = normalizeSquareWebhook(envelope('refund.updated', {
  id: 'refund-001',
  status: 'COMPLETED',
  payment_id: 'payment-001',
  order_id: 'order-001',
  created_at: '2026-07-21T22:00:00.000Z',
  updated_at: '2026-07-21T22:01:00.000Z',
  amount_money: { amount: 10000, currency: 'USD' }
}, 'square-event-006'), {
  identitySecret: secret,
  rawBody: '{"refund":"completed"}',
  receivedAt
});
assert.equal(refund.entity_type, 'refund');
assert.equal(refund.entity.provider_refund_id, 'refund-001');
assert.equal(refund.entity.amount_minor, 10000);

assert.throws(
  () => normalizeSquareWebhook(envelope('customer.created', { id: 'customer-001' }), {
    identitySecret: secret,
    rawBody: '{"customer":"created"}',
    receivedAt
  }),
  (error) => error instanceof SquareWebhookValidationError && error.code === 'unsupported_event_type'
);

assert.throws(
  () => normalizeSquareWebhook({ type: 'booking.created' }, {
    identitySecret: secret,
    rawBody: '{}',
    receivedAt
  }),
  (error) => error instanceof SquareWebhookValidationError && error.code === 'invalid_envelope'
);

console.log('square webhook normalization test passed');
