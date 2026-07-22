import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../lead-tracking.js', import.meta.url), 'utf8');
const data = new Map();
const localStorage = {
  getItem(key) {
    return data.has(key) ? data.get(key) : null;
  },
  setItem(key, value) {
    data.set(key, String(value));
  },
  removeItem(key) {
    data.delete(key);
  }
};
const requests = [];
let shouldFail = true;
let idCounter = 0;
const document = {
  readyState: 'complete',
  referrer: '',
  documentElement: {},
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {},
  createElement() { return {}; }
};
const window = {
  location: {
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=retry-click',
    origin: 'https://www.obsidianautoworksoc.com',
    pathname: '/vip-booking',
    search: '?gclid=retry-click'
  },
  crypto: {
    randomUUID() {
      idCounter += 1;
      return `00000000-0000-4000-8000-${String(idCounter).padStart(12, '0')}`;
    }
  },
  navigator: { sendBeacon() { return true; } },
  async fetch(url, options) {
    requests.push({ url, event: JSON.parse(options.body) });
    return { ok: !shouldFail };
  },
  requestAnimationFrame(callback) { callback(); },
  setInterval() {},
  setTimeout(callback) { callback(); },
  gtag() {}
};
const context = {
  URL,
  URLSearchParams,
  Date,
  Math,
  JSON,
  console,
  localStorage,
  document,
  window,
  MutationObserver: class { observe() {} }
};
window.window = window;
window.document = document;
window.localStorage = localStorage;
window.MutationObserver = context.MutationObserver;

vm.runInNewContext(script, context);
const tracker = window.obsidianLeadTracking;

await tracker.flushPendingEvents();
const failedPending = tracker.getPendingEvents();
assert.ok(failedPending.length >= 1, 'failed deliveries stay queued');
assert.ok(failedPending.some((entry) => entry.attempts >= 1), 'delivery attempts are recorded');

shouldFail = false;
await tracker.flushPendingEvents();
assert.equal(tracker.getPendingEvents().length, 0, 'acknowledged events leave the queue');

const uniqueEventIds = new Set(requests.map((request) => request.event.event_id));
assert.ok(uniqueEventIds.size >= 1);
assert.ok(requests.length > uniqueEventIds.size, 'the same event ID is retried after failure');

console.log('lead-event retry test passed');
