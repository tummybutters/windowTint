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
assert.match(page, /<select[^>]+id="consultation-goal"[^>]+name="consultation_goal"[^>]+required/i, 'The form needs a project goal.');
assert.match(page, /<textarea[^>]+id="consultation-question"[^>]+name="consultation_question"/i, 'The form needs a place for the caller question.');
assert.match(page, /<select[^>]+id="consultation-time"[^>]+name="consultation_preferred_time"[^>]+required/i, 'The form needs a preferred time.');
assert.match(page, /<input[^>]+id="consultation-pricing-acknowledgement"[^>]+name="consultation_pricing_acknowledgement"[^>]+required/i, 'The form needs a required pricing acknowledgement.');
assert.match(page, /Call \(714\) 600-7134/, 'The hero and final CTA must make the phone action explicit.');
assert.match(page, /Call for clear answers/, 'The page must explain the value of the first phone call.');
assert.match(page, /book the on-site consultation with you by phone/i, 'The hero must set the expectation that the visit is booked by phone.');
assert.match(page, /Cannot call now\? Request a callback instead/, 'The form must be presented as the secondary path.');
assert.match(page, /<details class="res-callback-details">/i, 'The callback form must not compete visually with the phone CTA.');
assert.match(page, /callbackDetails\.open = true/, 'Callback links must open the collapsed callback form.');
assert.match(page, /Request A Callback/, 'The secondary form action must request a callback rather than imply a booked consultation.');
assert.match(page, /Any on-site consultation will be scheduled by phone/i, 'The form acknowledgement must set the scheduling expectation.');
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
  'consultation_goal',
  'consultation_question',
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
