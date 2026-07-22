const { WebhooksHelper } = require('square');
const {
  normalizeSquareWebhook,
  SquareWebhookValidationError
} = require('../lib/square-webhook-normalize');
const { createNeonSquareEventStore } = require('../lib/square-event-store');

const MAX_BODY_BYTES = 256 * 1024;
let defaultStore;

const rawBodyError = (statusCode, code, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const readRawBody = async (req) => {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > MAX_BODY_BYTES) throw rawBodyError(413, 'request_too_large', 'Request body too large');
    return req.body.toString('utf8');
  }
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body) > MAX_BODY_BYTES) {
      throw rawBodyError(413, 'request_too_large', 'Request body too large');
    }
    return req.body;
  }
  if (req.body && typeof req.body === 'object') {
    throw rawBodyError(400, 'raw_body_unavailable', 'Raw request body required');
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw rawBodyError(413, 'request_too_large', 'Request body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
};

const getHeader = (req, name) => {
  const headers = req.headers || {};
  return headers[name] || headers[name.toLowerCase()] || '';
};

const getDefaultStore = () => {
  if (!defaultStore) defaultStore = createNeonSquareEventStore(process.env.DATABASE_URL);
  return defaultStore;
};

const safeEventId = (value) => (typeof value === 'string' ? value.trim().slice(0, 160) : '');

const recordFailure = async (store, failure) => {
  if (!store || typeof store.recordFailure !== 'function') return;
  try {
    await store.recordFailure(failure);
  } catch (error) {
    console.warn('[obsidian-square-webhook-failure-telemetry-error]', JSON.stringify({
      code: error.code || 'failure_telemetry_failed'
    }));
  }
};

const resolveStoreForTelemetry = (options) => {
  if (options.store) return options.store;
  try {
    return getDefaultStore();
  } catch {
    return null;
  }
};

const createHandler = (options = {}) => async function handler(req, res) {
  res.setHeader('Allow', 'POST');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    const status = error.statusCode || 400;
    return res.status(status).json({
      ok: false,
      error: error.code === 'raw_body_unavailable' ? 'Raw request body required' : 'Invalid Square webhook'
    });
  }

  const signatureKey = options.signatureKey || process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = options.notificationUrl || process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
  const signatureHeader = getHeader(req, 'x-square-hmacsha256-signature');
  if (!signatureKey || !notificationUrl) {
    console.error('[obsidian-square-webhook-config-error]', JSON.stringify({ code: 'signature_config_missing' }));
    return res.status(503).json({ ok: false, error: 'Square webhook unavailable' });
  }

  let signatureValid = false;
  try {
    const verifySignature = options.verifySignature || ((args) => WebhooksHelper.verifySignature(args));
    signatureValid = Boolean(signatureHeader) && await verifySignature({
      requestBody: rawBody,
      signatureHeader,
      signatureKey,
      notificationUrl
    });
  } catch (error) {
    console.warn('[obsidian-square-webhook-signature-error]', JSON.stringify({ code: 'signature_verification_failed' }));
  }
  if (!signatureValid) {
    return res.status(403).json({ ok: false, error: 'Invalid Square signature' });
  }

  let envelope;
  let record;
  try {
    envelope = JSON.parse(rawBody);
    record = normalizeSquareWebhook(envelope, {
      identitySecret: options.identitySecret || process.env.ATTRIBUTION_HMAC_SECRET,
      rawBody,
      receivedAt: (options.now || (() => new Date().toISOString()))()
    });
  } catch (error) {
    const store = resolveStoreForTelemetry(options);
    if (error instanceof SyntaxError || error instanceof SquareWebhookValidationError) {
      await recordFailure(store, {
        eventId: safeEventId(envelope && envelope.event_id),
        errorCode: error.code || 'invalid_json',
        retryable: false
      });
      console.warn('[obsidian-square-webhook-rejected]', JSON.stringify({
        code: error.code || 'invalid_json',
        event_type: envelope && envelope.type ? String(envelope.type).slice(0, 100) : null
      }));
      return res.status(400).json({ ok: false, error: 'Invalid Square webhook' });
    }
    await recordFailure(store, {
      eventId: safeEventId(envelope && envelope.event_id),
      errorCode: error.code || 'normalize_failed',
      retryable: true
    });
    console.error('[obsidian-square-webhook-normalize-error]', JSON.stringify({ code: 'normalize_failed' }));
    return res.status(503).json({ ok: false, error: 'Square webhook unavailable' });
  }

  try {
    const store = options.store || getDefaultStore();
    const result = await store.persist(record);
    console.info('[obsidian-square-webhook-persisted]', JSON.stringify({
      provider_event_id: record.provider_event_id,
      event_type: record.event_type,
      entity_type: result.entityType,
      duplicate: !result.inserted,
      stale: Boolean(result.inserted && result.applied === false)
    }));
    return res.status(202).json({ ok: true, duplicate: !result.inserted });
  } catch (error) {
    await recordFailure(resolveStoreForTelemetry(options), {
      eventId: record.provider_event_id,
      errorCode: error.code || 'persist_failed',
      retryable: true
    });
    console.error('[obsidian-square-webhook-storage-error]', JSON.stringify({
      provider_event_id: record.provider_event_id,
      event_type: record.event_type,
      code: error.code || 'persist_failed'
    }));
    return res.status(503).json({ ok: false, error: 'Square webhook storage unavailable' });
  }
};

const defaultHandler = createHandler();
module.exports = defaultHandler;
module.exports.createHandler = createHandler;
module.exports.readRawBody = readRawBody;
