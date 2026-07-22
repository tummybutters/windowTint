const crypto = require('node:crypto');
const { buildLeadEventRecord, LeadEventValidationError } = require('../lib/lead-event-normalize');
const { createNeonLeadEventStore } = require('../lib/lead-event-store');

const MAX_BODY_BYTES = 64 * 1024;
let defaultStore;

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);

  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body too large');
      error.statusCode = 413;
      error.code = 'request_too_large';
      throw error;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const getDefaultStore = () => {
  if (!process.env.ATTRIBUTION_HMAC_SECRET) {
    const error = new Error('ATTRIBUTION_HMAC_SECRET is not configured');
    error.code = 'storage_not_configured';
    throw error;
  }
  if (!defaultStore) defaultStore = createNeonLeadEventStore(process.env.DATABASE_URL);
  return defaultStore;
};

const forwardRecord = async (record, fetchImpl) => {
  if (!process.env.LEAD_EVENT_WEBHOOK_URL || typeof fetchImpl !== 'function') return;

  const response = await fetchImpl(process.env.LEAD_EVENT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
  if (!response.ok) {
    const error = new Error('Lead-event webhook rejected the event');
    error.code = 'lead_event_webhook_rejected';
    throw error;
  }
};

const getHeader = (req, name) => {
  const headers = req.headers || {};
  return String(headers[name] || headers[name.toLowerCase()] || '').trim();
};

const requestIsSameOrigin = (req) => {
  const origin = getHeader(req, 'origin');
  const forwardedHost = getHeader(req, 'x-forwarded-host');
  const host = (forwardedHost || getHeader(req, 'host')).split(',')[0].trim();
  const fetchSite = getHeader(req, 'sec-fetch-site').toLowerCase();
  if (!origin || !host || (fetchSite && fetchSite !== 'same-origin')) return false;

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host && (originUrl.protocol === 'https:' || originUrl.protocol === 'http:');
  } catch {
    return false;
  }
};

const allowSameOrigin = (req, res) => {
  if (!requestIsSameOrigin(req)) return false;
  res.setHeader('Access-Control-Allow-Origin', getHeader(req, 'origin'));
  res.setHeader('Vary', 'Origin');
  return true;
};

const clientBucketKey = (req, identitySecret) => {
  const forwardedFor = getHeader(req, 'x-forwarded-for').split(',')[0].trim();
  const clientAddress = forwardedFor
    || getHeader(req, 'x-real-ip')
    || (req.socket && req.socket.remoteAddress)
    || 'unknown';
  return crypto.createHmac('sha256', identitySecret).update(`lead-event-rate:${clientAddress}`).digest('hex');
};

const safeEventId = (value) => (typeof value === 'string' ? value.trim().slice(0, 160) : '');

const recordFailure = async (store, failure) => {
  if (!store || typeof store.recordFailure !== 'function') return;
  try {
    await store.recordFailure(failure);
  } catch (error) {
    console.warn('[obsidian-lead-event-failure-telemetry-error]', JSON.stringify({
      code: error.code || 'failure_telemetry_failed'
    }));
  }
};

const rateLimitPerMinute = () => {
  const configured = Number(process.env.ATTRIBUTION_RATE_LIMIT_PER_MINUTE || 60);
  if (!Number.isFinite(configured)) return 60;
  return Math.min(600, Math.max(10, Math.floor(configured)));
};

const createHandler = (options = {}) => async function handler(req, res) {
  const sameOrigin = allowSameOrigin(req, res);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    if (!sameOrigin) return res.status(403).json({ ok: false, error: 'Forbidden' });
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!sameOrigin) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  let store;
  let identitySecret;
  try {
    identitySecret = options.identitySecret || process.env.ATTRIBUTION_HMAC_SECRET;
    if (!identitySecret) {
      const error = new Error('Identity hashing is not configured');
      error.code = 'storage_not_configured';
      throw error;
    }
    store = options.store || getDefaultStore();
    if (!store || typeof store.checkRateLimit !== 'function') {
      const error = new Error('Rate limiting is not configured');
      error.code = 'rate_limit_not_configured';
      throw error;
    }
    const rateLimit = await store.checkRateLimit(
      clientBucketKey(req, identitySecret),
      options.rateLimitPerMinute || rateLimitPerMinute()
    );
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }
  } catch (error) {
    console.error('[obsidian-lead-event-storage-error]', JSON.stringify({
      code: error.code || 'storage_not_configured'
    }));
    return res.status(503).json({ ok: false, error: 'Lead-event storage unavailable' });
  }

  let event;
  let record;
  try {
    event = await readBody(req);
    record = buildLeadEventRecord(event, { identitySecret });
  } catch (error) {
    if (error instanceof LeadEventValidationError || error instanceof SyntaxError || error.statusCode === 413) {
      const status = error.statusCode || 400;
      await recordFailure(store, {
        eventId: safeEventId(event && event.event_id),
        errorCode: error.code || 'invalid_json',
        retryable: false
      });
      console.warn('[obsidian-lead-event-rejected]', JSON.stringify({
        code: error.code || 'invalid_json',
        status
      }));
      return res.status(status).json({ ok: false, error: 'Invalid lead event' });
    }

    console.error('[obsidian-lead-event-storage-error]', JSON.stringify({
      code: error.code || 'storage_not_configured'
    }));
    return res.status(503).json({ ok: false, error: 'Lead-event storage unavailable' });
  }

  try {
    const result = await store.persist(record);

    try {
      await forwardRecord(record, options.fetchImpl || globalThis.fetch);
    } catch (error) {
      await recordFailure(store, {
        eventId: record.event_id,
        errorCode: error.code || 'forward_failed',
        retryable: true
      });
      console.warn('[obsidian-lead-event-forward-error]', JSON.stringify({
        event_id: record.event_id,
        code: error.code || 'forward_failed'
      }));
    }

    console.info('[obsidian-lead-event-persisted]', JSON.stringify({
      event_id: record.event_id,
      event_name: record.event_name,
      duplicate: !result.inserted
    }));
    return res.status(202).json({ ok: true, duplicate: !result.inserted });
  } catch (error) {
    await recordFailure(store, {
      eventId: record.event_id,
      errorCode: error.code || 'persist_failed',
      retryable: true
    });
    console.error('[obsidian-lead-event-storage-error]', JSON.stringify({
      event_id: record.event_id,
      code: error.code || 'persist_failed'
    }));
    return res.status(503).json({ ok: false, error: 'Lead-event storage unavailable' });
  }
};

const defaultHandler = createHandler();
module.exports = defaultHandler;
module.exports.createHandler = createHandler;
module.exports.readBody = readBody;
module.exports.requestIsSameOrigin = requestIsSameOrigin;
