import { writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

const cities = [
  {
    city: 'Irvine',
    slug: 'irvine',
    meta: 'Mobile ceramic coating in Irvine with paint preparation, correction options, and direct call or text quoting from Obsidian Autoworks.',
    localMarker: 'business parks and residential garages',
    localHeading: 'Coating Service Built Around Irvine',
    localBody: 'From business parks and residential garages to suitable covered driveways, we qualify the workspace before the appointment so preparation, application, and curing are protected.',
    exposureHeading: 'Daily Miles Should Not Dull the Finish',
    exposureBody: 'Irvine commuting, outdoor parking, heat, and routine washing all leave their mark. Proper correction and coating create a richer surface that is easier to maintain.',
    faqOne: 'Can you coat my vehicle at an Irvine office?',
    faqOneAnswer: 'Potentially. We confirm property permission, working room, shade or enclosure, water and power access, and enough uninterrupted time for the selected service.',
    faqTwo: 'What should I send for an Irvine quote?',
    faqTwoAnswer: 'Text the year, make, model, Irvine neighborhood or cross-streets, clear paint photos, and whether the workspace is a garage, covered driveway, or workplace.',
    finalHeading: 'Bring Out the Finish Irvine Roads Have Been Hiding.'
  },
  {
    city: 'Lake Forest',
    slug: 'lake-forest',
    meta: 'Mobile ceramic coating in Lake Forest with paint correction, garage-ready service qualification, and direct photo quoting from Obsidian Autoworks.',
    localMarker: 'garage and covered-driveway setups',
    localHeading: 'A Mobile Setup That Respects the Process',
    localBody: 'Lake Forest garage and covered-driveway setups can be excellent coating environments when access, light, water, power, airflow, and cure time are confirmed first.',
    exposureHeading: 'Protection for Sun, Dust, and Daily Use',
    exposureBody: 'Warm days, road dust, tree debris, and regular commuting can make paint feel tired. Ceramic protection helps a properly prepared finish stay cleaner and easier to care for.',
    faqOne: 'Can you work in my Lake Forest garage?',
    faqOneAnswer: 'Often, yes. We confirm working clearance, lighting, ventilation, water and power access, and whether the vehicle can remain protected through the required cure window.',
    faqTwo: 'Does a newer Lake Forest vehicle need correction?',
    faqTwoAnswer: 'Not automatically. We use photos and an in-person paint check to recommend only the preparation or correction the finish actually needs.',
    finalHeading: 'Give Your Lake Forest Vehicle a Finish That Holds Up.'
  },
  {
    city: 'Aliso Viejo',
    slug: 'aliso-viejo',
    meta: 'Mobile ceramic coating in Aliso Viejo for deeper gloss, easier upkeep, and paint correction matched to your vehicle by Obsidian Autoworks.',
    localMarker: 'hillside sun and inland dust',
    localHeading: 'Paint Protection for Aliso Viejo Conditions',
    localBody: 'Hillside sun and inland dust can make an unprotected finish look flatter between washes. We pair the coating with the preparation needed to preserve depth and reflection.',
    exposureHeading: 'A Better Surface for South OC Driving',
    exposureBody: 'The goal is not a temporary shine. It is a corrected, protected surface that releases dirt more easily and keeps its visual depth through routine use.',
    faqOne: 'Can ceramic coating help with Aliso Viejo sun exposure?',
    faqOneAnswer: 'It adds durable protection and makes maintenance easier, but it does not replace responsible washing, covered parking when available, or proper paint care.',
    faqTwo: 'Where can mobile coating be completed in Aliso Viejo?',
    faqTwoAnswer: 'A suitable garage or protected workspace is preferred. We confirm property access, room, utilities, weather protection, and cure conditions before scheduling.',
    finalHeading: 'Keep the Finish as Refined as the Drive.'
  },
  {
    city: 'Newport Beach',
    slug: 'newport-beach',
    meta: 'Mobile ceramic coating in Newport Beach with coastal paint-protection planning, correction options, and direct photo quoting from Obsidian Autoworks.',
    localMarker: 'coastal air and salt residue',
    localHeading: 'Protection Planned for the Coast',
    localBody: 'Coastal air and salt residue can settle on paint even when the vehicle is not driven far. Proper decontamination and a disciplined maintenance plan matter as much as the coating itself.',
    exposureHeading: 'Preserve the Finish in Harsh Light',
    exposureBody: 'Newport sun reveals haze, swirls, and inconsistent correction quickly. We scope the paint work first so the coating protects a finish worth seeing in direct light.',
    faqOne: 'Does coating stop coastal salt from reaching the paint?',
    faqOneAnswer: 'It creates a durable sacrificial layer and makes residue easier to remove, but regular, paint-safe washing is still essential near the coast.',
    faqTwo: 'Can you coat a vehicle at a Newport Beach residence?',
    faqTwoAnswer: 'Yes when the property provides permission, working clearance, utilities, protection from wind and direct sun, and a controlled cure environment.',
    finalHeading: 'A Newport Finish That Looks Right in Full Sun.'
  },
  {
    city: 'Costa Mesa',
    slug: 'costa-mesa',
    meta: 'Mobile ceramic coating in Costa Mesa with paint enhancement, correction options, and direct call or text consultations from Obsidian Autoworks.',
    localMarker: 'daily freeway driving and open-air parking',
    localHeading: 'Built for Costa Mesa Daily Driving',
    localBody: 'Daily freeway driving and open-air parking bring road film, sun, dust, and frequent washing. We prepare the surface around that reality before adding long-term protection.',
    exposureHeading: 'Gloss Is Earned Before the Coating',
    exposureBody: 'Correction removes eligible defects and restores clarity; coating preserves that work. The order matters when the goal is a finish with real depth.',
    faqOne: 'Can you coat my car at a Costa Mesa workplace?',
    faqOneAnswer: 'Potentially. We verify property approval, safe working room, water and power, shade or enclosure, and enough time for the service and initial cure.',
    faqTwo: 'Will coating make freeway grime easier to remove?',
    faqTwoAnswer: 'A properly maintained coating reduces how strongly contamination bonds, making routine cleaning more manageable without eliminating the need for safe washing.',
    finalHeading: 'Turn Everyday Costa Mesa Miles Into a Better Finish.'
  },
  {
    city: 'Tustin',
    slug: 'tustin',
    meta: 'Mobile ceramic coating in Tustin with paint preparation, correction matched to your finish, and call-first quoting from Obsidian Autoworks.',
    localMarker: 'garage, driveway, or suitable workplace',
    localHeading: 'Mobile Coating That Starts With the Workspace',
    localBody: 'A garage, driveway, or suitable workplace can support professional coating when there is enough room, protection from the elements, utility access, and uninterrupted cure time.',
    exposureHeading: 'Make the Finish Easier to Live With',
    exposureBody: 'Tustin commuting and outdoor exposure create constant maintenance. A well-prepared coating helps the vehicle clean up faster while preserving a deeper visual finish.',
    faqOne: 'What makes a Tustin location suitable for mobile coating?',
    faqOneAnswer: 'We look for safe working clearance, reliable shade or enclosure, water and power access, property permission, and protection during the initial cure period.',
    faqTwo: 'Can I get a Tustin quote by text?',
    faqTwoAnswer: 'Yes. Send the vehicle details, location, workspace photos, paint photos in direct light, and whether your priority is gloss, protection, or defect improvement.',
    finalHeading: 'Professional Paint Protection, Wherever Tustin Works for You.'
  },
  {
    city: 'Mission Viejo',
    slug: 'mission-viejo',
    meta: 'Mobile ceramic coating in Mission Viejo for deeper gloss, paint correction, and easier upkeep with direct vehicle-photo quoting from Obsidian Autoworks.',
    localMarker: 'sun exposure and hillside dust',
    localHeading: 'Protection for Mission Viejo Exposure',
    localBody: 'Sun exposure and hillside dust can mute the finish and increase wash frequency. We focus first on paint clarity, then protect it with the right coating duration.',
    exposureHeading: 'Long-Term Gloss Starts Underneath',
    exposureBody: 'A coating cannot hide swirls or water spots. Paint enhancement or correction gives the protected surface the depth and consistency people actually notice.',
    faqOne: 'Can coating help with Mission Viejo water spotting?',
    faqOneAnswer: 'It can make maintenance easier, but mineral deposits still need prompt, safe removal. Existing etching may require correction before the coating is installed.',
    faqTwo: 'Can you work in a Mission Viejo driveway?',
    faqTwoAnswer: 'Yes when the driveway has adequate room, shade or suitable cover, utility access, property approval, and protection from weather during application and cure.',
    finalHeading: 'Give Mission Viejo Sun a Better Surface to Meet.'
  },
  {
    city: 'Laguna Hills',
    slug: 'laguna-hills',
    meta: 'Mobile ceramic coating in Laguna Hills with paint correction options, long-term gloss, and direct call or text quoting from Obsidian Autoworks.',
    localMarker: 'warm inland sun and regular road dust',
    localHeading: 'A Better Finish for Laguna Hills Driving',
    localBody: 'Warm inland sun and regular road dust can leave paint looking dry and difficult to maintain. Proper preparation and ceramic protection create a smoother, richer surface.',
    exposureHeading: 'Protection Should Improve Ownership',
    exposureBody: 'The best result is not only gloss on installation day. It is a finish that stays easier to wash and feels more composed through normal South OC use.',
    faqOne: 'Is my Laguna Hills garage suitable for coating?',
    faqOneAnswer: 'Most garages work well when there is enough clearance, clean lighting, ventilation, water and power access, and room for the vehicle to remain protected while curing.',
    faqTwo: 'How do you price Laguna Hills ceramic coating?',
    faqTwoAnswer: 'Vehicle size, paint condition, correction needs, coating duration, and workspace all affect scope. Texting photos is the fastest way to begin.',
    finalHeading: 'Keep the Laguna Hills Finish Clean, Deep, and Protected.'
  }
];

const photoCards = (city, localMarker) => `
                <figure class="paid-hero-strip__item"><img src="/assets/ceramic-coating/foam-sedan.webp" alt="Sedan receiving preparation before mobile ceramic coating in ${city}" width="1012" height="1800" fetchpriority="high"><figcaption><p>Professional preparation for ${localMarker}.</p><span class="paid-hero-strip__reviewer">${city} mobile service</span></figcaption></figure>
                <figure class="paid-hero-strip__item"><img src="/assets/ceramic-coating/white-mclaren.webp" alt="White performance car showing a reflective protected finish" width="1012" height="1800" fetchpriority="high"><figcaption><p>Deep gloss, clean reflections, and protection built around the car.</p><span class="paid-hero-strip__reviewer">Finish standard</span></figcaption></figure>
                <figure class="paid-hero-strip__item"><img src="/assets/ceramic-coating/paint-detail.webp" alt="Detailed paint showing clarity after professional preparation" width="1012" height="1800" fetchpriority="high"><figcaption><p>Paint condition sets the correction plan before coating begins.</p><span class="paid-hero-strip__reviewer">Paint-specific scope</span></figcaption></figure>
                <figure class="paid-hero-strip__item"><img src="/assets/ceramic-coating/foam-bmw.webp" alt="BMW undergoing decontamination before ceramic coating" width="1012" height="1800" loading="lazy"><figcaption><p>Preparation gives long-term protection a cleaner foundation.</p><span class="paid-hero-strip__reviewer">Obsidian process</span></figcaption></figure>
                <figure class="paid-hero-strip__item"><img src="/assets/ceramic-coating/finished-vw.webp" alt="Finished vehicle paint showing a reflective ceramic-coated surface" width="1012" height="1800" loading="lazy"><figcaption><p>A richer surface designed to stay easier to care for.</p><span class="paid-hero-strip__reviewer">Protected result</span></figcaption></figure>
                <figure class="paid-hero-strip__item"><img src="/gallery/optimized/vip-cadillac-lyriq-01.webp" alt="Cadillac Lyriq after professional vehicle care" width="760" height="702" loading="lazy"><figcaption><p>Vehicle, paint, workspace, and expectations shape the final plan.</p><span class="paid-hero-strip__reviewer">Vehicle-specific plan</span></figcaption></figure>
                <figure class="paid-hero-strip__item"><img src="/gallery/optimized/vip-bmw-m4-01.webp" alt="BMW M4 after professional vehicle care" width="760" height="810" loading="lazy"><figcaption><p>Send paint and workspace photos for a direct recommendation.</p><span class="paid-hero-strip__reviewer">Direct consultation</span></figcaption></figure>`;

const render = (data) => {
  const action = `coating_${data.slug.replaceAll('-', '_')}`;
  const route = `ceramic-coating-${data.slug}`;
  const textBody = encodeURIComponent(`Hi Obsidian Autoworks, I'd like ceramic coating in ${data.city}. My vehicle, ${data.city} location, paint condition, workspace, and protection goal are: `);

  return `<!DOCTYPE html>
<html lang="en" data-lead-service="ceramic_coating" data-lead-variant="${action}_v1">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mobile Ceramic Coating ${data.city} | Obsidian Autoworks</title>
    <meta name="description" content="${data.meta}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://www.obsidianautoworksoc.com/${route}">
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/style.css?v=20260108-1">
    <link rel="stylesheet" href="/paid-landing.css?v=20260731-city1">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-TR9ET60HX3"></script>
    <script>
        window.OBSIDIAN_GOOGLE_ADS_CONFIG = { id: 'AW-18301955625', websiteCallConfigId: 'AW-18301955625/1asCCLrhh9wcEKnchpdE', conversions: { phone_click: 'BU5VCLCasNkcEKnchpdE', text_click: 'qbmnCLOasNkcEKnchpdE' } };
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-TR9ET60HX3');
        gtag('config', 'AW-18301955625');
    </script>
</head>
<body class="paid-page">
    <nav class="paid-nav" aria-label="Primary navigation"><div class="paid-shell paid-nav__inner"><a class="paid-brand" href="/"><img class="paid-brand__mark" src="/car-hero.webp" alt="" width="500" height="200">OBSIDIAN<span>AUTOWORKS</span></a><div class="paid-nav__actions"><a class="paid-link" href="#service">${data.city} mobile service</a><a class="paid-button paid-button--ghost" href="tel:7146007134">Call (714) 600-7134</a></div></div></nav>
    <main>
        <header class="paid-hero paid-hero--vip"><div class="paid-shell paid-hero__content paid-hero__content--centered">
            <p class="paid-eyebrow">Mobile ceramic coating in ${data.city}</p>
            <h1>Ceramic Coating <span>in ${data.city}</span></h1>
            <p class="paid-hero__copy">We prep, correct, and protect your paint at a suitable ${data.city} location.</p>
            <div class="paid-hero__actions"><a data-hero-primary data-lead-action="${action}_call" class="paid-button paid-button--primary" href="tel:7146007134">Call for ${data.city} service</a><a data-hero-secondary data-lead-action="${action}_text" class="paid-button paid-button--ghost" href="sms:+17146007134?body=${textBody}">Text vehicle photos</a><a data-hero-tertiary class="paid-button paid-button--ghost" href="#service">See local service</a></div>
        </div></header>
        <section class="paid-hero-strip" aria-label="${data.city} ceramic coating results"><div class="paid-hero-strip__grid">${photoCards(data.city, data.localMarker)}
            </div></section>
        <section class="paid-proof" aria-label="${data.city} ceramic coating service"><div class="paid-shell paid-proof__grid"><div class="paid-proof__item"><strong>${data.city} mobile service</strong><span>Qualified home and workplace options across the city.</span></div><div class="paid-proof__item"><strong>Paint assessed first</strong><span>Correction is matched to the finish, never added by default.</span></div><div class="paid-proof__item"><strong>Call or text directly</strong><span>Discuss the vehicle before scheduling the work.</span></div></div></section>
        <section class="paid-band paid-band--paper" id="service"><div class="paid-shell"><div class="paid-section-heading"><span>Local service, professional conditions</span><h2>${data.localHeading}</h2><p>${data.localBody}</p></div><div class="paid-packages"><article class="paid-package"><h3>Vehicle access</h3><p>Enough room to work safely around every included panel.</p><div class="paid-package__price"><small>Confirm</small>Space</div></article><article class="paid-package"><h3>Protected conditions</h3><p>A garage or suitable covered area protects preparation, application, and cure.</p><div class="paid-package__price"><small>Confirm</small>Cover</div></article><article class="paid-package"><h3>Water and power</h3><p>Practical site access is confirmed around the agreed service scope.</p><div class="paid-package__price"><small>Confirm</small>Access</div></article></div></div></section>
        <section class="paid-band paid-band--ink"><div class="paid-shell"><div class="paid-section-heading"><span>Local exposure, better protected</span><h2>${data.exposureHeading}</h2><p>${data.exposureBody}</p></div><div class="paid-photo-grid"><figure class="paid-photo"><img src="/assets/ceramic-coating/foam-sedan.webp" alt="Vehicle preparation before ceramic coating in ${data.city}" width="1012" height="1800"><figcaption>Preparation before protection</figcaption></figure><figure class="paid-photo"><img src="/assets/ceramic-coating/paint-detail.webp" alt="Paint clarity after professional correction and coating" width="1012" height="1800"><figcaption>Clarity built into the finish</figcaption></figure></div></div></section>
        <section class="paid-band paid-band--silver"><div class="paid-shell"><div class="paid-section-heading"><span>Fast qualification</span><h2>Text the Car, Paint, and Workspace</h2></div><div class="paid-steps"><article class="paid-step"><div><h3>Your vehicle</h3><p>Year, make, model, color, mileage, and current condition.</p></div></article><article class="paid-step"><div><h3>Your ${data.city} location</h3><p>Neighborhood or cross-streets plus garage, covered driveway, or workplace details.</p></div></article><article class="paid-step"><div><h3>Paint photos</h3><p>Direct-light images showing swirls, scratches, water spots, and problem panels.</p></div></article><article class="paid-step"><div><h3>Your finish goal</h3><p>Choose practical protection, stronger gloss, easier maintenance, or visible correction.</p></div></article></div></div></section>
        <section class="paid-band paid-band--paper"><div class="paid-shell"><div class="paid-section-heading"><span>${data.city} ceramic coating FAQ</span><h2>Know the Plan Before We Arrive</h2></div><div class="paid-faq"><details><summary>${data.faqOne}</summary><p>${data.faqOneAnswer}</p></details><details><summary>${data.faqTwo}</summary><p>${data.faqTwoAnswer}</p></details><details><summary>How much does ceramic coating cost?</summary><p>Pricing depends on vehicle size, paint condition, correction scope, coating duration, and workspace. Call or text photos for a direct recommendation.</p></details></div></div></section>
        <section class="paid-cta"><div class="paid-shell paid-cta__inner"><div><h2>${data.finalHeading}</h2><p>Call now or text the vehicle, ${data.city} location, paint condition, and protection goal.</p></div><div class="paid-cta__actions"><a data-cta-primary data-lead-action="${action}_call" class="paid-button paid-button--primary" href="tel:7146007134">Call for ${data.city} coating</a><a data-cta-secondary data-lead-action="${action}_text" class="paid-button paid-button--ghost" href="sms:+17146007134?body=${textBody}">Text photos &amp; location</a></div></div></section>
    </main>
    <footer class="paid-footer"><div class="paid-shell paid-footer__inner"><span>Obsidian Autoworks</span><span>Mobile ceramic coating in ${data.city}, California</span></div></footer>
    <div class="paid-mobile-actions" aria-label="Contact Obsidian Autoworks"><a data-lead-action="${action}_call" href="tel:7146007134">Call</a><a data-lead-action="${action}_text" href="sms:+17146007134?body=${textBody}">Text</a></div>
    <script src="/lead-tracking.js" defer></script>
</body>
</html>
`;
};

for (const city of cities) {
  await writeFile(new URL(`ceramic-coating-${city.slug}`, root), render(city));
}

console.log(`generated ${cities.length} ceramic coating city pages`);
