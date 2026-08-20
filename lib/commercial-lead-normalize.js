const crypto = require('node:crypto');
const qualifier = require('./commercial-qualifier');

const SUBMISSION_ID = /^commercial_submission_[A-Za-z0-9_-]{16,120}$/;
const LEAD_INTENT_ID = /^intent_[A-Za-z0-9_-]{16,120}$/;
const LEAD_REFERENCE = /^OA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/;
const ATTRIBUTION_FIELDS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'gbraid', 'wbraid', 'campaignid', 'adgroupid', 'creative',
  'keyword', 'matchtype', 'device', 'network', 'loc_physical_ms',
  'loc_interest_ms', 'placement', 'targetid', 'extensionid',
  'first_seen_at', 'last_seen_at', 'first_landing_page', 'first_referrer'
];
const TOUCH_FIELDS = [
  'touch_id', 'touch_time', 'landing_page', 'utm_source', 'utm_medium',
  'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid',
  'campaign_id', 'ad_group_id', 'creative_id', 'keyword', 'match_type',
  'device', 'network', 'location_physical_id', 'location_interest_id',
  'placement', 'target_id', 'extension_id'
];

class CommercialLeadValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CommercialLeadValidationError';
    this.statusCode = 400;
    this.code = 'invalid_commercial_lead';
  }
}

const clean = (value, maxLength) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);

const requireText = (value, label, maxLength) => {
  const normalized = clean(value, maxLength);
  if (!normalized) throw new CommercialLeadValidationError(`${label} is required`);
  return normalized;
};

const normalizePhone = (value) => {
  let digits = clean(value, 40).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) throw new CommercialLeadValidationError('A valid phone number is required');
  return digits;
};

const pickStrings = (source, fields, maxLength = 500) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const result = {};
  for (const field of fields) {
    const value = clean(source[field], field === 'keyword' ? 500 : maxLength);
    if (value) result[field] = value;
  }
  return result;
};

const normalizeAnswers = (answers) => {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || !qualifier.isComplete(answers)) {
    throw new CommercialLeadValidationError('Valid quiz answers are required');
  }
  return Object.fromEntries(qualifier.QUESTIONS.map((question) => [question.id, clean(answers[question.id], 80)]));
};

const buildCommercialLeadRecord = (payload, { now = new Date() } = {}) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const submissionId = clean(source.submission_id, 160);
  if (!SUBMISSION_ID.test(submissionId)) throw new CommercialLeadValidationError('Valid submission_id is required');

  const sessionId = clean(source.session_id, 160);
  const intentId = clean(source.lead_intent_id, 160);
  const reference = clean(source.reference_code, 32);
  if (intentId && !LEAD_INTENT_ID.test(intentId)) throw new CommercialLeadValidationError('Invalid lead_intent_id');
  if (reference && !LEAD_REFERENCE.test(reference)) throw new CommercialLeadValidationError('Invalid reference_code');

  return {
    lead_id: `commercial_lead_${crypto.createHash('sha256').update(submissionId).digest('hex').slice(0, 32)}`,
    submission_id: submissionId,
    session_id: sessionId,
    lead_intent_id: intentId,
    reference_code: reference,
    name: requireText(source.name, 'Name', 120),
    phone: normalizePhone(source.phone),
    property_city: requireText(source.property_city, 'Property city', 120),
    additional_notes: clean(source.additional_notes, 2000),
    answers: normalizeAnswers(source.answers),
    attribution: {
      ...pickStrings(source.attribution, ATTRIBUTION_FIELDS, 1000),
      evidence_status: 'client_snapshot_unverified'
    },
    touch: pickStrings(source.touch, TOUCH_FIELDS, 1000),
    created_at: now.toISOString()
  };
};

module.exports = {
  CommercialLeadValidationError,
  buildCommercialLeadRecord
};
