import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  CACHE_CONTROL,
  DEFAULT_BOOKING_URL,
  DEFAULT_SERVICE_VARIATION_ID,
  DEFAULT_TEAM_MEMBER_ID,
  buildSearchBody,
  formatSlotLabel,
  resolveConfig,
  selectSlots
} = require('../lib/square-availability.js');
const { createHandler } = require('../api/square-availability.js');

const NOW = '2026-09-02T18:00:00.000Z';
const env = {
  SQUARE_ENVIRONMENT: 'production',
  SQUARE_ACCESS_TOKEN: 'test-token-never-logged'
};

const createResponse = () => {
  const state = { statusCode: 200, headers: {}, body: null };
  const res = {
    setHeader(name, value) { state.headers[name.toLowerCase()] = String(value); },
    status(code) { state.statusCode = code; return res; },
    json(payload) { state.body = payload; return res; }
  };
  return { res, state };
};

// --- label formatting in America/Los_Angeles ---
assert.equal(formatSlotLabel(new Date('2026-09-04T21:10:00Z')), 'Fri, Sep 4 · 2:10 PM');
assert.equal(formatSlotLabel(new Date('2026-12-15T17:00:00Z')), 'Tue, Dec 15 · 9:00 AM');

// --- config: env overrides win, otherwise discovered constants ---
assert.equal(resolveConfig(env).serviceVariationId, DEFAULT_SERVICE_VARIATION_ID);
assert.equal(resolveConfig(env).teamMemberId, DEFAULT_TEAM_MEMBER_ID);
assert.equal(resolveConfig(env).bookingUrl, DEFAULT_BOOKING_URL);
assert.equal(resolveConfig(env).baseUrl, 'https://connect.squareup.com');
assert.equal(resolveConfig({ ...env, SQUARE_ENVIRONMENT: 'sandbox' }).baseUrl, 'https://connect.squareupsandbox.com');
assert.equal(resolveConfig({
  ...env,
  SQUARE_AVAILABILITY_SERVICE_VARIATION_ID: 'VAR_OVERRIDE',
  SQUARE_AVAILABILITY_TEAM_MEMBER_ID: 'TM_OVERRIDE'
}).serviceVariationId, 'VAR_OVERRIDE');

// --- search body: 18h lead, 14 day window, team member filter ---
{
  const body = buildSearchBody({ ...resolveConfig(env), now: new Date(NOW) });
  assert.equal(body.query.filter.location_id, 'LWC5SDBDX3R99');
  assert.equal(body.query.filter.start_at_range.start_at, '2026-09-03T12:00:00Z');
  assert.equal(body.query.filter.start_at_range.end_at, '2026-09-17T12:00:00Z');
  assert.deepEqual(body.query.filter.segment_filters, [{
    service_variation_id: DEFAULT_SERVICE_VARIATION_ID,
    team_member_id_filter: { any: [DEFAULT_TEAM_MEMBER_ID] }
  }]);
}

// --- slot selection: soonest first, >= 18h out, deduped, max 3 ---
{
  const slots = selectSlots([
    { start_at: '2026-09-06T16:00:00Z' },
    { start_at: '2026-09-03T00:00:00Z' }, // only 6h out — excluded
    { start_at: '2026-09-04T21:10:00Z' },
    { start_at: '2026-09-04T21:10:00Z' }, // duplicate
    { start_at: 'not-a-date' },
    { start_at: '2026-09-05T15:00:00Z' },
    { start_at: '2026-09-07T15:00:00Z' }
  ], { now: new Date(NOW), bookingUrl: DEFAULT_BOOKING_URL });
  assert.deepEqual(slots, [
    { startAt: '2026-09-04T21:10:00Z', label: 'Fri, Sep 4 · 2:10 PM', bookingUrl: DEFAULT_BOOKING_URL },
    { startAt: '2026-09-05T15:00:00Z', label: 'Sat, Sep 5 · 8:00 AM', bookingUrl: DEFAULT_BOOKING_URL },
    { startAt: '2026-09-06T16:00:00Z', label: 'Sun, Sep 6 · 9:00 AM', bookingUrl: DEFAULT_BOOKING_URL }
  ]);
}

// --- handler: success path with mocked fetch ---
{
  const calls = [];
  const handler = createHandler({
    env,
    now: () => NOW,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({
        availabilities: [
          { start_at: '2026-09-05T15:00:00Z', location_id: 'LWC5SDBDX3R99' },
          { start_at: '2026-09-04T21:10:00Z', location_id: 'LWC5SDBDX3R99' }
        ]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });
  const { res, state } = createResponse();
  await handler({ method: 'GET', headers: {} }, res);

  assert.equal(state.statusCode, 200);
  assert.equal(state.headers['cache-control'], CACHE_CONTROL);
  assert.equal(state.body.ok, true);
  assert.equal(state.body.generatedAt, NOW);
  assert.deepEqual(state.body.slots.map((slot) => slot.startAt), ['2026-09-04T21:10:00Z', '2026-09-05T15:00:00Z']);
  assert.equal(state.body.slots[0].label, 'Fri, Sep 4 · 2:10 PM');
  assert.equal(state.body.slots[0].bookingUrl, DEFAULT_BOOKING_URL);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://connect.squareup.com/v2/bookings/availability/search');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-token-never-logged');
  assert.ok(calls[0].init.signal instanceof AbortSignal, 'request must carry an abort signal for the timeout');
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.query.filter.segment_filters[0].service_variation_id, DEFAULT_SERVICE_VARIATION_ID);
}

// --- handler: Square error -> 200 ok:false, logged, not cached ---
{
  const logged = [];
  const originalError = console.error;
  console.error = (...args) => logged.push(args.join(' '));
  try {
    const handler = createHandler({
      env,
      now: () => NOW,
      fetchImpl: async () => new Response(JSON.stringify({
        errors: [{ category: 'INVALID_REQUEST_ERROR', code: 'BAD_REQUEST', detail: 'boom' }]
      }), { status: 400 })
    });
    const { res, state } = createResponse();
    await handler({ method: 'GET', headers: {} }, res);
    assert.equal(state.statusCode, 200);
    assert.deepEqual(state.body, { ok: false, slots: [], generatedAt: NOW });
    assert.equal(state.headers['cache-control'], 'no-store');
    assert.equal(logged.length, 1);
    assert.match(logged[0], /square_availability_failed/);
    assert.match(logged[0], /BAD_REQUEST/);
    assert.doesNotMatch(logged[0], /test-token-never-logged/);
  } finally {
    console.error = originalError;
  }
}

// --- handler: fetch throws / times out -> 200 ok:false ---
{
  const originalError = console.error;
  console.error = () => {};
  try {
    const handler = createHandler({
      env,
      now: () => NOW,
      timeoutMs: 20,
      fetchImpl: (url, init) => new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      })
    });
    const { res, state } = createResponse();
    await handler({ method: 'GET', headers: {} }, res);
    assert.deepEqual(state.body, { ok: false, slots: [], generatedAt: NOW });
  } finally {
    console.error = originalError;
  }
}

// --- handler: missing token -> 200 ok:false without calling Square ---
{
  const originalError = console.error;
  console.error = () => {};
  try {
    let called = false;
    const handler = createHandler({
      env: { SQUARE_ENVIRONMENT: 'production' },
      now: () => NOW,
      fetchImpl: async () => { called = true; return new Response('{}'); }
    });
    const { res, state } = createResponse();
    await handler({ method: 'GET', headers: {} }, res);
    assert.equal(called, false);
    assert.deepEqual(state.body, { ok: false, slots: [], generatedAt: NOW });
  } finally {
    console.error = originalError;
  }
}

// --- handler: non-GET rejected with 405 ---
{
  const handler = createHandler({ env, now: () => NOW, fetchImpl: async () => new Response('{}') });
  const { res, state } = createResponse();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(state.statusCode, 405);
  assert.equal(state.headers.allow, 'GET, HEAD');
  assert.equal(state.body.ok, false);
}

console.log('square availability tests passed');
