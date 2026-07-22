const crypto = require('node:crypto');
const { normalizeSquareWebhook } = require('./square-webhook-normalize');

const ENTITY_EVENT_TYPES = Object.freeze({
  booking: 'booking.updated',
  payment: 'payment.updated',
  order: 'order.updated',
  refund: 'refund.updated'
});

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }
  return typeof value === 'bigint' ? value.toString() : value;
};

const buildReconcileEnvelope = (entityType, entity, options = {}) => {
  const eventType = ENTITY_EVENT_TYPES[entityType];
  if (!eventType) throw new Error(`Unsupported Square reconciliation entity type: ${entityType}`);
  if (!entity || typeof entity !== 'object' || !entity.id) {
    throw new Error(`Square ${entityType} is missing an ID`);
  }
  const canonicalEntity = canonicalize(entity);
  const digest = crypto.createHash('sha256')
    .update(JSON.stringify(canonicalEntity))
    .digest('hex')
    .slice(0, 24);
  const createdAt = entity.updated_at || entity.created_at || options.createdAt || new Date(0).toISOString();
  return {
    merchant_id: options.merchantId || null,
    type: eventType,
    event_id: `reconcile:${entityType}:${entity.id}:${digest}`,
    created_at: createdAt,
    data: { object: { [entityType]: canonicalEntity } }
  };
};

const reconcileSquareEntities = async ({
  entityType,
  entities,
  identitySecret,
  merchantId,
  receivedAt,
  store
}) => {
  if (!store || typeof store.persist !== 'function') throw new Error('Square event store is required');
  const summary = { scanned: 0, inserted: 0, duplicates: 0, failed: 0 };
  for (const entity of Array.isArray(entities) ? entities : []) {
    summary.scanned += 1;
    try {
      const envelope = buildReconcileEnvelope(entityType, entity, { merchantId, createdAt: receivedAt });
      const rawBody = JSON.stringify(envelope);
      const normalized = normalizeSquareWebhook(envelope, {
        rawBody,
        identitySecret,
        receivedAt
      });
      const result = await store.persist(normalized);
      if (result.inserted) summary.inserted += 1;
      else summary.duplicates += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
};

module.exports = {
  ENTITY_EVENT_TYPES,
  buildReconcileEnvelope,
  reconcileSquareEntities
};
