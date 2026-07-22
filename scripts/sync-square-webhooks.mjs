import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { SquareClient, SquareEnvironment } from 'square';

const require = createRequire(import.meta.url);
const {
  REQUIRED_SQUARE_EVENT_TYPES,
  SQUARE_API_VERSION,
  TARGET_SUBSCRIPTION_NAME,
  buildSubscriptionPlan
} = require('../lib/square-webhook-subscription.js');

const APPLY = process.argv.includes('--apply');
const TEST_EVENT = process.argv.find((argument) => argument.startsWith('--test-event='))?.split('=')[1];
const KEYCHAIN_SERVICE = 'codex.square.kislev-obsidian.webhook-signature';
const KEYCHAIN_ACCOUNT = 'obsidianautoworks';
const accessToken = process.env.SQUARE_ACCESS_TOKEN;
const environment = String(process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL
  || 'https://www.obsidianautoworksoc.com/api/square-webhooks';

if (!accessToken) throw new Error('SQUARE_ACCESS_TOKEN is required');
if (environment !== 'production') throw new Error('This guarded script only manages the production Square app');

const saveSecretToKeychain = (secret) => {
  if (!secret) throw new Error('Square did not return a webhook signature key');
  const result = spawnSync('/usr/bin/security', [
    'add-generic-password',
    '-U',
    '-a', KEYCHAIN_ACCOUNT,
    '-s', KEYCHAIN_SERVICE,
    '-w', secret
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) throw new Error('Could not store the webhook signature key in Keychain');
};

const client = new SquareClient({
  token: accessToken,
  environment: SquareEnvironment.Production
});

const page = await client.webhooks.subscriptions.list({ includeDisabled: true, limit: 100 });
const subscriptions = [];
for await (const subscription of page) subscriptions.push(subscription);
const target = {
  name: TARGET_SUBSCRIPTION_NAME,
  notificationUrl,
  apiVersion: SQUARE_API_VERSION,
  eventTypes: REQUIRED_SQUARE_EVENT_TYPES
};
const plan = buildSubscriptionPlan(subscriptions, target);

const safeSummary = {
  mode: APPLY ? 'apply' : 'dry-run',
  action: plan.action,
  subscription_id: plan.subscriptionId || null,
  notification_url: target.notificationUrl,
  api_version: target.apiVersion,
  event_types: [...target.eventTypes],
  changed_fields: plan.changedFields || []
};

if (!APPLY) {
  console.log(JSON.stringify(safeSummary, null, 2));
  process.exit(0);
}

let subscription;
if (plan.action === 'create') {
  const response = await client.webhooks.subscriptions.create({
    idempotencyKey: randomUUID(),
    subscription: plan.subscription
  });
  subscription = response.subscription;
} else if (plan.action === 'update') {
  const response = await client.webhooks.subscriptions.update({
    subscriptionId: plan.subscriptionId,
    subscription: plan.subscription
  });
  subscription = response.subscription;
} else {
  const response = await client.webhooks.subscriptions.get({ subscriptionId: plan.subscriptionId });
  subscription = response.subscription;
}

if (!subscription || !subscription.id) throw new Error('Square did not return the managed subscription');
saveSecretToKeychain(subscription.signatureKey || plan.signatureKey);

if (TEST_EVENT) {
  if (!REQUIRED_SQUARE_EVENT_TYPES.includes(TEST_EVENT)) {
    throw new Error(`Unsupported test event: ${TEST_EVENT}`);
  }
  await client.webhooks.subscriptions.test({
    subscriptionId: subscription.id,
    eventType: TEST_EVENT
  });
}

console.log(JSON.stringify({
  ...safeSummary,
  action: plan.action,
  subscription_id: subscription.id,
  signature_key_stored_in_keychain: true,
  test_event_sent: TEST_EVENT || null
}, null, 2));
