(function () {
    'use strict';

    const EVENTS = Object.freeze({
        started: 'commercial_qualifier_started',
        answered: 'commercial_qualifier_answered',
        completed: 'commercial_qualifier_completed',
        restarted: 'commercial_qualifier_restarted'
    });

    const PHONE = '+17146007134';

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

        const textHref = () => `sms:${PHONE}?body=${encodeURIComponent(model.buildTextMessage(state))}`;

        const renderResult = () => {
            setProgress(true);
            liveRegion.textContent = 'Your project brief is ready to send.';
            body.innerHTML = `
                <div class="commercial-qualifier__result">
                    <p class="commercial-overline">Project brief</p>
                    <h3 tabindex="-1">Bring the right details to the first conversation.</h3>
                    <pre data-commercial-summary></pre>
                    <p>No message has been sent. Add the property city, photos, and rough measurements when you text.</p>
                    <div class="commercial-qualifier__result-actions">
                        <a class="commercial-button commercial-button--signal" href="tel:${PHONE}"
                            data-lead-action="commercial_window_film_call">Call (714) 600-7134</a>
                        <a class="commercial-button commercial-button--line" data-commercial-result-text
                            data-lead-action="commercial_window_film_text">Text this brief</a>
                        <button class="commercial-text-button" type="button" data-commercial-restart>Start over</button>
                    </div>
                </div>
            `;
            body.querySelector('[data-commercial-summary]').textContent = model.buildSummary(state);
            body.querySelector('[data-commercial-result-text]').href = textHref();
            body.querySelector('[data-commercial-restart]').addEventListener('click', () => {
                track(EVENTS.restarted, { answered_questions: Object.keys(state).length });
                state = Object.freeze({});
                stepIndex = 0;
                started = false;
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
