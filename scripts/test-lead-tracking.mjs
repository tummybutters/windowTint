import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../lead-tracking.js', import.meta.url), 'utf8');

const createStorage = () => {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    }
  };
};

const localStorage = createStorage();
const gtagCalls = [];
const beacons = [];

const fakeDocument = {
  readyState: 'complete',
  referrer: 'https://www.google.com/',
  documentElement: {},
  querySelectorAll() {
    return [];
  },
  querySelector() {
    return null;
  },
  addEventListener() {},
  createElement(tagName) {
    return {
      tagName: tagName.toUpperCase(),
      setAttribute() {},
      getAttribute() {
        return '';
      }
    };
  }
};

const context = {
  URL,
  URLSearchParams,
  Date,
  Math,
  JSON,
  console,
  localStorage,
  document: fakeDocument,
  MutationObserver: class {
    observe() {}
  },
  window: {
    location: {
      href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=GCLID123&utm_campaign=agency-build&campaignid=23899221542&adgroupid=111&keyword=ceramic%20tint&matchtype=e&device=m',
      origin: 'https://www.obsidianautoworksoc.com',
      pathname: '/vip-booking',
      search: '?gclid=GCLID123&utm_campaign=agency-build&campaignid=23899221542&adgroupid=111&keyword=ceramic%20tint&matchtype=e&device=m'
    },
    crypto: {
      randomUUID() {
        return '00000000-0000-4000-8000-000000000001';
      }
    },
    dataLayer: [],
    gtag(...args) {
      gtagCalls.push(args);
    },
    navigator: {
      sendBeacon(url, body) {
        beacons.push({ url, body });
        return true;
      }
    },
    requestAnimationFrame(callback) {
      callback();
    },
    setInterval() {},
    setTimeout(callback) {
      callback();
    }
  }
};

context.window.window = context.window;
context.window.document = fakeDocument;
context.window.localStorage = localStorage;
context.window.MutationObserver = context.MutationObserver;

vm.runInNewContext(script, context);

const tracker = context.window.obsidianLeadTracking;

assert.ok(tracker, 'tracker is exposed on window');
assert.equal(typeof tracker.getLead, 'function');
assert.equal(typeof tracker.trackEvent, 'function');
assert.equal(typeof tracker.getEventLog, 'function');
assert.equal(typeof tracker.exportEventLog, 'function');

const lead = tracker.getLead();
assert.equal(lead.gclid, 'GCLID123');
assert.equal(lead.utm_campaign, 'agency-build');
assert.equal(lead.campaignid, '23899221542');
assert.equal(lead.adgroupid, '111');
assert.equal(lead.keyword, 'ceramic tint');
assert.equal(lead.matchtype, 'e');
assert.equal(lead.device, 'm');
assert.ok(lead.session_id.startsWith('obsidian_session_'));
assert.equal(lead.first_landing_page, context.window.location.href);

tracker.trackEvent('vip_quiz_answer', {
  quiz_step: 'vehicle',
  answer: 'tesla'
});

const eventLog = tracker.getEventLog();
const answerEvent = eventLog.find((event) => event.event_name === 'vip_quiz_answer');
assert.ok(answerEvent, 'quiz event is stored locally');
assert.equal(answerEvent.session_id, lead.session_id);
assert.equal(answerEvent.lead.gclid, 'GCLID123');
assert.equal(answerEvent.payload.answer, 'tesla');
assert.equal(answerEvent.page_path, '/vip-booking');
assert.ok(gtagCalls.some((call) => call[0] === 'event' && call[1] === 'vip_quiz_answer'));
assert.ok(beacons.some((beacon) => beacon.url === '/api/lead-events'));

tracker.trackEvent('square_booking_click', {
  link_url: 'https://book.squareup.com/appointments/py2a8n8lsuxp5n/location/LWC5SDBDX3R99/services/test',
  service_title: 'Tesla Model 3 - Full Car'
});

tracker.trackEvent('vip_quiz_square_click', {
  link_url: 'https://book.squareup.com/appointments/py2a8n8lsuxp5n/location/LWC5SDBDX3R99/services/test',
  service_title: 'Tesla Model 3 - Full Car'
});

tracker.trackEvent('phone_click', {
  link_url: 'tel:7146007134'
});

tracker.trackEvent('vip_quiz_call_click', {
  link_url: 'tel:7146007134'
});

const conversionCalls = gtagCalls.filter((call) => call[0] === 'event' && call[1] === 'conversion');
assert.equal(conversionCalls.length, 2, 'only generic Square and phone events fire Ads conversions');
assert.ok(
  conversionCalls.some((call) => call[2].send_to === 'AW-17846304809/3k3PCLD9u70cEKmA5L1C'),
  'Square booking click fires the Square Ads conversion'
);
assert.ok(
  conversionCalls.some((call) => call[2].send_to === 'AW-17846304809/GVSvCK39u70cEKmA5L1C'),
  'phone click fires the phone Ads conversion'
);
assert.ok(gtagCalls.some((call) => call[0] === 'event' && call[1] === 'vip_quiz_square_click'));
assert.ok(gtagCalls.some((call) => call[0] === 'event' && call[1] === 'vip_quiz_call_click'));

const exported = JSON.parse(tracker.exportEventLog());
assert.equal(exported.lead.session_id, lead.session_id);
assert.ok(exported.events.some((event) => event.event_name === 'vip_quiz_answer'));
assert.ok(exported.events.some((event) => event.event_name === 'square_booking_click'));
assert.ok(exported.events.some((event) => event.event_name === 'vip_quiz_square_click'));

console.log('lead-tracking smoke test passed');
