import assert from 'node:assert/strict';

const { default: handler } = await import('../api/lead-events.js');

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
  event_name: 'vip_quiz_square_click',
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

{
  const response = createMockResponse();
  await handler({ method: 'POST', body: validEvent }, response);
  assert.equal(response.statusCode, 202);
  assert.deepEqual(JSON.parse(response.body), { ok: true });
}

{
  const response = createMockResponse();
  await handler({ method: 'GET' }, response);
  assert.equal(response.statusCode, 405);
}

{
  const response = createMockResponse();
  await handler({ method: 'POST', body: { session_id: 'missing-name' } }, response);
  assert.equal(response.statusCode, 400);
}

console.log('lead-events api test passed');
