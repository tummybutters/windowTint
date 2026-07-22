CREATE TABLE IF NOT EXISTS attribution_orders (
  order_id text PRIMARY KEY,
  provider text NOT NULL,
  provider_order_id text NOT NULL,
  customer_identity_hash text,
  state text,
  amount_minor integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  closed_at timestamptz,
  fulfillment_state text,
  service_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_order_id)
);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_orders_customer_time_idx
  ON attribution_orders (customer_identity_hash, provider_created_at);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_refunds (
  refund_id text PRIMARY KEY,
  provider text NOT NULL,
  provider_refund_id text NOT NULL,
  provider_payment_id text,
  provider_order_id text,
  status text,
  amount_minor integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_refund_id)
);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_refunds_payment_idx
  ON attribution_refunds (provider_payment_id, provider_created_at);

-- migrate:split

INSERT INTO attribution_schema_migrations (migration_id)
VALUES ('002_square_lifecycle')
ON CONFLICT (migration_id) DO NOTHING;
