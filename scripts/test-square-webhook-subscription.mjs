import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  REQUIRED_SQUARE_EVENT_TYPES,
  buildSubscriptionPlan
} = require('../lib/square-webhook-subscription.js');

const target = {
  name: 'Obsidian Attribution Lifecycle',
  notificationUrl: 'https://www.obsidianautoworksoc.com/api/square-webhooks',
  apiVersion: '2026-01-22',
  eventTypes: REQUIRED_SQUARE_EVENT_TYPES
};

const createPlan = buildSubscriptionPlan([], target);
assert.equal(createPlan.action, 'create');
assert.equal(createPlan.subscription.enabled, true);
assert.deepEqual(createPlan.subscription.eventTypes, [...REQUIRED_SQUARE_EVENT_TYPES].sort());

const noOpPlan = buildSubscriptionPlan([
  {
    id: 'subscription-1',
    name: target.name,
    enabled: true,
    notificationUrl: target.notificationUrl,
    apiVersion: target.apiVersion,
    eventTypes: [...target.eventTypes].reverse()
  }
], target);
assert.equal(noOpPlan.action, 'noop');
assert.equal(noOpPlan.subscriptionId, 'subscription-1');

const updatePlan = buildSubscriptionPlan([
  {
    id: 'subscription-1',
    name: target.name,
    enabled: false,
    notificationUrl: 'https://old.example/api/square-webhooks',
    apiVersion: '2025-10-16',
    eventTypes: ['payment.created']
  }
], target);
assert.equal(updatePlan.action, 'update');
assert.equal(updatePlan.subscriptionId, 'subscription-1');
assert.deepEqual(updatePlan.changedFields.sort(), [
  'apiVersion',
  'enabled',
  'eventTypes',
  'notificationUrl'
]);

assert.throws(
  () => buildSubscriptionPlan([
    { id: 'subscription-1', name: target.name },
    { id: 'subscription-2', name: target.name }
  ], target),
  /multiple subscriptions/i
);

assert.throws(
  () => buildSubscriptionPlan([], { ...target, notificationUrl: 'http://example.com/hook' }),
  /https/i
);

console.log('square webhook subscription planning test passed');
