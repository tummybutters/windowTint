const INSERT_SQL = `
WITH inserted AS (
  INSERT INTO commercial_leads (
    lead_id, submission_id, session_id, lead_intent_id, reference_code,
    name, phone, property_city, additional_notes, answers, attribution, touch, created_at, updated_at
  ) VALUES (
    $1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''),
    $6, $7, $8, NULLIF($9, ''), $10::jsonb, $11::jsonb, $12::jsonb, $13::timestamptz, NOW()
  )
  ON CONFLICT (submission_id) DO NOTHING
  RETURNING lead_id
)
SELECT lead_id, TRUE AS inserted FROM inserted
UNION ALL
SELECT lead_id, FALSE AS inserted
FROM commercial_leads
WHERE submission_id = $2 AND NOT EXISTS (SELECT 1 FROM inserted)
LIMIT 1;
`;

const RATE_LIMIT_SQL = `
INSERT INTO attribution_ingest_rate_limits (bucket_key, window_started_at, request_count, updated_at)
VALUES ($1, date_trunc('minute', NOW()), 1, NOW())
ON CONFLICT (bucket_key, window_started_at) DO UPDATE SET
  request_count = attribution_ingest_rate_limits.request_count + 1,
  updated_at = NOW()
RETURNING request_count;
`;

const rows = (result) => Array.isArray(result) ? result : (result && Array.isArray(result.rows) ? result.rows : []);

const createCommercialLeadStore = ({ query }) => {
  if (typeof query !== 'function') throw new Error('A database query function is required');
  return {
    async checkRateLimit(bucketKey, limit = 20) {
      const row = rows(await query(RATE_LIMIT_SQL, [bucketKey]))[0] || {};
      const requestCount = Number(row.request_count || 0);
      return { allowed: requestCount <= limit, requestCount, limit };
    },
    async persist(record) {
      const params = [
        record.lead_id, record.submission_id, record.session_id, record.lead_intent_id,
        record.reference_code, record.name, record.phone, record.property_city,
        record.additional_notes, JSON.stringify(record.answers), JSON.stringify(record.attribution),
        JSON.stringify(record.touch), record.created_at
      ];
      const row = rows(await query(INSERT_SQL, params))[0];
      if (!row || !row.lead_id) {
        const error = new Error('Commercial lead was not persisted');
        error.code = 'commercial_lead_persist_failed';
        throw error;
      }
      return { leadId: row.lead_id, inserted: row.inserted === true || row.inserted === 'true' };
    }
  };
};

const createNeonCommercialLeadStore = (databaseUrl) => {
  if (!databaseUrl) {
    const error = new Error('DATABASE_URL is not configured');
    error.code = 'storage_not_configured';
    throw error;
  }
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(databaseUrl);
  return createCommercialLeadStore({ query: (text, params) => sql.query(text, params) });
};

module.exports = { createCommercialLeadStore, createNeonCommercialLeadStore };
