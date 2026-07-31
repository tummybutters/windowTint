import { writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

const teslaProof = [
  ['/assets/paid-landing/tesla-model-y-rear.webp', 'Tesla ceramic tint work completed by Obsidian Autoworks', 'Real Obsidian Tesla work'],
  ['/assets/paid-landing/tesla-model-y-front.webp', 'Silver Tesla Model Y with finished ceramic window tint', 'Model Y result'],
  ['/assets/paid-landing/tesla-glass-roof.webp', 'Interior view of a Tesla panoramic glass roof', 'Tesla panoramic glass'],
  ['/gallery/optimized/vip-porsche-cayenne-coupe-01.webp', 'Porsche Cayenne with finished window tint', 'Jadelyn Belle - 5-star review'],
  ['/gallery/optimized/vip-bmw-m4-01.webp', 'BMW M4 with finished window tint', 'Mark Cruz - 5-star review'],
  ['/gallery/optimized/vip-cadillac-lyriq-01.webp', 'Cadillac Lyriq with finished window tint', 'Bryan Rodriguez - 5-star review'],
  ['/gallery/optimized/vip-toyota-4runner-01.webp', 'Toyota 4Runner with finished window tint', 'Alex Brockman - 5-star review']
];

const ceramicProof = [
  ['/assets/paid-landing/mobile-porsche-rear.webp', 'Rear view of a Porsche after mobile ceramic tint installation', 'Ceramic tint result'],
  ['/assets/paid-landing/mobile-porsche-side.webp', 'Porsche receiving mobile ceramic window tint service', 'Real mobile installation'],
  ['/assets/paid-landing/mobile-porsche-front.webp', 'Front view of a Porsche after mobile ceramic window tint', 'Orange County mobile service'],
  ['/gallery/optimized/vip-mercedes-benz-gls-01.webp', 'Mercedes GLS with finished window tint', 'Nesha Bowman - 5-star review'],
  ['/gallery/optimized/vip-bmw-m4-01.webp', 'BMW M4 with finished window tint', 'Mark Cruz - 5-star review'],
  ['/gallery/optimized/vip-cadillac-lyriq-01.webp', 'Cadillac Lyriq with finished window tint', 'Bryan Rodriguez - 5-star review'],
  ['/gallery/optimized/vip-toyota-4runner-01.webp', 'Toyota 4Runner with finished window tint', 'Alex Brockman - 5-star review']
];

const pages = [
  {
    route: 'tesla-model-y-window-tint',
    title: 'Tesla Model Y Window Tint | Obsidian Autoworks',
    meta: 'Tesla Model Y ceramic window tint pricing, real Model Y results, and qualified mobile installation across Orange County.',
    canonical: '/tesla-model-y-window-tinting',
    service: 'tesla_tint',
    variant: 'tesla_model_y_v1',
    action: 'tesla_model_y',
    eyebrow: 'Tesla Model Y ceramic tint - Orange County',
    h1: 'Tesla Model Y',
    accent: 'Window Tint',
    hero: 'A cooler cabin, cleaner glass, and model-specific pricing without a shop waiting room.',
    primary: 'Call for Model Y tint',
    secondary: 'Text Model Y details',
    tertiary: 'See Model Y pricing',
    textPrompt: "Hi Obsidian Autoworks, I'd like a Model Y tint quote. My year, city, requested glass, and shade goal are: ",
    proof: teslaProof,
    proofTitle: 'Real Tesla Work. Clear Model Y Pricing.',
    proofBody: 'The Tesla photos shown are a real Model Y completed by Obsidian Autoworks. Choose the glass package, then call or text to confirm year, shade, roof scope, and install space.',
    benefits: [
      ['Model Y pricing', 'Sides and rear, full-car, and roof-glass options.'],
      ['Ceramic performance', 'Heat rejection, UV protection, glare control, and privacy.'],
      ['Mobile installation', 'Qualified Orange County homes and workplaces.']
    ],
    packages: [
      ['Sides &amp; Rear', 'Side and rear glass for a consistent cabin and exterior shade.', 'From', '$700'],
      ['Full Car', 'Sides, rear, and windshield coverage confirmed for your model year.', 'From', '$950'],
      ['Panoramic Roof', 'Roof-glass add-on quoted with the selected package.', 'Add-on', '$550']
    ],
    detailTitle: 'Make the Glass Feel Like Part of the Car',
    detailBody: 'Model Y glass creates a bright cabin and a large heat load. The right ceramic package brings the shade together while keeping visibility and comfort in view.',
    steps: [
      ['Model year', 'Share the year so the glass layout and package can be confirmed.'],
      ['Glass package', 'Choose sides and rear, full car, windshield, or roof glass.'],
      ['Shade goal', 'Tell us whether heat, glare, privacy, or exterior balance matters most.'],
      ['Install space', 'A clean garage, driveway, or workplace area must be qualified first.']
    ],
    faqs: [
      ['Does Model Y roof glass cost extra?', 'Yes. Panoramic roof glass is a separate add-on because of its size and installation scope.'],
      ['Can you tint my Model Y at home?', 'Yes, when the location provides clean working room and suitable weather protection.'],
      ['Is ceramic tint only about darker glass?', 'No. Ceramic film is selected for heat rejection, UV protection, glare control, privacy, and a balanced finished look.']
    ],
    finalTitle: 'Give Your Model Y the Glass It Should Have.'
  },
  {
    route: 'tesla-model-3-window-tint',
    title: 'Tesla Model 3 Window Tint | Obsidian Autoworks',
    meta: 'Tesla Model 3 ceramic window tint pricing with qualified mobile installation, heat rejection, privacy, and direct quoting in Orange County.',
    canonical: '/tesla-model-3-window-tinting',
    service: 'tesla_tint',
    variant: 'tesla_model_3_v1',
    action: 'tesla_model_3',
    eyebrow: 'Tesla Model 3 ceramic tint - Orange County',
    h1: 'Tesla Model 3',
    accent: 'Window Tint',
    hero: 'Ceramic tint that cuts the heat, cleans up the profile, and comes with the price upfront.',
    primary: 'Call for Model 3 tint',
    secondary: 'Text Model 3 details',
    tertiary: 'See Model 3 pricing',
    textPrompt: "Hi Obsidian Autoworks, I'd like a Model 3 tint quote. My year, city, requested glass, and shade goal are: ",
    proof: teslaProof,
    proofTitle: 'Tesla Experience, Model 3-Specific Scope',
    proofBody: 'The Tesla shown is real Obsidian work and is labeled honestly as a Model Y. Your Model 3 quote is based on its own glass, year, package, shade, and installation location.',
    benefits: [
      ['Model 3 pricing', 'Confirmed sides-and-rear and full-car starting points.'],
      ['Cleaner cabin feel', 'Heat, glare, UV, and privacy addressed together.'],
      ['Mobile installation', 'Qualified Orange County homes and workplaces.']
    ],
    packages: [
      ['Sides &amp; Rear', 'Model 3 side and rear glass with the selected ceramic shade.', 'From', '$950'],
      ['Full Car', 'Sides, rear, and windshield coverage confirmed before service.', 'From', '$1,150']
    ],
    detailTitle: 'A Cooler Cabin Without Changing the Car',
    detailBody: 'The Model 3 has a bright, glass-heavy cabin. Ceramic tint reduces heat feel and glare while keeping the finish clean and intentional.',
    steps: [
      ['Model year', 'Share the year so we can confirm the glass and package.'],
      ['Glass package', 'Choose sides and rear, full car, windshield, or roof scope.'],
      ['Shade goal', 'Tell us your comfort, privacy, and appearance priorities.'],
      ['Install space', 'We qualify the garage, driveway, or workplace before scheduling.']
    ],
    faqs: [
      ['Why does Model 3 pricing differ from Model Y?', 'The glass layout, film use, and installation time differ by model and package.'],
      ['Can you tint a Model 3 at my workplace?', 'Potentially. We confirm property permission, clean working room, and weather protection first.'],
      ['Will ceramic tint help with cabin heat?', 'Ceramic film is selected to reduce heat feel and glare while adding UV protection and privacy.']
    ],
    finalTitle: 'Make Your Model 3 Cooler Before the Next Drive.'
  },
  {
    route: 'tesla-cybertruck-window-tint',
    title: 'Cybertruck Window Tint | Obsidian Autoworks',
    meta: 'Request a Cybertruck ceramic window tint quote matched to the year, selected glass, shade goal, and qualified Orange County installation location.',
    canonical: '/tesla-cybertruck-window-tint',
    service: 'tesla_tint',
    variant: 'tesla_cybertruck_v1',
    action: 'tesla_cybertruck',
    eyebrow: 'Cybertruck ceramic tint - Orange County',
    h1: 'Cybertruck',
    accent: 'Window Tint',
    hero: 'Heat control, privacy, and a cleaner glass line for the most exposed part of the truck.',
    primary: 'Call for an exact quote',
    secondary: 'Text Cybertruck details',
    tertiary: 'See quote details',
    textPrompt: "Hi Obsidian Autoworks, I'd like an exact Cybertruck tint quote. My year, city, requested glass, and shade goal are: ",
    proof: teslaProof,
    proofTitle: 'Tesla Tint Experience, Cybertruck-Specific Quote',
    proofBody: 'The Tesla shown is real Obsidian work and is not presented as a Cybertruck. Your exact quote is built around Cybertruck glass, selected coverage, shade, and installation conditions.',
    benefits: [
      ['Exact quote first', 'Glass selection and installation scope confirmed before service.'],
      ['Ceramic performance', 'Heat rejection, UV protection, glare control, and privacy.'],
      ['Mobile qualification', 'Suitable Orange County homes and workplaces.']
    ],
    packages: [
      ['Vehicle and year', 'Confirm the truck year and any glass-layout details.'],
      ['Selected glass', 'Choose side glass, rear glass, windshield, roof, or a combined scope.'],
      ['Install location', 'Share garage, driveway, or workplace photos for qualification.']
    ],
    detailTitle: 'Start With the Glass You Actually Want Tinted',
    detailBody: 'Cybertruck has a distinct glass layout. We quote the selected coverage and working conditions directly instead of forcing it into a generic car package.',
    steps: [
      ['Truck year', 'Share the year and any relevant configuration details.'],
      ['Requested glass', 'List every window, windshield, rear glass, or roof panel you want included.'],
      ['Shade goal', 'Tell us whether heat, glare, privacy, or appearance is the priority.'],
      ['Install space', 'Send photos of the clean, protected area where the work would happen.']
    ],
    faqs: [
      ['Why is Cybertruck quoted directly?', 'Its glass layout and requested coverage can vary enough that a generic package would be misleading.'],
      ['Can Cybertruck tint be installed at home?', 'Potentially, when the workspace has sufficient room, cleanliness, access, and weather protection.'],
      ['What should I text for the fastest answer?', 'Send the year, city, requested glass, shade goal, and photos of the vehicle and install space.']
    ],
    finalTitle: 'Get the Right Cybertruck Tint Scope First.'
  },
  {
    route: 'mobile-ceramic-window-tint-near-me',
    title: 'Mobile Ceramic Window Tint Near Me | Obsidian Autoworks',
    meta: 'Mobile ceramic window tint at qualified Orange County homes and workplaces with clear package pricing and direct call or text quoting.',
    canonical: '/mobile-window-tinting-near-me',
    service: 'ceramic_tint',
    variant: 'ceramic_near_me_v1',
    action: 'ceramic_near_me',
    eyebrow: 'Mobile ceramic window tint - Orange County',
    h1: 'Mobile Ceramic',
    accent: 'Window Tint',
    hero: 'Premium ceramic tint installed at a qualified home or workplace in Orange County.',
    primary: 'Call for mobile tint',
    secondary: 'Text vehicle and city',
    tertiary: 'See mobile packages',
    textPrompt: "Hi Obsidian Autoworks, I'd like mobile ceramic tint. My vehicle, city, requested glass, shade goal, and install space are: ",
    proof: ceramicProof,
    proofTitle: 'Real Mobile Work, Not a Shop Stock Photo',
    proofBody: 'The Porsche shown was serviced at a mobile location. We qualify the driveway, garage, or workplace before scheduling so the installation conditions support clean work.',
    benefits: [
      ['We come to you', 'Qualified Orange County homes and workplaces.'],
      ['Ceramic performance', 'Heat rejection, UV protection, visibility, and privacy.'],
      ['Clear starting prices', 'Choose the glass before requesting the final quote.']
    ],
    packages: [
      ['Front Two', 'Sedan or coupe front windows. Truck and SUV packages start higher.', 'From', '$200'],
      ['Sides &amp; Rear', 'Coupe package. Sedans, trucks, and SUVs vary by glass size.', 'From', '$500'],
      ['Full Car', 'Coupe package with vehicle-specific pricing confirmed before service.', 'From', '$720'],
      ['Windshield', 'Sedan or coupe windshield. Truck and SUV packages start higher.', 'From', '$220']
    ],
    detailTitle: 'Premium Tint Without a Shop Waiting Room',
    detailBody: 'Mobile does not mean improvised. We confirm space, weather protection, vehicle access, and the selected glass before arriving.',
    steps: [
      ['Vehicle', 'Send the year, make, model, and current tint condition.'],
      ['Requested glass', 'Choose front two, sides and rear, full car, windshield, or roof glass.'],
      ['City and space', 'Share the Orange County city and photos of the garage, driveway, or workplace.'],
      ['Shade goal', 'Tell us whether heat, glare, privacy, or appearance matters most.']
    ],
    faqs: [
      ['Can mobile tint be installed in a driveway?', 'Yes, when the space is clean, safe, protected from unsuitable weather, and large enough for the work.'],
      ['Does mobile service change the film quality?', 'No. The selected ceramic film and installation process remain the same; the location must simply be qualified.'],
      ['How do I get the fastest quote?', 'Text the vehicle, city, requested glass, shade goal, and install-space photos.']
    ],
    finalTitle: 'Bring Premium Ceramic Tint to Your Driveway.'
  },
  {
    route: 'nano-ceramic-window-tint',
    title: 'Nano Ceramic Window Tint | Obsidian Autoworks',
    meta: 'Nano ceramic window tint for heat rejection, UV protection, glare control, visibility, and qualified mobile installation in Orange County.',
    canonical: '/ceramic-window-tinting',
    service: 'ceramic_tint',
    variant: 'nano_ceramic_v1',
    action: 'nano_ceramic',
    eyebrow: 'Nano ceramic window tint - Orange County',
    h1: 'Nano Ceramic',
    accent: 'Window Tint',
    hero: 'Less heat and glare without choosing film by darkness alone.',
    primary: 'Call for ceramic tint',
    secondary: 'Text vehicle and glass',
    tertiary: 'See ceramic pricing',
    textPrompt: "Hi Obsidian Autoworks, I'd like nano ceramic tint. My vehicle, city, requested glass, and shade goal are: ",
    proof: ceramicProof,
    proofTitle: 'Performance You Can Feel, Finish You Can See',
    proofBody: 'Ceramic tint is selected around heat rejection, UV protection, glare, visibility, privacy, and the finished look across the vehicle.',
    benefits: [
      ['Heat rejection', 'Reduce the heat load through selected vehicle glass.'],
      ['UV protection', 'Add another layer of protection for occupants and interior surfaces.'],
      ['Shade with purpose', 'Balance privacy, visibility, glare, and exterior appearance.']
    ],
    packages: [
      ['Front Two', 'Sedan or coupe front windows. Truck and SUV packages start higher.', 'From', '$200'],
      ['Sides &amp; Rear', 'Coupe package. Sedans, trucks, and SUVs vary by glass size.', 'From', '$500'],
      ['Full Car', 'Coupe package with vehicle-specific pricing confirmed before service.', 'From', '$720'],
      ['Windshield', 'Sedan or coupe windshield. Truck and SUV packages start higher.', 'From', '$220']
    ],
    detailTitle: 'Choose Performance Before Darkness',
    detailBody: 'A darker shade is not the only measure of comfort. Film construction, selected glass, visibility, and the way the shades work together all matter.',
    steps: [
      ['Vehicle', 'Share the year, make, model, and existing tint.'],
      ['Glass coverage', 'Choose front two, sides and rear, full car, windshield, or roof glass.'],
      ['Comfort goal', 'Rank heat, glare, UV, privacy, and appearance.'],
      ['Installation location', 'Send the city and photos of the available mobile workspace.']
    ],
    faqs: [
      ['Does darker tint always reject more heat?', 'No. Film construction and ceramic performance matter alongside visible darkness.'],
      ['Can ceramic tint stay clear enough for visibility?', 'Yes. Shade and glass selection are discussed around visibility, comfort, and applicable California rules.'],
      ['Can nano ceramic tint be installed at my home?', 'Yes, when the garage or protected workspace is qualified for clean mobile installation.']
    ],
    finalTitle: 'Choose the Ceramic Package Around the Drive.'
  }
];

const proofWall = (proof) => proof.map(([src, alt, label], index) => `
                <figure class="paid-hero-strip__item"><img src="${src}" alt="${alt}" width="1012" height="1800" ${index < 3 ? 'fetchpriority="high"' : 'loading="lazy"'}><figcaption><p>${index < 3 ? label : 'Real Obsidian tint result.'}</p><span class="paid-hero-strip__reviewer">${label}</span></figcaption></figure>`).join('');

const proofItems = (items) => items.map(([title, body]) => `<div class="paid-proof__item"><strong>${title}</strong><span>${body}</span></div>`).join('');

const packageItems = (items) => items.map(([title, body, prefix, price]) => {
  const priceBlock = prefix && price
    ? `<div class="paid-package__price"><small>${prefix}</small>${price}</div>`
    : '';
  return `<article class="paid-package"><h3>${title}</h3><p>${body}</p>${priceBlock}</article>`;
}).join('');

const stepItems = (items) => items.map(([title, body]) => `<article class="paid-step"><div><h3>${title}</h3><p>${body}</p></div></article>`).join('');

const faqItems = (items) => items.map(([title, body]) => `<details><summary>${title}</summary><p>${body}</p></details>`).join('');

const render = (page) => {
  const textBody = encodeURIComponent(page.textPrompt);
  const firstImage = page.proof[0];
  const secondImage = page.proof[1];
  return `<!DOCTYPE html>
<html lang="en" data-lead-service="${page.service}" data-lead-variant="${page.variant}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title}</title>
    <meta name="description" content="${page.meta}">
    <meta name="robots" content="noindex, nofollow">
    <link rel="canonical" href="https://www.obsidianautoworksoc.com${page.canonical}">
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/style.css?v=20260108-1">
    <link rel="stylesheet" href="/paid-landing.css?v=20260731-intent1">
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-TR9ET60HX3"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TR9ET60HX3');gtag('config','AW-17846304809');</script>
</head>
<body class="paid-page">
    <nav class="paid-nav" aria-label="Primary navigation"><div class="paid-shell paid-nav__inner"><a class="paid-brand" href="/"><img class="paid-brand__mark" src="/car-hero.webp" alt="" width="500" height="200">OBSIDIAN<span>AUTOWORKS</span></a><div class="paid-nav__actions"><a class="paid-link" href="#packages">Packages</a><a class="paid-button paid-button--ghost" href="tel:7146007134">Call (714) 600-7134</a></div></div></nav>
    <main>
        <header class="paid-hero paid-hero--vip"><div class="paid-shell paid-hero__content paid-hero__content--centered"><p class="paid-eyebrow">${page.eyebrow}</p><h1>${page.h1} <span>${page.accent}</span></h1><p class="paid-hero__copy">${page.hero}</p><div class="paid-hero__actions"><a data-hero-primary data-lead-action="${page.action}_call" class="paid-button paid-button--primary" href="tel:7146007134">${page.primary}</a><a data-hero-secondary data-lead-action="${page.action}_text" class="paid-button paid-button--ghost" href="sms:+17146007134?body=${textBody}">${page.secondary}</a><a data-hero-tertiary class="paid-button paid-button--ghost" href="#packages">${page.tertiary}</a></div></div></header>
        <section class="paid-hero-strip" aria-label="Real Obsidian window tint results"><div class="paid-hero-strip__grid">${proofWall(page.proof)}
            </div></section>
        <section class="paid-proof" aria-label="Service details"><div class="paid-shell paid-proof__grid">${proofItems(page.benefits)}</div></section>
        <section class="paid-band paid-band--paper" id="packages"><div class="paid-shell"><div class="paid-section-heading"><span>Clear scope before service</span><h2>${page.proofTitle}</h2><p>${page.proofBody}</p></div><div class="paid-packages">${packageItems(page.packages)}</div></div></section>
        <section class="paid-band paid-band--ink"><div class="paid-shell"><div class="paid-section-heading"><span>Comfort and finish</span><h2>${page.detailTitle}</h2><p>${page.detailBody}</p></div><div class="paid-photo-grid"><figure class="paid-photo"><img src="${firstImage[0]}" alt="${firstImage[1]}" width="1012" height="1800"><figcaption>${firstImage[2]}</figcaption></figure><figure class="paid-photo"><img src="${secondImage[0]}" alt="${secondImage[1]}" width="1012" height="1800"><figcaption>${secondImage[2]}</figcaption></figure></div></div></section>
        <section class="paid-band paid-band--silver"><div class="paid-shell"><div class="paid-section-heading"><span>Fast quote path</span><h2>Four Details Get You a Better Answer</h2></div><div class="paid-steps">${stepItems(page.steps)}</div></div></section>
        <section class="paid-band paid-band--paper"><div class="paid-shell"><div class="paid-section-heading"><span>Before you choose</span><h2>Questions Worth Answering</h2></div><div class="paid-faq">${faqItems(page.faqs)}</div></div></section>
        <section class="paid-cta"><div class="paid-shell paid-cta__inner"><div><h2>${page.finalTitle}</h2><p>Call now or text the vehicle, year, city, requested glass, and shade goal.</p></div><div class="paid-cta__actions"><a data-cta-primary data-lead-action="${page.action}_call" class="paid-button paid-button--primary" href="tel:7146007134">Call Obsidian</a><a data-cta-secondary data-lead-action="${page.action}_text" class="paid-button paid-button--ghost" href="sms:+17146007134?body=${textBody}">Text the details</a></div></div></section>
    </main>
    <footer class="paid-footer"><div class="paid-shell paid-footer__inner"><span>Obsidian Autoworks</span><span>Mobile ceramic window tinting in Orange County</span></div></footer>
    <div class="paid-mobile-actions" aria-label="Contact Obsidian Autoworks"><a data-lead-action="${page.action}_call" href="tel:7146007134">Call</a><a data-lead-action="${page.action}_text" href="sms:+17146007134?body=${textBody}">Text</a></div>
    <script src="/lead-tracking.js" defer></script>
</body>
</html>
`;
};

for (const page of pages) {
  await writeFile(new URL(`${page.route}.html`, root), render(page));
}

console.log(`generated ${pages.length} Tesla and ceramic tint intent pages`);
