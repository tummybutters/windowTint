const crypto = require('node:crypto');
const { buildCommercialLeadRecord, CommercialLeadValidationError } = require('../lib/commercial-lead-normalize');
const { createNeonCommercialLeadStore } = require('../lib/commercial-lead-store');

const MAX_BODY_BYTES = 32 * 1024;
let defaultStore;

const getHeader = (req, name) => String((req.headers || {})[name] || (req.headers || {})[name.toLowerCase()] || '').trim();

const sameOrigin = (req) => {
  const origin = getHeader(req, 'origin');
  const host = (getHeader(req, 'x-forwarded-host') || getHeader(req, 'host')).split(',')[0].trim();
  const fetchSite = getHeader(req, 'sec-fetch-site').toLowerCase();
  if (!origin || !host || (fetchSite && fetchSite !== 'same-origin')) return false;
  try {
    const url = new URL(origin);
    return ['http:', 'https:'].includes(url.protocol) && url.host === host;
  } catch {
    return false;
  }
};

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') {
    if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_BODY_BYTES) {
      const error = new CommercialLeadValidationError('Request body too large');
      error.statusCode = 413;
      throw error;
    }
    return req.body;
  }
  if (typeof req.body === 'string') {
    if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) {
      const error = new CommercialLeadValidationError('Request body too large');
      error.statusCode = 413;
      throw error;
    }
    return JSON.parse(req.body);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new CommercialLeadValidationError('Request body too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const getStore = () => {
  if (!defaultStore) defaultStore = createNeonCommercialLeadStore(process.env.DATABASE_URL);
  return defaultStore;
};

const bucketKey = (req, secret) => {
  const address = getHeader(req, 'x-forwarded-for').split(',')[0].trim()
    || getHeader(req, 'x-real-ip')
    || (req.socket && req.socket.remoteAddress)
    || 'unknown';
  return crypto.createHmac('sha256', secret).update(`commercial-lead:${address}`).digest('hex');
};

const createHandler = (options = {}) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (!sameOrigin(req)) return res.status(403).json({ ok: false, error: 'Forbidden' });
  res.setHeader('Access-Control-Allow-Origin', getHeader(req, 'origin'));
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  let store;
  try {
    const secret = options.identitySecret || process.env.ATTRIBUTION_HMAC_SECRET;
    if (!secret) throw new Error('Identity hashing is not configured');
    store = options.store || getStore();
    const rate = await store.checkRateLimit(bucketKey(req, secret), options.rateLimit || 20);
    if (!rate.allowed) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }
  } catch (error) {
    console.error('[obsidian-commercial-lead-storage-error]', JSON.stringify({ code: error.code || 'storage_not_configured' }));
    return res.status(503).json({ ok: false, error: 'Lead storage unavailable' });
  }

  let record;
  try {
    record = buildCommercialLeadRecord(await readBody(req));
  } catch (error) {
    if (error instanceof CommercialLeadValidationError || error instanceof SyntaxError) {
      return res.status(error.statusCode || 400).json({ ok: false, error: 'Invalid commercial lead' });
    }
    return res.status(503).json({ ok: false, error: 'Lead storage unavailable' });
  }

  try {
    const result = await store.persist(record);
    console.info('[obsidian-commercial-lead-persisted]', JSON.stringify({
      lead_id: result.leadId,
      duplicate: !result.inserted,
      reference_code: record.reference_code || ''
    }));
    return res.status(result.inserted ? 201 : 200).json({ ok: true, duplicate: !result.inserted, lead_id: result.leadId });
  } catch (error) {
    if (error.code === 'commercial_lead_conflict') {
      return res.status(409).json({ ok: false, error: 'Submission changed; please restart the project brief' });
    }
    console.error('[obsidian-commercial-lead-storage-error]', JSON.stringify({ code: error.code || 'persist_failed' }));
    return res.status(503).json({ ok: false, error: 'Lead storage unavailable' });
  }
};

const defaultHandler = createHandler();
module.exports = defaultHandler;
module.exports.createHandler = createHandler;
