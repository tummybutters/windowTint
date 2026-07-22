import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const { createFetchHandler } = await import('../api/square-webhooks.mjs');

const signatureKey = 'square-vercel-adapter-key';
const notificationUrl = 'https://www.obsidianautoworksoc.com/api/square-webhooks';
const rawBody = JSON.stringify({
  merchant_id: 'merchant-adapter-001',
  type: 'booking.created',
  event_id: 'square-adapter-event-001',
  created_at: '2026-07-21T21:00:00.000Z',
  data: {
    type: 'booking',
    id: 'booking-adapter-001',
    object: {
      booking: {
        id: 'booking-adapter-001',
        status: 'ACCEPTED',
        source: 'FIRST_PARTY_BUYER'
      }
    }
  }
});
const signature = crypto
  .createHmac('sha256', signatureKey)
  .update(notificationUrl + rawBody)
  .digest('base64');

const persisted = [];
const handler = createFetchHandler({
  signatureKey,
  notificationUrl,
  identitySecret: 'square-adapter-identity',
  store: {
    async persist(record) {
      persisted.push(record);
      return { inserted: true, entityType: record.entity_type, applied: true };
    },
    async recordFailure() {}
  },
  now: () => '2026-07-21T21:00:01.000Z'
});

{
  const response = await handler(new Request(notificationUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-square-hmacsha256-signature': signature
    },
    body: rawBody
  }));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true, duplicate: false });
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].provider_event_id, 'square-adapter-event-001');
}

{
  const response = await handler(new Request(notificationUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: rawBody
  }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { ok: false, error: 'Invalid Square signature' });
}

{
  const response = await handler(new Request(notificationUrl, { method: 'GET' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
}

console.log('square webhooks Vercel adapter test passed');
