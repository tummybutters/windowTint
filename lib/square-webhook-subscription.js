const REQUIRED_SQUARE_EVENT_TYPES = Object.freeze([
  'booking.created',
  'booking.updated',
  'order.created',
  'order.updated',
  'order.fulfillment.updated',
  'payment.created',
  'payment.updated',
  'refund.created',
  'refund.updated'
]);

const TARGET_SUBSCRIPTION_NAME = 'Obsidian Attribution Lifecycle';
const SQUARE_API_VERSION = '2026-07-15';

const sortedStrings = (values) => [...new Set(Array.isArray(values) ? values : [])].sort();

const sameStrings = (left, right) => (
  JSON.stringify(sortedStrings(left)) === JSON.stringify(sortedStrings(right))
);

const validateTarget = (target) => {
  if (!target || typeof target !== 'object') throw new Error('A webhook subscription target is required');
  if (target.name !== TARGET_SUBSCRIPTION_NAME) {
    throw new Error(`Refusing to manage an unexpected subscription name: ${target.name || '(missing)'}`);
  }
  let url;
  try {
    url = new URL(target.notificationUrl);
  } catch {
    throw new Error('Webhook notification URL is invalid');
  }
  if (url.protocol !== 'https:') throw new Error('Webhook notification URL must use HTTPS');
  if (!sameStrings(target.eventTypes, REQUIRED_SQUARE_EVENT_TYPES)) {
    throw new Error('Webhook event types do not match the required lifecycle set');
  }
  if (!target.apiVersion) throw new Error('Square API version is required');
};

const normalizedTarget = (target) => ({
  name: target.name,
  enabled: true,
  notificationUrl: target.notificationUrl,
  apiVersion: target.apiVersion,
  eventTypes: sortedStrings(target.eventTypes)
});

const buildSubscriptionPlan = (subscriptions, target) => {
  validateTarget(target);
  const matches = (Array.isArray(subscriptions) ? subscriptions : [])
    .filter((subscription) => subscription && subscription.name === target.name);
  if (matches.length > 1) {
    throw new Error(`Refusing to modify multiple subscriptions named ${target.name}`);
  }

  const subscription = normalizedTarget(target);
  if (matches.length === 0) return { action: 'create', subscription };

  const current = matches[0];
  if (!current.id) throw new Error('Existing webhook subscription is missing an ID');
  const changedFields = [];
  if (current.enabled !== true) changedFields.push('enabled');
  if (current.notificationUrl !== subscription.notificationUrl) changedFields.push('notificationUrl');
  if (current.apiVersion !== subscription.apiVersion) changedFields.push('apiVersion');
  if (!sameStrings(current.eventTypes, subscription.eventTypes)) changedFields.push('eventTypes');

  return {
    action: changedFields.length ? 'update' : 'noop',
    subscriptionId: current.id,
    subscription,
    changedFields,
    signatureKey: current.signatureKey || null
  };
};

module.exports = {
  REQUIRED_SQUARE_EVENT_TYPES,
  SQUARE_API_VERSION,
  TARGET_SUBSCRIPTION_NAME,
  buildSubscriptionPlan
};
