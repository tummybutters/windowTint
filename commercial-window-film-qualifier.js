(function () {
    'use strict';

    const EVENTS = Object.freeze({
        started: 'commercial_qualifier_started',
        answered: 'commercial_qualifier_answered',
        completed: 'commercial_qualifier_completed',
        restarted: 'commercial_qualifier_restarted'
    });

    const PHONE = '+17146007134';

    const clean = (value) => String(value || '').trim().replace(/\s+/g, ' ');

    const boot = () => {
        const root = document.getElementById('commercial-qualifier');
        const model = window.ObsidianCommercialQualifier;
        if (!root || !model) return;

        const body = root.querySelector('[data-commercial-qualifier-body]');
        const stepLabel = root.querySelector('[data-commercial-step]');
        const progress = root.querySelector('[data-commercial-progress]');
        const liveRegion = root.querySelector('[data-commercial-live]');
        let state = Object.freeze({});
        let stepIndex = 0;
        let started = false;
        let submissionId = '';

        const track = (eventName, payload) => {
            const tracking = window.obsidianLeadTracking;
            if (!tracking || typeof tracking.recordEvent !== 'function') return;
            tracking.recordEvent(eventName, {
                service: 'commercial_window_film',
                landing_variant: 'commercial_socal_v1',
                ...payload
            });
        };

        const focusWithoutScroll = (element) => {
            if (!element) return;
            try {
                element.focus({ preventScroll: true });
            } catch (error) {
                element.focus();
            }
        };

        const setProgress = (complete) => {
            const current = complete ? model.QUESTIONS.length : stepIndex + 1;
            const percentage = complete ? 100 : (stepIndex / model.QUESTIONS.length) * 100;
            stepLabel.textContent = complete ? 'Project brief ready' : `Step ${current} of ${model.QUESTIONS.length}`;
            progress.style.width = `${percentage}%`;
            progress.parentElement.setAttribute('aria-valuenow', String(Math.round(percentage)));
        };

        const renderResult = () => {
            setProgress(true);
            submissionId = submissionId || window.ObsidianCommercialLeadClient.createSubmissionId(window.crypto);
            liveRegion.textContent = 'Your project brief is ready. Add your contact information to save it and open Messages.';
            body.innerHTML = `
                <div class="commercial-qualifier__result">
                    <p class="commercial-overline">Project brief</p>
                    <h3 tabindex="-1">One last step: where should we reach you?</h3>
                    <pre data-commercial-summary></pre>
                    <form class="commercial-qualifier__intake" data-commercial-result-form novalidate>
                        <div class="commercial-qualifier__intake-fields">
                            <label><span>Name</span><input type="text" name="name" autocomplete="name" required></label>
                            <label><span>Phone</span><input type="tel" name="phone" autocomplete="tel" inputmode="tel" required></label>
                            <label><span>Property city</span><input type="text" name="property_city" autocomplete="address-level2" required></label>
                            <label class="commercial-qualifier__notes"><span>Additional notes <small>Optional</small></span>
                                <textarea name="additional_notes" rows="3" placeholder="Anything else that would help us understand the property or glass."></textarea>
                            </label>
                        </div>
                        <div class="commercial-qualifier__result-actions">
                            <button class="commercial-button commercial-button--signal" type="submit">Text us your info</button>
                            <a class="commercial-button commercial-button--line" href="tel:${PHONE}"
                                data-lead-action="commercial_window_film_call">Call instead</a>
                            <button class="commercial-text-button" type="button" data-commercial-restart>Start over</button>
                        </div>
                        <p class="commercial-qualifier__save-note">Your information is saved first. Then Messages opens with the complete brief ready for you to send.</p>
                        <p class="commercial-qualifier__status" data-commercial-result-status aria-live="polite"></p>
                    </form>
                </div>
            `;
            body.querySelector('[data-commercial-summary]').textContent = model.buildSummary(state);
            const form = body.querySelector('[data-commercial-result-form]');
            const status = body.querySelector('[data-commercial-result-status]');
            const submit = form.querySelector('[type="submit"]');

            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (!form.reportValidity()) {
                    status.textContent = 'Please add your name, phone number, and property city.';
                    return;
                }

                const tracking = window.obsidianLeadTracking;
                const prepared = tracking && typeof tracking.prepareLeadIntent === 'function'
                    ? tracking.prepareLeadIntent('form')
                    : { intent: null, touchForEvent: null };
                const lead = tracking && typeof tracking.getLead === 'function' ? tracking.getLead() : {};
                const contact = Object.fromEntries(new FormData(form).entries());
                const intent = prepared.intent || {};
                const payload = {
                    submission_id: submissionId,
                    session_id: clean(lead.session_id),
                    lead_intent_id: clean(intent.lead_intent_id),
                    reference_code: clean(intent.reference_code),
                    name: clean(contact.name),
                    phone: clean(contact.phone),
                    property_city: clean(contact.property_city),
                    additional_notes: clean(contact.additional_notes),
                    answers: { ...state },
                    attribution: { ...lead },
                    touch: prepared.touchForEvent ? { ...prepared.touchForEvent } : {}
                };
                const message = model.buildTextMessage(state, {
                    ...contact,
                    reference_code: payload.reference_code
                });
                const smsHref = `sms:${PHONE}?body=${encodeURIComponent(message)}`;

                submit.disabled = true;
                status.textContent = 'Saving your project information…';
                try {
                    await window.ObsidianCommercialLeadClient.saveThenOpenText({
                        endpoint: '/api/commercial-leads',
                        payload,
                        smsHref,
                        fetchImpl: window.fetch.bind(window),
                        navigate: (href) => window.location.assign(href),
                        beforeSave: async () => {
                            if (!tracking || typeof tracking.recordEvent !== 'function') return;
                            tracking.recordEvent('commercial_lead_submit', {
                                service: 'commercial_window_film',
                                landing_variant: 'commercial_socal_v1'
                            }, { leadIntent: intent, touch: prepared.touchForEvent });
                            if (typeof tracking.flushPendingEvents === 'function') {
                                await tracking.flushPendingEvents();
                            }
                        }
                    });
                    if (tracking && typeof tracking.recordEvent === 'function') {
                        tracking.recordEvent('commercial_lead_saved', {
                            service: 'commercial_window_film',
                            landing_variant: 'commercial_socal_v1'
                        }, { leadIntent: intent, touch: prepared.touchForEvent });
                    }
                    status.textContent = 'Saved. Opening Messages…';
                } catch (error) {
                    submit.disabled = false;
                    status.textContent = 'We could not save your information yet. Please try again, or call us directly.';
                }
            });
            body.querySelector('[data-commercial-restart]').addEventListener('click', () => {
                track(EVENTS.restarted, { answered_questions: Object.keys(state).length });
                state = Object.freeze({});
                stepIndex = 0;
                started = false;
                submissionId = '';
                liveRegion.textContent = 'Commercial project qualifier restarted.';
                renderQuestion({ focusChoice: true });
            });
            focusWithoutScroll(body.querySelector('.commercial-qualifier__result h3'));
        };

        const renderQuestion = ({ focusChoice = false } = {}) => {
            const question = model.QUESTIONS[stepIndex];
            setProgress(false);
            body.innerHTML = `
                <fieldset class="commercial-qualifier__fieldset">
                    <legend>${question.prompt}</legend>
                    <p>Select the closest fit. You can add context in your text.</p>
                    <div class="commercial-qualifier__choices"></div>
                </fieldset>
            `;

            const choices = body.querySelector('.commercial-qualifier__choices');
            question.choices.forEach((choice) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'commercial-qualifier__choice';
                button.dataset.questionId = question.id;
                button.dataset.choiceId = choice.id;
                button.innerHTML = `<span>${choice.label}</span><span aria-hidden="true">Select &rarr;</span>`;
                button.addEventListener('click', () => {
                    if (!started) {
                        started = true;
                        track(EVENTS.started, { first_question: question.id });
                    }

                    state = Object.freeze(model.selectAnswer(state, question.id, choice.id));
                    track(EVENTS.answered, {
                        question_id: question.id,
                        choice_id: choice.id,
                        answer_number: stepIndex + 1
                    });
                    liveRegion.textContent = `${question.prompt}: ${choice.label}`;

                    if (model.isComplete(state)) {
                        track(EVENTS.completed, { answers: { ...state } });
                        renderResult();
                        return;
                    }

                    stepIndex += 1;
                    renderQuestion({ focusChoice: true });
                });
                choices.appendChild(button);
            });

            if (focusChoice) {
                focusWithoutScroll(body.querySelector('.commercial-qualifier__choice'));
            }
        };

        renderQuestion();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
}());
