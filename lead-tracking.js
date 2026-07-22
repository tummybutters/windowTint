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
        pendingEvents: 'lead_track_pending_events'
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
    const GOOGLE_ADS_ID = 'AW-17846304809';
    const WEBSITE_CALL_CONFIG_ID = `${GOOGLE_ADS_ID}/060ZCNixtdQcEKmA5L1C`;
    const WEBSITE_CALL_DISPLAY_NUMBER = '(714) 600-7134';
    const DEFAULT_ADS_CONVERSIONS = {
        ai_booking_click: '',
        phone_click: 'GVSvCK39u70cEKmA5L1C',
        residential_consultation_request: 'uZ_6CNyY8tQcEKmA5L1C',
        square_booking_click: ''
    };
    const SQUARE_BOOKING_HOSTS = [
        'app.squareup.com',
        'book.squareup.com',
        'squareup.com',
        'square.site'
    ];

    const readParams = () => new URLSearchParams(window.location.search);

    const generateId = (prefix) => {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return `${prefix}_${window.crypto.randomUUID()}`;
        }

        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
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

    const applyParams = (url, lead) => {
        if (lead.session_id && !url.searchParams.has('obsidian_session_id')) {
            url.searchParams.set('obsidian_session_id', lead.session_id);
        }
        if (lead.cid && !url.searchParams.has('cid') && !url.searchParams.has('conversation_id')) {
            url.searchParams.set('cid', lead.cid);
        }
        if (lead.phone && !url.searchParams.has('phone')) {
            url.searchParams.set('phone', lead.phone);
        }
        if (lead.utm_source && !url.searchParams.has('utm_source')) {
            url.searchParams.set('utm_source', lead.utm_source);
        }
        if (lead.utm_medium && !url.searchParams.has('utm_medium')) {
            url.searchParams.set('utm_medium', lead.utm_medium);
        }
        if (lead.utm_campaign && !url.searchParams.has('utm_campaign')) {
            url.searchParams.set('utm_campaign', lead.utm_campaign);
        }
        if (lead.utm_term && !url.searchParams.has('utm_term')) {
            url.searchParams.set('utm_term', lead.utm_term);
        }
        if (lead.utm_content && !url.searchParams.has('utm_content')) {
            url.searchParams.set('utm_content', lead.utm_content);
        }
        if (lead.gclid && !url.searchParams.has('gclid')) {
            url.searchParams.set('gclid', lead.gclid);
        }
        if (lead.gbraid && !url.searchParams.has('gbraid')) {
            url.searchParams.set('gbraid', lead.gbraid);
        }
        if (lead.wbraid && !url.searchParams.has('wbraid')) {
            url.searchParams.set('wbraid', lead.wbraid);
        }
        ['campaignid', 'adgroupid', 'creative', 'keyword', 'matchtype', 'device', 'network', 'loc_physical_ms', 'loc_interest_ms', 'placement', 'targetid', 'extensionid'].forEach((param) => {
            if (lead[param] && !url.searchParams.has(param)) {
                url.searchParams.set(param, lead[param]);
            }
        });
    };

    const decorateBookingTargets = () => {
        const lead = getLead();
        if (!hasAttribution(lead)) return;

        document.querySelectorAll(BOOKING_SELECTORS).forEach((node) => {
            const attr = node.tagName === 'IFRAME' ? 'src' : 'href';
            const raw = node.getAttribute(attr);
            if (!raw) return;

            try {
                const url = new URL(raw, window.location.origin);
                applyParams(url, lead);
                const nextValue = url.origin === window.location.origin
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

    const decorateForms = () => {
        const lead = getLead();
        if (!hasAttribution(lead)) return;

        document.querySelectorAll('form').forEach((form) => {
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

                try {
                    const response = await window.fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(entry.event),
                        keepalive: true
                    });
                    if (!response || !response.ok) throw new Error('Lead-event endpoint rejected delivery');
                    removePendingEvent(entry.event.event_id);
                } catch (error) {
                    break;
                }
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

    const submitFirstPartyEvent = async (event) => {
        const endpoint = getEventEndpoint();
        if (!endpoint || typeof window.fetch !== 'function') return false;

        queuePendingEvent(event);
        try {
            const response = await window.fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event),
                keepalive: true
            });
            if (!response || !response.ok) return false;
            removePendingEvent(event.event_id);
            return true;
        } catch (error) {
            return false;
        }
    };

    const recordLeadEvent = (eventName, payload = {}, options = {}) => {
        const lead = {
            ...getLead(),
            ...(options.lead || {})
        };
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

        const events = getEventLog();
        events.push(event);
        setEventLog(events);
        if (!options.deferDelivery) sendFirstPartyEvent(event);

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

    const sendGoogleAnalyticsEvent = (eventName, extra = {}, lead = getLead()) => {
        if (typeof window.gtag !== 'function') return;

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
    };

    const sendAnalyticsEvent = (eventName, extra = {}, options = {}) => {
        const lead = {
            ...getLead(),
            ...(options.lead || {})
        };
        const event = recordLeadEvent(eventName, extra, { ...options, lead });
        if (!event) return event;

        sendGoogleAnalyticsEvent(eventName, options.analyticsPayload || extra, lead);

        return event;
    };

    const submitLeadEvent = async (eventName, payload = {}, options = {}) => {
        const lead = {
            ...getLead(),
            ...(options.lead || {})
        };
        const event = recordLeadEvent(eventName, payload, {
            ...options,
            lead,
            deferDelivery: true
        });
        if (!event) return { ok: false, event: null };

        const ok = await submitFirstPartyEvent(event);
        if (ok) sendGoogleAnalyticsEvent(eventName, options.analyticsPayload || {}, lead);
        return { ok, event };
    };

    let websiteCallTrackingConfigured = false;
    const configureWebsiteCallTracking = () => {
        if (websiteCallTrackingConfigured || typeof window.gtag !== 'function') return false;

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
                link_text: (link.textContent || '').trim().slice(0, 120)
            });
        }, true);

        document.addEventListener('click', (event) => {
            const link = event.target.closest(TEXT_SELECTOR);
            if (!link) return;

            sendAnalyticsEvent('text_click', {
                link_url: link.href,
                link_text: (link.textContent || '').trim().slice(0, 120)
            });
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
        configureWebsiteCallTracking();
        decorateBookingTargets();
        decorateForms();
        titleBookingFrames();
        bindClickTracking();

        const path = window.location.pathname;
        sendAnalyticsEvent('ai_lead_page_visit', {}, { requireAttribution: true });
        if (path === '/booking' || document.querySelector('.booking-calendar, #booking')) {
            sendAnalyticsEvent('ai_booking_page_visit');
        }
        if (path === '/vip-booking') {
            sendAnalyticsEvent('vip_page_visit');
        }
        if (path === '/architectural-window-film') {
            sendAnalyticsEvent('residential_page_visit');
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
                titleBookingFrames();
            });
        };

        const observer = new MutationObserver(scheduleRefresh);
        observer.observe(document.documentElement, { childList: true, subtree: true });

        window.setInterval(() => {
            decorateBookingTargets();
            decorateForms();
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
        submitLeadEvent,
        configureWebsiteCallTracking,
        decorateBookingTargets,
        decorateForms
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
