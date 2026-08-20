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

    const createSubmissionId = (cryptoObject, options = {}) => {
        if (cryptoObject && typeof cryptoObject.getRandomValues === 'function') {
            const bytes = new Uint8Array(16);
            cryptoObject.getRandomValues(bytes);
            return `commercial_submission_${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
        }

        const now = typeof options.now === 'function' ? options.now() : Date.now();
        const random = typeof options.random === 'function' ? options.random() : Math.random();
        return `commercial_submission_${now.toString(36)}_${random.toString(36).slice(2, 18).padEnd(16, '0')}`;
    };

    const saveThenOpenText = async ({ endpoint, payload, smsHref, fetchImpl, navigate, beforeSave }) => {
        if (typeof fetchImpl !== 'function') throw new Error('Unable to save project information.');
        if (typeof navigate !== 'function') throw new Error('Unable to open Messages.');

        if (typeof beforeSave === 'function') await beforeSave();

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

    return Object.freeze({ createSubmissionId, saveThenOpenText });
}));
