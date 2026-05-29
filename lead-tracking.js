(function () {
    const STORAGE_KEYS = {
        cid: 'lead_track_cid',
        phone: 'lead_track_phone',
        utmSource: 'lead_track_utm_source',
        utmMedium: 'lead_track_utm_medium',
        utmCampaign: 'lead_track_utm_campaign',
        utmTerm: 'lead_track_utm_term',
        utmContent: 'lead_track_utm_content',
        gclid: 'lead_track_gclid',
        gbraid: 'lead_track_gbraid',
        wbraid: 'lead_track_wbraid'
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
        'wbraid'
    ];
    const BOOKING_SELECTORS = [
        'a[href="/booking"]',
        'a[href^="/booking?"]',
        'a[href="/vip-booking"]',
        'a[href^="/vip-booking?"]',
        'a[href*="app.squareup.com/appointments"]',
        'a[href*="squareup.com/appointments"]',
        'a[href*="square.site/appointments"]',
        'iframe[src*="app.squareup.com/appointments"]',
        'iframe[src*="square.site/appointments"]'
    ].join(',');
    const PHONE_SELECTOR = 'a[href^="tel:"]';

    const readParams = () => new URLSearchParams(window.location.search);

    const firstParam = (params, names) => {
        for (const name of names) {
            const value = params.get(name);
            if (value) return value;
        }
        return '';
    };

    const remember = () => {
        const params = readParams();
        const cid = firstParam(params, ['cid', 'conversation_id', 'lead_id']);
        const phone = firstParam(params, ['phone', 'lead_phone']);
        const utmSource = params.get('utm_source') || '';
        const utmMedium = params.get('utm_medium') || '';
        const utmCampaign = params.get('utm_campaign') || '';
        const utmTerm = params.get('utm_term') || '';
        const utmContent = params.get('utm_content') || '';
        const gclid = params.get('gclid') || '';
        const gbraid = params.get('gbraid') || '';
        const wbraid = params.get('wbraid') || '';

        if (cid) localStorage.setItem(STORAGE_KEYS.cid, cid);
        if (phone) localStorage.setItem(STORAGE_KEYS.phone, phone);
        if (utmSource) localStorage.setItem(STORAGE_KEYS.utmSource, utmSource);
        if (utmMedium) localStorage.setItem(STORAGE_KEYS.utmMedium, utmMedium);
        if (utmCampaign) localStorage.setItem(STORAGE_KEYS.utmCampaign, utmCampaign);
        if (utmTerm) localStorage.setItem(STORAGE_KEYS.utmTerm, utmTerm);
        if (utmContent) localStorage.setItem(STORAGE_KEYS.utmContent, utmContent);
        if (gclid) localStorage.setItem(STORAGE_KEYS.gclid, gclid);
        if (gbraid) localStorage.setItem(STORAGE_KEYS.gbraid, gbraid);
        if (wbraid) localStorage.setItem(STORAGE_KEYS.wbraid, wbraid);
    };

    const getLead = () => ({
        cid: localStorage.getItem(STORAGE_KEYS.cid) || '',
        phone: localStorage.getItem(STORAGE_KEYS.phone) || '',
        utm_source: localStorage.getItem(STORAGE_KEYS.utmSource) || '',
        utm_medium: localStorage.getItem(STORAGE_KEYS.utmMedium) || '',
        utm_campaign: localStorage.getItem(STORAGE_KEYS.utmCampaign) || '',
        utm_term: localStorage.getItem(STORAGE_KEYS.utmTerm) || '',
        utm_content: localStorage.getItem(STORAGE_KEYS.utmContent) || '',
        gclid: localStorage.getItem(STORAGE_KEYS.gclid) || '',
        gbraid: localStorage.getItem(STORAGE_KEYS.gbraid) || '',
        wbraid: localStorage.getItem(STORAGE_KEYS.wbraid) || ''
    });

    const hasAttribution = (lead) => TRACKED_PARAMS.some((param) => Boolean(lead[param]));

    const applyParams = (url, lead) => {
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
        });
    };

    const sendAnalyticsEvent = (eventName, extra = {}, options = {}) => {
        const lead = getLead();
        if (typeof window.gtag !== 'function') return;
        if (options.requireAttribution && !hasAttribution(lead)) return;

        window.gtag('event', eventName, {
            event_category: 'lead_attribution',
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
            page_path: window.location.pathname,
            ...extra
        });
    };

    const bindClickTracking = () => {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (!link || !link.matches(BOOKING_SELECTORS)) return;

            sendAnalyticsEvent('ai_booking_click', {
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
    };

    const titleBookingFrames = () => {
        document.querySelectorAll('iframe[src*="app.squareup.com/appointments"], iframe[src*="square.site/appointments"]').forEach((frame) => {
            if (!frame.getAttribute('title')) {
                frame.setAttribute('title', 'Square appointment booking calendar for Obsidian Autoworks');
            }
        });
    };

    const boot = () => {
        remember();
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
        if (path === '/booking' || path === '/vip-booking' || document.querySelector('.booking-calendar, #booking, #vip-booking')) {
            sendAnalyticsEvent('booking_landing_page_view', {
                booking_path: path
            });
        }

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
    };

    window.obsidianLeadTracking = {
        getLead,
        trackEvent: sendAnalyticsEvent,
        decorateBookingTargets,
        decorateForms
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
