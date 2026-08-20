CREATE TABLE IF NOT EXISTS commercial_leads (
  lead_id text PRIMARY KEY,
  submission_id text NOT NULL UNIQUE,
  session_id text,
  lead_intent_id text,
  reference_code text,
  name text NOT NULL,
  phone text NOT NULL,
  property_city text NOT NULL,
  additional_notes text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  touch jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- migrate:split

CREATE INDEX IF NOT EXISTS commercial_leads_created_at_idx
  ON commercial_leads (created_at DESC);

-- migrate:split

CREATE INDEX IF NOT EXISTS commercial_leads_session_idx
  ON commercial_leads (session_id);

-- migrate:split

CREATE INDEX IF NOT EXISTS commercial_leads_phone_idx
  ON commercial_leads (phone);

-- migrate:split

INSERT INTO attribution_schema_migrations (migration_id)
VALUES ('005_commercial_leads')
ON CONFLICT (migration_id) DO NOTHING;
