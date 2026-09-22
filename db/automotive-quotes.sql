CREATE TABLE IF NOT EXISTS automotive_quotes (
 id uuid PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now(),
 name text NOT NULL, phone text NOT NULL, service_address text NOT NULL,
 vehicle_type text NOT NULL, vehicle text NOT NULL, coverage text NOT NULL,
 contact_method text NOT NULL CHECK(contact_method='call'),
 consent_version text NOT NULL, page_path text NOT NULL,
 attribution jsonb NOT NULL DEFAULT '{}', payload_hash text NOT NULL,
 stage text NOT NULL DEFAULT 'new' CHECK(stage IN ('new','contacted','qualified','quoted','booked','closed')),
 notification_state text NOT NULL DEFAULT 'pending' CHECK(notification_state IN ('pending','sending','accepted','retry','failed','unknown')),
 notification_attempts integer NOT NULL DEFAULT 0,
 notification_next_at timestamptz NOT NULL DEFAULT now(),
 notification_locked_at timestamptz, notification_provider_id text,
 notification_error text, notified_at timestamptz
);
CREATE INDEX IF NOT EXISTS automotive_quotes_notifications ON automotive_quotes(notification_state,notification_next_at);
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS notification_delivery_state text;
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS notification_delivery_error text;
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS notification_delivery_checked_at timestamptz;
CREATE TABLE IF NOT EXISTS automotive_quote_rate_limits (
 bucket text NOT NULL, window_at timestamptz NOT NULL DEFAULT date_trunc('minute',now()),
 count integer NOT NULL DEFAULT 1, PRIMARY KEY(bucket,window_at)
);

ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS priority text;
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS timing text;
-- Existing quotes are excluded; new saved quotes explicitly start pending.
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS crm_state text NOT NULL DEFAULT 'ignored';
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS crm_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS crm_next_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS crm_locked_at timestamptz;
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS crm_error text;
ALTER TABLE automotive_quotes ADD COLUMN IF NOT EXISTS crm_accepted_at timestamptz;
CREATE INDEX IF NOT EXISTS automotive_quotes_crm ON automotive_quotes(crm_state,crm_next_at);
