import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const booking = await readFile(new URL('booking', root), 'utf8');
const vipBooking = await readFile(new URL('vip-booking', root), 'utf8');
const mobileTint = await readFile(new URL('mobile-window-tinting', root), 'utf8');
const ceramicTint = await readFile(new URL('ceramic-window-tinting', root), 'utf8');
const tracking = await readFile(new URL('lead-tracking.js', root), 'utf8');

const squarePattern = /(?:app\.squareup\.com|book\.squareup\.com|squareup\.com\/appointments|square\.site\/appointments)/i;

assert.doesNotMatch(booking, squarePattern, 'The /booking fallback must not load or link to Square.');
assert.doesNotMatch(vipBooking, squarePattern, 'The paid landing page must not load or link to Square.');
assert.doesNotMatch(vipBooking, /squareBookingUrl|squareServiceBase|squareBookingEnabled|serviceBookingIds/, 'Dead Square routing configuration must be removed.');

assert.match(booking, /data-booking-primary[^>]*href="tel:7146007134"|href="tel:7146007134"[^>]*data-booking-primary/, 'The /booking page needs a primary call action.');
assert.match(booking, /data-booking-secondary[^>]*href="sms:\+17146007134|href="sms:\+17146007134[^>]*data-booking-secondary/, 'The /booking page needs a secondary text action.');
assert.match(booking, /data-booking-quiz[^>]*href="\/vip-booking#vip-booking"|href="\/vip-booking#vip-booking"[^>]*data-booking-quiz/, 'The /booking page needs a quiz route.');

const bookingPrimaryIndex = booking.indexOf('data-booking-primary');
const bookingSecondaryIndex = booking.indexOf('data-booking-secondary');
const bookingQuizIndex = booking.indexOf('data-booking-quiz');
assert.ok(bookingPrimaryIndex < bookingSecondaryIndex && bookingSecondaryIndex < bookingQuizIndex, 'The /booking actions must be ordered call, text, then quiz.');

assert.match(vipBooking, /href="tel:\+17146007134"/, 'VIP keeps the approved call number.');
assert.match(vipBooking, /assets\/quote\/quote.js/, 'VIP uses the saved callback intake.');
assert.match(vipBooking, /id="vip-booking"/, 'Existing deep links still resolve.');
assert.doesNotMatch(vipBooking, /data-booking-router/, 'VIP must not expose the obsolete second quiz.');

for (const [name, page, service] of [
  ['mobile tint', mobileTint, 'mobile_tint'],
  ['ceramic tint', ceramicTint, 'ceramic_tint']
]) {
  assert.match(page, new RegExp(`<html[^>]+data-lead-service="${service}"`), `The ${name} page must identify its lead service.`);
  assert.match(page, /data-hero-primary/, `The ${name} header needs a call action.`);
  assert.match(page, /href="tel:\+17146007134"/, `The ${name} header uses the approved callback number.`);
  assert.match(page, /id="quote"/, `The ${name} page needs its saved callback quiz.`);
  assert.match(page, /assets\/quote\/quote.js/, `The ${name} page uses the shared intake.`);
  assert.match(page, /id="resume"/, `The ${name} final CTA returns to its quiz.`);

}

assert.match(tracking, /const TEXT_SELECTOR = 'a\[href\^="sms:"\]'/, 'Shared tracking needs an SMS selector.');
assert.match(tracking, /sendAnalyticsEvent\('text_click'/, 'Shared tracking needs to record text clicks.');
assert.match(tracking, /event_id: generateId\('obsidian_event'\)/, 'Lead events need unique event IDs.');
assert.match(tracking, /event_time: new Date\(\)\.toISOString\(\)/, 'Lead events need explicit timestamps.');

console.log('call-first funnel contract test passed');
