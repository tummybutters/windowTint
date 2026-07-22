import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const booking = await readFile(new URL('booking', root), 'utf8');
const vipBooking = await readFile(new URL('vip-booking', root), 'utf8');
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

assert.match(vipBooking, /data-hero-primary[^>]*href="tel:7146007134"|href="tel:7146007134"[^>]*data-hero-primary/, 'The paid landing hero needs a primary call action.');
assert.match(vipBooking, /data-hero-secondary[^>]*href="sms:\+17146007134|href="sms:\+17146007134[^>]*data-hero-secondary/, 'The paid landing hero needs a secondary text action.');
assert.match(vipBooking, /data-hero-quiz[^>]*href="#vip-booking"|href="#vip-booking"[^>]*data-hero-quiz/, 'The paid landing hero needs a quiz route.');

assert.match(vipBooking, /data-router-call/, 'Every quiz recommendation needs an explicit call action.');
assert.match(vipBooking, /data-router-text/, 'Every quiz recommendation needs an explicit text action.');
assert.doesNotMatch(vipBooking, /data-router-book|vip_quiz_square_click|square_booking_url|square_booking_available/, 'Quiz results must not expose stale Square behavior or payload fields.');

assert.match(tracking, /const TEXT_SELECTOR = 'a\[href\^="sms:"\]'/, 'Shared tracking needs an SMS selector.');
assert.match(tracking, /sendAnalyticsEvent\('text_click'/, 'Shared tracking needs to record text clicks.');
assert.match(tracking, /event_id: generateId\('obsidian_event'\)/, 'Lead events need unique event IDs.');
assert.match(tracking, /event_time: new Date\(\)\.toISOString\(\)/, 'Lead events need explicit timestamps.');

console.log('call-first funnel contract test passed');
