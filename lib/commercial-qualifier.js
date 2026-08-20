(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.ObsidianCommercialQualifier = api;
    }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const QUESTIONS = [
        {
            id: 'property',
            prompt: 'Property type',
            choices: [
                { id: 'office', label: 'Office' },
                { id: 'storefront_restaurant', label: 'Storefront / restaurant' },
                { id: 'hospitality_healthcare', label: 'Hospitality / healthcare' },
                { id: 'multifamily_common_area', label: 'Multi-family / common area' },
                { id: 'other_commercial', label: 'Other commercial property' }
            ]
        },
        {
            id: 'goal',
            prompt: 'Primary goal',
            choices: [
                { id: 'heat_glare', label: 'Heat / glare' },
                { id: 'privacy_decorative', label: 'Privacy / decorative' },
                { id: 'safety_security', label: 'Safety / security' },
                { id: 'uv_fade', label: 'UV / fade protection' }
            ]
        },
        {
            id: 'scope',
            prompt: 'Scope',
            choices: [
                { id: 'one_area_storefront', label: 'One area / storefront' },
                { id: 'small_building', label: 'Small building' },
                { id: 'multi_floor_large_project', label: 'Multi-floor / large project' },
                { id: 'not_yet_measured', label: 'Not yet measured' }
            ]
        },
        {
            id: 'timing',
            prompt: 'Timing',
            choices: [
                { id: 'as_soon_as_possible', label: 'As soon as possible' },
                { id: 'within_30_days', label: 'Within 30 days' },
                { id: 'one_to_three_months', label: 'One to three months' },
                { id: 'planning_budgeting', label: 'Planning / budgeting' }
            ]
        }
    ];

    const questionById = (questionId) => {
        const question = QUESTIONS.find((item) => item.id === questionId);
        if (!question) {
            throw new Error(`Unknown question: ${questionId}`);
        }
        return question;
    };

    const choiceById = (question, choiceId) => {
        const choice = question.choices.find((item) => item.id === choiceId);
        if (!choice) {
            throw new Error(`Invalid choice ${choiceId} for ${question.id}`);
        }
        return choice;
    };

    const selectAnswer = (state, questionId, choiceId) => {
        const question = questionById(questionId);
        choiceById(question, choiceId);
        return { ...(state || {}), [questionId]: choiceId };
    };

    const isComplete = (state) => QUESTIONS.every((question) => {
        const choiceId = state && state[question.id];
        return question.choices.some((choice) => choice.id === choiceId);
    });

    const answerLabel = (state, question) => {
        const choiceId = state && state[question.id];
        return choiceById(question, choiceId).label;
    };

    const requireComplete = (state) => {
        if (!isComplete(state)) {
            throw new Error('Commercial qualifier is incomplete. Answer all four questions first.');
        }
    };

    const buildSummary = (state) => {
        requireComplete(state);
        const labels = {
            property: 'Property',
            goal: 'Goal',
            scope: 'Scope',
            timing: 'Timing'
        };
        return QUESTIONS.map((question) => `${labels[question.id]}: ${answerLabel(state, question)}`).join('\n');
    };

    const clean = (value) => String(value || '').trim().replace(/\s+/g, ' ');

    const buildTextMessage = (state, contact = {}) => {
        requireComplete(state);
        const name = clean(contact.name);
        const phone = clean(contact.phone);
        const city = clean(contact.property_city);
        const notes = clean(contact.additional_notes);
        const reference = clean(contact.reference_code);
        return [
            `Hi Obsidian Autoworks, this is ${name || 'a commercial property customer'}. I would like a commercial window film site review.`,
            buildSummary(state),
            `Property city: ${city}`,
            `Best callback number: ${phone}`,
            notes ? `Additional notes: ${notes}` : '',
            reference ? `Reference: ${reference}` : '',
            'I can send photos and rough measurements:'
        ].filter(Boolean).join('\n');
    };

    return Object.freeze({
        QUESTIONS,
        selectAnswer,
        isComplete,
        buildSummary,
        buildTextMessage
    });
}));
