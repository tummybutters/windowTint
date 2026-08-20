(function () {
    'use strict';

    const PHONE = '+17146007134';

    const clean = (value) => String(value || '').trim().replace(/\s+/g, ' ');

    const boot = () => {
        const form = document.getElementById('commercial-consultation-form');
        const preview = document.querySelector('[data-commercial-preview]');
        if (!form || !preview) return;

        const previewText = preview.querySelector('[data-commercial-preview-text]');
        const sendLink = preview.querySelector('[data-commercial-preview-send]');
        const closeButtons = preview.querySelectorAll('[data-commercial-preview-close]');
        const status = form.querySelector('[data-commercial-form-status]');
        const submitButton = form.querySelector('[type="submit"]');

        const closePreview = () => {
            preview.hidden = true;
            document.body.style.removeProperty('overflow');
            submitButton.focus({ preventScroll: true });
        };

        const buildMessage = (formData) => {
            const name = clean(formData.get('name'));
            const phone = clean(formData.get('phone'));
            const city = clean(formData.get('property_city'));
            const goal = clean(formData.get('project_goal'));
            const details = clean(formData.get('project_details'));
            const reference = clean(formData.get('lead_reference'));

            return [
                `Hi Obsidian, this is ${name}. I would like a commercial window film site review.`,
                `Property city: ${city}`,
                `Primary goal: ${goal}`,
                `Project details: ${details}`,
                `Best callback number: ${phone}`,
                reference ? `Reference: ${reference}` : '',
                'I can send photos and rough measurements here.'
            ].filter(Boolean).join('\n');
        };

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!form.reportValidity()) {
                status.textContent = 'Please complete each required field.';
                return;
            }

            const message = buildMessage(new FormData(form));
            previewText.textContent = message;
            sendLink.href = `sms:${PHONE}?body=${encodeURIComponent(message)}`;
            status.textContent = 'Your project text is ready to review.';
            preview.hidden = false;
            document.body.style.overflow = 'hidden';
            sendLink.focus({ preventScroll: true });
        });

        closeButtons.forEach((button) => button.addEventListener('click', closePreview));
        preview.addEventListener('click', (event) => {
            if (event.target === preview) closePreview();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !preview.hidden) closePreview();
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
}());
