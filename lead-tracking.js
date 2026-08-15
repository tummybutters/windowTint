(function () {
    const STORAGE_KEYS = {
        sessionId: 'lead_track_session_id',
        firstSeenAt: 'lead_track_first_seen_at',
        lastSeenAt: 'lead_track_last_seen_at',
        firstLandingPage: 'lead_track_first_landing_page',
        firstReferrer: 'lead_track_first_referrer',
        cid: 'lead_track_cid',
        phone: 'lead_track_phone',
        utmSource: 'lead_track_utm_source',
        utmMedium: 'lead_track_utm_medium',
        utmCampaign: 'lead_track_utm_campaign',
        utmTerm: 'lead_track_utm_term',
        utmContent: 'lead_track_utm_content',
        gclid: 'lead_track_gclid',
        gbraid: 'lead_track_gbraid',
        wbraid: 'lead_track_wbraid',
        events: 'lead_track_event_log',
        pendingEvents: 'lead_track_pending_events',
        touchId: 'lead_track_touch_id',
        touchSnapshot: 'lead_track_touch_snapshot',
        leadIntent: 'lead_track_lead_intent',
        leadIntentBoundTouchSnapshot: 'lead_track_lead_intent_bound_touch_snapshot'
    };

    const TRACKED_PARAMS = [
        'cid',
        'phone',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'gclid',
        'gbraid',
        'wbraid',
        'campaignid',
        'adgroupid',
        'creative',
        'keyword',
        'matchtype',
        'device',
        'network',
        'loc_physical_ms',
        'loc_interest_ms',
        'placement',
        'targetid',
        'extensionid'
    ];
    const MAX_STORED_EVENTS = 120;
    const MAX_PENDING_EVENTS = 120;
    const MAX_DELIVERY_ATTEMPTS = 25;
    const DELIVERY_BATCH_SIZE = 20;
    const DELIVERY_RETRY_INTERVAL_MS = 15000;
    // Conservative margins strictly inside the server's own touch_time window
    // (lib/lead-event-normalize.js: 400 days / 24h future skew) -- the client withholds the
    // frozen intent-bound touch snapshot before it would ever reach the server's own degrade
    // path, so a stale or clock-skewed snapshot is never even sent (Q1).
    const MAX_CLIENT_TOUCH_AGE_MS = 380 * 24 * 60 * 60 * 1000;
    const MAX_CLIENT_TOUCH_FUTURE_SKEW_MS = 12 * 60 * 60 * 1000;
    const STORAGE_BY_PARAM = {
        cid: STORAGE_KEYS.cid,
        phone: STORAGE_KEYS.phone,
        utm_source: STORAGE_KEYS.utmSource,
        utm_medium: STORAGE_KEYS.utmMedium,
        utm_campaign: STORAGE_KEYS.utmCampaign,
        utm_term: STORAGE_KEYS.utmTerm,
        utm_content: STORAGE_KEYS.utmContent,
        gclid: STORAGE_KEYS.gclid,
        gbraid: STORAGE_KEYS.gbraid,
        wbraid: STORAGE_KEYS.wbraid
    };
    TRACKED_PARAMS.forEach((param) => {
        if (!STORAGE_BY_PARAM[param]) STORAGE_BY_PARAM[param] = `lead_track_${param}`;
    });
    const BOOKING_SELECTORS = [
        'a[href="/booking"]',
        'a[href^="/booking?"]',
        'a[href^="/booking#"]',
        'a[href="/vip-booking"]',
        'a[href^="/vip-booking?"]',
        'a[href^="/vip-booking#"]',
        'a[href*="app.squareup.com/appointments"]',
        'a[href*="book.squareup.com/appointments"]',
        'a[href*="squareup.com/appointments"]',
        'a[href*="square.site/appointments"]',
        'iframe[src*="app.squareup.com/appointments"]',
        'iframe[src*="book.squareup.com/appointments"]',
        'iframe[src*="square.site/appointments"]'
    ].join(',');
    const PHONE_SELECTOR = 'a[href^="tel:"]';
    const TEXT_SELECTOR = 'a[href^="sms:"]';
    const GOOGLE_ADS_CONFIG = window.OBSIDIAN_GOOGLE_ADS_CONFIG || {};
    const GOOGLE_ADS_ID = GOOGLE_ADS_CONFIG.id || 'AW-17846304809';
    const WEBSITE_CALL_CONFIG_ID = Object.prototype.hasOwnProperty.call(
        GOOGLE_ADS_CONFIG,
        'websiteCallConfigId'
    )
        ? GOOGLE_ADS_CONFIG.websiteCallConfigId
        : `${GOOGLE_ADS_ID}/060ZCNixtdQcEKmA5L1C`;
    const WEBSITE_CALL_DISPLAY_NUMBER = (
        GOOGLE_ADS_CONFIG.websiteCallDisplayNumber || '(714) 600-7134'
    );
    const DEFAULT_ADS_CONVERSIONS = {
        ai_booking_click: '',
        phone_click: 'GVSvCK39u70cEKmA5L1C',
        text_click: 'CyqpCMPso9kcEKmA5L1C',
        square_booking_click: '',
        ...(GOOGLE_ADS_CONFIG.conversions || {})
    };
    const SQUARE_BOOKING_HOSTS = [
        'app.squareup.com',
        'book.squareup.com',
        'squareup.com',
        'square.site'
    ];

    // Maps an immutable touch's migration-style column name to the browser's
    // TRACKED_PARAMS/lead storage key, matching db/migrations/004_attribution_foundation.sql
    // and lib/lead-event-normalize.js's TOUCH_FIELDS allow-list.
    const TOUCH_FIELD_SOURCE = {
        utm_source: 'utm_source',
        utm_medium: 'utm_medium',
        utm_campaign: 'utm_campaign',
        utm_term: 'utm_term',
        utm_content: 'utm_content',
        gclid: 'gclid',
        gbraid: 'gbraid',
        wbraid: 'wbraid',
        campaign_id: 'campaignid',
        ad_group_id: 'adgroupid',
        creative_id: 'creative',
        keyword: 'keyword',
        match_type: 'matchtype',
        device: 'device',
        network: 'network',
        location_physical_id: 'loc_physical_ms',
        location_interest_id: 'loc_interest_ms',
        placement: 'placement',
        target_id: 'targetid',
        extension_id: 'extensionid'
    };

    // Unambiguous uppercase Base32 alphabet (no I, L, O, 0, 1), matching the server's
    // LEAD_REFERENCE regex in lib/lead-event-normalize.js.
    const OA_REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    const LEAD_INTENT_CHANNEL_BY_EVENT = {
        phone_click: 'phone',
        text_click: 'text',
        square_booking_click: 'booking',
        ai_booking_click: 'booking',
        lead_form_submit: 'form'
    };

    const readParams = () => new URLSearchParams(window.location.search);

    const generateId = (prefix) => {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return `${prefix}_${window.crypto.randomUUID()}`;
        }

        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    };

    const hasSecureRandom = () => Boolean(
        window.crypto && typeof window.crypto.getRandomValues === 'function'
    );

    const HEX_CHARS = '0123456789abcdef';

    // Only ever called after hasSecureRandom() confirms window.crypto.getRandomValues exists --
    // touch_id, lead_intent_id, and the OA reference are never derived from Math.random.
    const randomHexString = (length) => {
        const bytes = new Uint8Array(Math.ceil(length / 2));
        window.crypto.getRandomValues(bytes);
        let out = '';
        for (let i = 0; i < bytes.length; i += 1) {
            out += HEX_CHARS[bytes[i] >> 4] + HEX_CHARS[bytes[i] & 0x0f];
        }
        return out.slice(0, length);
    };

    const generateSecureId = (prefix) => `${prefix}_${randomHexString(40)}`;

    // Rejection sampling avoids modulo bias: OA_REFERENCE_ALPHABET has 31 symbols, so any
    // byte >= floor(256/31)*31 is discarded rather than reduced with %.
    const generateReferenceCode = () => {
        const alphabetLength = OA_REFERENCE_ALPHABET.length;
        const acceptableMax = Math.floor(256 / alphabetLength) * alphabetLength;
        let suffix = '';
        while (suffix.length < 10) {
            const bytes = new Uint8Array(10);
            window.crypto.getRandomValues(bytes);
            for (let i = 0; i < bytes.length && suffix.length < 10; i += 1) {
                const byte = bytes[i];
                if (byte >= acceptableMax) continue;
                suffix += OA_REFERENCE_ALPHABET[byte % alphabetLength];
            }
        }
        return `OA-${suffix}`;
    };

    const firstParam = (params, names) => {
        for (const name of names) {
            const value = params.get(name);
            if (value) return value;
        }
        return '';
    };

    const remember = () => {
        const params = readParams();
        const now = new Date().toISOString();

        if (!localStorage.getItem(STORAGE_KEYS.sessionId)) {
            localStorage.setItem(STORAGE_KEYS.sessionId, generateId('obsidian_session'));
        }
        if (!localStorage.getItem(STORAGE_KEYS.firstSeenAt)) {
            localStorage.setItem(STORAGE_KEYS.firstSeenAt, now);
        }
        if (!localStorage.getItem(STORAGE_KEYS.firstLandingPage)) {
            localStorage.setItem(STORAGE_KEYS.firstLandingPage, window.location.href);
        }
        if (!localStorage.getItem(STORAGE_KEYS.firstReferrer)) {
            localStorage.setItem(STORAGE_KEYS.firstReferrer, document.referrer || '');
        }
        localStorage.setItem(STORAGE_KEYS.lastSeenAt, now);

        const values = {
            cid: firstParam(params, ['cid', 'conversation_id', 'lead_id']),
            phone: firstParam(params, ['phone', 'lead_phone'])
        };

        TRACKED_PARAMS.forEach((param) => {
            if (!values[param]) values[param] = params.get(param) || '';
        });

        Object.entries(values).forEach(([param, value]) => {
            if (value) localStorage.setItem(STORAGE_BY_PARAM[param], value);
        });
    };

    const getLead = () => {
        const lead = {
            session_id: localStorage.getItem(STORAGE_KEYS.sessionId) || '',
            first_seen_at: localStorage.getItem(STORAGE_KEYS.firstSeenAt) || '',
            last_seen_at: localStorage.getItem(STORAGE_KEYS.lastSeenAt) || '',
            first_landing_page: localStorage.getItem(STORAGE_KEYS.firstLandingPage) || '',
            first_referrer: localStorage.getItem(STORAGE_KEYS.firstReferrer) || ''
        };

        TRACKED_PARAMS.forEach((param) => {
            lead[param] = localStorage.getItem(STORAGE_BY_PARAM[param]) || '';
        });

        return lead;
    };

    const hasAttribution = (lead) => TRACKED_PARAMS.some((param) => Boolean(lead[param]));

    const getCurrentTouch = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.touchSnapshot);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    };

    const storeTouch = (touch) => {
        localStorage.setItem(STORAGE_KEYS.touchId, touch.touch_id);
        localStorage.setItem(STORAGE_KEYS.touchSnapshot, JSON.stringify(touch));
    };

    const getCurrentIntent = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.leadIntent);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    };

    const storeIntent = (intent) => {
        localStorage.setItem(STORAGE_KEYS.leadIntent, JSON.stringify(intent));
    };

    // The exact touch snapshot bound to the current lead intent at creation time, frozen
    // separately from getCurrentTouch() -- a later paid click can overwrite the "current" touch
    // (STORAGE_KEYS.touchSnapshot) while the intent's binding stays immutable server-side, so
    // this must never be re-derived from getCurrentTouch() once the intent exists (F4: doing so
    // would either attach a newer touch that mismatches the intent's stored touch_id, which the
    // server rejects at lib/lead-event-normalize.js:318, or silently misattribute the lead).
    const getLeadIntentBoundTouchSnapshot = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.leadIntentBoundTouchSnapshot);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    };

    const storeLeadIntentBoundTouchSnapshot = (touch) => {
        localStorage.setItem(STORAGE_KEYS.leadIntentBoundTouchSnapshot, JSON.stringify(touch));
    };

    // Q1: a touch snapshot stamped once at click time and never refreshed can age past the
    // server's own window (400 days) or be created under clock skew (>24h future) and then get
    // resent on every later real lead action forever, permanently 400ing each one. Gate on the
    // client, strictly inside the server's limits, so an unusable snapshot is never sent at all --
    // the real event and intent still go out without it.
    const isTouchSnapshotUsable = (touch) => {
        if (!touch || !touch.touch_time) return false;
        const timestamp = Date.parse(touch.touch_time);
        if (!Number.isFinite(timestamp)) return false;
        const now = Date.now();
        return timestamp >= now - MAX_CLIENT_TOUCH_AGE_MS && timestamp <= now + MAX_CLIENT_TOUCH_FUTURE_SKEW_MS;
    };

    // Called once per page load (from boot()), never from the periodic refresh loop --
    // otherwise a static URL left open with a click ID would mint a new touch every tick.
    const createTouchIfNew = () => {
        if (!hasSecureRandom()) return null;

        const params = readParams();
        const clickIds = {
            gclid: params.get('gclid') || '',
            gbraid: params.get('gbraid') || '',
            wbraid: params.get('wbraid') || ''
        };
        const hasClickId = Boolean(clickIds.gclid || clickIds.gbraid || clickIds.wbraid);
        if (!hasClickId) return null;

        // A reload or an internal navigation that merely propagates the same click id
        // (e.g. applyParams copying gclid onto a booking link) must reuse the current touch,
        // not mint a duplicate one -- only a URL with a genuinely different click id is a
        // new paid click.
        const current = getCurrentTouch();
        if (
            current
            && current.gclid === clickIds.gclid
            && current.gbraid === clickIds.gbraid
            && current.wbraid === clickIds.wbraid
        ) {
            return current;
        }

        // Every touch field is read directly from the current landing URL's query params --
        // never from getLead()/localStorage -- so a new click never inherits stale campaign,
        // keyword, or click-id values left over from a prior click.
        const touch = {
            touch_id: generateSecureId('touch'),
            touch_time: new Date().toISOString(),
            landing_page: window.location.href
        };
        Object.keys(TOUCH_FIELD_SOURCE).forEach((touchField) => {
            touch[touchField] = params.get(TOUCH_FIELD_SOURCE[touchField]) || '';
        });

        storeTouch(touch);
        recordLeadEvent('paid_touch', {}, { touch });
        return touch;
    };

    // The first phone/text/form/booking action creates the session's one lead intent and
    // binds it to whatever touch is current at that moment; every later call (any channel)
    // reuses the stored intent unchanged, per the immutable-binding contract in lib/lead-event-store.js.
    //
    // F4: a paid intent's touch snapshot is attached to every real lead action that reuses an
    // existing intent, not just the one that created it. If the intent-creating envelope (the
    // one call where isNew was true) exhausts MAX_DELIVERY_ATTEMPTS before the server ever
    // receives it, the server never has the touch to insert/link and the intent's touch binding
    // would otherwise be lost forever -- ensureLeadIntent alone never sees that failure, so it
    // cannot special-case a retry. Instead the originally bound touch snapshot is persisted
    // alongside the intent and resent on every subsequent real lead action until whichever
    // envelope eventually lands; touch_insert/lead_intent_upsert/link writes are all idempotent
    // (ON CONFLICT ... DO NOTHING) so re-sending an already-persisted touch is a harmless no-op.
    // The resent snapshot always comes from the frozen binding, never from getCurrentTouch() --
    // a later distinct paid click must never be substituted in here.
    const ensureLeadIntent = (channel) => {
        const existing = getCurrentIntent();
        if (existing) {
            const boundTouch = existing.touch_id ? getLeadIntentBoundTouchSnapshot() : null;
            const usableBoundTouch = isTouchSnapshotUsable(boundTouch) ? boundTouch : null;
            return { intent: existing, touchForEvent: usableBoundTouch, isNew: false };
        }
        if (!hasSecureRandom()) return { intent: null, touchForEvent: null, isNew: false };

        const touch = getCurrentTouch();
        const usableTouch = isTouchSnapshotUsable(touch) ? touch : null;
        const intent = {
            lead_intent_id: generateSecureId('intent'),
            reference_code: generateReferenceCode(),
            // MED-2: bind from usableTouch, not the raw current touch -- a touch outside the
            // conservative client window will never be sent to the server, so binding to its
            // touch_id would leave the intent's touch_lookup permanently unresolvable and the
            // intent/reference/Tier A link never persisted. Degrade to unattributed instead.
            touch_id: usableTouch ? usableTouch.touch_id : '',
            first_channel: channel
        };
        storeIntent(intent);
        if (usableTouch) storeLeadIntentBoundTouchSnapshot(usableTouch);
        return { intent, touchForEvent: usableTouch, isNew: true };
    };

    const AD_TOUCH_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'campaignid', 'adgroupid', 'creative', 'keyword', 'matchtype', 'device', 'network', 'loc_physical_ms', 'loc_interest_ms', 'placement', 'targetid', 'extensionid'];

    // Union of every paid attribution field name that can ever reach a URL, deduplicated --
    // the set stripped from same-origin targets in applyParams below (MED-1).
    const PAID_ATTRIBUTION_PARAMS = Array.from(new Set([
        ...Object.values(TOUCH_FIELD_SOURCE),
        ...AD_TOUCH_PARAMS
    ]));

    const applyParams = (url, lead, touch, options = {}) => {
        if (lead.session_id && !url.searchParams.has('obsidian_session_id')) {
            url.searchParams.set('obsidian_session_id', lead.session_id);
        }
        if (lead.cid && !url.searchParams.has('cid') && !url.searchParams.has('conversation_id')) {
            url.searchParams.set('cid', lead.cid);
        }
        if (lead.phone && !url.searchParams.has('phone')) {
            url.searchParams.set('phone', lead.phone);
        }

        // Q2/MED-1: a same-origin target (an internal /booking or /vip-booking link) is a URL a
        // customer can copy, paste, and share -- carrying gclid/gbraid/wbraid, UTMs, or
        // campaign/keyword/device metadata on it lets a stranger's browser mint a genuine paid
        // touch from a click it never made. localStorage already preserves this browser's touch
        // for first-party attribution, so the URL copy buys nothing and only creates
        // cross-visitor false attribution. Strip every paid field from the final URL, even if the
        // raw href already carried one (markup outside this repo could ship one) -- declining to
        // add new paid fields is not enough. The opaque session bridge and non-paid contact
        // context above are still genuinely needed and stay. External Square targets cannot read
        // this browser's localStorage, so they keep the full decoration below.
        if (options.sameOrigin) {
            PAID_ATTRIBUTION_PARAMS.forEach((param) => url.searchParams.delete(param));
            return;
        }

        if (touch) {
            // Every ad-touch field (UTMs, click IDs, campaign/ad group/creative/keyword/match/
            // device/network/location/placement/target/extension) comes exclusively from the
            // current immutable touch, never from sticky getLead() history -- otherwise a later,
            // distinct-type click (e.g. a gbraid landing after a stored gclid) would have its
            // internal links poisoned with the prior click's id, defeating createTouchIfNew's
            // dedup and minting a duplicate, misattributed touch (r1 review finding #1). A field
            // missing from the current touch stays absent; it never falls back to a prior click.
            Object.keys(TOUCH_FIELD_SOURCE).forEach((touchField) => {
                const param = TOUCH_FIELD_SOURCE[touchField];
                const value = touch[touchField] || '';
                if (value && !url.searchParams.has(param)) {
                    url.searchParams.set(param, value);
                }
            });
            return;
        }

        // No current touch (Web Crypto unavailable, or an organic session that never had a
        // paid click): preserve the legacy lead-storage propagation for UTMs and ad-platform
        // metadata, but stay conservative and withhold click ids -- sticky lead storage can hold
        // a click id left over from an earlier, different-type click, and without a touch record
        // to compare against there is no way to tell current from stale.
        AD_TOUCH_PARAMS.forEach((param) => {
            if (lead[param] && !url.searchParams.has(param)) {
                url.searchParams.set(param, lead[param]);
            }
        });
    };

    const decorateBookingTargets = () => {
        const lead = getLead();
        if (!hasAttribution(lead)) return;

        const touch = getCurrentTouch();

        document.querySelectorAll(BOOKING_SELECTORS).forEach((node) => {
            const attr = node.tagName === 'IFRAME' ? 'src' : 'href';
            const raw = node.getAttribute(attr);
            if (!raw) return;

            try {
                const url = new URL(raw, window.location.origin);
                const sameOrigin = url.origin === window.location.origin;
                applyParams(url, lead, touch, { sameOrigin });
                const nextValue = sameOrigin
                    ? `${url.pathname}${url.search}${url.hash}`
                    : url.toString();

                if (node.getAttribute(attr) !== nextValue) {
                    node.setAttribute(attr, nextValue);
                }
            } catch (error) {
                // Ignore malformed third-party URLs.
            }
        });
    };

    const upsertHidden = (form, name, value) => {
        let input = form.querySelector(`input[name="${name}"]`);
        if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            form.appendChild(input);
        }
        input.value = value || '';
    };

    // Never mints a lead intent -- only decorates with one that a real form submit or other
    // channel action already created (finding #1/critical). Passive/periodic decoration is a
    // consequence of a real action, never a trigger for one.
    const decorateForms = () => {
        const lead = getLead();
        if (!hasAttribution(lead)) return;

        const forms = document.querySelectorAll('form');
        if (forms.length === 0) return;

        const intent = getCurrentIntent();

        forms.forEach((form) => {
            upsertHidden(form, 'lead_session_id', lead.session_id);
            upsertHidden(form, 'lead_cid', lead.cid);
            upsertHidden(form, 'lead_phone', lead.phone);
            upsertHidden(form, 'lead_utm_source', lead.utm_source);
            upsertHidden(form, 'lead_utm_medium', lead.utm_medium);
            upsertHidden(form, 'lead_utm_campaign', lead.utm_campaign);
            upsertHidden(form, 'lead_utm_term', lead.utm_term);
            upsertHidden(form, 'lead_utm_content', lead.utm_content);
            upsertHidden(form, 'lead_gclid', lead.gclid);
            upsertHidden(form, 'lead_gbraid', lead.gbraid);
            upsertHidden(form, 'lead_wbraid', lead.wbraid);
            upsertHidden(form, 'lead_landing_page', window.location.href);
            upsertHidden(form, 'lead_first_landing_page', lead.first_landing_page);
            upsertHidden(form, 'lead_campaignid', lead.campaignid);
            upsertHidden(form, 'lead_adgroupid', lead.adgroupid);
            upsertHidden(form, 'lead_keyword', lead.keyword);
            upsertHidden(form, 'lead_matchtype', lead.matchtype);
            upsertHidden(form, 'lead_device', lead.device);
            if (intent) {
                upsertHidden(form, 'lead_intent_id', intent.lead_intent_id);
                upsertHidden(form, 'lead_reference', intent.reference_code);
                upsertHidden(form, 'lead_touch_id', intent.touch_id);
            }
        });
    };

    // Appends "Ref: OA-..." to an sms: href's raw body value via string concatenation rather
    // than round-tripping through URLSearchParams, which would re-encode spaces as "+" (invalid
    // per RFC 3986/5724 for sms: URIs) and silently drop the site's "?&body=" idiom's leading
    // "&". Preserves the destination, other params, and any fragment untouched.
    const appendReferenceToSmsHref = (href, referenceCode) => {
        const hashIndex = href.indexOf('#');
        const base = hashIndex === -1 ? href : href.slice(0, hashIndex);
        const fragment = hashIndex === -1 ? '' : href.slice(hashIndex);

        const queryIndex = base.indexOf('?');
        const destination = queryIndex === -1 ? base : base.slice(0, queryIndex);
        const rawQuery = queryIndex === -1 ? '' : base.slice(queryIndex + 1);

        const encodedRef = encodeURIComponent(`Ref: ${referenceCode}`);
        const bodyMatch = /(^|&)body=([^&]*)/.exec(rawQuery);

        let nextQuery;
        if (bodyMatch) {
            const separator = bodyMatch[1];
            const existingValue = bodyMatch[2];
            const appendedValue = existingValue ? `${existingValue}%20${encodedRef}` : encodedRef;
            nextQuery = rawQuery.slice(0, bodyMatch.index + separator.length)
                + `body=${appendedValue}`
                + rawQuery.slice(bodyMatch.index + bodyMatch[0].length);
        } else if (rawQuery) {
            nextQuery = `${rawQuery}&body=${encodedRef}`;
        } else if (queryIndex !== -1) {
            nextQuery = `body=${encodedRef}`;
        } else {
            nextQuery = null;
        }

        const nextBase = nextQuery === null
            ? `${destination}?body=${encodedRef}`
            : `${destination}?${nextQuery}`;

        return `${nextBase}${fragment}`;
    };

    // Never mints a lead intent (finding #1/critical) -- the tapped link itself is decorated
    // synchronously by the text-click capture handler in bindClickTracking before the OS reads
    // the href. This pass only opportunistically catches up any *other*, not-yet-tapped sms
    // links on the page once a real action has already created an intent.
    const decorateTextLinks = () => {
        const lead = getLead();
        if (!hasAttribution(lead)) return;

        const links = document.querySelectorAll(TEXT_SELECTOR);
        if (links.length === 0) return;

        const intent = getCurrentIntent();
        if (!intent) return;

        links.forEach((node) => {
            const raw = node.getAttribute('href');
            if (!raw || !raw.startsWith('sms:')) return;
            if (raw.includes(intent.reference_code)) return;

            node.setAttribute('href', appendReferenceToSmsHref(raw, intent.reference_code));
        });
    };

    const getEventLog = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.events);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    };

    const setEventLog = (events) => {
        localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events.slice(-MAX_STORED_EVENTS)));
    };

    const getPendingEvents = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.pendingEvents);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed)
                ? parsed.filter((entry) => entry && entry.event && entry.event.event_id)
                : [];
        } catch (error) {
            return [];
        }
    };

    const setPendingEvents = (entries) => {
        localStorage.setItem(STORAGE_KEYS.pendingEvents, JSON.stringify(entries.slice(-MAX_PENDING_EVENTS)));
    };

    const queuePendingEvent = (event) => {
        const entries = getPendingEvents();
        if (!entries.some((entry) => entry.event.event_id === event.event_id)) {
            entries.push({ event, attempts: 0, last_attempt_at: '' });
            setPendingEvents(entries);
        }
    };

    const updatePendingEvent = (eventId, update) => {
        const entries = getPendingEvents().map((entry) => (
            entry.event.event_id === eventId ? { ...entry, ...update } : entry
        ));
        setPendingEvents(entries);
    };

    const removePendingEvent = (eventId) => {
        setPendingEvents(getPendingEvents().filter((entry) => entry.event.event_id !== eventId));
    };

    const getEventEndpoint = () => {
        if (window.OBSIDIAN_LEAD_EVENT_ENDPOINT) return window.OBSIDIAN_LEAD_EVENT_ENDPOINT;
        const endpoint = document.documentElement && document.documentElement.getAttribute
            ? document.documentElement.getAttribute('data-lead-event-endpoint')
            : '';
        return endpoint || '/api/lead-events';
    };

    let flushPromise = null;

    const flushPendingEvents = () => {
        const endpoint = getEventEndpoint();
        if (!endpoint || typeof window.fetch !== 'function') return Promise.resolve(false);
        if (flushPromise) return flushPromise;

        flushPromise = (async () => {
            const entries = getPendingEvents()
                .filter((entry) => entry.attempts < MAX_DELIVERY_ATTEMPTS)
                .slice(0, DELIVERY_BATCH_SIZE);

            for (const entry of entries) {
                updatePendingEvent(entry.event.event_id, {
                    attempts: entry.attempts + 1,
                    last_attempt_at: new Date().toISOString()
                });

                let response;
                try {
                    response = await window.fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(entry.event),
                        keepalive: true
                    });
                } catch (error) {
                    // Network error: retryable, stop the batch so later envelopes are attempted
                    // on the next flush rather than out of order.
                    break;
                }

                if (!response) break;

                if (response.ok) {
                    removePendingEvent(entry.event.event_id);
                    continue;
                }

                // Q1/Q6/MED-3: only a payload-level rejection (400 malformed, 413 too large, 422
                // semantically invalid) will never succeed on retry -- drop it and keep flushing
                // so one poison envelope can never block the rest of the queue. Every other
                // status, including 401/403/404/405/408/429/451 and any 5xx, describes the
                // request environment rather than an unfixable payload (an edge/WAF header
                // rewrite, a routing regression, a rate limit, a timeout) and must stay retryable
                // -- otherwise a recoverable outage would silently and permanently discard real
                // lead-action data on its first attempt.
                const status = response.status;
                const isPermanentRejection = status === 400 || status === 413 || status === 422;
                if (isPermanentRejection) {
                    removePendingEvent(entry.event.event_id);
                    continue;
                }

                break;
            }

            return getPendingEvents().length === 0;
        })().finally(() => {
            flushPromise = null;
        });

        return flushPromise;
    };

    const beaconPendingEvents = () => {
        const endpoint = getEventEndpoint();
        if (!endpoint || !window.navigator || typeof window.navigator.sendBeacon !== 'function') return;

        getPendingEvents().slice(0, DELIVERY_BATCH_SIZE).forEach((entry) => {
            window.navigator.sendBeacon(endpoint, JSON.stringify(entry.event));
        });
    };

    const sendFirstPartyEvent = (event) => {
        const endpoint = getEventEndpoint();
        if (!endpoint) return;

        queuePendingEvent(event);
        if (typeof window.fetch === 'function') {
            flushPendingEvents().catch(() => {});
            return;
        }

        if (window.navigator && typeof window.navigator.sendBeacon === 'function') {
            window.navigator.sendBeacon(endpoint, JSON.stringify(event));
        }
    };

    const recordLeadEvent = (eventName, payload = {}, options = {}) => {
        const lead = getLead();
        if (options.requireAttribution && !hasAttribution(lead)) return;

        const event = {
            event_id: generateId('obsidian_event'),
            event_name: eventName,
            event_time: new Date().toISOString(),
            session_id: lead.session_id,
            page_url: window.location.href,
            page_path: window.location.pathname,
            referrer: document.referrer || lead.first_referrer,
            lead,
            payload
        };

        if (options.touch) event.touch = options.touch;
        if (options.leadIntent) event.lead_intent = options.leadIntent;

        const events = getEventLog();
        events.push(event);
        setEventLog(events);
        sendFirstPartyEvent(event);

        return event;
    };

    const exportEventLog = () => JSON.stringify({
        exported_at: new Date().toISOString(),
        lead: getLead(),
        events: getEventLog()
    }, null, 2);

    const clearEventLog = () => {
        localStorage.removeItem(STORAGE_KEYS.events);
    };

    const sendAnalyticsEvent = (eventName, extra = {}, options = {}) => {
        const lead = getLead();

        let eventOptions = options;
        const channel = LEAD_INTENT_CHANNEL_BY_EVENT[eventName];
        if (channel) {
            // A capture-phase handler may have already called ensureLeadIntent itself (to
            // decorate the clicked link/submitted form before this call), in which case it
            // passes that same result through so the intent isn't created/read twice and the
            // isNew/touchForEvent bookkeeping stays accurate.
            const leadIntentResult = options.leadIntentResult || ensureLeadIntent(channel);
            if (leadIntentResult.intent) {
                eventOptions = { ...options, leadIntent: leadIntentResult.intent };
                // F4: touchForEvent is attached whenever present, not only when isNew -- a
                // reused intent's bound touch is resent on every later real lead action so an
                // intent-creating envelope that never lands still has its touch delivered
                // (idempotently) by a subsequent action. touchForEvent is always the frozen
                // binding (see ensureLeadIntent), never a newer current touch.
                if (leadIntentResult.touchForEvent) {
                    eventOptions.touch = leadIntentResult.touchForEvent;
                }
            }
        }

        const event = recordLeadEvent(eventName, extra, eventOptions);
        if (!event || typeof window.gtag !== 'function') return event;

        window.gtag('event', eventName, {
            event_category: 'lead_attribution',
            lead_session_id: lead.session_id,
            conversation_id: lead.cid,
            phone: lead.phone,
            utm_source: lead.utm_source,
            utm_medium: lead.utm_medium,
            utm_campaign: lead.utm_campaign,
            utm_term: lead.utm_term,
            utm_content: lead.utm_content,
            gclid: lead.gclid,
            gbraid: lead.gbraid,
            wbraid: lead.wbraid,
            campaignid: lead.campaignid,
            adgroupid: lead.adgroupid,
            keyword: lead.keyword,
            matchtype: lead.matchtype,
            device: lead.device,
            network: lead.network,
            page_path: window.location.pathname,
            ...extra
        });

        const adsConversions = {
            ...DEFAULT_ADS_CONVERSIONS,
            ...(window.OBSIDIAN_GOOGLE_ADS_CONVERSIONS || {})
        };
        const conversionLabel = adsConversions[eventName];
        if (conversionLabel) {
            window.gtag('event', 'conversion', {
                send_to: `${GOOGLE_ADS_ID}/${conversionLabel}`,
                event_category: 'lead_attribution',
                lead_session_id: lead.session_id,
                gclid: lead.gclid,
                gbraid: lead.gbraid,
                wbraid: lead.wbraid,
                page_path: window.location.pathname,
                ...extra
            });
        }

        return event;
    };

    let websiteCallTrackingConfigured = false;
    const configureWebsiteCallTracking = () => {
        if (
            websiteCallTrackingConfigured
            || !WEBSITE_CALL_CONFIG_ID
            || typeof window.gtag !== 'function'
        ) return false;

        window.gtag('config', WEBSITE_CALL_CONFIG_ID, {
            phone_conversion_number: WEBSITE_CALL_DISPLAY_NUMBER
        });
        websiteCallTrackingConfigured = true;
        return true;
    };

    const isSquareBookingLink = (href) => {
        try {
            const url = new URL(href, window.location.origin);
            return SQUARE_BOOKING_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
                && url.pathname.includes('/appointments');
        } catch (error) {
            return false;
        }
    };

    const documentLeadAttribute = (name) => (
        document.documentElement
        && typeof document.documentElement.getAttribute === 'function'
        && document.documentElement.getAttribute(name)
    ) || '';

    const getLeadContext = (link) => ({
        service: (
            (link && link.getAttribute('data-lead-service'))
            || documentLeadAttribute('data-lead-service')
        ),
        landing_variant: (
            (link && link.getAttribute('data-lead-variant'))
            || documentLeadAttribute('data-lead-variant')
        ),
        lead_action: (link && link.getAttribute('data-lead-action')) || ''
    });

    const bindClickTracking = () => {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (!link || !link.matches(BOOKING_SELECTORS)) return;

            const eventName = isSquareBookingLink(link.href) ? 'square_booking_click' : 'ai_booking_click';
            sendAnalyticsEvent(eventName, {
                link_url: link.href,
                link_text: (link.textContent || '').trim().slice(0, 120)
            });
        }, true);

        document.addEventListener('click', (event) => {
            const link = event.target.closest(PHONE_SELECTOR);
            if (!link) return;

            sendAnalyticsEvent('phone_click', {
                link_url: link.href,
                link_text: (link.textContent || '').trim().slice(0, 120),
                ...getLeadContext(link)
            });
        }, true);

        document.addEventListener('click', (event) => {
            const link = event.target.closest(TEXT_SELECTOR);
            if (!link) return;

            // Create/reuse the intent and rewrite this specific link's href synchronously,
            // before the default action (the OS reading the href to launch Messages) runs.
            const leadIntentResult = ensureLeadIntent('text');
            const intent = leadIntentResult.intent;
            if (intent) {
                const raw = link.getAttribute('href');
                if (raw && raw.startsWith('sms:') && !raw.includes(intent.reference_code)) {
                    link.setAttribute('href', appendReferenceToSmsHref(raw, intent.reference_code));
                }
            }

            sendAnalyticsEvent('text_click', {
                link_url: link.href,
                link_text: (link.textContent || '').trim().slice(0, 120),
                ...getLeadContext(link)
            }, { leadIntentResult });
        }, true);

        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (!form || form.tagName !== 'FORM') return;

            const lead = getLead();
            // lead_session_id is a legacy field written unconditionally (even without Web
            // Crypto); the OA intent fields below are only written once a real intent exists.
            upsertHidden(form, 'lead_session_id', lead.session_id);

            const leadIntentResult = ensureLeadIntent('form');
            const intent = leadIntentResult.intent;
            if (intent) {
                upsertHidden(form, 'lead_intent_id', intent.lead_intent_id);
                upsertHidden(form, 'lead_reference', intent.reference_code);
                upsertHidden(form, 'lead_touch_id', intent.touch_id);
            }

            sendAnalyticsEvent('lead_form_submit', {}, { leadIntentResult });
        }, true);
    };

    const titleBookingFrames = () => {
        document.querySelectorAll('iframe[src*="app.squareup.com/appointments"], iframe[src*="book.squareup.com/appointments"], iframe[src*="square.site/appointments"]').forEach((frame) => {
            if (!frame.getAttribute('title')) {
                frame.setAttribute('title', 'Square appointment booking calendar for Obsidian Autoworks');
            }
        });
    };

    const boot = () => {
        remember();
        createTouchIfNew();
        configureWebsiteCallTracking();
        decorateBookingTargets();
        decorateForms();
        decorateTextLinks();
        titleBookingFrames();
        bindClickTracking();

        const path = window.location.pathname;
        const pageLeadContext = getLeadContext();
        sendAnalyticsEvent('ai_lead_page_visit', pageLeadContext, { requireAttribution: true });
        if (pageLeadContext.landing_variant) {
            sendAnalyticsEvent(
                'paid_landing_page_view',
                pageLeadContext,
                { requireAttribution: true }
            );
        }
        if (path === '/booking' || document.querySelector('.booking-calendar, #booking')) {
            sendAnalyticsEvent('ai_booking_page_visit');
        }
        if (path === '/vip-booking') {
            sendAnalyticsEvent('vip_page_visit');
        }
        if (path === '/architectural-window-film') {
            sendAnalyticsEvent('residential_page_visit');
        }
        if (path === '/ceramic-coating') {
            sendAnalyticsEvent('ceramic_coating_page_visit', pageLeadContext);
        }
        if (path === '/booking' || path === '/vip-booking' || path === '/architectural-window-film' || document.querySelector('.booking-calendar, #booking, #vip-booking')) {
            sendAnalyticsEvent('booking_landing_page_view', {
                booking_path: path
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState !== 'hidden') return;
            sendAnalyticsEvent('lead_session_checkpoint', {
                event_count: getEventLog().length
            });
            beaconPendingEvents();
        });

        let pendingRefresh = false;
        const scheduleRefresh = () => {
            if (pendingRefresh) return;
            pendingRefresh = true;
            window.requestAnimationFrame(() => {
                pendingRefresh = false;
                decorateBookingTargets();
                decorateForms();
                decorateTextLinks();
                titleBookingFrames();
            });
        };

        const observer = new MutationObserver(scheduleRefresh);
        observer.observe(document.documentElement, { childList: true, subtree: true });

        window.setInterval(() => {
            decorateBookingTargets();
            decorateForms();
            decorateTextLinks();
            titleBookingFrames();
        }, 2000);

        window.setInterval(() => {
            flushPendingEvents().catch(() => {});
        }, DELIVERY_RETRY_INTERVAL_MS);

        window.setInterval(configureWebsiteCallTracking, 2000);

        flushPendingEvents().catch(() => {});
    };

    window.obsidianLeadTracking = {
        getLead,
        getEventLog,
        getPendingEvents,
        exportEventLog,
        clearEventLog,
        flushPendingEvents,
        recordEvent: recordLeadEvent,
        trackEvent: sendAnalyticsEvent,
        configureWebsiteCallTracking,
        decorateBookingTargets,
        decorateForms,
        decorateTextLinks,
        getCurrentTouch,
        getCurrentIntent
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
