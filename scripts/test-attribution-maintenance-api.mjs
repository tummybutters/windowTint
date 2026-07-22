import assert from 'node:assert/strict';
import fs from 'node:fs';

const apiModule = await import('../api/attribution-maintenance.js');
const { createHandler } = apiModule.default;

const createMockResponse = () => ({
  statusCode: 200,
  headers: {},
  body: '',
  setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = JSON.stringify(payload); return this; },
  end(body = '') { this.body = body; return this; }
});

let pruneCalls = 0;
const handler = createHandler({
  cronSecret: 'test-cron-secret',
  store: {
    async prune(options) {
      pruneCalls += 1;
      assert.deepEqual(options, { eventRetentionDays: 400, failureRetentionDays: 30 });
      return { deletedEvents: 12, deletedFailures: 3, deletedRateLimitBuckets: 4 };
    }
  }
});

{
  const response = createMockResponse();
  await handler({
    method: 'GET',
    headers: { authorization: 'Bearer test-cron-secret' }
  }, response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    ok: true,
    deleted_events: 12,
    deleted_failures: 3,
    deleted_rate_limit_buckets: 4,
    event_retention_days: 400,
    failure_retention_days: 30
  });
  assert.equal(pruneCalls, 1);
}

{
  const response = createMockResponse();
  await handler({ method: 'GET', headers: {} }, response);
  assert.equal(response.statusCode, 401);
  assert.equal(pruneCalls, 1);
}

{
  const response = createMockResponse();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer test-cron-secret' }
  }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(pruneCalls, 1);
}

console.log('attribution maintenance api test passed');

const vercelConfig = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
assert.deepEqual(vercelConfig.crons, [{
  path: '/api/attribution-maintenance',
  schedule: '17 11 * * *'
}]);
