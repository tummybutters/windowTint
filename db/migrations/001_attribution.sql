CREATE TABLE IF NOT EXISTS attribution_schema_migrations (
  migration_id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT NOW()
);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_sessions (
  session_id text PRIMARY KEY,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  first_landing_page text,
  first_referrer text,
  source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  gbraid text,
  wbraid text,
  campaign_id text,
  ad_group_id text,
  creative_id text,
  keyword text,
  match_type text,
  device text,
  network text,
  location_physical_id text,
  location_interest_id text,
  placement text,
  target_id text,
  extension_id text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_events (
  event_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES attribution_sessions(session_id),
  event_name text NOT NULL,
  event_time timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  page_path text,
  page_url text,
  referrer text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  lead_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'website',
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_events_session_time_idx
  ON attribution_events (session_id, event_time);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_events_name_time_idx
  ON attribution_events (event_name, event_time);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_identities (
  session_id text NOT NULL REFERENCES attribution_sessions(session_id),
  identity_type text NOT NULL,
  identity_hash text NOT NULL,
  identity_hint text,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  PRIMARY KEY (session_id, identity_type, identity_hash)
);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_identities_hash_idx
  ON attribution_identities (identity_type, identity_hash);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_leads (
  lead_id text PRIMARY KEY,
  primary_session_id text NOT NULL UNIQUE REFERENCES attribution_sessions(session_id),
  lifecycle_stage text NOT NULL DEFAULT 'anonymous',
  source text,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  qualified_at timestamptz,
  accepted_at timestamptz,
  won_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_calls (
  call_id text PRIMARY KEY,
  provider text NOT NULL,
  provider_call_id text,
  session_id text REFERENCES attribution_sessions(session_id),
  caller_identity_hash text,
  destination_identity_hash text,
  direction text,
  status text,
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  qualified boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_call_id)
);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_bookings (
  booking_id text PRIMARY KEY,
  provider text NOT NULL,
  provider_booking_id text NOT NULL,
  session_id text REFERENCES attribution_sessions(session_id),
  customer_identity_hash text,
  status text,
  staff_created boolean,
  provider_created_at timestamptz,
  appointment_start_at timestamptz,
  service_summary text,
  amount_minor integer,
  currency text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_booking_id)
);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_payments (
  payment_id text PRIMARY KEY,
  provider text NOT NULL,
  provider_payment_id text NOT NULL,
  booking_id text REFERENCES attribution_bookings(booking_id),
  customer_identity_hash text,
  status text,
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  provider_created_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_payment_id)
);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_links (
  attribution_link_id text PRIMARY KEY,
  session_id text REFERENCES attribution_sessions(session_id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  method text NOT NULL,
  confidence numeric(5,4),
  gclid text,
  gbraid text,
  wbraid text,
  matched_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, method)
);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_webhook_receipts (
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload_digest text NOT NULL,
  status text NOT NULL,
  received_at timestamptz NOT NULL,
  processed_at timestamptz,
  error_code text,
  PRIMARY KEY (provider, provider_event_id)
);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_ingest_failures (
  failure_id bigserial PRIMARY KEY,
  event_id text,
  error_code text NOT NULL,
  retryable boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT NOW()
);

-- migrate:split

INSERT INTO attribution_schema_migrations (migration_id)
VALUES ('001_attribution')
ON CONFLICT (migration_id) DO NOTHING;
