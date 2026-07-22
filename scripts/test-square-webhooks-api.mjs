import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

const apiModule = await import('../lib/square-webhooks-handler.js');
const { createHandler } = apiModule.default;

const signatureKey = 'square-signature-test-key';
const notificationUrl = 'https://www.obsidianautoworksoc.com/api/square-webhooks';
const identitySecret = 'square-identity-test-secret';
const validEnvelope = {
  merchant_id: 'merchant-001',
  type: 'booking.created',
  event_id: 'square-event-api-001',
  created_at: '2026-07-21T21:00:00.000Z',
  data: {
    type: 'booking',
    id: 'booking-001',
    object: {
      booking: {
        id: 'booking-001',
        status: 'ACCEPTED',
        source: 'FIRST_PARTY_BUYER',
        creator_details: { creator_type: 'CUSTOMER', customer_id: 'customer-001' }
      }
    }
  }
};

const sign = (body) => crypto
  .createHmac('sha256', signatureKey)
  .update(notificationUrl + body)
  .digest('base64');

const requestFor = (body, signature = sign(body)) => {
  const request = Readable.from([Buffer.from(body)]);
  request.method = 'POST';
  request.headers = { 'x-square-hmacsha256-signature': signature };
  return request;
};

const createMockResponse = () => ({
  statusCode: 200,
  headers: {},
  body: '',
  setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = JSON.stringify(payload); return this; },
  end(body = '') { this.body = body; return this; }
});

const persisted = [];
const failures = [];
let inserted = true;
const handler = createHandler({
  signatureKey,
  notificationUrl,
  identitySecret,
  store: {
    async persist(record) {
      persisted.push(record);
      return { inserted, entityType: record.entity_type, entityId: record.entity.booking_id };
    },
    async recordFailure(failure) {
      failures.push(failure);
    }
  },
  now: () => '2026-07-21T21:00:01.000Z'
});

const rawBody = JSON.stringify(validEnvelope);
{
  const response = createMockResponse();
  await handler(requestFor(rawBody), response);
  assert.equal(response.statusCode, 202);
  assert.deepEqual(JSON.parse(response.body), { ok: true, duplicate: false });
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].provider_event_id, 'square-event-api-001');
}

{
  inserted = false;
  const response = createMockResponse();
  await handler(requestFor(rawBody), response);
  assert.equal(response.statusCode, 202);
  assert.deepEqual(JSON.parse(response.body), { ok: true, duplicate: true });
}

{
  const response = createMockResponse();
  await handler(requestFor(rawBody, 'tampered-signature'), response);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(JSON.parse(response.body), { ok: false, error: 'Invalid Square signature' });
}

{
  const request = requestFor(rawBody, '');
  const response = createMockResponse();
  await handler(request, response);
  assert.equal(response.statusCode, 403);
}

{
  const unsupportedEnvelope = JSON.stringify({
    ...validEnvelope,
    event_id: 'square-event-api-unsupported',
    type: 'customer.created'
  });
  const response = createMockResponse();
  await handler(requestFor(unsupportedEnvelope), response);
  assert.equal(response.statusCode, 400);
  assert.equal(failures.at(-1).eventId, 'square-event-api-unsupported');
  assert.equal(failures.at(-1).errorCode, 'unsupported_event_type');
  assert.equal(failures.at(-1).retryable, false);
}

{
  const response = createMockResponse();
  await handler({ method: 'GET', headers: {} }, response);
  assert.equal(response.statusCode, 405);
}

{
  const response = createMockResponse();
  await handler({
    method: 'POST',
    headers: { 'x-square-hmacsha256-signature': 'anything' },
    body: validEnvelope
  }, response);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), { ok: false, error: 'Raw request body required' });
}

{
  const oversized = 'x'.repeat(256 * 1024 + 1);
  const response = createMockResponse();
  await handler(requestFor(oversized), response);
  assert.equal(response.statusCode, 413);
}

{
  const storageFailures = [];
  const unavailableHandler = createHandler({
    signatureKey,
    notificationUrl,
    identitySecret,
    store: {
      async persist() {
        const error = new Error('database offline');
        error.code = 'database_offline';
        throw error;
      },
      async recordFailure(failure) {
        storageFailures.push(failure);
      }
    },
    now: () => '2026-07-21T21:00:01.000Z'
  });
  const response = createMockResponse();
  await unavailableHandler(requestFor(rawBody), response);
  assert.equal(response.statusCode, 503);
  assert.equal(storageFailures.length, 1);
  assert.equal(storageFailures[0].eventId, 'square-event-api-001');
  assert.equal(storageFailures[0].errorCode, 'database_offline');
  assert.equal(storageFailures[0].retryable, true);
}

console.log('square webhooks api test passed');
