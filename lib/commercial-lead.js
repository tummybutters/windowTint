const crypto = require('node:crypto');

// Commercial requests share the automotive_quotes pipeline (storage, Elle's alert, Tint Wiz, retries).
const COMMERCIAL_CHOICES = {
 property: ['Office', 'Storefront / retail', 'Medical / healthcare', 'Multi-family / HOA', 'Industrial / warehouse', 'Something else'],
 problem: ['Heat / hot offices', 'Glare on screens', 'Privacy / frosting', 'Security / break-ins', 'Sun fading (UV)', 'Not sure yet'],
 glass: ['A few windows or one storefront', '6–20 windows', '20+ windows or multiple floors', 'Not sure, measure it for me'],
 role: ['Property or facility manager', 'Business owner or tenant', 'Building owner or landlord', 'HOA board member', 'Contractor or architect'],
 timing: ['This month', 'In 1–3 months', 'Planning or budgeting for later']
};
const ATTRIBUTION_KEYS = ['session_id', 'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'campaignid', 'adgroupid', 'creative', 'keyword', 'matchtype', 'device', 'network', 'source_label', 'device_category', 'ad_click_device', 'device_basis', 'landing_page', 'first_landing_page', 'referrer_host', 'touch_at', 'attribution_model', 'attribution_version', 'is_internal','session_landing_page','first_seen_at','last_seen_at','flow_version','rendered_experiment_variant','experiment_id','experiment_variant'];
const clean = value => value.trim().replace(/[\r\n\t]+/g, ' ');

function normalizeCommercialLead(input) {
 if (!input || typeof input !== 'object' || Array.isArray(input) || input.website) throw Error('invalid_quote');
 const text = {};
 for (const key of ['id', 'name', 'phone']) {
  if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 254) throw Error('invalid_quote');
  text[key] = clean(input[key]);
 }
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text.id)) throw Error('invalid_id');
 const locationKey = Object.hasOwn(input, 'city') ? 'city' : 'address';
 if (typeof input[locationKey] !== 'string' || input[locationKey].trim().length < (locationKey === 'city' ? 2 : 5) || input[locationKey].length > 254) throw Error('invalid_details');
 text.address = clean(input[locationKey]);
 const details = locationKey === 'city' ? {city: text.address} : {};
 for (const [key, values] of Object.entries(COMMERCIAL_CHOICES)) {
  if (['role', 'timing'].includes(key) && !Object.hasOwn(input, key)) continue;
  if (!values.includes(input[key])) throw Error('invalid_choice');
  details[key] = input[key];
 }
 const digits = text.phone.replace(/\D/g, '');
 const email = typeof input.email === 'string' && input.email.trim() ? clean(input.email).toLowerCase() : null;
 if (!/^1?\d{10}$/.test(digits) || input.contact !== 'call' || text.name.length < 2 || (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)))) throw Error('invalid_details');
 const company = typeof input.company === 'string' && input.company.trim() ? clean(input.company).slice(0, 120) : null;
 const attribution = {};
 for (const key of ATTRIBUTION_KEYS) {
  const value = input.attribution?.[key];
  if (typeof value === 'string' && value.length <= 200) attribution[key] = clean(value);
 }
 const out = {
  id: text.id,
  lead_kind: 'commercial',
  // Legacy columns keep a readable summary so existing views of the quotes table still make sense.
  type: 'Commercial',
  coverage: details.problem,
  vehicle: `${details.property} · ${details.glass}`,
  address: text.address,
  name: text.name,
  phone: '+' + (digits.length === 10 ? '1' : '') + digits,
  email,
  company,
  details,
  contact: 'call',
  attribution,
  page_path: typeof input.page_path === 'string' && /^\/[A-Za-z0-9/_-]*$/.test(input.page_path) ? input.page_path : '/',
  consent_version: locationKey === 'city' ? 'commercial-city-2026-10-15' : 'commercial-2026-09-28'
 };
 out.payload_hash = crypto.createHash('sha256').update(JSON.stringify({lead_kind: out.lead_kind, name: out.name, phone: out.phone, email: out.email, company: out.company, address: out.address, details})).digest('hex');
 return out;
}

module.exports = {normalizeCommercialLead, COMMERCIAL_CHOICES};
