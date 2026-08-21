import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const controlPath = resolve(projectRoot, 'commercial-window-film-socal');

const CONTROL = Object.freeze({
  htmlTag: '<html lang="en" data-lead-service="commercial_window_film" data-lead-variant="commercial_socal_v1">',
  title: '<title>Commercial Window Film Southern California | Obsidian Autoworks</title>',
  description: `<meta name="description"
        content="Commercial window film site reviews for Orange County and Southern California offices, storefronts, hospitality, healthcare, and shared spaces. Call or text Obsidian Autoworks.">`,
  heroOverline: '<p class="commercial-overline">Orange County commercial glass</p>',
  heroHeading: '<h1>Commercial Window Film Installation <span>in Orange County</span></h1>',
  heroBody: `                    <p>Plan for heat and glare, privacy, glass-retention goals, or sun-exposed interiors. We review the
                        building, glass, access, and project goal before recommending a film system.</p>`,
  heroNote: `                    <p class="commercial-paid-hero__note">Offices, storefronts, interior glass, hospitality,
                        healthcare, and commercial properties throughout Orange County.</p>`,
  galleryAlts: [
    'Solar-control window film on office glazing from an Obsidian Autoworks project',
    'Storefront glass with a neutral commercial window-film appearance',
    'Professional installation of commercial window film on office glass'
  ],
  solutionHeading: `                    <div><p class="commercial-overline">Commercial film solutions</p><h2>One glass surface can have several jobs.</h2></div>
                    <p>The starting point is the business need—not a preselected film. Existing glazing, sightlines,
                        sun exposure, and access all shape the project conversation.</p>`,
  solutionCards: `                    <article id="solar-glare"><span>Solar / glare</span><h3>Work with the sun-facing glass.</h3><p>Review film options intended to manage solar load and glare in occupied or display-facing areas.</p></article>
                    <article><span>Privacy / design</span><h3>Control views and define space.</h3><p>Consider frosted, patterned, or visibility-control film for exterior and interior glass.</p></article>
                    <article id="safety-security"><span>Safety / security</span><h3>Start with the system intent.</h3><p>Discuss the glass, attachment approach, access, and intended retention goal before choosing a direction.</p></article>
                    <article><span>UV / fade</span><h3>Review what is exposed.</h3><p>Map sunlight around furnishings, finishes, products, and work areas without promising elimination of fading.</p></article>`,
  processHeading: '<div class="commercial-heading"><p class="commercial-overline">Commercial project process</p><h2>Details first. Scope second.</h2></div>',
  processSteps: `                    <li><span>01</span><div><h3>Describe the property</h3><p>Share the city, property type, affected areas, and the main problem the film should address.</p></div></li>
                    <li><span>02</span><div><h3>Send what you have</h3><p>Photos and rough measurements help frame the conversation. Unknown details can be identified during review.</p></div></li>
                    <li><span>03</span><div><h3>Review glass + access</h3><p>The glass, coatings, access, viewing angles, and operating environment inform the film direction.</p></div></li>
                    <li><span>04</span><div><h3>Define the next step</h3><p>We identify what can move toward an estimate and what needs more site information.</p></div></li>`,
  imageAlt: 'Commercial conference room glass with frosted privacy film bands',
  imageOverline: '<p class="commercial-overline">Privacy + decorative film</p>',
  imageHeading: '<h2>Shape sightlines without making the space feel closed.</h2>',
  imageBody: `                    <p>Meeting rooms, office partitions, storefronts, entries, and customer-facing glass may each
                        require a different balance of privacy, light, and appearance. A site review helps identify the
                        right questions before film is selected.</p>`,
  imageLinkText: 'Text privacy or\n                        decorative details &rarr;',
  siteReviewOverline: '<p class="commercial-overline">Commercial consultation / site review</p>',
  siteReviewHeading: '<h2>Tell us enough to plan the first conversation.</h2>',
  siteReviewBody: `                <p>Answer four quick project questions. Your contact details come last, then we save the complete brief
                    and open a prepared text for you to send.</p>`,
  finalCopy: '<div><p class="commercial-overline">Start with the site</p><h2>Bring the building into the first conversation.</h2><p>Property city, photos, rough measurements, and the primary goal give us a practical place to start.</p></div>'
});

const variants = Object.freeze([
  {
    route: 'commercial-window-tinting-orange-county',
    variant: 'commercial_tint_oc_v1',
    title: 'Commercial Window Tinting Orange County | Obsidian',
    description: 'Commercial window tinting for Orange County offices, storefronts, and building glass. Request a site review for heat, glare, privacy, UV, or safety goals.',
    hero: {
      overline: 'Orange County commercial tinting',
      heading: 'Commercial Window Tinting <span>in Orange County</span>',
      body: 'For offices, storefronts, and building glass, start with the problem the film needs to solve. We review sun exposure, glass, access, sightlines, and project goals before recommending a direction.',
      note: 'Commercial tinting for offices, storefronts, and building glass throughout Orange County.',
      galleryAlts: [
        'Commercial window tinting on office glazing from an Obsidian Autoworks project',
        'Orange County storefront glass with a neutral commercial window-tint appearance',
        'Professional installation of commercial window tint on office glass'
      ]
    },
    solutions: {
      overline: 'Commercial window tinting',
      heading: 'Commercial window tinting starts with the glass you have.',
      body: 'The glass, sun exposure, sightlines, access, and the problem you need to solve all shape the right project conversation.',
      cards: [
        { id: 'solar-glare', label: 'Heat / glare', heading: 'Start with the sun-facing glass.', body: 'Review the rooms, elevations, and display-facing areas affected by heat or glare.' },
        { label: 'Privacy / appearance', heading: 'Set the right level of visibility.', body: 'Discuss privacy, finish, and appearance for exterior or interior commercial glass.' },
        { label: 'UV / fade', heading: 'Map what stays in the sun.', body: 'Identify furnishings, products, finishes, and work areas exposed to direct light.' },
        { id: 'safety-security', label: 'Safety / security', heading: 'Clarify the protection goal.', body: 'Start with the glass, frame, access, and intended safety or security direction.' }
      ]
    },
    process: {
      heading: 'Review the glass before defining scope.',
      steps: [
        ['Describe the property', 'Share the city, property type, affected glass, and the primary reason for commercial tinting.'],
        ['Send photos or measurements', 'Photos and rough measurements help us understand the glass and access before a site review.'],
        ['Review exposure + sightlines', 'Sun, glazing, viewing angles, and daily use help narrow the right film direction.'],
        ['Define the next step', 'We identify what can move toward an estimate and what needs more site information.']
      ]
    },
    image: {
      alt: 'Commercial office glass with a privacy-film finish',
      overline: 'Privacy + appearance',
      heading: 'Use film to address both view and appearance.',
      body: 'Commercial window tinting can involve exterior glass, interior glass, or both. A site review helps separate the privacy, daylight, appearance, and operational questions before a film direction is selected.',
      linkText: 'Text commercial tinting details &rarr;'
    },
    siteReview: {
      overline: 'Commercial tinting site review',
      heading: 'Tell us what the glass needs to solve.',
      body: 'Answer four quick project questions. Your contact details come last, then we save the complete brief and open a prepared text for you to send.'
    },
    final: {
      overline: 'Start with the glass',
      heading: 'Bring the affected glass into the first conversation.',
      body: 'Property city, photos, rough measurements, and the primary issue give us a practical place to start.'
    },
    sms: "Hi Obsidian Autoworks, I'd like a commercial window tinting site review in Orange County.\nProperty city:\nProperty type:\nPrimary issue (heat, glare, privacy, UV, safety):\nPhotos / rough measurements:"
  },
  {
    route: 'office-privacy-window-film',
    variant: 'office_privacy_frost_v1',
    title: 'Office Privacy Window Film Orange County | Obsidian',
    description: 'Office privacy and frosted window film for Orange County conference rooms, partitions, entries, and glass walls. Request a site review tailored to your space.',
    hero: {
      overline: 'Office privacy / frosted glass',
      heading: 'Office Privacy Window Film <span>in Orange County</span>',
      body: 'Privacy film can define rooms, soften direct sightlines, and preserve a more open feel. We review the glass, viewing angles, daylight, finish, and access before selecting a film direction.',
      note: 'Conference rooms, partitions, entries, and glass walls throughout Orange County.',
      galleryAlts: [
        'Office privacy window film on glass from an Obsidian Autoworks project',
        'Commercial office entry glass with a neutral privacy-film appearance',
        'Professional installation of privacy window film on office glass'
      ]
    },
    solutions: {
      overline: 'Office privacy window film',
      heading: 'Privacy can be clear in intent without closing off the room.',
      body: 'Conference rooms, partitions, entries, and glass walls each need their own review of views, daylight, finish, and daily use.',
      cards: [
        { label: 'Conference rooms', heading: 'Keep meetings more private.', body: 'Review direct sightlines, room use, and the amount of privacy the space actually needs.' },
        { label: 'Interior partitions', heading: 'Define glass without closing it off.', body: 'Consider frosted or patterned directions that preserve a more open feeling.' },
        { label: 'Entry glass', heading: 'Balance arrival, visibility, and privacy.', body: 'Review customer-facing entries, internal access, and how the glass is used every day.' },
        { label: 'Daylight / sightlines', heading: 'Review every view before selecting a finish.', body: 'Light, viewing angles, and adjacent spaces help determine the appropriate privacy direction.' }
      ]
    },
    process: {
      heading: 'Review every view before selecting a finish.',
      steps: [
        ['Describe the glass area', 'Share the city and whether the glass is a conference room, entry, partition, or exterior opening.'],
        ['Show the sightlines', 'Photos help us understand where privacy is needed and who sees the glass from each side.'],
        ['Review light + finish', 'Daylight, finish preference, glass condition, and access all inform the film direction.'],
        ['Define the next step', 'We identify what can move toward an estimate and what needs a closer site review.']
      ]
    },
    image: {
      alt: 'Office glass partition with a frosted privacy-film finish',
      overline: 'Privacy / frosted glass',
      heading: 'Make the privacy decision room by room.',
      body: 'A conference room, entry, interior partition, and glass wall can each call for a different approach. A site review helps identify the views that matter before a finish is selected.',
      linkText: 'Text office privacy details &rarr;'
    },
    siteReview: {
      overline: 'Office privacy site review',
      heading: 'Tell us where privacy is needed.',
      body: 'Answer four quick project questions. Your contact details come last, then we save the complete brief and open a prepared text for you to send.'
    },
    final: {
      overline: 'Start with the view',
      heading: 'Bring the room and sightlines into the first conversation.',
      body: 'Property city, photos, rough measurements, and the privacy goal give us a practical place to start.'
    },
    sms: "Hi Obsidian Autoworks, I'd like office privacy or frosted window film.\nProperty city:\nGlass area (conference room, entry, partition, exterior):\nPrivacy goal:\nPhotos / rough measurements:"
  },
  {
    route: 'commercial-heat-glare-window-film',
    variant: 'commercial_solar_glare_v1',
    title: 'Commercial Heat & Glare Film Orange County | Obsidian',
    description: 'Commercial heat and glare window film for Orange County offices and storefronts. Review sun-exposed glass, comfort, screen glare, and fade concerns.',
    hero: {
      overline: 'Solar control for commercial glass',
      heading: 'Commercial Heat &amp; Glare Window Film <span>in Orange County</span>',
      body: 'When sun-facing glass makes rooms uncomfortable or screens hard to use, the right starting point is the affected elevation. We review exposure, glazing, use of the space, and desired appearance before discussing film options.',
      note: 'Sun-facing office and storefront glass throughout Orange County.',
      galleryAlts: [
        'Commercial heat and glare film on office glazing from an Obsidian Autoworks project',
        'Sun-facing storefront glass with a neutral commercial film appearance',
        'Professional installation of solar-control window film on office glass'
      ]
    },
    solutions: {
      overline: 'Heat + glare control',
      heading: 'Find the windows causing the heat or glare.',
      body: 'Sun-facing glass, screen visibility, occupant comfort, and interiors exposed to light all give the project a clearer starting point.',
      cards: [
        { id: 'solar-glare', label: 'Sun-facing glass', heading: 'Start with the affected elevation.', body: 'Identify which windows receive direct sun and when the issue is most noticeable.' },
        { label: 'Screen glare', heading: 'Review the work or display area.', body: 'Look at screen visibility, display-facing glass, and the position of the people using the space.' },
        { label: 'Occupant comfort', heading: 'Map the uncomfortable rooms.', body: 'Describe the areas where direct sun changes the comfort of employees, guests, or customers.' },
        { label: 'Sun-exposed interiors', heading: 'Review what stays in the light.', body: 'Identify furnishings, finishes, products, and other interiors exposed to direct sun.' }
      ]
    },
    process: {
      heading: 'Review exposure before choosing solar-control film.',
      steps: [
        ['Describe the affected space', 'Share the city, property type, sun-facing room or elevation, and the main heat or glare concern.'],
        ['Send photos or measurements', 'Photos of the windows, room, and view outside help us understand exposure and access.'],
        ['Review glazing + use', 'Glass type, orientation, room use, screen positions, and desired appearance guide the conversation.'],
        ['Define the next step', 'We identify what can move toward an estimate and what needs more site information.']
      ]
    },
    image: {
      alt: 'Sun-facing commercial office glass in an occupied workspace',
      overline: 'Exposure + interiors',
      heading: 'The affected elevation tells the story.',
      body: 'Heat and glare conversations work best when the sun-facing glass, room use, screen locations, and exposure pattern are visible. A site review helps collect the right details before a film direction is selected.',
      linkText: 'Text heat and glare details &rarr;'
    },
    siteReview: {
      overline: 'Heat + glare site review',
      heading: 'Tell us where the sun is affecting the space.',
      body: 'Answer four quick project questions. Your contact details come last, then we save the complete brief and open a prepared text for you to send.'
    },
    final: {
      overline: 'Start with exposure',
      heading: 'Bring the affected windows into the first conversation.',
      body: 'Property city, photos, rough measurements, and the main heat or glare issue give us a practical place to start.'
    },
    sms: "Hi Obsidian Autoworks, I'd like commercial heat and glare window film.\nProperty city:\nSun-facing area / room:\nMain issue (heat, glare, fading, screen visibility):\nPhotos / rough measurements:"
  },
  {
    route: 'storefront-security-window-film',
    variant: 'storefront_security_v1',
    title: 'Storefront Security Film Orange County | Obsidian',
    description: 'Storefront safety and security window film for Orange County retail and commercial glass. Request a site review for entry, display, and ground-level glass.',
    hero: {
      overline: 'Storefront safety / security film',
      heading: 'Storefront Security Window Film <span>in Orange County</span>',
      body: 'For entry, display, and ground-level storefront glass, the conversation starts with the glass, frame, access, and protection goal. We review the site before recommending a safety or security-film direction.',
      note: 'Entry, display, and ground-level storefront glass throughout Orange County.',
      galleryAlts: [
        'Storefront security film on commercial glass from an Obsidian Autoworks project',
        'Ground-level storefront glass with a neutral commercial film appearance',
        'Professional installation of storefront safety film on commercial glass'
      ]
    },
    solutions: {
      overline: 'Storefront safety + security',
      heading: 'Start with the glass customers and staff use every day.',
      body: 'Entry, display, and ground-level glass need a site-specific review of the safety or security intent, frame, access, and operating conditions.',
      cards: [
        { id: 'safety-security', label: 'Entry / display glass', heading: 'Start with the customer-facing glass.', body: 'Review entry doors, display windows, ground-level glass, and the way each opening is used.' },
        { label: 'Safety / security intent', heading: 'Define the protection conversation.', body: 'Clarify the project goal before discussing an appropriate film-system direction.' },
        { label: 'Glass-retention goals', heading: 'Review the system, not just the film.', body: 'The glass, frame, attachment approach, and intended retention goal all matter.' },
        { label: 'Frame / access', heading: 'Bring the site conditions into scope.', body: 'Access, frame type, glass condition, and daily operations help define the next step.' }
      ]
    },
    process: {
      heading: 'Security film requires a site-specific conversation.',
      steps: [
        ['Describe the storefront glass', 'Share the city, property type, and whether the glass is entry, display, or ground level.'],
        ['Send photos or measurements', 'Photos help us review the glass, frame, access, and surrounding conditions before the next step.'],
        ['Clarify the protection goal', 'Safety versus security intent, glass-retention goals, and daily use shape the right conversation.'],
        ['Define the next step', 'We identify what can move toward an estimate and what needs more site information.']
      ]
    },
    image: {
      alt: 'Commercial storefront entry glass with a neutral window-film appearance',
      overline: 'Glass + access',
      heading: 'Review the entry and frame together.',
      body: 'Storefront safety and security film is site-specific. A review of the glass, frame, access, and protection goal helps establish the right questions before a direction is recommended.',
      linkText: 'Text storefront security details &rarr;'
    },
    siteReview: {
      overline: 'Storefront security site review',
      heading: 'Tell us what the storefront glass needs to address.',
      body: 'Answer four quick project questions. Your contact details come last, then we save the complete brief and open a prepared text for you to send.'
    },
    final: {
      overline: 'Start with the storefront',
      heading: 'Bring the entry and glass into the first conversation.',
      body: 'Property city, photos, rough measurements, and the primary concern give us a practical place to start.'
    },
    sms: "Hi Obsidian Autoworks, I'd like storefront safety or security window film.\nProperty city:\nGlass area (entry, display, ground-level storefront):\nPrimary concern:\nPhotos / rough measurements:"
  }
]);

const replaceExactly = (source, search, replacement, label) => {
  const first = source.indexOf(search);
  if (first === -1) throw new Error(`Could not find control-page ${label}.`);
  if (source.indexOf(search, first + search.length) !== -1) {
    throw new Error(`Control-page ${label} is not unique.`);
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + search.length)}`;
};

const smsHref = (message) => `sms:+17146007134?body=${encodeURIComponent(message).replace(/[!'()*]/g, (character) => (
  `%${character.charCodeAt(0).toString(16).toUpperCase()}`
))}`;

const renderCards = (cards) => cards.map((card) => {
  const id = card.id ? ` id="${card.id}"` : '';
  return `                    <article${id}><span>${card.label}</span><h3>${card.heading}</h3><p>${card.body}</p></article>`;
}).join('\n');

const renderSteps = (steps) => steps.map(([heading, body], index) => (
  `                    <li><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${heading}</h3><p>${body}</p></div></li>`
)).join('\n');

const renderVariant = (control, page) => {
  let html = control;
  html = replaceExactly(html, CONTROL.htmlTag, `<html lang="en" data-lead-service="commercial_window_film" data-lead-variant="${page.variant}">`, 'html tag');
  html = replaceExactly(html, CONTROL.title, `<title>${page.title}</title>`, 'title');
  html = replaceExactly(html, CONTROL.description, `<meta name="description"\n        content="${page.description}">`, 'description');
  html = replaceExactly(html, CONTROL.heroOverline, `<p class="commercial-overline">${page.hero.overline}</p>`, 'hero overline');
  html = replaceExactly(html, CONTROL.heroHeading, `<h1>${page.hero.heading}</h1>`, 'hero heading');
  html = replaceExactly(html, CONTROL.heroBody, `                    <p>${page.hero.body}</p>`, 'hero body');
  html = replaceExactly(html, CONTROL.heroNote, `                    <p class="commercial-paid-hero__note">${page.hero.note}</p>`, 'hero note');
  CONTROL.galleryAlts.forEach((alt, index) => {
    html = replaceExactly(html, `alt="${alt}"`, `alt="${page.hero.galleryAlts[index]}"`, `gallery alt ${index + 1}`);
  });
  html = replaceExactly(
    html,
    CONTROL.solutionHeading,
    `                    <div><p class="commercial-overline">${page.solutions.overline}</p><h2>${page.solutions.heading}</h2></div>\n                    <p>${page.solutions.body}</p>`,
    'solution heading'
  );
  html = replaceExactly(html, CONTROL.solutionCards, renderCards(page.solutions.cards), 'solution cards');
  html = replaceExactly(
    html,
    CONTROL.processHeading,
    `<div class="commercial-heading"><p class="commercial-overline">Commercial project process</p><h2>${page.process.heading}</h2></div>`,
    'process heading'
  );
  html = replaceExactly(html, CONTROL.processSteps, renderSteps(page.process.steps), 'process steps');
  html = replaceExactly(html, `alt="${CONTROL.imageAlt}"`, `alt="${page.image.alt}"`, 'image callout alt');
  html = replaceExactly(html, CONTROL.imageOverline, `<p class="commercial-overline">${page.image.overline}</p>`, 'image callout overline');
  html = replaceExactly(html, CONTROL.imageHeading, `<h2>${page.image.heading}</h2>`, 'image callout heading');
  html = replaceExactly(html, CONTROL.imageBody, `                    <p>${page.image.body}</p>`, 'image callout body');
  html = replaceExactly(html, CONTROL.imageLinkText, page.image.linkText, 'image callout link text');
  html = replaceExactly(html, CONTROL.siteReviewOverline, `<p class="commercial-overline">${page.siteReview.overline}</p>`, 'site-review overline');
  html = replaceExactly(html, CONTROL.siteReviewHeading, `<h2>${page.siteReview.heading}</h2>`, 'site-review heading');
  html = replaceExactly(html, CONTROL.siteReviewBody, `                <p>${page.siteReview.body}</p>`, 'site-review body');
  html = replaceExactly(
    html,
    CONTROL.finalCopy,
    `<div><p class="commercial-overline">${page.final.overline}</p><h2>${page.final.heading}</h2><p>${page.final.body}</p></div>`,
    'final CTA copy'
  );
  html = html.replaceAll(/href="sms:\+17146007134\?body=[^"]*"/g, `href="${smsHref(page.sms)}"`);
  return html;
};

const control = await readFile(controlPath, 'utf8');
for (const page of variants) {
  await writeFile(resolve(projectRoot, page.route), renderVariant(control, page), 'utf8');
  console.log(`generated /${page.route}`);
}
