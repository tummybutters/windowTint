const crypto = require('node:crypto');

const MAX_EVENT_AGE_MS = 400 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;
const SAFE_URL_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
  'campaignid',
  'adgroupid',
  'creative',
  'keyword',
  'matchtype',
  'device',
  'network',
  'loc_physical_ms',
  'loc_interest_ms',
  'placement',
  'targetid',
  'extensionid',
  'obsidian_session_id'
]);
const ATTRIBUTION_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
  'campaignid',
  'adgroupid',
  'creative',
  'keyword',
  'matchtype',
  'device',
  'network',
  'loc_physical_ms',
  'loc_interest_ms',
  'placement',
  'targetid',
  'extensionid'
];
const TOUCH_ID = /^touch_[A-Za-z0-9_-]{16,120}$/;
const LEAD_INTENT_ID = /^intent_[A-Za-z0-9_-]{16,120}$/;
const LEAD_REFERENCE = /^OA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;
const LEAD_INTENT_CHANNELS = new Set(['phone', 'text', 'form', 'booking']);
const TOUCH_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid',
  'campaign_id',
  'ad_group_id',
  'creative_id',
  'keyword',
  'match_type',
  'device',
  'network',
  'location_physical_id',
  'location_interest_id',
  'placement',
  'target_id',
  'extension_id'
];
const PAYLOAD_FIELDS = [
  'quiz_step',
  'answer',
  'from_step',
  'to_step',
  'vehicle',
  'tesla_model',
  'coverage',
  'addons',
  'addon_labels',
  'service_title',
  'service_price',
  'service_duration',
  'service_mode',
  'service',
  'landing_variant',
  'lead_action',
  'needs_confirmation',
  'link_url',
  'link_text',
  'booking_path',
  'event_count'
];

class LeadEventValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LeadEventValidationError';
    this.statusCode = 400;
    this.code = 'invalid_lead_event';
  }
}

const asString = (value, maxLength) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, maxLength);
};

const sanitizeHttpUrl = (value, maxLength = 1000) => {
  const raw = asString(value, maxLength * 2);
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return '';

    const safe = new URL(`${url.protocol}//${url.host}${url.pathname}`);
    for (const [key, paramValue] of url.searchParams.entries()) {
      if (SAFE_URL_PARAMS.has(key)) safe.searchParams.append(key, paramValue.slice(0, 500));
    }
    safe.hash = url.hash.slice(0, 200);
    return safe.toString().slice(0, maxLength);
  } catch (error) {
    return '';
  }
};

const sanitizeReferrer = (value) => {
  const raw = asString(value, 1000);
  if (!raw) return '';

  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return `${url.protocol}//${url.host}${url.pathname}`.slice(0, 1000);
  } catch (error) {
    return '';
  }
};

const sanitizeLinkUrl = (value) => {
  const raw = asString(value, 1000);
  if (!raw) return '';
  if (raw.startsWith('tel:')) return 'tel:';
  if (raw.startsWith('sms:')) return 'sms:';
  return sanitizeHttpUrl(raw);
};

const normalizePhone = (value) => {
  const digits = asString(value, 40).replace(/\D/g, '');
  if (digits.length < 7) return '';
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
};

const hashIdentity = (type, value, secret) => {
  const normalized = type === 'phone'
    ? normalizePhone(value)
    : asString(value, 240).toLowerCase();
  if (!normalized || !secret) return null;

  return {
    identity_type: type,
    identity_hash: crypto.createHmac('sha256', secret).update(`${type}:${normalized}`).digest('hex'),
    identity_hint: type === 'phone' ? normalized.slice(-4) : ''
  };
};

const normalizePayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};

  const normalized = {};
  for (const field of PAYLOAD_FIELDS) {
    if (!(field in payload)) continue;
    if (field === 'event_count') {
      const number = Number(payload[field]);
      if (Number.isFinite(number)) normalized[field] = Math.max(0, Math.min(number, 100000));
      continue;
    }
    if (field === 'link_url') {
      normalized[field] = sanitizeLinkUrl(payload[field]);
      continue;
    }
    normalized[field] = asString(payload[field], field === 'link_text' ? 120 : 240);
  }
  return normalized;
};

const normalizeLead = (lead, identitySecret) => {
  const source = lead && typeof lead === 'object' && !Array.isArray(lead) ? lead : {};
  const normalized = {
    first_seen_at: asString(source.first_seen_at, 80),
    last_seen_at: asString(source.last_seen_at, 80),
    first_landing_page: sanitizeHttpUrl(source.first_landing_page),
    first_referrer: sanitizeReferrer(source.first_referrer)
  };

  for (const field of ATTRIBUTION_FIELDS) {
    normalized[field] = asString(source[field], field === 'keyword' ? 500 : 240);
  }

  const identities = [
    hashIdentity('phone', source.phone, identitySecret),
    hashIdentity('conversation', source.cid, identitySecret)
  ].filter(Boolean);

  return { normalized, identities };
};

const normalizeTimestamp = (value, now, label = 'event_time') => {
  const raw = asString(value, 80);
  const timestamp = Date.parse(raw);
  if (!raw || !Number.isFinite(timestamp)) {
    throw new LeadEventValidationError(`Invalid ${label}`);
  }
  if (timestamp < now.getTime() - MAX_EVENT_AGE_MS || timestamp > now.getTime() + MAX_FUTURE_SKEW_MS) {
    throw new LeadEventValidationError(`${label} outside accepted window`);
  }
  return new Date(timestamp).toISOString();
};

// A touch's touch_time is optional *evidence*, not a required credential: an unparseable,
// stale (>400 days), or clock-skewed (>24h future) touch_time must never cost a real lead
// event (Q1). A syntactically valid touch_id and a supported click ID are still required --
// those identify which touch is meant, so they stay a hard rejection.
const isTouchTimeUsable = (value, now) => {
  const raw = asString(value, 80);
  const timestamp = Date.parse(raw);
  if (!raw || !Number.isFinite(timestamp)) return false;
  return timestamp >= now.getTime() - MAX_EVENT_AGE_MS && timestamp <= now.getTime() + MAX_FUTURE_SKEW_MS;
};

const normalizeTouch = (source, now) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;

  const touchId = asString(source.touch_id, 160);
  if (!touchId) return null;
  if (!TOUCH_ID.test(touchId)) {
    throw new LeadEventValidationError('Invalid touch_id');
  }

  const fields = {};
  for (const field of TOUCH_FIELDS) {
    fields[field] = asString(source[field], field === 'keyword' ? 500 : 240);
  }

  if (!fields.gclid && !fields.gbraid && !fields.wbraid) {
    throw new LeadEventValidationError('touch requires a supported click ID');
  }

  if (!isTouchTimeUsable(source.touch_time, now)) return null;

  return {
    touch_id: touchId,
    touch_time: normalizeTimestamp(source.touch_time, now, 'touch_time'),
    landing_page: sanitizeHttpUrl(source.landing_page),
    ...fields
  };
};

const normalizeLeadIntent = (source) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;

  const leadIntentId = asString(source.lead_intent_id, 160);
  if (!leadIntentId) return null;
  if (!LEAD_INTENT_ID.test(leadIntentId)) {
    throw new LeadEventValidationError('Invalid lead_intent_id');
  }

  const referenceCode = asString(source.reference_code, 40);
  if (!LEAD_REFERENCE.test(referenceCode)) {
    throw new LeadEventValidationError('Invalid reference_code');
  }

  const firstChannel = asString(source.first_channel, 20);
  if (!LEAD_INTENT_CHANNELS.has(firstChannel)) {
    throw new LeadEventValidationError('Invalid first_channel');
  }

  const touchId = asString(source.touch_id, 160);
  if (touchId && !TOUCH_ID.test(touchId)) {
    throw new LeadEventValidationError('Invalid lead_intent touch_id');
  }

  return {
    lead_intent_id: leadIntentId,
    reference_code: referenceCode,
    touch_id: touchId,
    first_channel: firstChannel
  };
};

const buildLeadEventRecord = (event, options = {}) => {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new LeadEventValidationError('Event body must be an object');
  }

  const now = options.now instanceof Date ? options.now : new Date();
  const eventName = asString(event.event_name, 120);
  const eventId = asString(event.event_id, 160);
  const sessionId = asString(event.session_id, 180);

  if (!/^[a-z0-9_]{1,120}$/.test(eventName)) {
    throw new LeadEventValidationError('Invalid event_name');
  }
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(eventId)) {
    throw new LeadEventValidationError('Invalid event_id');
  }
  if (!/^[A-Za-z0-9._:-]{8,180}$/.test(sessionId)) {
    throw new LeadEventValidationError('Invalid session_id');
  }

  const { normalized: lead, identities } = normalizeLead(event.lead, options.identitySecret || '');
  const source = lead.gclid || lead.gbraid || lead.wbraid
    ? 'google_ads'
    : lead.utm_source || 'direct';

  const touch = normalizeTouch(event.touch, now);
  const leadIntent = normalizeLeadIntent(event.lead_intent);
  // Controller ruling (task-2 fix round 1): keep this rejection. The wire contract going
  // forward is that one envelope never carries both a *new* touch and an *older*, already-bound
  // intent -- the browser sends a new paid-touch event without the existing intent, then sends
  // later lead actions with the intent's originally bound touch_id (or no touch at all). A
  // mismatch here means the client violated that contract, not a legitimate second-touch case,
  // so reject rather than guess. An intent with an *empty* touch_id (organic) is unaffected by
  // this guard and may legally coexist with any touch in the same event; the persistence layer
  // (not this guard) is responsible for ensuring that never produces a Tier A link.
  if (leadIntent && leadIntent.touch_id && touch && leadIntent.touch_id !== touch.touch_id) {
    throw new LeadEventValidationError('lead_intent touch_id does not match touch');
  }

  return {
    received_at: now.toISOString(),
    event_name: eventName,
    event_time: normalizeTimestamp(event.event_time, now),
    event_id: eventId,
    session_id: sessionId,
    page_path: asString(event.page_path, 240),
    page_url: sanitizeHttpUrl(event.page_url),
    referrer: sanitizeReferrer(event.referrer),
    lead,
    identities,
    payload: normalizePayload(event.payload),
    source,
    touch,
    lead_intent: leadIntent
  };
};

module.exports = {
  ATTRIBUTION_FIELDS,
  LEAD_REFERENCE,
  LEAD_INTENT_ID,
  TOUCH_ID,
  LeadEventValidationError,
  buildLeadEventRecord,
  normalizePhone,
  sanitizeHttpUrl,
  sanitizeLinkUrl
};
