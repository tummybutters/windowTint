async (page) => {
    const origin = await page.evaluate(() => window.location.origin);
    const baseUrl = `${origin}/vip-booking?gclid=test-gclid-20260721&utm_source=google&utm_medium=cpc&utm_campaign=mobile-tint-test&campaignid=23899221542&adgroupid=12345&keyword=auto%20window%20tinting%20near%20me&device=m`;
    const cases = [
        { name: 'coupe full', actions: ['coupe', 'full', 'none'], expected: 'Coupe Vehicles - Full Car' },
        { name: 'sedan full with sunstrip', actions: ['sedan', 'full', 'sunstrip'], finish: true, expected: 'Sedan Vehicles - Full Car' },
        { name: 'truck full with review add-ons', actions: ['truck', 'full', 'removal', 'priority'], finish: true, expected: 'Trucks, SUVs & Crossovers - Full Car' },
        { name: 'coupe sides with roof add-on', actions: ['coupe', 'sides', 'roof'], finish: true, expected: 'Coupe Vehicles - Sides & Rear' },
        { name: 'sedan sides', actions: ['sedan', 'sides', 'none'], expected: 'Sedan Vehicles - Sides & Rear' },
        { name: 'truck sides', actions: ['truck', 'sides', 'none'], expected: 'Trucks, SUVs & Crossovers - Side & Rear' },
        { name: 'coupe front windows', actions: ['coupe', 'front', 'none'], expected: 'Front 2 Windows - Sedan and Coupe Vehicles' },
        { name: 'truck front windows', actions: ['truck', 'front', 'none'], expected: 'Front 2 Windows - Trucks, SUVs & Crossovers' },
        { name: 'sedan windshield', actions: ['sedan', 'windshield', 'none'], expected: 'Windshield Only - Sedan & Coupe Vehicles' },
        { name: 'truck windshield', actions: ['truck', 'windshield', 'none'], expected: 'Windshield Only - Trucks, SUVs & Crossovers' },
        { name: 'single window', actions: ['sedan', 'single', 'none'], expected: 'Single Window Service' },
        { name: 'panoramic roof', actions: ['sedan', 'roof'], expected: 'Panoramic Roof Coverage' },
        { name: 'tesla model 3 full', actions: ['tesla', '3', 'full', 'none'], expected: 'Tesla Model 3 - Full Car' },
        { name: 'tesla model 3 sides', actions: ['tesla', '3', 'sides', 'none'], expected: 'Tesla Model 3 - Sides & Rear' },
        { name: 'tesla model s full', actions: ['tesla', 's', 'full', 'none'], expected: 'Tesla Model S - Full Car' },
        { name: 'tesla model s sides', actions: ['tesla', 's', 'sides', 'none'], expected: 'Tesla Model S - Sides & Rear' },
        { name: 'tesla model s roof', actions: ['tesla', 's', 'roof'], expected: 'Tesla Model S - Panoramic Roof Add-On' },
        { name: 'tesla model y full', actions: ['tesla', 'y', 'full', 'none'], expected: 'Tesla Model Y - Full Car' },
        { name: 'tesla model y sides', actions: ['tesla', 'y', 'sides', 'none'], expected: 'Tesla Model Y - Sides & Rear' },
        { name: 'tesla model y roof', actions: ['tesla', 'y', 'roof'], expected: 'Tesla Model Y - Panoramic Roof Add-On' },
        { name: 'tesla custom', actions: ['tesla', '3', 'custom'], expected: 'Custom Auto Tint Setup' },
        { name: 'architectural', actions: ['architectural'], expected: 'Architectural Film Consultation' },
        { name: 'custom', actions: ['custom'], expected: 'Custom Auto Tint Setup' }
    ];
    const results = [];

    await page.route('**/api/lead-events', (route) => route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: '{"ok":true}'
    }));
    await page.route(/https:\/\/(?:www\.)?google-analytics\.com\/.*/, (route) => route.abort());
    await page.route(/https:\/\/www\.googletagmanager\.com\/.*/, (route) => route.abort());
    await page.route(/https:\/\/stats\.g\.doubleclick\.net\/.*/, (route) => route.abort());

    await page.addInitScript(() => {
        const originalMatchMedia = window.matchMedia.bind(window);
        window.matchMedia = (query) => query === '(prefers-reduced-motion: reduce)'
            ? {
                matches: true,
                media: query,
                onchange: null,
                addListener() {},
                removeListener() {},
                addEventListener() {},
                removeEventListener() {},
                dispatchEvent() { return true; }
            }
            : originalMatchMedia(query);
    });
    await page.evaluate(() => localStorage.clear());

    for (const scenario of cases) {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            window.obsidianLeadTracking.clearEventLog();
            document.addEventListener('click', (event) => {
                if (event.target.closest('a[href^="tel:"], a[href^="sms:"]')) event.preventDefault();
            }, true);
        });

        for (const value of scenario.actions) {
            await page.locator('.booking-router__options.is-ready').waitFor({ state: 'visible' });
            await page.locator(`.booking-router__option[data-value="${value}"]`).click();
            await page.waitForTimeout(190);
        }
        if (scenario.finish) {
            await page.locator('[data-router-finish]').click();
        }

        const summary = page.locator('.booking-router__summary-title');
        await summary.waitFor({ state: 'visible' });
        const title = (await summary.textContent()).trim();
        const callHref = await page.locator('[data-router-call]').getAttribute('href');
        const textHref = await page.locator('[data-router-text]').getAttribute('href');
        const squareLinks = await page.locator('a[href*="square"], iframe[src*="square"]').count();

        if (title !== scenario.expected) throw new Error(`${scenario.name}: expected ${scenario.expected}, got ${title}`);
        if (callHref !== 'tel:7146007134') throw new Error(`${scenario.name}: invalid call target ${callHref}`);
        if (!textHref || !textHref.startsWith('sms:+17146007134?body=')) throw new Error(`${scenario.name}: invalid text target ${textHref}`);
        if (squareLinks !== 0) throw new Error(`${scenario.name}: stale Square target found`);

        await page.locator('[data-router-call]').click();
        await page.locator('[data-router-text]').click();
        const eventState = await page.evaluate(() => ({
            lead: window.obsidianLeadTracking.getLead(),
            events: window.obsidianLeadTracking.getEventLog()
        }));
        const names = eventState.events.map((event) => event.event_name);
        for (const required of ['vip_quiz_recommendation', 'vip_quiz_call_click', 'phone_click', 'vip_quiz_text_click', 'text_click']) {
            if (!names.includes(required)) throw new Error(`${scenario.name}: missing ${required}`);
        }
        if (eventState.lead.gclid !== 'test-gclid-20260721') throw new Error(`${scenario.name}: gclid was not preserved`);
        if (eventState.lead.campaignid !== '23899221542') throw new Error(`${scenario.name}: campaignid was not preserved`);
        if (!eventState.lead.session_id) throw new Error(`${scenario.name}: session id missing`);
        if (eventState.events.some((event) => !event.event_id || !event.event_time)) throw new Error(`${scenario.name}: event identity or timestamp missing`);

        results.push({ name: scenario.name, title, eventCount: eventState.events.length });
    }

    return { passed: results.length, results };
}
