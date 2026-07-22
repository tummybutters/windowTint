import { createRequire } from 'node:module';
import { SquareClient, SquareEnvironment } from 'square';

const require = createRequire(import.meta.url);
const { createNeonSquareEventStore } = require('../lib/square-event-store.js');
const { reconcileSquareEntities } = require('../lib/square-reconcile.js');

const APPLY = process.argv.includes('--apply');
const daysArgument = process.argv.find((argument) => argument.startsWith('--days='));
const requestedDays = Number(daysArgument?.split('=')[1] || 28);
if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 90) {
  throw new Error('--days must be an integer between 1 and 90');
}

const accessToken = process.env.SQUARE_ACCESS_TOKEN;
const environment = String(process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
if (!accessToken) throw new Error('SQUARE_ACCESS_TOKEN is required');
if (environment !== 'production') throw new Error('This guarded script only reads the production Square account');

const now = new Date();
const begin = new Date(now.getTime() - requestedDays * 86_400_000).toISOString();
const end = now.toISOString();
const client = new SquareClient({
  token: accessToken,
  environment: SquareEnvironment.Production
});

const locationPage = await client.locations.list();
const locations = Array.isArray(locationPage.locations) ? locationPage.locations : [];
const locationIds = locations.filter((location) => location.status === 'ACTIVE').map((location) => location.id);
if (!locationIds.length) throw new Error('No active Square locations were returned');

const collectPage = async (page) => {
  const items = [];
  for await (const item of page) items.push(item);
  return items;
};

const bookings = [];
for (const locationId of locationIds) {
  const page = await client.bookings.list({
    locationId,
    startAtMin: begin,
    limit: 100
  });
  bookings.push(...await collectPage(page));
}

const payments = [];
const refunds = [];
for (const locationId of locationIds) {
  const paymentPage = await client.payments.list({
    locationId,
    updatedAtBeginTime: begin,
    updatedAtEndTime: end,
    sortField: 'UPDATED_AT',
    sortOrder: 'ASC',
    limit: 100
  });
  payments.push(...await collectPage(paymentPage));

  const refundPage = await client.refunds.list({
    locationId,
    updatedAtBeginTime: begin,
    updatedAtEndTime: end,
    sortField: 'UPDATED_AT',
    sortOrder: 'ASC',
    limit: 100
  });
  refunds.push(...await collectPage(refundPage));
}

const orders = [];
let cursor;
do {
  const response = await client.orders.search({
    locationIds,
    cursor,
    limit: 500,
    query: {
      filter: { dateTimeFilter: { updatedAt: { startAt: begin, endAt: end } } },
      sort: { sortField: 'UPDATED_AT', sortOrder: 'ASC' }
    },
    returnEntries: false
  });
  orders.push(...(response.orders || []));
  cursor = response.cursor || null;
} while (cursor);

const statusCounts = (items, key) => items.reduce((counts, item) => {
  const value = String(item?.[key] || 'UNKNOWN');
  counts[value] = (counts[value] || 0) + 1;
  return counts;
}, {});

const summary = {
  mode: APPLY ? 'apply' : 'dry-run',
  window: { begin, end, days: requestedDays },
  active_location_count: locationIds.length,
  bookings: { count: bookings.length, statuses: statusCounts(bookings, 'status') },
  payments: { count: payments.length, statuses: statusCounts(payments, 'status') },
  orders: { count: orders.length, states: statusCounts(orders, 'state') },
  refunds: { count: refunds.length, statuses: statusCounts(refunds, 'status') }
};

if (!APPLY) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const identitySecret = process.env.ATTRIBUTION_HMAC_SECRET;
if (!identitySecret) throw new Error('ATTRIBUTION_HMAC_SECRET is required in apply mode');
const store = createNeonSquareEventStore(process.env.DATABASE_URL);
const merchantId = process.env.SQUARE_MERCHANT_ID || null;
const inputs = { identitySecret, merchantId, receivedAt: end, store };

summary.persistence = {
  booking: await reconcileSquareEntities({ ...inputs, entityType: 'booking', entities: bookings }),
  payment: await reconcileSquareEntities({ ...inputs, entityType: 'payment', entities: payments }),
  order: await reconcileSquareEntities({ ...inputs, entityType: 'order', entities: orders }),
  refund: await reconcileSquareEntities({ ...inputs, entityType: 'refund', entities: refunds })
};

console.log(JSON.stringify(summary, null, 2));
