import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildReconcileEnvelope,
  reconcileSquareEntities
} = require('../lib/square-reconcile.js');
const { hashIdentity } = require('../lib/square-webhook-normalize.js');

const booking = {
  id: 'booking-1',
  status: 'ACCEPTED',
  customer_id: 'customer-private',
  start_at: '2026-07-22T17:00:00Z',
  created_at: '2026-07-20T12:00:00Z',
  updated_at: '2026-07-21T12:00:00Z'
};

const first = buildReconcileEnvelope('booking', booking, { merchantId: 'merchant-1' });
const second = buildReconcileEnvelope('booking', booking, { merchantId: 'merchant-1' });
assert.deepEqual(first, second, 'the same Square entity update must get the same recovery event ID');
assert.equal(first.type, 'booking.updated');
assert.match(first.event_id, /^reconcile:booking:booking-1:/);
assert.equal(first.data.object.booking.id, 'booking-1');

const changed = buildReconcileEnvelope('booking', {
  ...booking,
  status: 'CANCELLED_BY_CUSTOMER',
  updated_at: '2026-07-21T13:00:00Z'
}, { merchantId: 'merchant-1' });
assert.notEqual(first.event_id, changed.event_id);

const paymentEnvelope = buildReconcileEnvelope('payment', {
  id: 'payment-1',
  status: 'COMPLETED',
  amount_money: { amount: 25000n, currency: 'USD' },
  updated_at: '2026-07-21T13:00:00Z'
});
assert.doesNotThrow(() => JSON.stringify(paymentEnvelope));
assert.equal(paymentEnvelope.data.object.payment.amount_money.amount, '25000');

assert.throws(() => buildReconcileEnvelope('customer', { id: 'customer-1' }), /unsupported/i);
assert.throws(() => buildReconcileEnvelope('payment', {}), /missing an id/i);

const persisted = [];
const result = await reconcileSquareEntities({
  entityType: 'booking',
  entities: [booking, booking],
  identitySecret: 'test-secret',
  merchantId: 'merchant-1',
  receivedAt: '2026-07-21T14:00:00Z',
  store: {
    async persist(record) {
      persisted.push(record);
      return { inserted: persisted.length === 1, entityType: record.entity_type };
    }
  }
});

assert.deepEqual(result, { scanned: 2, inserted: 1, duplicates: 1, failed: 0 });
assert.equal(persisted[0].entity.customer_identity_hash.length, 64);
assert.doesNotMatch(JSON.stringify(persisted[0]), /customer-private/);

// --- Square SDK v45 camelCase reconciliation shape compatibility ---

const IDENTITY_SECRET = 'test-secret';

const assertSnakeCaseKeys = (value, path = '') => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSnakeCaseKeys(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      assert.ok(!/[A-Z]/.test(key), `expected snake_case key but found "${key}" at ${path || '<root>'}`);
      assertSnakeCaseKeys(value[key], `${path}.${key}`);
    }
  }
};

const captureStore = () => {
  const persisted = [];
  return {
    persisted,
    async persist(record) {
      persisted.push(record);
      return { inserted: true, entityType: record.entity_type };
    }
  };
};

const sdkBooking = {
  id: 'sdk-booking-1',
  status: 'ACCEPTED',
  customerId: 'sdk-customer-1',
  locationId: 'location-1',
  source: 'FIRST_PARTY_BUYER',
  createdAt: '2026-08-01T12:00:00Z',
  updatedAt: '2026-08-02T12:00:00Z',
  startAt: '2026-08-05T17:00:00Z',
  version: 3,
  creatorDetails: { creatorType: 'CUSTOMER' },
  appointmentSegments: [
    { serviceVariationId: 'service-window-tint' },
    { serviceVariationId: 'service-ceramic-coat' }
  ]
};

const sdkPayment = {
  id: 'sdk-payment-1',
  status: 'COMPLETED',
  orderId: 'sdk-order-1',
  customerId: 'sdk-customer-1',
  locationId: 'location-1',
  sourceType: 'CARD',
  createdAt: '2026-08-01T12:05:00Z',
  updatedAt: '2026-08-01T12:06:00Z',
  totalMoney: { amount: 25000n, currency: 'USD' }
};

const sdkOrder = {
  id: 'sdk-order-1',
  state: 'COMPLETED',
  customerId: 'sdk-customer-1',
  locationId: 'location-1',
  createdAt: '2026-08-01T12:00:00Z',
  updatedAt: '2026-08-01T12:10:00Z',
  closedAt: '2026-08-01T12:15:00Z',
  version: 2,
  totalMoney: { amount: 25000n, currency: 'USD' },
  lineItems: [
    { name: 'Commercial Window Film Install' },
    { name: 'Ceramic Coating Add-on' }
  ],
  fulfillments: [
    { state: 'PROPOSED' },
    { state: 'COMPLETED' }
  ],
  source: { name: 'Square Point of Sale' }
};

const sdkRefund = {
  id: 'sdk-refund-1',
  status: 'COMPLETED',
  paymentId: 'sdk-payment-1',
  orderId: 'sdk-order-1',
  locationId: 'location-1',
  createdAt: '2026-08-03T09:00:00Z',
  updatedAt: '2026-08-03T09:05:00Z',
  amountMoney: { amount: 5000n, currency: 'USD' }
};

const expectedCustomerHash = hashIdentity(IDENTITY_SECRET, 'square_customer_id', 'sdk-customer-1');

// Booking: SDK camelCase must normalize through the real snake_case-only normalizer.
{
  const store = captureStore();
  const result = await reconcileSquareEntities({
    entityType: 'booking',
    entities: [sdkBooking],
    identitySecret: IDENTITY_SECRET,
    merchantId: 'merchant-1',
    receivedAt: '2026-08-05T18:00:00Z',
    store
  });
  assert.deepEqual(result, { scanned: 1, inserted: 1, duplicates: 0, failed: 0 });
  const entity = store.persisted[0].entity;
  assert.equal(entity.provider_booking_id, 'sdk-booking-1');
  assert.equal(entity.status, 'ACCEPTED');
  assert.equal(entity.customer_identity_hash, expectedCustomerHash);
  assert.equal(entity.provider_created_at, '2026-08-01T12:00:00.000Z');
  assert.equal(entity.appointment_start_at, '2026-08-05T17:00:00.000Z');
  assert.equal(entity.service_summary, 'service-window-tint, service-ceramic-coat');
  assert.equal(entity.booking_origin, 'customer');
  assert.equal(entity.metadata.provider_updated_at, '2026-08-02T12:00:00.000Z');
  assert.equal(entity.metadata.location_id, 'location-1');
}

// Payment: SDK camelCase must retain order link, amount/currency, and timestamps.
{
  const store = captureStore();
  const result = await reconcileSquareEntities({
    entityType: 'payment',
    entities: [sdkPayment],
    identitySecret: IDENTITY_SECRET,
    merchantId: 'merchant-1',
    receivedAt: '2026-08-01T13:00:00Z',
    store
  });
  assert.deepEqual(result, { scanned: 1, inserted: 1, duplicates: 0, failed: 0 });
  const entity = store.persisted[0].entity;
  assert.equal(entity.provider_payment_id, 'sdk-payment-1');
  assert.equal(entity.provider_order_id, 'sdk-order-1');
  assert.equal(entity.status, 'COMPLETED');
  assert.equal(entity.customer_identity_hash, expectedCustomerHash);
  assert.equal(entity.amount_minor, 25000);
  assert.equal(entity.currency, 'USD');
  assert.equal(entity.provider_created_at, '2026-08-01T12:05:00.000Z');
  assert.equal(entity.metadata.location_id, 'location-1');
  assert.equal(entity.metadata.source_type, 'CARD');
  assert.equal(entity.metadata.provider_updated_at, '2026-08-01T12:06:00.000Z');
}

// Order: SDK camelCase must retain state, line items, fulfillment state, and money.
{
  const store = captureStore();
  const result = await reconcileSquareEntities({
    entityType: 'order',
    entities: [sdkOrder],
    identitySecret: IDENTITY_SECRET,
    merchantId: 'merchant-1',
    receivedAt: '2026-08-01T13:00:00Z',
    store
  });
  assert.deepEqual(result, { scanned: 1, inserted: 1, duplicates: 0, failed: 0 });
  const entity = store.persisted[0].entity;
  assert.equal(entity.provider_order_id, 'sdk-order-1');
  assert.equal(entity.state, 'COMPLETED');
  assert.equal(entity.customer_identity_hash, expectedCustomerHash);
  assert.equal(entity.amount_minor, 25000);
  assert.equal(entity.currency, 'USD');
  assert.equal(entity.provider_created_at, '2026-08-01T12:00:00.000Z');
  assert.equal(entity.provider_updated_at, '2026-08-01T12:10:00.000Z');
  assert.equal(entity.closed_at, '2026-08-01T12:15:00.000Z');
  assert.equal(entity.fulfillment_state, 'COMPLETED');
  assert.equal(entity.service_summary, 'Commercial Window Film Install, Ceramic Coating Add-on');
  assert.equal(entity.metadata.location_id, 'location-1');
  assert.equal(entity.metadata.source_name, 'Square Point of Sale');
  assert.equal(entity.metadata.line_item_count, 2);
}

// Refund: SDK camelCase must retain payment/order links, status, amount/currency.
{
  const store = captureStore();
  const result = await reconcileSquareEntities({
    entityType: 'refund',
    entities: [sdkRefund],
    identitySecret: IDENTITY_SECRET,
    merchantId: 'merchant-1',
    receivedAt: '2026-08-03T10:00:00Z',
    store
  });
  assert.deepEqual(result, { scanned: 1, inserted: 1, duplicates: 0, failed: 0 });
  const entity = store.persisted[0].entity;
  assert.equal(entity.provider_refund_id, 'sdk-refund-1');
  assert.equal(entity.provider_payment_id, 'sdk-payment-1');
  assert.equal(entity.provider_order_id, 'sdk-order-1');
  assert.equal(entity.status, 'COMPLETED');
  assert.equal(entity.amount_minor, 5000);
  assert.equal(entity.currency, 'USD');
  assert.equal(entity.provider_created_at, '2026-08-03T09:00:00.000Z');
  assert.equal(entity.metadata.location_id, 'location-1');
}

// The synthetic envelope must carry only snake_case keys for the entity payload.
{
  const envelope = buildReconcileEnvelope('order', sdkOrder, { merchantId: 'merchant-1' });
  assertSnakeCaseKeys(envelope.data.object.order);
  const serialized = JSON.stringify(envelope.data.object.order);
  for (const camelField of [
    'createdAt', 'updatedAt', 'closedAt', 'customerId', 'locationId',
    'totalMoney', 'lineItems'
  ]) {
    assert.ok(!serialized.includes(`"${camelField}"`), `envelope must not retain camelCase field "${camelField}"`);
  }
  assert.equal(envelope.data.object.order.customer_id, 'sdk-customer-1');
  assert.equal(envelope.data.object.order.total_money.amount, '25000');
  assert.equal(envelope.data.object.order.line_items[0].name, 'Commercial Window Film Install');
}

// Explicit snake_case must win over a camelCase alias collision on the same entity.
{
  const collisionOrder = {
    id: 'sdk-order-collision',
    state: 'COMPLETED',
    customerId: 'camel-customer-should-lose',
    customer_id: 'snake-customer-should-win',
    createdAt: '2026-08-01T00:00:00Z',
    totalMoney: { amount: 1000n, currency: 'USD' }
  };
  const envelope = buildReconcileEnvelope('order', collisionOrder, { merchantId: 'merchant-1' });
  assert.equal(envelope.data.object.order.customer_id, 'snake-customer-should-win');
  assert.ok(!Object.prototype.hasOwnProperty.call(envelope.data.object.order, 'customerId'));

  const store = captureStore();
  await reconcileSquareEntities({
    entityType: 'order',
    entities: [collisionOrder],
    identitySecret: IDENTITY_SECRET,
    merchantId: 'merchant-1',
    receivedAt: '2026-08-01T01:00:00Z',
    store
  });
  const expectedCollisionHash = hashIdentity(IDENTITY_SECRET, 'square_customer_id', 'snake-customer-should-win');
  assert.equal(store.persisted[0].entity.customer_identity_hash, expectedCollisionHash);
}

console.log('square reconciliation test passed');
