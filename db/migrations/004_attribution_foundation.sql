CREATE TABLE IF NOT EXISTS attribution_touches (
  touch_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES attribution_sessions(session_id),
  touch_time timestamptz NOT NULL,
  landing_page text,
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
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (gclid IS NOT NULL OR gbraid IS NOT NULL OR wbraid IS NOT NULL)
);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_touches_session_time_idx
  ON attribution_touches (session_id, touch_time);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_touches_gclid_idx
  ON attribution_touches (gclid);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_touches_gbraid_idx
  ON attribution_touches (gbraid);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_touches_wbraid_idx
  ON attribution_touches (wbraid);

-- migrate:split

CREATE TABLE IF NOT EXISTS attribution_lead_intents (
  lead_intent_id text PRIMARY KEY,
  reference_code text NOT NULL UNIQUE,
  session_id text NOT NULL REFERENCES attribution_sessions(session_id),
  touch_id text REFERENCES attribution_touches(touch_id),
  first_event_id text,
  first_channel text NOT NULL CHECK (first_channel IN ('phone', 'text', 'form', 'booking')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_lead_intents_session_idx
  ON attribution_lead_intents (session_id);

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_lead_intents_reference_idx
  ON attribution_lead_intents (reference_code);

-- migrate:split

ALTER TABLE attribution_payments
  ADD COLUMN IF NOT EXISTS provider_order_id text;

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_payments_provider_order_idx
  ON attribution_payments (provider_order_id);

-- migrate:split

ALTER TABLE attribution_links
  ADD COLUMN IF NOT EXISTS touch_id text REFERENCES attribution_touches(touch_id);

-- migrate:split

ALTER TABLE attribution_links
  ADD COLUMN IF NOT EXISTS proof_tier text CHECK (proof_tier IS NULL OR proof_tier IN ('A', 'B', 'C'));

-- migrate:split

ALTER TABLE attribution_links
  ADD COLUMN IF NOT EXISTS link_status text CHECK (link_status IS NULL OR link_status IN ('approved', 'candidate', 'rejected'));

-- migrate:split

CREATE INDEX IF NOT EXISTS attribution_links_touch_idx
  ON attribution_links (touch_id);

-- migrate:split

INSERT INTO attribution_schema_migrations (migration_id)
VALUES ('004_attribution_foundation')
ON CONFLICT (migration_id) DO NOTHING;
