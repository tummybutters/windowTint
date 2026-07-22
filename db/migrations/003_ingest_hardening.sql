ALTER TABLE attribution_bookings
  ADD COLUMN IF NOT EXISTS last_provider_event_at timestamptz;

-- migrate:split

ALTER TABLE attribution_payments
  ADD COLUMN IF NOT EXISTS last_provider_event_at timestamptz;

-- migrate:split

ALTER TABLE attribution_orders
  ADD COLUMN IF NOT EXISTS last_provider_event_at timestamptz;

-- migrate:split

ALTER TABLE attribution_refunds
  ADD COLUMN IF NOT EXISTS last_provider_event_at timestamptz;

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_ingest_rate_limits (
  bucket_key text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bucket_key, window_started_at)
);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_ingest_rate_limits_updated_idx
  ON attribution_ingest_rate_limits (updated_at);

-- migrate:split

INSERT INTO attribution_schema_migrations (migration_id)
VALUES ('003_ingest_hardening')
ON CONFLICT (migration_id) DO NOTHING;
