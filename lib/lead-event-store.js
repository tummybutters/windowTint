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
touch_insert AS (
  INSERT INTO attribution_touches (
    touch_id,
    session_id,
    touch_time,
    landing_page,
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
  )
  SELECT
    $38,
    $1,
    NULLIF($39, '')::timestamptz,
    NULLIF($40, ''),
    NULLIF($41, ''),
    NULLIF($42, ''),
    NULLIF($43, ''),
    NULLIF($44, ''),
    NULLIF($45, ''),
    NULLIF($46, ''),
    NULLIF($47, ''),
    NULLIF($48, ''),
    NULLIF($49, ''),
    NULLIF($50, ''),
    NULLIF($51, ''),
    NULLIF($52, ''),
    NULLIF($53, ''),
    NULLIF($54, ''),
    NULLIF($55, ''),
    NULLIF($56, ''),
    NULLIF($57, ''),
    NULLIF($58, ''),
    NULLIF($59, ''),
    NULLIF($60, ''),
    NOW()
  WHERE $38 <> ''
  ON CONFLICT (touch_id) DO NOTHING
  RETURNING touch_id, gclid, gbraid, wbraid
),
-- A touch inserted earlier in this same statement is invisible to a plain table read
-- (writable CTEs in one WITH clause share the pre-statement snapshot); union its RETURNING
-- output with a session-scoped table lookup so a touch created in this call or an earlier
-- call both resolve the same way. Both arms are keyed off the lead intent's declared binding
-- ($63), never off the event's current touch ($38) -- an organic intent sharing an event with
-- an unrelated paid touch must not resolve to that touch. The table-read arm additionally
-- requires session_id = $1 so a touch belonging to a different session is never usable.
touch_lookup AS (
  SELECT touch_id, gclid, gbraid, wbraid FROM touch_insert
    WHERE touch_id = NULLIF($63, '')
  UNION ALL
  SELECT touch_id, gclid, gbraid, wbraid FROM attribution_touches
    WHERE touch_id = NULLIF($63, '') AND session_id = $1
),
-- Controller ruling (task-2 fix round 2): a NULL-to-touch conflict update was rejected because
-- it could later convert a genuinely organic first intent into a paid one. Instead, the insert
-- itself is conditional: a true organic intent ($63 empty) always inserts with touch_id NULL,
-- but an intent declaring a nonempty touch ($63) inserts only when that exact touch has already
-- resolved through the session-scoped touch_lookup above. If the declared touch is temporarily
-- missing or belongs to another session, this CTE produces no row at all -- the lead-intent and
-- link writes are skipped for this call, while event_insert below still persists the ordinary
-- event. A later call for the same lead_intent_id, once the touch has landed, is a fresh INSERT
-- attempt (no existing row to conflict with) and creates the intent then. Once a row exists,
-- ON CONFLICT (lead_intent_id) DO NOTHING makes its reference_code and touch_id immutable --
-- no later call can rewrite either, organic or paid.
lead_intent_upsert AS (
  INSERT INTO attribution_lead_intents (
    lead_intent_id,
    reference_code,
    session_id,
    touch_id,
    first_event_id,
    first_channel,
    updated_at
  )
  SELECT $61, $62, $1, (SELECT touch_id FROM touch_lookup LIMIT 1), $30, $64, NOW()
  WHERE $61 <> ''
    AND ($63 = '' OR EXISTS (SELECT 1 FROM touch_lookup))
  ON CONFLICT (lead_intent_id) DO NOTHING
  RETURNING lead_intent_id, touch_id
),
-- Same reasoning as touch_lookup: a lead intent inserted earlier in this statement is
-- invisible to a plain table read, so union the fresh RETURNING output (this call's own
-- insert) with a session-scoped table lookup (retries and repeated lead actions against a
-- pre-existing intent from an earlier call). The table-read arm requires exact session
-- ownership AND the exact stored reference_code, not lead_intent_id alone -- a guessable or
-- reused lead_intent_id submitted under a different (or absent) reference_code must not match
-- another session's or another reference's intent.
lead_intent_lookup AS (
  SELECT lead_intent_id, touch_id FROM lead_intent_upsert
  UNION ALL
  SELECT lead_intent_id, touch_id FROM attribution_lead_intents
    WHERE lead_intent_id = NULLIF($61, '')
      AND session_id = $1
      AND reference_code = NULLIF($62, '')
),
lead_intent_link_insert AS (
  INSERT INTO attribution_links (
    attribution_link_id,
    session_id,
    entity_type,
    entity_id,
    method,
    confidence,
    gclid,
    gbraid,
    wbraid,
    touch_id,
    proof_tier,
    link_status,
    matched_at,
    metadata
  )
  SELECT
    $65,
    $1,
    'lead_intent',
    $61,
    'lead_intent_touch',
    1.0,
    tl.gclid,
    tl.gbraid,
    tl.wbraid,
    tl.touch_id,
    'A',
    'approved',
    NOW(),
    '{}'::jsonb
  FROM lead_intent_lookup li
  JOIN touch_lookup tl ON tl.touch_id = li.touch_id
  WHERE $61 <> ''
  ON CONFLICT (entity_type, entity_id, method) DO NOTHING
  RETURNING attribution_link_id
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

const attributionLinkId = (entityType, entityId, method) =>
  `link_${crypto.createHash('sha256').update(`${entityType}:${entityId}:${method}`).digest('hex').slice(0, 32)}`;

const buildParams = (record) => {
  const lead = record.lead;
  const touch = record.touch || {};
  const leadIntent = record.lead_intent || {};
  const leadIntentId = leadIntent.lead_intent_id || '';
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
    JSON.stringify(record.lead),
    touch.touch_id || '',
    touch.touch_time || '',
    touch.landing_page || '',
    touch.utm_source || '',
    touch.utm_medium || '',
    touch.utm_campaign || '',
    touch.utm_term || '',
    touch.utm_content || '',
    touch.gclid || '',
    touch.gbraid || '',
    touch.wbraid || '',
    touch.campaign_id || '',
    touch.ad_group_id || '',
    touch.creative_id || '',
    touch.keyword || '',
    touch.match_type || '',
    touch.device || '',
    touch.network || '',
    touch.location_physical_id || '',
    touch.location_interest_id || '',
    touch.placement || '',
    touch.target_id || '',
    touch.extension_id || '',
    leadIntentId,
    leadIntent.reference_code || '',
    leadIntent.touch_id || '',
    leadIntent.first_channel || '',
    attributionLinkId('lead_intent', leadIntentId, 'lead_intent_touch')
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
  attributionLinkId,
  buildParams,
  createLeadEventStore,
  createNeonLeadEventStore,
  leadIdForSession
};
