import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import normalizeModule from '../lib/lead-event-normalize.js';

const { TOUCH_ID, LEAD_INTENT_ID, LEAD_REFERENCE } = normalizeModule;
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

tracker.trackEvent('text_click', {
  link_url: 'sms:7146007134'
});

tracker.trackEvent('vip_quiz_call_click', {
  link_url: 'tel:7146007134'
});

const conversionCalls = gtagCalls.filter((call) => call[0] === 'event' && call[1] === 'conversion');
assert.equal(conversionCalls.length, 2, 'phone and text clicks each fire one Ads conversion');
assert.ok(
  !conversionCalls.some((call) => call[2].send_to === 'AW-17846304809/3k3PCLD9u70cEKmA5L1C'),
  'disabled Square links never fire the stale Square Ads conversion'
);
assert.ok(
  conversionCalls.some((call) => call[2].send_to === 'AW-17846304809/GVSvCK39u70cEKmA5L1C'),
  'phone click fires the phone Ads conversion'
);
assert.ok(
  conversionCalls.some((call) => call[2].send_to === 'AW-17846304809/CyqpCMPso9kcEKmA5L1C'),
  'text click fires the text Ads conversion'
);
assert.ok(gtagCalls.some((call) => call[0] === 'event' && call[1] === 'vip_quiz_square_click'));
assert.ok(gtagCalls.some((call) => call[0] === 'event' && call[1] === 'vip_quiz_call_click'));

const exported = JSON.parse(tracker.exportEventLog());
assert.equal(exported.lead.session_id, lead.session_id);
assert.ok(exported.events.some((event) => event.event_name === 'vip_quiz_answer'));
assert.ok(exported.events.some((event) => event.event_name === 'square_booking_click'));
assert.ok(exported.events.some((event) => event.event_name === 'vip_quiz_square_click'));

const coatingStorage = createStorage();
const coatingGtagCalls = [];
const coatingDocument = {
  ...fakeDocument,
  documentElement: {
    getAttribute(name) {
      if (name === 'data-lead-service') return 'ceramic_coating';
      if (name === 'data-lead-variant') return 'coating_general_v1';
      return '';
    }
  }
};
const coatingWindow = {
  location: {
    href: 'https://www.obsidianautoworksoc.com/ceramic-coating?gclid=COATING123&campaignid=24054610950',
    origin: 'https://www.obsidianautoworksoc.com',
    pathname: '/ceramic-coating',
    search: '?gclid=COATING123&campaignid=24054610950'
  },
  crypto: context.window.crypto,
  dataLayer: [],
  gtag(...args) {
    coatingGtagCalls.push(args);
  },
  navigator: {
    sendBeacon() {
      return true;
    }
  },
  requestAnimationFrame(callback) {
    callback();
  },
  setInterval() {},
  setTimeout(callback) {
    callback();
  },
  OBSIDIAN_GOOGLE_ADS_CONFIG: {
    id: 'AW-COATING',
    websiteCallConfigId: '',
    conversions: {
      phone_click: 'COATING_PHONE',
      text_click: 'COATING_TEXT'
    }
  }
};
const coatingContext = {
  URL,
  URLSearchParams,
  Date,
  Math,
  JSON,
  console,
  localStorage: coatingStorage,
  document: coatingDocument,
  MutationObserver: context.MutationObserver,
  window: coatingWindow
};
coatingWindow.window = coatingWindow;
coatingWindow.document = coatingDocument;
coatingWindow.localStorage = coatingStorage;
coatingWindow.MutationObserver = coatingContext.MutationObserver;

vm.runInNewContext(script, coatingContext);

const coatingTracker = coatingWindow.obsidianLeadTracking;
const coatingPageView = coatingTracker.getEventLog().find(
  (event) => event.event_name === 'paid_landing_page_view'
);
assert.ok(coatingPageView, 'attributed paid landing pages record a dedicated page view');
assert.equal(coatingPageView.payload.service, 'ceramic_coating');
assert.equal(coatingPageView.payload.landing_variant, 'coating_general_v1');

coatingTracker.trackEvent('phone_click', { link_url: 'tel:7146007134' });
coatingTracker.trackEvent('text_click', { link_url: 'sms:7146007134' });

const coatingConversions = coatingGtagCalls.filter(
  (call) => call[0] === 'event' && call[1] === 'conversion'
);
assert.deepEqual(
  coatingConversions.map((call) => call[2].send_to),
  ['AW-COATING/COATING_PHONE', 'AW-COATING/COATING_TEXT'],
  'coating phone and text clicks route only to the coating Ads account'
);
assert.ok(
  !coatingGtagCalls.some((call) => String(call[1] || '').startsWith('AW-17846304809')),
  'coating pages never initialize the mobile-tint Ads account'
);
assert.equal(
  coatingTracker.configureWebsiteCallTracking(),
  false,
  'coating pages leave mobile-tint website call replacement disabled'
);

// ---------------------------------------------------------------------------
// Task 3: immutable browser touches and OA lead-intent references
// ---------------------------------------------------------------------------

const secureCrypto = {
  randomUUID: webcrypto.randomUUID.bind(webcrypto),
  getRandomValues: (typedArray) => webcrypto.getRandomValues(typedArray)
};

const createFakeDocument = (nodesBySelector = {}) => ({
  readyState: 'complete',
  referrer: 'https://www.google.com/',
  documentElement: {},
  querySelectorAll(selector) {
    return nodesBySelector[selector] || [];
  },
  querySelector() {
    return null;
  },
  addEventListener() {},
  createElement(tagName) {
    const node = { tagName: tagName.toUpperCase(), __attrs: {} };
    node.setAttribute = (name, value) => {
      node.__attrs[name] = value;
    };
    node.getAttribute = (name) => (name in node.__attrs ? node.__attrs[name] : '');
    return node;
  }
});

const createFakeAnchor = (href) => {
  const node = { tagName: 'A', __attrs: { href } };
  node.getAttribute = (name) => (name in node.__attrs ? node.__attrs[name] : '');
  node.setAttribute = (name, value) => {
    node.__attrs[name] = value;
  };
  return node;
};

const createFakeForm = () => {
  const inputs = new Map();
  return {
    tagName: 'FORM',
    inputs,
    querySelector(selector) {
      const match = /^input\[name="([^"]+)"\]$/.exec(selector);
      if (!match) return null;
      return inputs.get(match[1]) || null;
    },
    appendChild(node) {
      inputs.set(node.name, node);
    }
  };
};

const createContext = ({ href, storage, doc, crypto, adsConfig }) => {
  const gtagCalls = [];
  const beacons = [];
  const url = new URL(href);
  const win = {
    location: { href, origin: url.origin, pathname: url.pathname, search: url.search },
    crypto,
    dataLayer: [],
    gtag(...args) {
      gtagCalls.push(args);
    },
    navigator: {
      sendBeacon(beaconUrl, body) {
        beacons.push({ url: beaconUrl, body });
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
  };
  if (adsConfig) win.OBSIDIAN_GOOGLE_ADS_CONFIG = adsConfig;
  win.window = win;
  win.document = doc;
  win.localStorage = storage;
  win.MutationObserver = class {
    observe() {}
  };

  const ctx = {
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
    console,
    localStorage: storage,
    document: doc,
    MutationObserver: win.MutationObserver,
    window: win
  };

  vm.runInNewContext(script, ctx);

  return { window: win, tracker: win.obsidianLeadTracking, gtagCalls, beacons };
};

// --- Scenario A: paid landings create immutable touches; non-paid pages reuse them ---
{
  const storage = createStorage();

  const run1 = createContext({
    href: 'https://www.obsidianautoworksoc.com/landing?gclid=CLICKA&utm_campaign=camp-a&campaignid=111&adgroupid=222&keyword=tint&matchtype=e&device=m',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });

  const touch1 = run1.tracker.getCurrentTouch();
  assert.ok(touch1, 'first paid landing creates a touch');
  assert.match(touch1.touch_id, TOUCH_ID, 'touch_id matches the server-accepted format');
  assert.equal(touch1.gclid, 'CLICKA');
  assert.equal(touch1.campaign_id, '111', 'campaignid maps to migration-style campaign_id');
  assert.equal(touch1.ad_group_id, '222', 'adgroupid maps to migration-style ad_group_id');
  assert.equal(touch1.keyword, 'tint');
  assert.equal(touch1.match_type, 'e', 'matchtype maps to migration-style match_type');
  assert.equal(touch1.device, 'm');

  const paidTouchEvents1 = run1.tracker.getEventLog().filter((event) => event.event_name === 'paid_touch');
  assert.equal(paidTouchEvents1.length, 1, 'exactly one paid_touch event on first landing');
  assert.equal(paidTouchEvents1[0].touch.touch_id, touch1.touch_id);
  assert.equal(paidTouchEvents1[0].lead_intent, undefined, 'a new paid-touch event never carries a lead_intent');

  const run2 = createContext({
    href: 'https://www.obsidianautoworksoc.com/landing?gclid=CLICKB&utm_campaign=camp-b',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });

  const touch2 = run2.tracker.getCurrentTouch();
  assert.ok(touch2, 'a second distinct paid landing creates a second touch');
  assert.notEqual(touch2.touch_id, touch1.touch_id);
  assert.equal(touch2.gclid, 'CLICKB');

  const paidTouchEvents2 = run2.tracker.getEventLog().filter((event) => event.event_name === 'paid_touch');
  assert.equal(paidTouchEvents2.length, 2, 'the second landing adds a second touch event, not replacing the first');
  const firstTouchEventStillIntact = paidTouchEvents2.find((event) => event.touch.touch_id === touch1.touch_id);
  assert.ok(firstTouchEventStillIntact, 'the first touch event remains in the log');
  assert.equal(firstTouchEventStillIntact.touch.gclid, 'CLICKA', 'the first touch snapshot is unchanged by the second landing');

  const run3 = createContext({
    href: 'https://www.obsidianautoworksoc.com/some-page',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });

  const touch3 = run3.tracker.getCurrentTouch();
  assert.equal(touch3.touch_id, touch2.touch_id, 'a non-paid page reuses the current touch');
  assert.equal(
    run3.tracker.getEventLog().filter((event) => event.event_name === 'paid_touch').length,
    2,
    'a non-paid page view does not create another touch'
  );
}

// --- Scenario B: first lead action creates one intent + OA reference; repeats reuse it ---
{
  const storage = createStorage();
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKC&campaignid=333',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });

  const touch = tracker.getCurrentTouch();
  assert.ok(touch, 'a touch exists before the first lead action');
  assert.equal(tracker.getCurrentIntent(), null, 'no intent exists before any lead action');

  tracker.trackEvent('phone_click', { link_url: 'tel:7146007134' });

  const intent = tracker.getCurrentIntent();
  assert.ok(intent, 'the first phone action creates a lead intent');
  assert.match(intent.lead_intent_id, LEAD_INTENT_ID);
  assert.match(intent.reference_code, LEAD_REFERENCE);
  assert.equal(intent.touch_id, touch.touch_id, 'the intent binds to the current touch');
  assert.equal(intent.first_channel, 'phone');

  const firstPhoneEvent = tracker.getEventLog().find((event) => event.event_name === 'phone_click');
  assert.ok(firstPhoneEvent, 'the phone click is recorded');
  assert.deepEqual(firstPhoneEvent.lead_intent, intent, 'the creating event carries the lead_intent');
  assert.ok(firstPhoneEvent.touch, 'the creating event includes the immutable touch snapshot for an atomic server insert');
  assert.equal(firstPhoneEvent.touch.touch_id, touch.touch_id);

  tracker.trackEvent('phone_click', { link_url: 'tel:7146007134' });

  assert.deepEqual(tracker.getCurrentIntent(), intent, 'repeated actions reuse the same intent and reference');

  const phoneEvents = tracker.getEventLog().filter((event) => event.event_name === 'phone_click');
  assert.equal(phoneEvents.length, 2);
  assert.deepEqual(phoneEvents[1].lead_intent, intent, 'the repeated action still carries the unchanged intent');
  assert.equal(phoneEvents[1].touch, undefined, 'the repeated action does not resend the already-landed touch snapshot');
}

// --- Scenario C: SMS bodies get the OA reference without changing the destination ---
{
  const storage = createStorage();
  const smsNode = createFakeAnchor('sms:7146007134');
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKD',
    storage,
    doc: createFakeDocument({ 'a[href^="sms:"]': [smsNode] }),
    crypto: secureCrypto
  });

  const intent = tracker.getCurrentIntent();
  assert.ok(intent, 'boot-time decoration creates the lead intent for the text channel');
  assert.equal(intent.first_channel, 'text');

  const decoratedHref = smsNode.getAttribute('href');
  assert.ok(decoratedHref.startsWith('sms:7146007134?'), 'the destination number is unchanged');
  const [, query] = decoratedHref.split('?');
  const body = new URLSearchParams(query).get('body');
  assert.ok(body.includes(`Ref: ${intent.reference_code}`), 'the sms body carries the OA reference');

  tracker.decorateTextLinks();
  const secondPassHref = smsNode.getAttribute('href');
  assert.equal(
    secondPassHref.split(intent.reference_code).length - 1,
    1,
    'repeated decoration does not duplicate the reference'
  );
}

// --- Scenario D: forms receive the four hidden lead-reference fields ---
{
  const storage = createStorage();
  const formNode = createFakeForm();
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKE',
    storage,
    doc: createFakeDocument({ form: [formNode] }),
    crypto: secureCrypto
  });

  const intent = tracker.getCurrentIntent();
  const touch = tracker.getCurrentTouch();
  assert.ok(intent, 'boot-time decoration creates the lead intent for the form channel');
  assert.equal(intent.first_channel, 'form');

  assert.equal(formNode.inputs.get('lead_intent_id').value, intent.lead_intent_id);
  assert.equal(formNode.inputs.get('lead_reference').value, intent.reference_code);
  assert.equal(formNode.inputs.get('lead_session_id').value, tracker.getLead().session_id);
  assert.equal(formNode.inputs.get('lead_touch_id').value, touch.touch_id);

  const creationEvent = tracker.getEventLog().find((event) => event.event_name === 'lead_intent_created');
  assert.ok(creationEvent, 'form-triggered intent creation is durably persisted via an event');
  assert.deepEqual(creationEvent.lead_intent, intent);
  assert.equal(creationEvent.touch.touch_id, touch.touch_id);
}

// --- Scenario E: phone hrefs are never modified ---
{
  const storage = createStorage();
  const telNode = createFakeAnchor('tel:7146007134');
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKF',
    storage,
    doc: createFakeDocument({ 'a[href^="tel:"]': [telNode] }),
    crypto: secureCrypto
  });

  tracker.trackEvent('phone_click', { link_url: 'tel:7146007134' });

  assert.equal(telNode.getAttribute('href'), 'tel:7146007134', 'the phone href is never modified');
}

// --- Scenario F: Web Crypto absence preserves the action and emits no weak reference/intent ---
{
  const storage = createStorage();
  const smsNode = createFakeAnchor('sms:7146007134');
  const formNode = createFakeForm();
  const { tracker, gtagCalls } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKG',
    storage,
    doc: createFakeDocument({ 'a[href^="sms:"]': [smsNode], form: [formNode] }),
    crypto: undefined
  });

  assert.equal(tracker.getCurrentTouch(), null, 'no touch is created without Web Crypto');
  assert.equal(smsNode.getAttribute('href'), 'sms:7146007134', 'the sms link is left undecorated without Web Crypto');
  assert.equal(formNode.inputs.get('lead_intent_id'), undefined, 'no lead_intent hidden field without Web Crypto');
  assert.equal(formNode.inputs.get('lead_reference'), undefined, 'no lead_reference hidden field without Web Crypto');
  assert.ok(formNode.inputs.get('lead_session_id').value, 'existing session hidden field still populates');

  tracker.trackEvent('phone_click', { link_url: 'tel:7146007134' });

  assert.equal(tracker.getCurrentIntent(), null, 'no weak lead intent is created without Web Crypto');
  const phoneEvent = tracker.getEventLog().find((event) => event.event_name === 'phone_click');
  assert.ok(phoneEvent, 'the underlying customer action still proceeds and is tracked');
  assert.equal(phoneEvent.lead_intent, undefined);
  assert.ok(
    gtagCalls.some((call) => call[0] === 'event' && call[1] === 'conversion'),
    'phone conversion tracking is unaffected by Web Crypto absence'
  );
}

console.log('lead-tracking smoke test passed');
