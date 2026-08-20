import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { saveThenOpenText } = require('../lib/commercial-lead-client.js');

const order = [];
let request;
await saveThenOpenText({
  endpoint: '/api/commercial-leads',
  payload: { submission_id: 'commercial_submission_0123456789abcdef', name: 'Tommy' },
  smsHref: 'sms:+17146007134?body=hello',
  fetchImpl: async (url, options) => {
    order.push('saved');
    request = { url, options };
    return { ok: true, status: 201, async json() { return { ok: true, lead_id: 'commercial_lead_1' }; } };
  },
  navigate: (href) => order.push(`opened:${href}`)
});

assert.deepEqual(order, ['saved', 'opened:sms:+17146007134?body=hello'], 'Messages must open only after storage succeeds.');
assert.equal(request.url, '/api/commercial-leads');
assert.equal(request.options.method, 'POST');
assert.equal(request.options.headers['Content-Type'], 'application/json');
assert.deepEqual(JSON.parse(request.options.body), { submission_id: 'commercial_submission_0123456789abcdef', name: 'Tommy' });

let navigated = false;
await assert.rejects(
  saveThenOpenText({
    endpoint: '/api/commercial-leads',
    payload: { name: 'Tommy' },
    smsHref: 'sms:+17146007134?body=hello',
    fetchImpl: async () => ({ ok: false, status: 503, async json() { return { ok: false }; } }),
    navigate: () => { navigated = true; }
  }),
  /save/i
);
assert.equal(navigated, false, 'Messages must remain closed when storage fails.');

console.log('commercial lead client contracts passed');
