import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const page = await readFile(new URL('architectural-window-film', root), 'utf8');
const tracking = await readFile(new URL('lead-tracking.js', root), 'utf8');
const normalizer = await readFile(new URL('lib/lead-event-normalize.js', root), 'utf8');

assert.match(page, /<form[^>]+id="residential-consultation-form"/i, 'The residential page needs an on-site consultation form.');
assert.match(page, /<label[^>]*for="consultation-name"[^>]*>\s*Name\s*<\/label>/i, 'The form needs an accessible name field.');
assert.match(page, /<input[^>]+id="consultation-phone"[^>]+name="consultation_phone"[^>]+required/i, 'The form needs a required phone field.');
assert.match(page, /<input[^>]+id="consultation-city-zip"[^>]+name="consultation_city_zip"[^>]+required/i, 'The form needs a required city or ZIP field.');
assert.match(page, /<select[^>]+id="consultation-decision-maker"[^>]+name="consultation_decision_maker"[^>]+required/i, 'The form needs homeowner or decision-maker status.');
assert.match(page, /<select[^>]+id="consultation-property-type"[^>]+name="consultation_property_type"[^>]+required/i, 'The form needs property type.');
assert.match(page, /<select[^>]+id="consultation-project-size"[^>]+name="consultation_project_size"[^>]+required/i, 'The form needs project size.');
assert.match(page, /<select[^>]+id="consultation-goal"[^>]+name="consultation_goal"[^>]+required/i, 'The form needs a project goal.');
assert.match(page, /<input[^>]+id="consultation-date"[^>]+name="consultation_preferred_date"[^>]+required/i, 'The form needs a preferred date.');
assert.match(page, /<select[^>]+id="consultation-time"[^>]+name="consultation_preferred_time"[^>]+required/i, 'The form needs a preferred time.');
assert.match(page, /<input[^>]+id="consultation-pricing-acknowledgement"[^>]+name="consultation_pricing_acknowledgement"[^>]+required/i, 'The form needs a required pricing acknowledgement.');
assert.match(page, /Call To Schedule A Visit/, 'Phone actions must accurately describe the call route.');
assert.match(page, /residential_consultation_start/, 'The form must emit a consultation-start event.');
assert.match(page, /residential_consultation_request/, 'The form must emit a consultation-request event.');
assert.match(page, /submitLeadEvent\('residential_consultation_request'/, 'The request event must wait for first-party persistence.');
assert.match(tracking, /submitLeadEvent/, 'Shared tracking needs a first-party submission helper.');
assert.doesNotMatch(tracking, /residential_consultation_start:\s*['"][^'"]+/, 'Consultation starts must remain diagnostic only.');
assert.match(tracking, /residential_consultation_request:\s*['"]uZ_6CNyY8tQcEKmA5L1C['"]/, 'Persisted consultation requests must map to the dedicated Google Ads conversion.');

for (const field of [
  'consultation_name',
  'consultation_phone',
  'consultation_city_zip',
  'consultation_decision_maker',
  'consultation_property_type',
  'consultation_project_size',
  'consultation_goal',
  'consultation_preferred_date',
  'consultation_preferred_time',
  'consultation_pricing_acknowledgement'
]) {
  assert.match(normalizer, new RegExp(`'${field}'`), `The first-party payload must retain ${field}.`);
}

for (const retiredPromise of [
  /rough estimate/i,
  /send project details/i,
  /send photos/i,
  /send measurements/i
]) {
  assert.doesNotMatch(page, retiredPromise, 'The page must not promise a remote estimate path.');
}

console.log('residential consultation funnel contract test passed');
