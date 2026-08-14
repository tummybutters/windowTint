const RECEIPT_CTE = `
WITH receipt_insert AS (
  INSERT INTO attribution_webhook_receipts (
    provider,
    provider_event_id,
    event_type,
    payload_digest,
    status,
    received_at,
    processed_at
  ) VALUES (
    'square', $1, $2, $3, 'processed', $4::timestamptz, $4::timestamptz
  )
  ON CONFLICT (provider, provider_event_id) DO NOTHING
  RETURNING provider_event_id
),
`;

const BOOKING_SQL = `${RECEIPT_CTE}
entity_upsert AS (
  INSERT INTO attribution_bookings (
    booking_id, provider, provider_booking_id, customer_identity_hash, status,
    staff_created, provider_created_at, appointment_start_at, service_summary,
    amount_minor, currency, metadata, last_provider_event_at, updated_at
  )
  SELECT $5, 'square', $6, NULLIF($7, ''), NULLIF($8, ''), $9,
    NULLIF($10, '')::timestamptz, NULLIF($11, '')::timestamptz, NULLIF($12, ''),
    $13, NULLIF($14, ''), $15::jsonb, $16::timestamptz, NOW()
  FROM receipt_insert
  ON CONFLICT (provider, provider_booking_id) DO UPDATE SET
    customer_identity_hash = COALESCE(EXCLUDED.customer_identity_hash, attribution_bookings.customer_identity_hash),
    status = COALESCE(EXCLUDED.status, attribution_bookings.status),
    staff_created = COALESCE(EXCLUDED.staff_created, attribution_bookings.staff_created),
    provider_created_at = COALESCE(attribution_bookings.provider_created_at, EXCLUDED.provider_created_at),
    appointment_start_at = COALESCE(EXCLUDED.appointment_start_at, attribution_bookings.appointment_start_at),
    service_summary = COALESCE(EXCLUDED.service_summary, attribution_bookings.service_summary),
    amount_minor = COALESCE(EXCLUDED.amount_minor, attribution_bookings.amount_minor),
    currency = COALESCE(EXCLUDED.currency, attribution_bookings.currency),
    metadata = attribution_bookings.metadata || EXCLUDED.metadata,
    last_provider_event_at = EXCLUDED.last_provider_event_at,
    updated_at = NOW()
  WHERE EXCLUDED.last_provider_event_at >= COALESCE(
    attribution_bookings.last_provider_event_at,
    '-infinity'::timestamptz
  )
  RETURNING booking_id
)
SELECT EXISTS(SELECT 1 FROM receipt_insert) AS inserted,
  EXISTS(SELECT 1 FROM entity_upsert) AS applied,
  (SELECT booking_id FROM entity_upsert) AS entity_id;
`;

const PAYMENT_SQL = `${RECEIPT_CTE}
entity_upsert AS (
  INSERT INTO attribution_payments (
    payment_id, provider, provider_payment_id, provider_order_id, customer_identity_hash, status,
    amount_minor, currency, provider_created_at, metadata, last_provider_event_at, updated_at
  )
  SELECT $5, 'square', $6, NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''),
    $10, $11, NULLIF($12, '')::timestamptz, $13::jsonb, $14::timestamptz, NOW()
  FROM receipt_insert
  ON CONFLICT (provider, provider_payment_id) DO UPDATE SET
    provider_order_id = COALESCE(EXCLUDED.provider_order_id, attribution_payments.provider_order_id),
    customer_identity_hash = COALESCE(EXCLUDED.customer_identity_hash, attribution_payments.customer_identity_hash),
    status = COALESCE(EXCLUDED.status, attribution_payments.status),
    amount_minor = EXCLUDED.amount_minor,
    currency = EXCLUDED.currency,
    provider_created_at = COALESCE(attribution_payments.provider_created_at, EXCLUDED.provider_created_at),
    metadata = attribution_payments.metadata || EXCLUDED.metadata,
    last_provider_event_at = EXCLUDED.last_provider_event_at,
    updated_at = NOW()
  WHERE EXCLUDED.last_provider_event_at >= COALESCE(
    attribution_payments.last_provider_event_at,
    '-infinity'::timestamptz
  )
  RETURNING payment_id
)
SELECT EXISTS(SELECT 1 FROM receipt_insert) AS inserted,
  EXISTS(SELECT 1 FROM entity_upsert) AS applied,
  (SELECT payment_id FROM entity_upsert) AS entity_id;
`;

const ORDER_SQL = `${RECEIPT_CTE}
entity_upsert AS (
  INSERT INTO attribution_orders (
    order_id, provider, provider_order_id, customer_identity_hash, state,
    amount_minor, currency, provider_created_at, provider_updated_at, closed_at,
    fulfillment_state, service_summary, metadata, last_provider_event_at, updated_at
  )
  SELECT $5, 'square', $6, NULLIF($7, ''), NULLIF($8, ''),
    $9, $10, NULLIF($11, '')::timestamptz, NULLIF($12, '')::timestamptz,
    NULLIF($13, '')::timestamptz, NULLIF($14, ''), NULLIF($15, ''),
    $16::jsonb, $17::timestamptz, NOW()
  FROM receipt_insert
  ON CONFLICT (provider, provider_order_id) DO UPDATE SET
    customer_identity_hash = COALESCE(EXCLUDED.customer_identity_hash, attribution_orders.customer_identity_hash),
    state = COALESCE(EXCLUDED.state, attribution_orders.state),
    amount_minor = EXCLUDED.amount_minor,
    currency = EXCLUDED.currency,
    provider_created_at = COALESCE(attribution_orders.provider_created_at, EXCLUDED.provider_created_at),
    provider_updated_at = COALESCE(EXCLUDED.provider_updated_at, attribution_orders.provider_updated_at),
    closed_at = COALESCE(EXCLUDED.closed_at, attribution_orders.closed_at),
    fulfillment_state = COALESCE(EXCLUDED.fulfillment_state, attribution_orders.fulfillment_state),
    service_summary = COALESCE(EXCLUDED.service_summary, attribution_orders.service_summary),
    metadata = attribution_orders.metadata || EXCLUDED.metadata,
    last_provider_event_at = EXCLUDED.last_provider_event_at,
    updated_at = NOW()
  WHERE EXCLUDED.last_provider_event_at >= COALESCE(
    attribution_orders.last_provider_event_at,
    '-infinity'::timestamptz
  )
  RETURNING order_id
)
SELECT EXISTS(SELECT 1 FROM receipt_insert) AS inserted,
  EXISTS(SELECT 1 FROM entity_upsert) AS applied,
  (SELECT order_id FROM entity_upsert) AS entity_id;
`;

const REFUND_SQL = `${RECEIPT_CTE}
entity_upsert AS (
  INSERT INTO attribution_refunds (
    refund_id, provider, provider_refund_id, provider_payment_id, provider_order_id,
    status, amount_minor, currency, provider_created_at, provider_updated_at,
    metadata, last_provider_event_at, updated_at
  )
  SELECT $5, 'square', $6, NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, ''),
    $10, $11, NULLIF($12, '')::timestamptz, NULLIF($13, '')::timestamptz,
    $14::jsonb, $15::timestamptz, NOW()
  FROM receipt_insert
  ON CONFLICT (provider, provider_refund_id) DO UPDATE SET
    provider_payment_id = COALESCE(EXCLUDED.provider_payment_id, attribution_refunds.provider_payment_id),
    provider_order_id = COALESCE(EXCLUDED.provider_order_id, attribution_refunds.provider_order_id),
    status = COALESCE(EXCLUDED.status, attribution_refunds.status),
    amount_minor = EXCLUDED.amount_minor,
    currency = EXCLUDED.currency,
    provider_created_at = COALESCE(attribution_refunds.provider_created_at, EXCLUDED.provider_created_at),
    provider_updated_at = COALESCE(EXCLUDED.provider_updated_at, attribution_refunds.provider_updated_at),
    metadata = attribution_refunds.metadata || EXCLUDED.metadata,
    last_provider_event_at = EXCLUDED.last_provider_event_at,
    updated_at = NOW()
  WHERE EXCLUDED.last_provider_event_at >= COALESCE(
    attribution_refunds.last_provider_event_at,
    '-infinity'::timestamptz
  )
  RETURNING refund_id
)
SELECT EXISTS(SELECT 1 FROM receipt_insert) AS inserted,
  EXISTS(SELECT 1 FROM entity_upsert) AS applied,
  (SELECT refund_id FROM entity_upsert) AS entity_id;
`;

const RECORD_FAILURE_SQL = `
INSERT INTO attribution_ingest_failures (
  event_id,
  error_code,
  retryable
) VALUES (
  NULLIF($1, ''),
  $2,
  $3
)
RETURNING failure_id;
`;

const rowsFromResult = (result) => {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
};

const baseParams = (record) => [
  record.provider_event_id,
  record.event_type,
  record.payload_digest,
  record.received_at
];

const statementFor = (record) => {
  const entity = record.entity || {};
  if (record.entity_type === 'booking') {
    return {
      sql: BOOKING_SQL,
      params: [...baseParams(record), entity.booking_id, entity.provider_booking_id,
        entity.customer_identity_hash, entity.status, entity.staff_created,
        entity.provider_created_at, entity.appointment_start_at, entity.service_summary,
        entity.amount_minor, entity.currency, JSON.stringify(entity.metadata || {}),
        record.provider_created_at]
    };
  }
  if (record.entity_type === 'payment') {
    return {
      sql: PAYMENT_SQL,
      params: [...baseParams(record), entity.payment_id, entity.provider_payment_id,
        entity.provider_order_id, entity.customer_identity_hash, entity.status,
        entity.amount_minor, entity.currency, entity.provider_created_at,
        JSON.stringify(entity.metadata || {}), record.provider_created_at]
    };
  }
  if (record.entity_type === 'order') {
    return {
      sql: ORDER_SQL,
      params: [...baseParams(record), entity.order_id, entity.provider_order_id,
        entity.customer_identity_hash, entity.state, entity.amount_minor, entity.currency,
        entity.provider_created_at, entity.provider_updated_at, entity.closed_at,
        entity.fulfillment_state, entity.service_summary, JSON.stringify(entity.metadata || {}),
        record.provider_created_at]
    };
  }
  if (record.entity_type === 'refund') {
    return {
      sql: REFUND_SQL,
      params: [...baseParams(record), entity.refund_id, entity.provider_refund_id,
        entity.provider_payment_id, entity.provider_order_id, entity.status,
        entity.amount_minor, entity.currency, entity.provider_created_at,
        entity.provider_updated_at, JSON.stringify(entity.metadata || {}),
        record.provider_created_at]
    };
  }
  throw new Error(`Unsupported Square entity type: ${record.entity_type}`);
};

const createSquareEventStore = ({ query }) => {
  if (typeof query !== 'function') throw new Error('A database query function is required');
  return {
    async recordFailure({ eventId = '', errorCode, retryable = false }) {
      await query(RECORD_FAILURE_SQL, [eventId, errorCode, Boolean(retryable)]);
    },
    async persist(record) {
      const statement = statementFor(record);
      const result = await query(statement.sql, statement.params);
      const row = rowsFromResult(result)[0] || {};
      return {
        inserted: Boolean(row.inserted),
        applied: Boolean(row.applied),
        entityType: record.entity_type,
        entityId: row.entity_id || statement.params[4]
      };
    }
  };
};

const createNeonSquareEventStore = (connectionString) => {
  if (!connectionString) {
    const error = new Error('DATABASE_URL is not configured');
    error.code = 'storage_not_configured';
    throw error;
  }
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(connectionString);
  return createSquareEventStore({ query: (queryText, params) => sql.query(queryText, params) });
};

module.exports = {
  BOOKING_SQL,
  ORDER_SQL,
  PAYMENT_SQL,
  RECORD_FAILURE_SQL,
  REFUND_SQL,
  createNeonSquareEventStore,
  createSquareEventStore,
  statementFor
};
