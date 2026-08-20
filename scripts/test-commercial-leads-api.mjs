import assert from 'node:assert/strict';

const apiModule = await import('../api/commercial-leads.js');
const { createHandler } = apiModule.default;

const response = () => ({
  statusCode: 200,
  headers: {},
  body: '',
  setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = JSON.stringify(payload); return this; },
  end(body = '') { this.body = body; return this; }
});

const validLead = {
  submission_id: 'commercial_submission_0123456789abcdef',
  session_id: 'obsidian_session_test',
  name: 'Tommy Test',
  phone: '7145550123',
  property_city: 'Irvine',
  additional_notes: '',
  answers: { property: 'office', goal: 'privacy_decorative', scope: 'small_building', timing: 'within_30_days' },
  attribution: { gclid: 'click-123', campaignid: '24117892229' }
};

const request = (body = validLead, headers = {}) => ({
  method: 'POST',
  body,
  headers: {
    origin: 'https://www.obsidianautoworksoc.com',
    host: 'www.obsidianautoworksoc.com',
    'sec-fetch-site': 'same-origin',
    'x-forwarded-for': '203.0.113.10',
    ...headers
  }
});

const persisted = [];
const handler = createHandler({
  identitySecret: 'test-secret',
  store: {
    async checkRateLimit() { return { allowed: true, requestCount: 1, limit: 20 }; },
    async persist(record) { persisted.push(record); return { leadId: record.lead_id, inserted: true }; }
  }
});

{
  const res = response();
  await handler(request(), res);
  assert.equal(res.statusCode, 201);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.match(body.lead_id, /^commercial_lead_/);
  assert.equal(persisted[0].name, 'Tommy Test');
  assert.equal(persisted[0].phone, '7145550123');
  assert.equal(persisted[0].attribution.gclid, 'click-123');
}

{
  const res = response();
  await handler(request(validLead, { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' }), res);
  assert.equal(res.statusCode, 403);
}

{
  const res = response();
  await handler(request({ ...validLead, phone: '' }), res);
  assert.equal(res.statusCode, 400);
}

{
  const res = response();
  await handler(request({ ...validLead, additional_notes: 'x'.repeat(40 * 1024) }), res);
  assert.equal(res.statusCode, 413, 'Pre-parsed serverless request bodies must still honor the byte limit.');
}

{
  let opened = false;
  const unavailable = createHandler({
    identitySecret: 'test-secret',
    store: {
      async checkRateLimit() { return { allowed: true, requestCount: 1, limit: 20 }; },
      async persist() { opened = true; throw new Error('database offline'); }
    }
  });
  const res = response();
  await unavailable(request(), res);
  assert.equal(opened, true);
  assert.equal(res.statusCode, 503);
  assert.equal(JSON.parse(res.body).ok, false);
}

{
  const conflict = new Error('submission changed');
  conflict.code = 'commercial_lead_conflict';
  const conflictHandler = createHandler({
    identitySecret: 'test-secret',
    store: {
      async checkRateLimit() { return { allowed: true, requestCount: 1, limit: 20 }; },
      async persist() { throw conflict; }
    }
  });
  const res = response();
  await conflictHandler(request(), res);
  assert.equal(res.statusCode, 409);
}

console.log('commercial leads api contracts passed');
