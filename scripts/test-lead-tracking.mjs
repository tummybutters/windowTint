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

// Minimal CSS attribute-selector matcher covering the shapes lead-tracking.js actually uses:
// bare tag ("a"), exact ([href="/booking"]), prefix ([href^="tel:"]), and substring
// ([href*="appointments"]) — joined with commas for compound selectors like BOOKING_SELECTORS.
const SELECTOR_PART_RE = /^([a-zA-Z0-9]+)?(?:\[([a-zA-Z0-9_-]+)([~^$*]?)="([^"]*)"\])?$/;

const matchesSingleSelector = (node, selector) => {
  const match = SELECTOR_PART_RE.exec(selector.trim());
  if (!match) return false;
  const [, tag, attr, op, value] = match;
  if (tag && (node.tagName || '').toLowerCase() !== tag.toLowerCase()) return false;
  if (attr) {
    const attrValue = (node.getAttribute && node.getAttribute(attr)) || '';
    if (op === '^') {
      if (!attrValue.startsWith(value)) return false;
    } else if (op === '*') {
      if (!attrValue.includes(value)) return false;
    } else if (op === '$') {
      if (!attrValue.endsWith(value)) return false;
    } else if (attrValue !== value) {
      return false;
    }
  }
  return true;
};

const matchesCompoundSelector = (node, selector) => (
  selector.split(',').some((part) => matchesSingleSelector(node, part))
);

// A working listener registry/dispatcher so bindClickTracking's real capture-phase document
// click/submit listeners are actually exercised (they were previously a no-op, so no test ever
// ran the real handler code path -- see task-3-review.md's "test strength" finding #1).
const createFakeDocument = (nodesBySelector = {}) => {
  const listeners = {};
  return {
    readyState: 'complete',
    referrer: 'https://www.google.com/',
    documentElement: {},
    // Exact-key lookup covers the existing single-selector registrations used by tests that
    // dispatch synthetic events. Production code also queries compound selectors directly (e.g.
    // decorateBookingTargets calls querySelectorAll(BOOKING_SELECTORS)), so unregistered compound
    // queries fall back to matching every registered node against the queried selector.
    querySelectorAll(selector) {
      if (nodesBySelector[selector]) return nodesBySelector[selector];
      const allNodes = Object.values(nodesBySelector).flat();
      return allNodes.filter((node) => matchesCompoundSelector(node, selector));
    },
    querySelector() {
      return null;
    },
    addEventListener(type, handler) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    createElement(tagName) {
      const node = { tagName: tagName.toUpperCase(), __attrs: {} };
      node.setAttribute = (name, value) => {
        node.__attrs[name] = value;
      };
      node.getAttribute = (name) => (name in node.__attrs ? node.__attrs[name] : '');
      return node;
    },
    // Simulates dispatching a real DOM event to every capture-phase listener registered for
    // `type`, synchronously, in registration order -- exactly like document-level delegation.
    dispatch(type, target) {
      const event = {
        type,
        target,
        defaultPrevented: false,
        preventDefault() {
          event.defaultPrevented = true;
        }
      };
      (listeners[type] || []).forEach((handler) => handler(event));
      return event;
    }
  };
};

const createFakeAnchor = (href, text = '') => {
  const node = { tagName: 'A', __attrs: { href }, textContent: text };
  node.getAttribute = (name) => (name in node.__attrs ? node.__attrs[name] : '');
  node.setAttribute = (name, value) => {
    node.__attrs[name] = value;
  };
  node.matches = (selector) => matchesCompoundSelector(node, selector);
  node.closest = (selector) => (node.matches(selector) ? node : null);
  Object.defineProperty(node, 'href', {
    get() {
      return node.__attrs.href || '';
    },
    set(value) {
      node.__attrs.href = value;
    },
    configurable: true
  });
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

  // Isolation (finding #5): touch2's URL omits campaignid/adgroupid/keyword/matchtype/device/
  // gbraid/wbraid, so those fields must be empty on touch2, not stale values carried over from
  // touch1 via getLead()/localStorage.
  assert.equal(touch2.campaign_id, '', 'touch2 does not inherit touch1s campaign_id from storage');
  assert.equal(touch2.ad_group_id, '', 'touch2 does not inherit touch1s ad_group_id from storage');
  assert.equal(touch2.keyword, '', 'touch2 does not inherit touch1s keyword from storage');
  assert.equal(touch2.match_type, '', 'touch2 does not inherit touch1s match_type from storage');
  assert.equal(touch2.device, '', 'touch2 does not inherit touch1s device from storage');
  assert.equal(touch2.gbraid, '', 'touch2 has no gbraid since the URL carried none');
  assert.equal(touch2.wbraid, '', 'touch2 has no wbraid since the URL carried none');

  const paidTouchEvents2 = run2.tracker.getEventLog().filter((event) => event.event_name === 'paid_touch');
  assert.equal(paidTouchEvents2.length, 2, 'the second landing adds a second touch event, not replacing the first');
  const firstTouchEventStillIntact = paidTouchEvents2.find((event) => event.touch.touch_id === touch1.touch_id);
  assert.ok(firstTouchEventStillIntact, 'the first touch event remains in the log');
  assert.equal(firstTouchEventStillIntact.touch.gclid, 'CLICKA', 'the first touch snapshot is unchanged by the second landing');

  // Dedup (finding #4): reloading the exact same paid URL must reuse the existing touch,
  // not mint a third one.
  const run2Reload = createContext({
    href: 'https://www.obsidianautoworksoc.com/landing?gclid=CLICKB&utm_campaign=camp-b',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });

  const touch2Reload = run2Reload.tracker.getCurrentTouch();
  assert.equal(touch2Reload.touch_id, touch2.touch_id, 'reloading the same paid URL reuses the existing touch');
  assert.equal(
    run2Reload.tracker.getEventLog().filter((event) => event.event_name === 'paid_touch').length,
    2,
    'a reload of the same click id does not mint or send another paid_touch event'
  );

  // Dedup (finding #4): an internal/booking navigation that propagates the same click id
  // (via applyParams) must also reuse the existing touch, not mint a new one.
  const bookingNav = createContext({
    href: 'https://www.obsidianautoworksoc.com/booking?gclid=CLICKB&obsidian_session_id=abc123',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });

  const touchAfterBookingNav = bookingNav.tracker.getCurrentTouch();
  assert.equal(
    touchAfterBookingNav.touch_id,
    touch2.touch_id,
    'an internal booking navigation carrying the propagated gclid reuses the existing touch'
  );
  assert.equal(
    bookingNav.tracker.getEventLog().filter((event) => event.event_name === 'paid_touch').length,
    2,
    'internal navigation with the same click id does not mint another touch'
  );

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

// --- Scenario A2: a distinct click carrying a different click-id type does not inherit the
// prior touch's campaign, keyword, or click id (finding #5) ---
{
  const storage = createStorage();

  const run1 = createContext({
    href: 'https://www.obsidianautoworksoc.com/landing?gclid=CLICKX&utm_campaign=camp-x&campaignid=999&keyword=window%20tint',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });
  const touch1 = run1.tracker.getCurrentTouch();
  assert.equal(touch1.gclid, 'CLICKX');
  assert.equal(touch1.campaign_id, '999');
  assert.equal(touch1.keyword, 'window tint');

  const run2 = createContext({
    href: 'https://www.obsidianautoworksoc.com/landing?gbraid=CLICKY',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });
  const touch2 = run2.tracker.getCurrentTouch();
  assert.notEqual(touch2.touch_id, touch1.touch_id, 'a distinct click-id tuple mints a new touch');
  assert.equal(touch2.gbraid, 'CLICKY');
  assert.equal(touch2.gclid, '', 'the new touch does not inherit the prior gclid click id');
  assert.equal(touch2.wbraid, '', 'the new touch has no wbraid');
  assert.equal(touch2.campaign_id, '', 'the new touch does not inherit the prior campaign_id');
  assert.equal(touch2.keyword, '', 'the new touch does not inherit the prior keyword');
  assert.equal(touch2.utm_campaign, '', 'the new touch does not inherit the prior utm_campaign');
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
  // F4: the repeated action DOES resend the intent's originally bound touch snapshot -- if the
  // intent-creating envelope never reaches the server (delivery attempts exhausted), this is the
  // only way the touch is ever delivered. touch_insert/link writes are idempotent server-side, so
  // resending an already-landed touch is a harmless no-op there.
  assert.ok(phoneEvents[1].touch, 'the repeated action resends the intent-bound touch snapshot');
  assert.equal(phoneEvents[1].touch.touch_id, touch.touch_id, 'the resent touch is the original binding, not a newer current touch');
  assert.equal(phoneEvents[1].lead_intent.touch_id, phoneEvents[1].touch.touch_id, 'resent touch never mismatches the intent\'s bound touch_id');
}

// --- Scenario C: SMS bodies get the OA reference without changing the destination, and only a
// real tap (not boot-time decoration) creates the intent and rewrites the tapped href ---
{
  const storage = createStorage();
  const smsNode = createFakeAnchor('sms:7146007134');
  // Real fixture shape from commercial-window-film: %20-encoded body, no leading "&".
  const realBodySmsNode = createFakeAnchor(
    'sms:+17146007134?body=Hi%20Obsidian%20Autoworks%2C%20I%27d%20like%20help%20booking%20mobile%20window%20tint.'
  );
  // Real fixture shape from booking / commercial-window-film-qualifier.js: the cross-platform "?&body=" idiom.
  const ampBodySmsNode = createFakeAnchor('sms:7146007134?&body=Hi%20there');
  const doc = createFakeDocument({
    'a[href^="sms:"]': [smsNode, realBodySmsNode, ampBodySmsNode]
  });
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKD',
    storage,
    doc,
    crypto: secureCrypto
  });

  // Critical finding #1: mere render (boot/MutationObserver/periodic decoration) must never
  // create the intent or decorate any sms link.
  assert.equal(tracker.getCurrentIntent(), null, 'boot-time render creates no lead intent for the text channel');
  assert.equal(smsNode.getAttribute('href'), 'sms:7146007134', 'no sms link is decorated before a real tap');
  assert.equal(
    tracker.getEventLog().filter((event) => event.event_name === 'text_click').length,
    0,
    'no text_click event exists before a real tap'
  );

  // A real tap on the primary sms link creates the intent and rewrites that link's href
  // synchronously -- before the simulated default action (the OS reading the href) would run.
  const clickEvent = doc.dispatch('click', smsNode);
  assert.equal(clickEvent.defaultPrevented, false, 'the tap is never intercepted with preventDefault');

  const intent = tracker.getCurrentIntent();
  assert.ok(intent, 'the real tap on the sms link creates the lead intent');
  assert.equal(intent.first_channel, 'text');

  const textClickEvents = tracker.getEventLog().filter((event) => event.event_name === 'text_click');
  assert.equal(textClickEvents.length, 1, 'the tap records exactly one text_click event');
  assert.deepEqual(textClickEvents[0].lead_intent, intent, 'the event carries the lead_intent');
  assert.ok(textClickEvents[0].touch, 'the creating event includes the bound touch snapshot');
  assert.equal(
    tracker.getEventLog().filter((event) => event.event_name === 'lead_intent_created').length,
    0,
    'no separate lead_intent_created plumbing event is ever emitted'
  );

  const decoratedHref = smsNode.getAttribute('href');
  assert.ok(decoratedHref.startsWith('sms:7146007134?'), 'the destination number is unchanged');
  const [, query] = decoratedHref.split('?');
  const body = new URLSearchParams(query).get('body');
  assert.ok(body.includes(`Ref: ${intent.reference_code}`), 'the sms body carries the OA reference');

  // A different, not-yet-tapped sms link is untouched by the first link's tap.
  assert.equal(
    realBodySmsNode.getAttribute('href'),
    'sms:+17146007134?body=Hi%20Obsidian%20Autoworks%2C%20I%27d%20like%20help%20booking%20mobile%20window%20tint.',
    'a second sms link is not decorated by tapping the first'
  );

  // Passive/periodic decoration (the MutationObserver refresh / 2s interval in real boot())
  // opportunistically catches up any other sms links now that a real action created an intent.
  tracker.decorateTextLinks();

  const realBodyHref = realBodySmsNode.getAttribute('href');
  assert.ok(
    realBodyHref.startsWith(
      'sms:+17146007134?body=Hi%20Obsidian%20Autoworks%2C%20I%27d%20like%20help%20booking%20mobile%20window%20tint.'
    ),
    'the existing %20-encoded body is preserved untouched, not re-serialized'
  );
  const realBodyPart = realBodyHref.slice(realBodyHref.indexOf('body=') + 'body='.length);
  assert.ok(!realBodyPart.includes('+'), 'no literal plus signs corrupt the appended body');
  assert.equal(
    decodeURIComponent(realBodyPart),
    `Hi Obsidian Autoworks, I'd like help booking mobile window tint. Ref: ${intent.reference_code}`,
    'the sms body decodes to the exact original text plus the reference, with real spaces'
  );

  const ampBodyHref = ampBodySmsNode.getAttribute('href');
  assert.ok(
    ampBodyHref.startsWith('sms:7146007134?&body=Hi%20there'),
    'the ?&body= idiom (leading &) is preserved'
  );
  const ampBodyPart = ampBodyHref.slice(ampBodyHref.indexOf('body=') + 'body='.length);
  assert.ok(!ampBodyPart.includes('+'), 'no literal plus signs corrupt the appended body in the ?&body= form');
  assert.equal(
    decodeURIComponent(ampBodyPart),
    `Hi there Ref: ${intent.reference_code}`,
    'the ?&body= form decodes correctly with real spaces'
  );

  tracker.decorateTextLinks();
  const secondPassHref = smsNode.getAttribute('href');
  assert.equal(
    secondPassHref.split(intent.reference_code).length - 1,
    1,
    'repeated decoration does not duplicate the reference'
  );
  assert.equal(
    realBodySmsNode.getAttribute('href'),
    realBodyHref,
    'repeated decoration on the real %20-body fixture is idempotent'
  );
  assert.equal(
    ampBodySmsNode.getAttribute('href'),
    ampBodyHref,
    'repeated decoration on the ?&body= fixture is idempotent'
  );

  // F4: a second real tap reuses the same intent/reference and DOES resend the intent's bound
  // touch snapshot (idempotent server-side; the only path that recovers a dropped
  // intent-creating envelope).
  doc.dispatch('click', smsNode);
  assert.deepEqual(tracker.getCurrentIntent(), intent, 'a repeated tap reuses the same intent and reference');
  const textClickEventsAfterSecondTap = tracker.getEventLog().filter((event) => event.event_name === 'text_click');
  assert.equal(textClickEventsAfterSecondTap.length, 2);
  assert.ok(textClickEventsAfterSecondTap[1].touch, 'the repeated tap resends the intent-bound touch snapshot');
  assert.equal(
    textClickEventsAfterSecondTap[1].touch.touch_id,
    textClickEventsAfterSecondTap[1].lead_intent.touch_id,
    'the resent touch never mismatches the intent\'s bound touch_id'
  );
}

// --- Scenario D: forms receive the four hidden lead-reference fields on a real submit, not on
// boot-time decoration ---
{
  const storage = createStorage();
  const formNode = createFakeForm();
  const doc = createFakeDocument({ form: [formNode] });
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKE',
    storage,
    doc,
    crypto: secureCrypto
  });

  assert.equal(tracker.getCurrentIntent(), null, 'boot-time render creates no lead intent for the form channel');
  assert.equal(formNode.inputs.get('lead_intent_id'), undefined, 'no lead_intent_id field before a real submit');

  const touch = tracker.getCurrentTouch();
  const submitEvent = doc.dispatch('submit', formNode);
  assert.equal(submitEvent.defaultPrevented, false, 'the submit is never intercepted with preventDefault');

  const intent = tracker.getCurrentIntent();
  assert.ok(intent, 'the real submit creates the lead intent');
  assert.equal(intent.first_channel, 'form');

  // The four hidden fields exist immediately after dispatch returns -- i.e. before the
  // simulated default action (the actual form POST) would run.
  assert.equal(formNode.inputs.get('lead_intent_id').value, intent.lead_intent_id);
  assert.equal(formNode.inputs.get('lead_reference').value, intent.reference_code);
  assert.equal(formNode.inputs.get('lead_session_id').value, tracker.getLead().session_id);
  assert.equal(formNode.inputs.get('lead_touch_id').value, touch.touch_id);

  const submitEvents = tracker.getEventLog().filter((event) => event.event_name === 'lead_form_submit');
  assert.equal(submitEvents.length, 1, 'the submit records exactly one lead_form_submit event');
  assert.deepEqual(submitEvents[0].lead_intent, intent, 'the event carries the lead_intent');
  assert.equal(submitEvents[0].touch.touch_id, touch.touch_id, 'the creating event includes the bound touch snapshot');
  assert.equal(
    tracker.getEventLog().filter((event) => event.event_name === 'lead_intent_created').length,
    0,
    'no separate lead_intent_created plumbing event is ever emitted'
  );

  // F4: a second real submit reuses the same intent/reference and DOES resend the intent's
  // bound touch snapshot.
  doc.dispatch('submit', formNode);
  assert.deepEqual(tracker.getCurrentIntent(), intent, 'a repeated submit reuses the same intent and reference');
  const submitEventsAfterSecond = tracker.getEventLog().filter((event) => event.event_name === 'lead_form_submit');
  assert.equal(submitEventsAfterSecond.length, 2);
  assert.equal(submitEventsAfterSecond[1].touch.touch_id, touch.touch_id, 'the repeated submit resends the original bound touch, not a newer one');
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

// --- Scenario F: Web Crypto absence preserves every real action and emits no weak
// reference/intent, for clicks and submits alike ---
{
  const storage = createStorage();
  const smsNode = createFakeAnchor('sms:7146007134');
  const formNode = createFakeForm();
  const doc = createFakeDocument({ 'a[href^="sms:"]': [smsNode], form: [formNode] });
  const { tracker, gtagCalls } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKG',
    storage,
    doc,
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

  // A real tap and a real submit must still proceed (no preventDefault) and still record their
  // events, but must create no intent, no reference, and no OA decoration.
  const clickEvent = doc.dispatch('click', smsNode);
  assert.equal(clickEvent.defaultPrevented, false, 'the sms tap is never intercepted without Web Crypto');
  assert.equal(smsNode.getAttribute('href'), 'sms:7146007134', 'the sms href is never decorated without Web Crypto');
  assert.ok(
    tracker.getEventLog().some((event) => event.event_name === 'text_click'),
    'the text_click action is still tracked without Web Crypto'
  );

  const submitEvent = doc.dispatch('submit', formNode);
  assert.equal(submitEvent.defaultPrevented, false, 'the form submit is never intercepted without Web Crypto');
  assert.equal(formNode.inputs.get('lead_intent_id'), undefined, 'submit never adds lead_intent_id without Web Crypto');
  assert.equal(formNode.inputs.get('lead_reference'), undefined, 'submit never adds lead_reference without Web Crypto');
  assert.equal(formNode.inputs.get('lead_touch_id'), undefined, 'submit never adds lead_touch_id without Web Crypto');
  assert.ok(
    tracker.getEventLog().some((event) => event.event_name === 'lead_form_submit'),
    'the lead_form_submit action is still tracked without Web Crypto'
  );

  assert.equal(tracker.getCurrentIntent(), null, 'no weak lead intent is ever created without Web Crypto');
  assert.equal(
    tracker.getEventLog().filter((event) => event.event_name === 'lead_intent_created').length,
    0,
    'no lead_intent_created plumbing event without Web Crypto'
  );
}

// --- Scenario G: mere DOM render (boot only, no user action at all) creates zero intent/OA
// events, even with a form, an sms link, and a phone link all present on the page ---
{
  const storage = createStorage();
  const smsNode = createFakeAnchor('sms:7146007134');
  const formNode = createFakeForm();
  const telNode = createFakeAnchor('tel:7146007134');
  const doc = createFakeDocument({
    'a[href^="sms:"]': [smsNode],
    'a[href^="tel:"]': [telNode],
    form: [formNode]
  });
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKH',
    storage,
    doc,
    crypto: secureCrypto
  });

  assert.ok(tracker.getCurrentTouch(), 'the paid landing still creates a touch on render');
  assert.equal(tracker.getCurrentIntent(), null, 'render alone creates no lead intent');
  assert.equal(smsNode.getAttribute('href'), 'sms:7146007134', 'the sms link is never decorated by render alone');
  assert.equal(formNode.inputs.get('lead_intent_id'), undefined, 'no lead_intent_id field from render alone');
  assert.equal(formNode.inputs.get('lead_reference'), undefined, 'no lead_reference field from render alone');
  assert.equal(formNode.inputs.get('lead_touch_id'), undefined, 'no lead_touch_id field from render alone');

  const actionEventNames = [
    'phone_click', 'text_click', 'lead_form_submit',
    'square_booking_click', 'ai_booking_click', 'lead_intent_created'
  ];
  const events = tracker.getEventLog();
  actionEventNames.forEach((name) => {
    assert.equal(events.filter((event) => event.event_name === name).length, 0, `render alone emits no ${name} event`);
  });

  // Re-running the periodic/MutationObserver decoration passes directly (simulating repeated
  // refreshes with no interaction) must still create nothing.
  tracker.decorateForms();
  tracker.decorateTextLinks();
  assert.equal(tracker.getCurrentIntent(), null, 'repeated passive decoration still creates no lead intent');
  assert.equal(smsNode.getAttribute('href'), 'sms:7146007134', 'repeated passive decoration still leaves the sms href untouched');
}

// --- Scenario H: phone wins first_channel even with a form and an sms link also present; later
// mixed actions reuse the exact same intent/reference/touch and never overwrite first_channel ---
{
  const storage = createStorage();
  const smsNode = createFakeAnchor('sms:7146007134');
  const formNode = createFakeForm();
  const telNode = createFakeAnchor('tel:7146007134');
  const doc = createFakeDocument({
    'a[href^="sms:"]': [smsNode],
    'a[href^="tel:"]': [telNode],
    form: [formNode]
  });
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKI',
    storage,
    doc,
    crypto: secureCrypto
  });

  const touch = tracker.getCurrentTouch();

  doc.dispatch('click', telNode);

  const intent = tracker.getCurrentIntent();
  assert.ok(intent, 'the phone tap creates the lead intent');
  assert.equal(intent.first_channel, 'phone', 'phone wins first_channel even though a form and sms link are also present');

  const phoneEvents = tracker.getEventLog().filter((event) => event.event_name === 'phone_click');
  assert.equal(phoneEvents.length, 1);
  assert.ok(phoneEvents[0].touch, 'the creating phone_click event carries the touch snapshot');
  assert.equal(phoneEvents[0].touch.touch_id, touch.touch_id);

  // A later text tap and a later form submit must reuse the same intent/reference/touch and
  // must never overwrite first_channel.
  doc.dispatch('click', smsNode);
  doc.dispatch('submit', formNode);

  const intentAfterMixedActions = tracker.getCurrentIntent();
  assert.deepEqual(intentAfterMixedActions, intent, 'later text and form actions reuse the exact same intent/reference');
  assert.equal(intentAfterMixedActions.first_channel, 'phone', 'first_channel is still phone after later actions');

  const textEvents = tracker.getEventLog().filter((event) => event.event_name === 'text_click');
  const formEvents = tracker.getEventLog().filter((event) => event.event_name === 'lead_form_submit');
  assert.equal(textEvents.length, 1);
  assert.equal(formEvents.length, 1);
  assert.deepEqual(textEvents[0].lead_intent, intent);
  assert.deepEqual(formEvents[0].lead_intent, intent);
  // F4: the later text_click and lead_form_submit DO resend the intent's originally bound
  // touch snapshot (idempotent server-side), and it is exactly touch1 -- the same touch the
  // intent was created against.
  assert.ok(textEvents[0].touch, 'the later text_click resends the intent-bound touch snapshot');
  assert.equal(textEvents[0].touch.touch_id, touch.touch_id, 'the resent touch on text_click is the original binding');
  assert.ok(formEvents[0].touch, 'the later lead_form_submit resends the intent-bound touch snapshot');
  assert.equal(formEvents[0].touch.touch_id, touch.touch_id, 'the resent touch on lead_form_submit is the original binding');

  assert.equal(
    tracker.getEventLog().filter((event) => event.event_name === 'lead_intent_created').length,
    0,
    'no lead_intent_created plumbing event exists across the mixed actions'
  );

  // The sms link is now decorated (from the text tap) and the form now carries the OA fields
  // (from the submit), both using the single shared intent/reference.
  assert.ok(smsNode.getAttribute('href').includes(intent.reference_code));
  assert.equal(formNode.inputs.get('lead_reference').value, intent.reference_code);

  // F4 regression: a genuinely new paid click lands in this same browser (a new page load with
  // a distinct gclid mints a new "current" touch), but the already-bound intent is immutable --
  // a still-later real action must resend the ORIGINAL bound touch (touch1), never the new
  // current touch, and must never produce a lead_intent/touch mismatch (which the server
  // rejects at lib/lead-event-normalize.js:318).
  const laterClickDoc = createFakeDocument({ form: [formNode] });
  const laterClickContext = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKI-LATER',
    storage,
    doc: laterClickDoc,
    crypto: secureCrypto
  });

  const newCurrentTouch = laterClickContext.tracker.getCurrentTouch();
  assert.notEqual(newCurrentTouch.touch_id, touch.touch_id, 'the later click mints a genuinely new current touch');

  const intentAfterNewClick = laterClickContext.tracker.getCurrentIntent();
  assert.deepEqual(intentAfterNewClick, intent, 'the intent (and its touch_id binding) is unchanged by the later click');

  laterClickDoc.dispatch('submit', formNode);

  const submitEventsAfterNewClick = laterClickContext.tracker
    .getEventLog()
    .filter((event) => event.event_name === 'lead_form_submit');
  const lastSubmitEvent = submitEventsAfterNewClick[submitEventsAfterNewClick.length - 1];
  assert.deepEqual(lastSubmitEvent.lead_intent, intent, 'the post-new-click submit still carries the original intent');
  assert.ok(lastSubmitEvent.touch, 'the post-new-click submit resends the intent-bound touch snapshot');
  assert.equal(lastSubmitEvent.touch.touch_id, touch.touch_id, 'the resent touch is the original binding, not the new current touch');
  assert.notEqual(lastSubmitEvent.touch.touch_id, newCurrentTouch.touch_id, 'the resent touch is never the newer current touch');
  assert.equal(
    lastSubmitEvent.lead_intent.touch_id,
    lastSubmitEvent.touch.touch_id,
    'lead_intent.touch_id and the resent touch.touch_id always agree -- no mismatch shape is ever sent'
  );
}

// --- Scenario I: booking wins first_channel when it is the first real action ---
{
  const storage = createStorage();
  const bookingNode = createFakeAnchor('/booking');
  const telNode = createFakeAnchor('tel:7146007134');
  const doc = createFakeDocument({
    'a[href="/booking"]': [bookingNode],
    'a[href^="tel:"]': [telNode]
  });
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKJ',
    storage,
    doc,
    crypto: secureCrypto
  });

  doc.dispatch('click', bookingNode);

  const intent = tracker.getCurrentIntent();
  assert.ok(intent, 'the booking tap creates the lead intent');
  assert.equal(intent.first_channel, 'booking', 'booking wins first_channel when clicked first');

  const bookingEvents = tracker.getEventLog().filter((event) => event.event_name === 'ai_booking_click');
  assert.equal(bookingEvents.length, 1);
  assert.deepEqual(bookingEvents[0].lead_intent, intent);

  doc.dispatch('click', telNode);
  assert.equal(tracker.getCurrentIntent().first_channel, 'booking', 'a later phone tap does not overwrite first_channel');

  assert.equal(
    tracker.getEventLog().filter((event) => event.event_name === 'lead_intent_created').length,
    0,
    'no lead_intent_created plumbing event exists'
  );
}

// ---------------------------------------------------------------------------
// Task 3 round 2: applyParams must source ad-touch fields from the current
// immutable touch, not sticky getLead() history (r1 review finding #1)
// ---------------------------------------------------------------------------

// --- Scenario J: Q2 -- a same-origin booking link never carries paid attribution fields, even
// though the current touch is genuine and real; localStorage already preserves the touch for
// this browser's own first-party attribution, so copying gclid/gbraid/wbraid/UTMs/campaign
// metadata onto a same-origin URL a customer can copy and share would let a stranger's browser
// mint a false paid touch from someone else's click. An external Square target cannot read this
// browser's localStorage, so it keeps the full existing decoration untouched. A genuine paid
// landing URL with a click ID must still mint a real touch regardless. ---
{
  const storage = createStorage();

  const run1 = createContext({
    href: 'https://www.obsidianautoworksoc.com/landing?gclid=CLICKA&utm_campaign=camp-a&campaignid=111&keyword=tint',
    storage,
    doc: createFakeDocument({ 'a[href="/booking"]': [createFakeAnchor('/booking')] }),
    crypto: secureCrypto
  });
  const touch1 = run1.tracker.getCurrentTouch();
  assert.equal(touch1.gclid, 'CLICKA');

  const bookingNode = createFakeAnchor('/booking');
  const squareNode = createFakeAnchor('https://book.squareup.com/appointments/py2a8n8lsuxp5n/location/LWC5SDBDX3R99');
  const run2 = createContext({
    href: 'https://www.obsidianautoworksoc.com/landing?gbraid=CLICKG&utm_campaign=camp-g&campaignid=222&keyword=coating&matchtype=e&device=m',
    storage,
    doc: createFakeDocument({
      'a[href="/booking"]': [bookingNode],
      'a[href*="book.squareup.com/appointments"]': [squareNode]
    }),
    crypto: secureCrypto
  });
  const touch2 = run2.tracker.getCurrentTouch();
  assert.ok(touch2, 'the gbraid landing still mints a genuine paid touch -- Q2s fix never blocks real touch minting');
  assert.notEqual(touch2.touch_id, touch1.touch_id, 'the gbraid-only click mints a distinct touch');
  assert.equal(touch2.gbraid, 'CLICKG');

  // decorateBookingTargets already ran once during run2's boot(); this captures the real, actual
  // output of that production code path (not a hand-written URL).
  const sameOriginHref = bookingNode.getAttribute('href');
  assert.ok(sameOriginHref, 'the same-origin booking link is still decorated');
  [
    'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
    'utm_content', 'campaignid', 'adgroupid', 'creative', 'keyword', 'matchtype', 'device',
    'network', 'loc_physical_ms', 'loc_interest_ms', 'placement', 'targetid', 'extensionid'
  ].forEach((param) => {
    assert.ok(!sameOriginHref.includes(`${param}=`), `the same-origin booking link never carries ${param}`);
  });
  assert.ok(sameOriginHref.includes('obsidian_session_id='), 'the same-origin booking link keeps the opaque session bridge');

  const externalHref = squareNode.getAttribute('href');
  assert.ok(externalHref.includes('gbraid=CLICKG'), 'the external Square target keeps the current touchs gbraid');
  assert.ok(externalHref.includes('campaignid=222'), 'the external Square target keeps campaign metadata');
  assert.ok(externalHref.includes('keyword=coating'), 'the external Square target keeps keyword metadata');
  assert.ok(externalHref.includes('obsidian_session_id='), 'the external Square target also keeps the session bridge');

  const paidTouchEventsAfterDecoration = run2.tracker.getEventLog()
    .filter((event) => event.event_name === 'paid_touch');
  assert.equal(paidTouchEventsAfterDecoration.length, 2, 'decorating the booking links mints no extra touch');
}

// --- Scenario K: without a current touch (no Web Crypto, so no touch was ever created), a
// same-origin booking link still carries no paid attribution fields (Q2), while an external
// Square target keeps the legacy UTM/campaign propagation from lead storage but stays
// conservative on click ids, since sticky lead storage cannot distinguish a stale click id from
// a genuinely current one without a touch record to compare against ---
{
  const storage = createStorage();
  const bookingNode = createFakeAnchor('/booking');
  const squareNode = createFakeAnchor('https://book.squareup.com/appointments/py2a8n8lsuxp5n/location/LWC5SDBDX3R99');
  const { tracker } = createContext({
    href: 'https://www.obsidianautoworksoc.com/landing?gclid=CLICKL&utm_campaign=camp-l&campaignid=555',
    storage,
    doc: createFakeDocument({
      'a[href="/booking"]': [bookingNode],
      'a[href*="book.squareup.com/appointments"]': [squareNode]
    }),
    crypto: undefined
  });

  assert.equal(tracker.getCurrentTouch(), null, 'no touch is created without Web Crypto');

  const sameOriginHref = bookingNode.getAttribute('href');
  assert.ok(!sameOriginHref.includes('utm_campaign='), 'same-origin link never carries utm_campaign, even without a touch');
  assert.ok(!sameOriginHref.includes('campaignid='), 'same-origin link never carries campaignid, even without a touch');
  assert.ok(!sameOriginHref.includes('gclid='), 'same-origin link never carries gclid');

  const externalHref = squareNode.getAttribute('href');
  assert.ok(externalHref.includes('utm_campaign=camp-l'), 'external target still gets legacy utm_campaign propagation without a touch');
  assert.ok(externalHref.includes('campaignid=555'), 'external target still gets legacy campaignid propagation without a touch');
  assert.ok(!externalHref.includes('gclid='), 'external target still withholds gclid conservatively without a touch record to compare against');
}

// ---------------------------------------------------------------------------
// Task 7: security hardening -- stale/future intent-bound touch snapshots must never cost a
// real lead event, and the delivery queue must never deadlock behind one poison envelope (Q1)
// ---------------------------------------------------------------------------

// --- Scenario L: an intent-bound touch snapshot that ages past the client's conservative window
// (or was stamped under forward clock skew) is never resent -- the real lead action still
// records and still carries the unchanged intent, just without the stale/skewed touch ---
{
  const storage = createStorage();
  const { tracker: tracker1 } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking?gclid=CLICKSTALE',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });

  tracker1.trackEvent('phone_click', { link_url: 'tel:7146007134' });
  const intent = tracker1.getCurrentIntent();
  assert.ok(intent, 'the first phone action creates a lead intent');

  const boundTouchKey = 'lead_track_lead_intent_bound_touch_snapshot';
  const originalBoundTouch = JSON.parse(storage.getItem(boundTouchKey));
  assert.ok(originalBoundTouch, 'the intent-bound touch snapshot is stored at creation');

  // Age the stored snapshot past the client's conservative window (380 days) without ever
  // refreshing it -- exactly the shape that caused Q1's permanent-400 loop server-side.
  const staleTouch = { ...originalBoundTouch, touch_time: new Date(Date.now() - 390 * 24 * 60 * 60 * 1000).toISOString() };
  storage.setItem(boundTouchKey, JSON.stringify(staleTouch));

  const { tracker: tracker2 } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });

  tracker2.trackEvent('phone_click', { link_url: 'tel:7146007134' });
  const phoneEventsAfterStale = tracker2.getEventLog().filter((event) => event.event_name === 'phone_click');
  const staleResendEvent = phoneEventsAfterStale[phoneEventsAfterStale.length - 1];
  assert.deepEqual(staleResendEvent.lead_intent, intent, 'the real lead action still records with the unchanged intent');
  assert.equal(staleResendEvent.touch, undefined, 'a stale intent-bound touch snapshot past the client window is never resent');

  // A forward-clock-skewed snapshot (created under >12h future skew) is equally withheld.
  const skewedTouch = { ...originalBoundTouch, touch_time: new Date(Date.now() + 13 * 60 * 60 * 1000).toISOString() };
  storage.setItem(boundTouchKey, JSON.stringify(skewedTouch));

  const { tracker: tracker3 } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });

  tracker3.trackEvent('phone_click', { link_url: 'tel:7146007134' });
  const phoneEventsAfterSkew = tracker3.getEventLog().filter((event) => event.event_name === 'phone_click');
  const skewedResendEvent = phoneEventsAfterSkew[phoneEventsAfterSkew.length - 1];
  assert.deepEqual(skewedResendEvent.lead_intent, intent, 'the real lead action still records with the unchanged intent under clock skew');
  assert.equal(skewedResendEvent.touch, undefined, 'a forward-clock-skewed intent-bound touch snapshot is never resent');

  // A snapshot still comfortably inside the window resends normally, unaffected.
  storage.setItem(boundTouchKey, JSON.stringify(originalBoundTouch));
  const { tracker: tracker4 } = createContext({
    href: 'https://www.obsidianautoworksoc.com/vip-booking',
    storage,
    doc: createFakeDocument(),
    crypto: secureCrypto
  });
  tracker4.trackEvent('phone_click', { link_url: 'tel:7146007134' });
  const phoneEventsAfterFresh = tracker4.getEventLog().filter((event) => event.event_name === 'phone_click');
  const freshResendEvent = phoneEventsAfterFresh[phoneEventsAfterFresh.length - 1];
  assert.ok(freshResendEvent.touch, 'a snapshot inside the conservative window still resends normally');
  assert.equal(freshResendEvent.touch.touch_id, originalBoundTouch.touch_id);
}

// --- Scenario M: the delivery queue never deadlocks behind one poison envelope -- a permanent
// 4xx (not 408/429) is dropped and flushing continues; a retryable failure (5xx, network error,
// 408, 429) stops the batch without dropping anything, so a temporarily-unreachable envelope is
// never silently discarded either ---
{
  // A permanent 4xx does not stop the batch: the next envelope is still attempted and delivered.
  {
    const { tracker, window: win } = createContext({
      href: 'https://www.obsidianautoworksoc.com/queue-test-a',
      storage: createStorage(),
      doc: createFakeDocument(),
      crypto: secureCrypto
    });

    tracker.trackEvent('queue_test_event_a', {});
    tracker.trackEvent('queue_test_event_b', {});
    assert.equal(tracker.getPendingEvents().length, 2, 'two events are queued before any fetch is available');

    let callCount = 0;
    win.fetch = async () => {
      callCount += 1;
      return callCount === 1 ? { ok: false, status: 400 } : { ok: true, status: 200 };
    };

    await tracker.flushPendingEvents();

    assert.equal(callCount, 2, 'a permanent 4xx does not stop the batch -- the next envelope is still attempted');
    assert.equal(tracker.getPendingEvents().length, 0, 'both the dropped 4xx envelope and the delivered envelope are cleared from the queue');
  }

  // A retryable 5xx stops the batch and drops nothing.
  {
    const { tracker, window: win } = createContext({
      href: 'https://www.obsidianautoworksoc.com/queue-test-b',
      storage: createStorage(),
      doc: createFakeDocument(),
      crypto: secureCrypto
    });

    tracker.trackEvent('queue_test_event_c', {});
    tracker.trackEvent('queue_test_event_d', {});

    let callCount = 0;
    win.fetch = async () => {
      callCount += 1;
      return { ok: false, status: 500 };
    };

    await tracker.flushPendingEvents();

    assert.equal(callCount, 1, 'a retryable 5xx stops the batch -- later envelopes are not attempted this round');
    assert.equal(tracker.getPendingEvents().length, 2, 'nothing is dropped on a retryable failure');
    assert.equal(tracker.getPendingEvents()[0].attempts, 1, 'the retried envelope still records the attempt');
  }

  // 408 (timeout) and 429 (rate limit) remain retryable, not permanent.
  for (const status of [408, 429]) {
    const { tracker, window: win } = createContext({
      href: `https://www.obsidianautoworksoc.com/queue-test-retry-${status}`,
      storage: createStorage(),
      doc: createFakeDocument(),
      crypto: secureCrypto
    });

    tracker.trackEvent('queue_test_event_retry', {});
    win.fetch = async () => ({ ok: false, status });

    await tracker.flushPendingEvents();

    assert.equal(tracker.getPendingEvents().length, 1, `status ${status} remains retryable and is not dropped`);
  }

  // A network error (fetch rejects) is retryable and drops nothing.
  {
    const { tracker, window: win } = createContext({
      href: 'https://www.obsidianautoworksoc.com/queue-test-net',
      storage: createStorage(),
      doc: createFakeDocument(),
      crypto: secureCrypto
    });

    tracker.trackEvent('queue_test_event_net', {});
    win.fetch = async () => { throw new Error('network down'); };

    await tracker.flushPendingEvents();

    assert.equal(tracker.getPendingEvents().length, 1, 'a network error is retryable and does not drop the envelope');
  }
}

console.log('lead-tracking smoke test passed');
