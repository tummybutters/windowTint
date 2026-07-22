import assert from 'node:assert/strict';

const apiModule = await import('../api/lead-events.js');
const { createHandler } = apiModule.default;

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = JSON.stringify(payload);
      return this;
    },
    end(body = '') {
      this.body = body;
      return this;
    }
  };
  return response;
};

const validEvent = {
  event_id: 'obsidian_event_api_test_001',
  event_name: 'vip_quiz_call_click',
  event_time: '2026-06-04T20:00:00.000Z',
  session_id: 'obsidian_session_test',
  page_path: '/vip-booking',
  page_url: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=abc',
  lead: {
    gclid: 'abc',
    campaignid: '23899221542',
    adgroupid: '111',
    keyword: 'ceramic tint'
  },
  payload: {
    service_title: 'Tesla Model 3 - Full Car',
    service_price: '$1,150'
  }
};

const sameOriginRequest = (body = validEvent, overrides = {}) => ({
  method: 'POST',
  body,
  headers: {
    origin: 'https://www.obsidianautoworksoc.com',
    host: 'www.obsidianautoworksoc.com',
    'sec-fetch-site': 'same-origin',
    'x-forwarded-for': '203.0.113.5',
    ...overrides
  }
});

const persisted = [];
const failures = [];
const handler = createHandler({
  store: {
    async checkRateLimit() {
      return { allowed: true, requestCount: 1, limit: 60 };
    },
    async persist(record) {
      persisted.push(record);
      return { inserted: persisted.length === 1 };
    },
    async recordFailure(failure) {
      failures.push(failure);
    }
  },
  identitySecret: 'test-identity-secret'
});

{
  const response = createMockResponse();
  await handler(sameOriginRequest(), response);
  assert.equal(response.statusCode, 202);
  assert.deepEqual(JSON.parse(response.body), { ok: true, duplicate: false });
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].lead.gclid, 'abc');
}

{
  const response = createMockResponse();
  await handler(sameOriginRequest(), response);
  assert.equal(response.statusCode, 202);
  assert.deepEqual(JSON.parse(response.body), { ok: true, duplicate: true });
}

{
  const response = createMockResponse();
  await handler({ method: 'GET' }, response);
  assert.equal(response.statusCode, 405);
}

{
  const response = createMockResponse();
  await handler(sameOriginRequest({ session_id: 'missing-name' }), response);
  assert.equal(response.statusCode, 400);
  assert.equal(failures.at(-1).errorCode, 'invalid_lead_event');
  assert.equal(failures.at(-1).retryable, false);
}

{
  const response = createMockResponse();
  await handler({ method: 'POST', body: validEvent, headers: {} }, response);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(JSON.parse(response.body), { ok: false, error: 'Forbidden' });
}

{
  const response = createMockResponse();
  await handler(sameOriginRequest(validEvent, {
    origin: 'https://attacker.example',
    'sec-fetch-site': 'cross-site'
  }), response);
  assert.equal(response.statusCode, 403);
}

{
  let persistCalled = false;
  const rateLimitedHandler = createHandler({
    store: {
      async checkRateLimit() {
        return { allowed: false, requestCount: 61, limit: 60 };
      },
      async persist() {
        persistCalled = true;
        return { inserted: true };
      }
    },
    identitySecret: 'test-identity-secret'
  });
  const response = createMockResponse();
  await rateLimitedHandler(sameOriginRequest(), response);
  assert.equal(response.statusCode, 429);
  assert.equal(persistCalled, false);
}

{
  const storageFailures = [];
  const unavailableHandler = createHandler({
    store: {
      async checkRateLimit() {
        return { allowed: true, requestCount: 1, limit: 60 };
      },
      async persist() {
        const error = new Error('database offline');
        error.code = 'database_offline';
        throw error;
      },
      async recordFailure(failure) {
        storageFailures.push(failure);
      }
    },
    identitySecret: 'test-identity-secret'
  });
  const response = createMockResponse();
  await unavailableHandler(sameOriginRequest(), response);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(JSON.parse(response.body), { ok: false, error: 'Lead-event storage unavailable' });
  assert.equal(storageFailures.length, 1);
  assert.equal(storageFailures[0].eventId, validEvent.event_id);
  assert.equal(storageFailures[0].errorCode, 'database_offline');
  assert.equal(storageFailures[0].retryable, true);
}

console.log('lead-events api test passed');
