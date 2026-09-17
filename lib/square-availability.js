const SQUARE_API_VERSION = '2026-07-15';
const SQUARE_BASE_URLS = Object.freeze({
  production: 'https://connect.squareup.com',
  sandbox: 'https://connect.squareupsandbox.com'
});

// Obsidian Autoworks (Garden Grove) location.
const DEFAULT_LOCATION_ID = 'LWC5SDBDX3R99';
// "Sedan Vehicles - Sides & Rear" (3.5h, $600) — the most common mobile tint job.
// Discovered read-only via GET /v2/catalog/list?types=ITEM (APPOINTMENTS_SERVICE).
const DEFAULT_SERVICE_VARIATION_ID = 'NNE7SJQ27NIY2FSKACDGEFT5';
// Kislev San Martin (owner) — the only team member whose booking profile is
// is_bookable=true. Square returns no availabilities without a team member filter.
const DEFAULT_TEAM_MEMBER_ID = 'TMBSSNW2koIZ2uUq';
// Public Square booking page already tracked by lead-tracking.js. Square's public
// booking flow does not support deep-linking a specific slot, so every slot shares it.
const DEFAULT_BOOKING_URL = 'https://app.squareup.com/appointments/book/py2a8n8lsuxp5n/LWC5SDBDX3R99/start';

const DISPLAY_TIME_ZONE = 'America/Los_Angeles';
const MIN_LEAD_MS = 18 * 60 * 60 * 1000;
const SEARCH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_SLOTS = 3;
const REQUEST_TIMEOUT_MS = 4000;
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=600';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric'
});
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: DISPLAY_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const resolveConfig = (env = process.env) => {
  const environment = String(env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
  return {
    accessToken: env.SQUARE_ACCESS_TOKEN || '',
    baseUrl: SQUARE_BASE_URLS[environment] || SQUARE_BASE_URLS.production,
    locationId: env.SQUARE_AVAILABILITY_LOCATION_ID || DEFAULT_LOCATION_ID,
    serviceVariationId: env.SQUARE_AVAILABILITY_SERVICE_VARIATION_ID || DEFAULT_SERVICE_VARIATION_ID,
    teamMemberId: env.SQUARE_AVAILABILITY_TEAM_MEMBER_ID || DEFAULT_TEAM_MEMBER_ID,
    bookingUrl: env.SQUARE_BOOKING_URL || DEFAULT_BOOKING_URL
  };
};

// Intl inserts U+202F before the AM/PM marker on newer ICU builds; normalize to a plain space.
const formatSlotLabel = (date) => {
  const day = dateFormatter.format(date).replace(/\s+/g, ' ');
  const time = timeFormatter.format(date).replace(/\s+/g, ' ');
  return `${day} · ${time}`;
};

const toIsoSeconds = (date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');

const buildSearchBody = ({ locationId, serviceVariationId, teamMemberId, now }) => {
  const startAt = new Date(now.getTime() + MIN_LEAD_MS);
  const endAt = new Date(startAt.getTime() + SEARCH_WINDOW_MS);
  return {
    query: {
      filter: {
        location_id: locationId,
        start_at_range: {
          start_at: toIsoSeconds(startAt),
          end_at: toIsoSeconds(endAt)
        },
        segment_filters: [{
          service_variation_id: serviceVariationId,
          team_member_id_filter: { any: [teamMemberId] }
        }]
      }
    }
  };
};

const selectSlots = (availabilities, { now, bookingUrl, maxSlots = MAX_SLOTS }) => {
  const cutoff = now.getTime() + MIN_LEAD_MS;
  const seen = new Set();
  const slots = [];
  const sorted = (Array.isArray(availabilities) ? availabilities : [])
    .map((availability) => new Date(availability?.start_at || availability?.startAt || NaN))
    .filter((date) => Number.isFinite(date.getTime()) && date.getTime() >= cutoff)
    .sort((a, b) => a.getTime() - b.getTime());

  // One slot per calendar day (LA time) so the page shows a spread of days,
  // not three back-to-back openings on the same morning.
  const seenDays = new Set();
  for (const date of sorted) {
    const startAt = toIsoSeconds(date);
    if (seen.has(startAt)) continue;
    seen.add(startAt);
    const day = date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
    if (seenDays.has(day)) continue;
    seenDays.add(day);
    slots.push({ startAt, label: formatSlotLabel(date), bookingUrl });
    if (slots.length >= maxSlots) break;
  }
  return slots;
};

const searchAvailability = async ({ config, now, fetchImpl, timeoutMs = REQUEST_TIMEOUT_MS }) => {
  if (!config.accessToken) {
    const error = new Error('SQUARE_ACCESS_TOKEN is not configured');
    error.code = 'square_not_configured';
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${config.baseUrl}/v2/bookings/availability/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Square-Version': SQUARE_API_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(buildSearchBody({ ...config, now })),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || (Array.isArray(payload.errors) && payload.errors.length)) {
      const error = new Error('Square availability search failed');
      error.code = 'square_availability_failed';
      error.status = response.status;
      error.squareErrors = (payload.errors || []).map((item) => ({
        category: item.category,
        code: item.code,
        detail: item.detail
      }));
      throw error;
    }
    return payload.availabilities || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Square availability search timed out after ${timeoutMs}ms`);
      timeoutError.code = 'square_availability_timeout';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

// Distinct LA-time calendar days with at least one opening in the next 7 days.
// Drives the honest urgency line on the page ("Only 1 open day left this week").
const countOpenDays = (availabilities, { now, horizonDays = 7 }) => {
  const cutoff = now.getTime() + MIN_LEAD_MS;
  const horizon = now.getTime() + horizonDays * 24 * 60 * 60 * 1000;
  const days = new Set();
  for (const availability of Array.isArray(availabilities) ? availabilities : []) {
    const date = new Date(availability?.start_at || availability?.startAt || NaN);
    const t = date.getTime();
    if (!Number.isFinite(t) || t < cutoff || t > horizon) continue;
    days.add(date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }));
  }
  return days.size;
};

const fetchSquareAvailabilityDetail = async (options = {}) => {
  const now = options.now ? new Date(options.now()) : new Date();
  const config = resolveConfig(options.env || process.env);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const availabilities = await searchAvailability({ config, now, fetchImpl, timeoutMs: options.timeoutMs });
  return {
    slots: selectSlots(availabilities, { now, bookingUrl: config.bookingUrl }),
    openDaysNext7: countOpenDays(availabilities, { now })
  };
};

const fetchSquareAvailability = async (options = {}) => {
  const now = options.now ? new Date(options.now()) : new Date();
  const config = resolveConfig(options.env || process.env);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const availabilities = await searchAvailability({
    config,
    now,
    fetchImpl,
    timeoutMs: options.timeoutMs
  });
  return selectSlots(availabilities, { now, bookingUrl: config.bookingUrl });
};

const createHandler = (options = {}) => async (req, res) => {
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ ok: false, slots: [], generatedAt: new Date().toISOString() });
  }

  const generatedAt = (options.now ? new Date(options.now()) : new Date()).toISOString();
  try {
    const { slots, openDaysNext7 } = await fetchSquareAvailabilityDetail(options);
    res.setHeader('Cache-Control', CACHE_CONTROL);
    return res.status(200).json({ ok: true, slots, openDaysNext7, generatedAt });
  } catch (error) {
    // Do not cache failures at the edge; the page treats ok:false as "call to book".
    res.setHeader('Cache-Control', 'no-store');
    console.error('[obsidian-square-availability-error]', JSON.stringify({
      code: error.code || 'square_availability_error',
      status: error.status || null,
      message: error.message,
      square_errors: error.squareErrors || null
    }));
    return res.status(200).json({ ok: false, slots: [], generatedAt });
  }
};

module.exports = {
  CACHE_CONTROL,
  DEFAULT_BOOKING_URL,
  DEFAULT_LOCATION_ID,
  DEFAULT_SERVICE_VARIATION_ID,
  DEFAULT_TEAM_MEMBER_ID,
  MAX_SLOTS,
  MIN_LEAD_MS,
  REQUEST_TIMEOUT_MS,
  SQUARE_API_VERSION,
  buildSearchBody,
  countOpenDays,
  fetchSquareAvailabilityDetail,
  createHandler,
  fetchSquareAvailability,
  formatSlotLabel,
  resolveConfig,
  selectSlots
};
