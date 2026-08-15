const crypto = require('node:crypto');
const {
  createNeonAttributionRetentionStore
} = require('../lib/attribution-retention-store');

let defaultStore;

const getHeader = (req, name) => {
  const headers = req.headers || {};
  return String(headers[name] || headers[name.toLowerCase()] || '').trim();
};

const authorizationMatches = (provided, secret) => {
  if (!provided || !secret) return false;
  const expectedBuffer = Buffer.from(`Bearer ${secret}`);
  const providedBuffer = Buffer.from(provided);
  return providedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

const getDefaultStore = () => {
  if (!defaultStore) {
    defaultStore = createNeonAttributionRetentionStore(process.env.DATABASE_URL);
  }
  return defaultStore;
};

const configuredDays = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createHandler = (options = {}) => async function handler(req, res) {
  res.setHeader('Allow', 'GET');
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const cronSecret = options.cronSecret || process.env.CRON_SECRET;
  if (!authorizationMatches(getHeader(req, 'authorization'), cronSecret)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const eventRetentionDays = configuredDays(
    options.eventRetentionDays || process.env.ATTRIBUTION_EVENT_RETENTION_DAYS,
    400
  );
  const failureRetentionDays = configuredDays(
    options.failureRetentionDays || process.env.ATTRIBUTION_FAILURE_RETENTION_DAYS,
    30
  );

  try {
    const store = options.store || getDefaultStore();
    const result = await store.prune({ eventRetentionDays, failureRetentionDays });
    return res.status(200).json({
      ok: true,
      deleted_events: result.deletedEvents,
      deleted_failures: result.deletedFailures,
      deleted_rate_limit_buckets: result.deletedRateLimitBuckets,
      deleted_lead_intent_links: result.deletedLeadIntentLinks,
      deleted_lead_intents: result.deletedLeadIntents,
      deleted_touches: result.deletedTouches,
      event_retention_days: eventRetentionDays,
      failure_retention_days: failureRetentionDays
    });
  } catch (error) {
    console.error('[obsidian-attribution-maintenance-error]', JSON.stringify({
      code: error.code || 'maintenance_failed'
    }));
    return res.status(503).json({ ok: false, error: 'Attribution maintenance unavailable' });
  }
};

const defaultHandler = createHandler();
module.exports = defaultHandler;
module.exports.authorizationMatches = authorizationMatches;
module.exports.createHandler = createHandler;
