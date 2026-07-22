const crypto = require('node:crypto');

const EVENT_OBJECT_KEYS = Object.freeze({
  'booking.created': ['booking', 'booking'],
  'booking.updated': ['booking', 'booking'],
  'payment.created': ['payment', 'payment'],
  'payment.updated': ['payment', 'payment'],
  'order.created': ['order', 'order'],
  'order.updated': ['order', 'order'],
  'order.fulfillment.updated': ['order', 'order'],
  'refund.created': ['refund', 'refund'],
  'refund.updated': ['refund', 'refund']
});

class SquareWebhookValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SquareWebhookValidationError';
    this.code = code;
    this.statusCode = 400;
  }
}

const compactText = (value, maxLength = 240) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const nullableTimestamp = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const amountMinor = (money) => {
  const raw = money && money.amount;
  if (typeof raw === 'bigint') return Number(raw);
  const value = typeof raw === 'string' ? Number(raw) : raw;
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
};

const currency = (money) => compactText(money && money.currency, 8) || 'USD';

const hashIdentity = (identitySecret, type, value) => {
  if (!value) return null;
  return crypto.createHmac('sha256', identitySecret).update(`${type}:${value}`).digest('hex');
};

const internalId = (entityType, providerId) => `square_${entityType}_${providerId}`;

const bookingOrigin = (booking) => {
  const creatorType = booking.creator_details && booking.creator_details.creator_type;
  if (creatorType === 'TEAM_MEMBER' || booking.source === 'FIRST_PARTY_MERCHANT') {
    return { staff_created: true, booking_origin: 'staff' };
  }
  if (
    creatorType === 'CUSTOMER'
    || booking.source === 'FIRST_PARTY_BUYER'
    || booking.source === 'THIRD_PARTY_BUYER'
  ) {
    return { staff_created: false, booking_origin: 'customer' };
  }
  return { staff_created: null, booking_origin: 'unknown' };
};

const normalizeBooking = (booking, identitySecret) => {
  const providerId = compactText(booking.id, 160);
  const origin = bookingOrigin(booking);
  const serviceSummary = (Array.isArray(booking.appointment_segments) ? booking.appointment_segments : [])
    .map((segment) => compactText(segment && segment.service_variation_id, 160))
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 6)
    .join(', ');

  return {
    booking_id: internalId('booking', providerId),
    provider_booking_id: providerId,
    customer_identity_hash: hashIdentity(identitySecret, 'square_customer_id', booking.customer_id),
    status: compactText(booking.status, 64),
    staff_created: origin.staff_created,
    booking_origin: origin.booking_origin,
    provider_created_at: nullableTimestamp(booking.created_at),
    appointment_start_at: nullableTimestamp(booking.start_at),
    service_summary: serviceSummary || null,
    amount_minor: null,
    currency: null,
    metadata: {
      location_id: compactText(booking.location_id, 160) || null,
      source: compactText(booking.source, 64) || null,
      creator_type: compactText(booking.creator_details && booking.creator_details.creator_type, 64) || null,
      booking_origin: origin.booking_origin,
      appointment_segment_count: Array.isArray(booking.appointment_segments)
        ? booking.appointment_segments.length
        : 0,
      version: Number.isSafeInteger(booking.version) ? booking.version : null,
      provider_updated_at: nullableTimestamp(booking.updated_at)
    }
  };
};

const normalizePayment = (payment, identitySecret) => {
  const providerId = compactText(payment.id, 160);
  const money = payment.total_money || payment.amount_money || {};
  return {
    payment_id: internalId('payment', providerId),
    provider_payment_id: providerId,
    provider_order_id: compactText(payment.order_id, 160) || null,
    customer_identity_hash: hashIdentity(identitySecret, 'square_customer_id', payment.customer_id),
    status: compactText(payment.status, 64),
    amount_minor: amountMinor(money),
    currency: currency(money),
    provider_created_at: nullableTimestamp(payment.created_at),
    metadata: {
      provider_order_id: compactText(payment.order_id, 160) || null,
      location_id: compactText(payment.location_id, 160) || null,
      source_type: compactText(payment.source_type, 64) || null,
      provider_updated_at: nullableTimestamp(payment.updated_at)
    }
  };
};

const normalizeOrder = (order, identitySecret) => {
  const providerId = compactText(order.id, 160);
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
  const fulfillments = Array.isArray(order.fulfillments) ? order.fulfillments : [];
  const serviceSummary = lineItems
    .map((lineItem) => compactText(lineItem && lineItem.name, 120))
    .filter(Boolean)
    .slice(0, 6)
    .join(', ');
  const fulfillmentStates = fulfillments
    .map((fulfillment) => compactText(fulfillment && fulfillment.state, 64))
    .filter(Boolean);
  const money = order.total_money || {};

  return {
    order_id: internalId('order', providerId),
    provider_order_id: providerId,
    customer_identity_hash: hashIdentity(identitySecret, 'square_customer_id', order.customer_id),
    state: compactText(order.state, 64),
    amount_minor: amountMinor(money),
    currency: currency(money),
    provider_created_at: nullableTimestamp(order.created_at),
    provider_updated_at: nullableTimestamp(order.updated_at),
    closed_at: nullableTimestamp(order.closed_at),
    fulfillment_state: fulfillmentStates.at(-1) || null,
    service_summary: serviceSummary || null,
    metadata: {
      location_id: compactText(order.location_id, 160) || null,
      source_name: compactText(order.source && order.source.name, 120) || null,
      fulfillment_states: fulfillmentStates.slice(0, 8),
      line_item_count: lineItems.length,
      version: Number.isSafeInteger(order.version) ? order.version : null
    }
  };
};

const normalizeRefund = (refund) => {
  const providerId = compactText(refund.id, 160);
  const money = refund.amount_money || {};
  return {
    refund_id: internalId('refund', providerId),
    provider_refund_id: providerId,
    provider_payment_id: compactText(refund.payment_id, 160) || null,
    provider_order_id: compactText(refund.order_id, 160) || null,
    status: compactText(refund.status, 64),
    amount_minor: amountMinor(money),
    currency: currency(money),
    provider_created_at: nullableTimestamp(refund.created_at),
    provider_updated_at: nullableTimestamp(refund.updated_at),
    metadata: {
      location_id: compactText(refund.location_id, 160) || null
    }
  };
};

const normalizeSquareWebhook = (envelope, options = {}) => {
  if (!envelope || typeof envelope !== 'object') {
    throw new SquareWebhookValidationError('invalid_envelope', 'Square webhook must be an object');
  }
  if (!options.identitySecret) {
    throw new SquareWebhookValidationError('identity_hashing_unavailable', 'Identity hashing is not configured');
  }
  if (typeof options.rawBody !== 'string') {
    throw new SquareWebhookValidationError('raw_body_unavailable', 'Raw webhook body is required');
  }

  const providerEventId = compactText(envelope.event_id, 160);
  const eventType = compactText(envelope.type, 100);
  const mapping = EVENT_OBJECT_KEYS[eventType];
  if (!mapping) {
    throw new SquareWebhookValidationError('unsupported_event_type', 'Unsupported Square event type');
  }
  if (!providerEventId || !nullableTimestamp(envelope.created_at)) {
    throw new SquareWebhookValidationError('invalid_envelope', 'Square webhook envelope is incomplete');
  }

  const object = envelope.data && envelope.data.object && envelope.data.object[mapping[1]];
  if (!object || typeof object !== 'object' || !compactText(object.id, 160)) {
    throw new SquareWebhookValidationError('invalid_entity', 'Square webhook entity is missing');
  }

  let entity;
  if (mapping[0] === 'booking') entity = normalizeBooking(object, options.identitySecret);
  if (mapping[0] === 'payment') entity = normalizePayment(object, options.identitySecret);
  if (mapping[0] === 'order') entity = normalizeOrder(object, options.identitySecret);
  if (mapping[0] === 'refund') entity = normalizeRefund(object);

  return {
    provider_event_id: providerEventId,
    event_type: eventType,
    provider_created_at: nullableTimestamp(envelope.created_at),
    received_at: nullableTimestamp(options.receivedAt) || new Date().toISOString(),
    merchant_id_hash: hashIdentity(options.identitySecret, 'square_merchant_id', envelope.merchant_id),
    payload_digest: crypto.createHash('sha256').update(options.rawBody).digest('hex'),
    entity_type: mapping[0],
    entity
  };
};

module.exports = {
  EVENT_OBJECT_KEYS,
  SquareWebhookValidationError,
  hashIdentity,
  normalizeSquareWebhook
};
