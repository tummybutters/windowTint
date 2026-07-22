import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildReconcileEnvelope,
  reconcileSquareEntities
} = require('../lib/square-reconcile.js');

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

console.log('square reconciliation test passed');
