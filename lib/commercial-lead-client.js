(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.ObsidianCommercialLeadClient = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const saveThenOpenText = async ({ endpoint, payload, smsHref, fetchImpl, navigate }) => {
        if (typeof fetchImpl !== 'function') throw new Error('Unable to save project information.');
        if (typeof navigate !== 'function') throw new Error('Unable to open Messages.');

        const response = await fetchImpl(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'same-origin'
        });

        if (!response || !response.ok) {
            throw new Error('Unable to save project information. Please try again.');
        }

        const result = await response.json();
        if (!result || !result.ok || !result.lead_id) {
            throw new Error('Unable to save project information. Please try again.');
        }

        navigate(smsHref);
        return result;
    };

    return Object.freeze({ saveThenOpenText });
}));
