const crypto = require('node:crypto');

const PERSIST_EVENT_SQL = `
WITH session_upsert AS (
  INSERT INTO attribution_sessions (
    session_id,
    first_seen_at,
    last_seen_at,
    first_landing_page,
    first_referrer,
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    gclid,
    gbraid,
    wbraid,
    campaign_id,
    ad_group_id,
    creative_id,
    keyword,
    match_type,
    device,
    network,
    location_physical_id,
    location_interest_id,
    placement,
    target_id,
    extension_id,
    updated_at
  ) VALUES (
    $1,
    NULLIF($2, '')::timestamptz,
    NULLIF($3, '')::timestamptz,
    NULLIF($4, ''),
    NULLIF($5, ''),
    NULLIF($6, ''),
    NULLIF($7, ''),
    NULLIF($8, ''),
    NULLIF($9, ''),
    NULLIF($10, ''),
    NULLIF($11, ''),
    NULLIF($12, ''),
    NULLIF($13, ''),
    NULLIF($14, ''),
    NULLIF($15, ''),
    NULLIF($16, ''),
    NULLIF($17, ''),
    NULLIF($18, ''),
    NULLIF($19, ''),
    NULLIF($20, ''),
    NULLIF($21, ''),
    NULLIF($22, ''),
    NULLIF($23, ''),
    NULLIF($24, ''),
    NULLIF($25, ''),
    NULLIF($26, ''),
    NOW()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    first_seen_at = COALESCE(attribution_sessions.first_seen_at, EXCLUDED.first_seen_at),
    last_seen_at = GREATEST(
      COALESCE(attribution_sessions.last_seen_at, '-infinity'::timestamptz),
      COALESCE(EXCLUDED.last_seen_at, '-infinity'::timestamptz)
    ),
    first_landing_page = COALESCE(attribution_sessions.first_landing_page, EXCLUDED.first_landing_page),
    first_referrer = COALESCE(attribution_sessions.first_referrer, EXCLUDED.first_referrer),
    source = COALESCE(attribution_sessions.source, EXCLUDED.source),
    utm_source = COALESCE(attribution_sessions.utm_source, EXCLUDED.utm_source),
    utm_medium = COALESCE(attribution_sessions.utm_medium, EXCLUDED.utm_medium),
    utm_campaign = COALESCE(attribution_sessions.utm_campaign, EXCLUDED.utm_campaign),
    utm_term = COALESCE(attribution_sessions.utm_term, EXCLUDED.utm_term),
    utm_content = COALESCE(attribution_sessions.utm_content, EXCLUDED.utm_content),
    gclid = COALESCE(attribution_sessions.gclid, EXCLUDED.gclid),
    gbraid = COALESCE(attribution_sessions.gbraid, EXCLUDED.gbraid),
    wbraid = COALESCE(attribution_sessions.wbraid, EXCLUDED.wbraid),
    campaign_id = COALESCE(attribution_sessions.campaign_id, EXCLUDED.campaign_id),
    ad_group_id = COALESCE(attribution_sessions.ad_group_id, EXCLUDED.ad_group_id),
    creative_id = COALESCE(attribution_sessions.creative_id, EXCLUDED.creative_id),
    keyword = COALESCE(attribution_sessions.keyword, EXCLUDED.keyword),
    match_type = COALESCE(attribution_sessions.match_type, EXCLUDED.match_type),
    device = COALESCE(attribution_sessions.device, EXCLUDED.device),
    network = COALESCE(attribution_sessions.network, EXCLUDED.network),
    location_physical_id = COALESCE(attribution_sessions.location_physical_id, EXCLUDED.location_physical_id),
    location_interest_id = COALESCE(attribution_sessions.location_interest_id, EXCLUDED.location_interest_id),
    placement = COALESCE(attribution_sessions.placement, EXCLUDED.placement),
    target_id = COALESCE(attribution_sessions.target_id, EXCLUDED.target_id),
    extension_id = COALESCE(attribution_sessions.extension_id, EXCLUDED.extension_id),
    updated_at = NOW()
  RETURNING session_id
),
lead_upsert AS (
  INSERT INTO attribution_leads (
    lead_id,
    primary_session_id,
    lifecycle_stage,
    source,
    first_seen_at,
    last_seen_at,
    created_at,
    updated_at
  ) VALUES (
    $27,
    $1,
    'anonymous',
    NULLIF($6, ''),
    COALESCE(NULLIF($2, '')::timestamptz, $28::timestamptz),
    COALESCE(NULLIF($3, '')::timestamptz, $28::timestamptz),
    NOW(),
    NOW()
  )
  ON CONFLICT (primary_session_id) DO UPDATE SET
    last_seen_at = GREATEST(attribution_leads.last_seen_at, EXCLUDED.last_seen_at),
    updated_at = NOW()
  RETURNING lead_id
),
identity_upsert AS (
  INSERT INTO attribution_identities (
    session_id,
    identity_type,
    identity_hash,
    identity_hint,
    first_seen_at,
    last_seen_at
  )
  SELECT
    $1,
    identity_type,
    identity_hash,
    NULLIF(identity_hint, ''),
    $28::timestamptz,
    $28::timestamptz
  FROM jsonb_to_recordset($29::jsonb) AS identity_rows(
    identity_type text,
    identity_hash text,
    identity_hint text
  )
  ON CONFLICT (session_id, identity_type, identity_hash) DO UPDATE SET
    last_seen_at = EXCLUDED.last_seen_at
  RETURNING identity_hash
),
event_insert AS (
  INSERT INTO attribution_events (
    event_id,
    session_id,
    event_name,
    event_time,
    received_at,
    page_path,
    page_url,
    referrer,
    payload,
    lead_snapshot,
    source
  ) VALUES (
    $30,
    $1,
    $31,
    $32::timestamptz,
    $28::timestamptz,
    NULLIF($33, ''),
    NULLIF($34, ''),
    NULLIF($35, ''),
    $36::jsonb,
    $37::jsonb,
    'website'
  )
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id
)
SELECT EXISTS(SELECT 1 FROM event_insert) AS inserted;
`;

const RATE_LIMIT_SQL = `
INSERT INTO attribution_ingest_rate_limits (
  bucket_key,
  window_started_at,
  request_count,
  updated_at
) VALUES (
  $1,
  date_trunc('minute', NOW()),
  1,
  NOW()
)
ON CONFLICT (bucket_key, window_started_at) DO UPDATE SET
  request_count = attribution_ingest_rate_limits.request_count + 1,
  updated_at = NOW()
RETURNING request_count;
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

const leadIdForSession = (sessionId) => `lead_${crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, 32)}`;

const buildParams = (record) => {
  const lead = record.lead;
  return [
    record.session_id,
    lead.first_seen_at,
    lead.last_seen_at,
    lead.first_landing_page,
    lead.first_referrer,
    record.source,
    lead.utm_source,
    lead.utm_medium,
    lead.utm_campaign,
    lead.utm_term,
    lead.utm_content,
    lead.gclid,
    lead.gbraid,
    lead.wbraid,
    lead.campaignid,
    lead.adgroupid,
    lead.creative,
    lead.keyword,
    lead.matchtype,
    lead.device,
    lead.network,
    lead.loc_physical_ms,
    lead.loc_interest_ms,
    lead.placement,
    lead.targetid,
    lead.extensionid,
    leadIdForSession(record.session_id),
    record.received_at,
    JSON.stringify(record.identities),
    record.event_id,
    record.event_name,
    record.event_time,
    record.page_path,
    record.page_url,
    record.referrer,
    JSON.stringify(record.payload),
    JSON.stringify(record.lead)
  ];
};

const createLeadEventStore = ({ query }) => {
  if (typeof query !== 'function') throw new Error('A database query function is required');

  return {
    async checkRateLimit(bucketKey, limit = 60) {
      const result = await query(RATE_LIMIT_SQL, [bucketKey]);
      const row = rowsFromResult(result)[0] || {};
      const requestCount = Number(row.request_count || 0);
      return {
        allowed: requestCount <= limit,
        requestCount,
        limit
      };
    },
    async recordFailure({ eventId = '', errorCode, retryable = false }) {
      await query(RECORD_FAILURE_SQL, [eventId, errorCode, Boolean(retryable)]);
    },
    async persist(record) {
      const result = await query(PERSIST_EVENT_SQL, buildParams(record));
      const row = rowsFromResult(result)[0];
      return { inserted: Boolean(row && row.inserted) };
    }
  };
};

const createNeonLeadEventStore = (connectionString) => {
  if (!connectionString) {
    const error = new Error('DATABASE_URL is not configured');
    error.code = 'storage_not_configured';
    throw error;
  }

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(connectionString);
  return createLeadEventStore({
    query: (queryText, params) => sql.query(queryText, params)
  });
};

module.exports = {
  PERSIST_EVENT_SQL,
  RATE_LIMIT_SQL,
  RECORD_FAILURE_SQL,
  buildParams,
  createLeadEventStore,
  createNeonLeadEventStore,
  leadIdForSession
};
