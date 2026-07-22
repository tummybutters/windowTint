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
let idCounter = 0;

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
        idCounter += 1;
        return `00000000-0000-4000-8000-${String(idCounter).padStart(12, '0')}`;
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
assert.equal(typeof tracker.getPendingEvents, 'function');
assert.equal(typeof tracker.flushPendingEvents, 'function');
assert.equal(typeof tracker.exportEventLog, 'function');
assert.equal(typeof tracker.configureWebsiteCallTracking, 'function');

const websiteCallConfigs = gtagCalls.filter(
  (call) => call[0] === 'config' && call[1] === 'AW-17846304809/060ZCNixtdQcEKmA5L1C'
);
assert.equal(websiteCallConfigs.length, 1, 'website call replacement is configured exactly once');
assert.equal(websiteCallConfigs[0][2].phone_conversion_number, '(714) 600-7134');
assert.equal(tracker.configureWebsiteCallTracking(), false, 'repeat configuration is deduplicated');
assert.equal(
  gtagCalls.filter(
    (call) => call[0] === 'config' && call[1] === 'AW-17846304809/060ZCNixtdQcEKmA5L1C'
  ).length,
  1,
  'manual retry does not duplicate website call configuration'
);

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
assert.ok(tracker.getPendingEvents().some((entry) => entry.event.event_id === answerEvent.event_id));

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
assert.equal(conversionCalls.length, 1, 'only the diagnostic phone-click event fires an Ads conversion');
assert.ok(
  !conversionCalls.some((call) => call[2].send_to === 'AW-17846304809/3k3PCLD9u70cEKmA5L1C'),
  'disabled Square links never fire the stale Square Ads conversion'
);
assert.ok(
  conversionCalls.some((call) => call[2].send_to === 'AW-17846304809/GVSvCK39u70cEKmA5L1C'),
  'phone click fires the phone Ads conversion'
);
assert.ok(gtagCalls.some((call) => call[0] === 'event' && call[1] === 'vip_quiz_square_click'));
assert.ok(gtagCalls.some((call) => call[0] === 'event' && call[1] === 'vip_quiz_call_click'));

const submittedEvents = [];
context.window.fetch = async (url, options) => {
  submittedEvents.push({ url, options });
  return { ok: true };
};

const consultationRequest = await tracker.submitLeadEvent('residential_consultation_request', {
  consultation_name: 'Test Homeowner',
  consultation_phone: '7146007134',
  consultation_city_zip: 'Irvine 92618',
  consultation_decision_maker: 'Homeowner and decision-maker',
  consultation_property_type: 'Single-family home',
  consultation_project_size: 'Several rooms',
  consultation_goal: 'Heat reduction',
  consultation_preferred_date: '2026-07-23',
  consultation_preferred_time: 'Morning',
  consultation_pricing_acknowledgement: 'acknowledged'
}, {
  lead: { phone: '7146007134' },
  analyticsPayload: {
    page_type: 'residential_window_film',
    consultation_goal: 'Heat reduction'
  }
});

assert.equal(consultationRequest.ok, true, 'a persisted consultation request reports success');
assert.equal(submittedEvents.length, 1, 'a consultation request posts to the first-party endpoint once');
assert.equal(submittedEvents[0].url, '/api/lead-events');
const submittedBody = JSON.parse(submittedEvents[0].options.body);
assert.equal(submittedBody.event_name, 'residential_consultation_request');
assert.equal(submittedBody.lead.phone, '7146007134');
assert.equal(submittedBody.payload.consultation_name, 'Test Homeowner');
assert.ok(
  gtagCalls.some((call) => call[0] === 'event' && call[1] === 'residential_consultation_request'),
  'a persisted consultation request emits a GA4 event'
);
assert.ok(
  !gtagCalls.some((call) => call[0] === 'conversion' && call[2].consultation_name === 'Test Homeowner'),
  'a consultation request never becomes an Ads conversion'
);

const exported = JSON.parse(tracker.exportEventLog());
assert.equal(exported.lead.session_id, lead.session_id);
assert.ok(exported.events.some((event) => event.event_name === 'vip_quiz_answer'));
assert.ok(exported.events.some((event) => event.event_name === 'square_booking_click'));
assert.ok(exported.events.some((event) => event.event_name === 'vip_quiz_square_click'));
assert.ok(exported.events.some((event) => event.event_name === 'residential_consultation_request'));

console.log('lead-tracking smoke test passed');
