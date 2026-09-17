(function () {
    'use strict';

    // Renders the next live Square slot into [data-availability]. Any failure, empty
    // payload, or malformed slot leaves the block hidden -- the page never shows a
    // broken or stale availability state.
    const ENDPOINT = '/api/square-availability';
    const SQUARE_HOSTS = ['app.squareup.com', 'book.squareup.com', 'squareup.com', 'square.site'];

    const isSquareUrl = (value) => {
        try {
            const url = new URL(value, window.location.origin);
            return url.protocol === 'https:'
                && SQUARE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
        } catch (error) {
            return false;
        }
    };

    const pickSlot = (payload) => {
        if (!payload || payload.ok !== true || !Array.isArray(payload.slots)) return null;
        const now = Date.now();
        return payload.slots.find((slot) => (
            slot
            && typeof slot.label === 'string'
            && slot.label.trim()
            && typeof slot.bookingUrl === 'string'
            && isSquareUrl(slot.bookingUrl)
            && (!slot.startAt || Number.isNaN(Date.parse(slot.startAt)) || Date.parse(slot.startAt) > now)
        )) || null;
    };

    const render = (container, slot, openDays) => {
        const fallbackUrl = container.getAttribute('data-availability-fallback-url') || '';
        const pulse = document.createElement('span');
        pulse.className = 'paid-availability__pulse';
        pulse.setAttribute('aria-hidden', 'true');

        const text = document.createElement('span');
        text.append('Next open driveway slot: ');
        const label = document.createElement('strong');
        label.textContent = slot.label.trim();
        text.append(label);
        // Real count from Square. Only shown when it is actually tight.
        if (Number.isInteger(openDays) && openDays >= 0 && openDays <= 3) {
            const scarcity = document.createElement('strong');
            scarcity.className = 'paid-availability__scarcity';
            scarcity.textContent = openDays === 0
                ? ' · This week is full'
                : ` · Only ${openDays} open day${openDays === 1 ? '' : 's'} left this week`;
            text.append(scarcity);
        }

        const link = document.createElement('a');
        link.href = slot.bookingUrl;
        link.textContent = 'Grab it';
        link.setAttribute('data-lead-action', container.getAttribute('data-availability-action') || 'near_me_reserve_slot');
        link.setAttribute('rel', 'noopener');
        if (slot.startAt) link.setAttribute('data-slot-start', slot.startAt);
        if (fallbackUrl && !link.href) link.href = fallbackUrl;

        container.replaceChildren(pulse, text, link);
        container.setAttribute('data-availability-ready', '');
        container.setAttribute('role', 'status');

        // Let the shared tracker decorate the injected Square link with the current ad touch.
        const tracker = window.obsidianLeadTracking;
        if (tracker && typeof tracker.decorateBookingTargets === 'function') {
            try { tracker.decorateBookingTargets(); } catch (error) { /* non-fatal */ }
        }
    };

    const boot = () => {
        const containers = Array.from(document.querySelectorAll('[data-availability]'));
        if (containers.length === 0 || typeof window.fetch !== 'function') return;

        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timer = controller ? window.setTimeout(() => controller.abort(), 6000) : null;

        window.fetch(ENDPOINT, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
            signal: controller ? controller.signal : undefined
        })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload) => {
                const slot = pickSlot(payload);
                if (!slot) return;
                containers.forEach((container) => render(container, slot, payload.openDaysNext7));
            })
            .catch(() => { /* silent: block stays hidden */ })
            .finally(() => { if (timer) window.clearTimeout(timer); });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
