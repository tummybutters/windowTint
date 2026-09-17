import { writeFile } from 'node:fs/promises';
import { vehicles } from './vehicle-page-data.mjs';

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const route = (v) => `/${v.slug}-window-tinting`;
const photo = (v, number) => `/gallery/optimized/gallery-cards/${v.slug}-${number}.webp`;

export function renderVehicle(v) {
  const title = `${v.name} Window Tinting | Obsidian Autoworks`;
  const description = `Explore ${v.name} window tinting with original gallery photos, coverage options, and mobile appointment planning in Orange County.`;
  const related = vehicles.filter((item) => item !== v);
  const textHref = `sms:+17146007134?body=${encodeURIComponent(`Hi Obsidian, I'd like a window tint quote for my ${v.name}. Year: __. City: __. Windows to tint: __.`)}`;
  const contactActions = (placement) => `<a class="paid-button vehicle-cta--text" href="${escape(textHref)}" data-lead-action="vehicle_${placement}_text">Text for a quote</a><a class="paid-button vehicle-cta--call" href="tel:7146007134" data-lead-action="vehicle_${placement}_call">Call Obsidian</a>`;
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.obsidianautoworksoc.com/' },
      { '@type': 'ListItem', position: 2, name: 'Window tinting', item: 'https://www.obsidianautoworksoc.com/mobile-window-tinting' },
      { '@type': 'ListItem', position: 3, name: v.name, item: `https://www.obsidianautoworksoc.com${route(v)}` }
    ]
  };
  return `<!DOCTYPE html>
<html lang="en" data-lead-service="mobile_tint" data-page-type="vehicle-guide" data-vehicle="${v.slug}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.obsidianautoworksoc.com${route(v)}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.obsidianautoworksoc.com${route(v)}">
  <meta property="og:image" content="https://www.obsidianautoworksoc.com${photo(v, v.images[0][0])}">
  <link rel="icon" href="/favicon.png">
  <link rel="stylesheet" href="/style.css?v=20260108-1">
  <link rel="stylesheet" href="/paid-landing.css?v=20260730-vip1">
  <link rel="stylesheet" href="/vehicle-pages.css?v=20260916-release1">
  <script type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g, '\\u003c')}</script>
  <script src="/vehicle-analytics.js" defer></script>
</head>
<body class="vehicle-page">
  <a class="vehicle-skip" href="#main">Skip to content</a>
  <nav class="paid-nav" aria-label="Primary navigation">
    <div class="vehicle-shell vehicle-nav">
      <a class="paid-brand" href="/" aria-label="Obsidian Autoworks home"><img class="paid-brand__mark" src="/car-hero.webp" width="500" height="200" alt=""><span class="vehicle-wordmark">OBSIDIAN<span>AUTOWORKS</span></span></a>
      <div class="vehicle-nav__links"><a href="/services">Services</a><a href="/window-tint-pricing">Pricing</a><a href="/window-tinting-gallery">Gallery</a><a href="/#contact">Contact</a></div>
      <a class="paid-button paid-button--primary vehicle-nav__book" href="${escape(textHref)}" data-lead-action="vehicle_nav_text">Text us</a>
      <details class="vehicle-menu"><summary aria-label="Navigation menu">Menu</summary><div><a href="/services">Services</a><a href="/window-tint-pricing">Pricing</a><a href="/window-tinting-gallery">Gallery</a><a href="/#contact">Contact</a><a href="/booking">Book online</a></div></details>
    </div>
  </nav>
  <main id="main">
    <header class="vehicle-shell vehicle-heading">
      <nav class="vehicle-crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/mobile-window-tinting">Window tinting</a><span aria-hidden="true">/</span><span aria-current="page">${escape(v.name)}</span></nav>
      <div class="vehicle-heading__grid"><div><p class="vehicle-kicker">Mobile service / Orange County</p><h1>${escape(v.name)}<span>Window tinting.</span></h1></div><div class="vehicle-heading__intro"><p>${escape(v.intro)}</p><div class="vehicle-contact-actions">${contactActions('intro')}</div><a class="vehicle-text-link" href="#coverage">Explore your coverage <span aria-hidden="true">&#8595;</span></a></div></div>
    </header>
    <section class="vehicle-photos vehicle-shell" aria-label="${escape(v.name)} photo gallery">
      ${v.images.map(([n, width, height, alt], i) => `<a class="vehicle-photo" href="/gallery/${v.slug}-${n}.jpg" data-vehicle-photo aria-label="Enlarge: ${escape(alt)}"><img src="${photo(v, n)}" alt="${escape(alt)}" width="${width}" height="${height}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><span class="vehicle-photo__zoom" aria-hidden="true">&#8599;</span></a>`).join('\n      ')}
    </section>
    <div class="vehicle-shell vehicle-photo-note"><span>From the Obsidian gallery</span><a href="/window-tinting-gallery">View all work <span aria-hidden="true">&#8599;</span></a></div>
    <nav class="vehicle-section-nav" aria-label="On this page"><div class="vehicle-shell"><a href="#coverage">Coverage</a><a href="#your-vehicle">Your ${escape(v.short)}</a><a href="#mobile">Mobile service</a><a href="#questions">Questions</a></div></nav>
    <section class="vehicle-band vehicle-band--light" id="coverage">
      <div class="vehicle-shell"><div class="vehicle-section-heading"><p class="vehicle-kicker">Coverage, considered</p><h2>Choose the windows.<br>Then choose the finish.</h2><p>Start with the glass you want treated. Compare the existing packages, then confirm the details for your ${escape(v.short)}.</p></div>
      <div class="vehicle-coverage">
        <a href="/front-two-window-tinting"><span class="vehicle-coverage__type">Front two</span><h3>A focused update.</h3><p>Explore a front-window appointment and discuss the look alongside your existing rear glass.</p><span class="vehicle-text-link">Front two windows <span aria-hidden="true">&#8599;</span></span></a>
        <a href="/sides-rear-window-tinting"><span class="vehicle-coverage__type">Sides &amp; rear</span><h3>A wider view.</h3><p>Plan coverage across the side windows and rear glass, with the included panes confirmed in your quote.</p><span class="vehicle-text-link">Sides &amp; rear package <span aria-hidden="true">&#8599;</span></span></a>
        <a href="/window-tint-pricing"><span class="vehicle-coverage__type">Compare packages</span><h3>Know the scope.</h3><p>See the current service menu. Ask separately about existing-film removal and additional glass.</p><span class="vehicle-text-link">View pricing <span aria-hidden="true">&#8599;</span></span></a>
      </div><div class="vehicle-coverage-help"><p>Not sure which windows to choose? <strong>Let's work it out for your ${escape(v.short)}.</strong></p><a class="vehicle-text-link" href="${escape(textHref)}" data-lead-action="vehicle_coverage_text">Text us about your ${escape(v.short)} <span aria-hidden="true">&#8599;</span></a></div></div>
    </section>
    <section class="vehicle-band" id="your-vehicle"><div class="vehicle-shell vehicle-detail"><div><p class="vehicle-kicker">Made for your ${escape(v.short)}</p><h2>${escape(v.heading)}</h2><p>${escape(v.copy)}</p><a class="vehicle-text-link" href="/ceramic-window-tinting">Explore ceramic window film <span aria-hidden="true">&#8599;</span></a></div><dl class="vehicle-checks">${v.checks.map(([heading, body]) => `<div><dt>${escape(heading)}</dt><dd>${escape(body)}</dd></div>`).join('')}</dl></div></section>
    <section class="vehicle-band vehicle-band--silver" id="mobile"><div class="vehicle-shell vehicle-mobile"><div><p class="vehicle-kicker">Your car. Your location.</p><h2>Less waiting room.<br>More of your day.</h2></div><div><p>Ask about mobile installation at a suitable home or workplace in Orange County. Share your city and the space available around the vehicle so access and conditions can be confirmed before scheduling.</p><div class="vehicle-local-links"><a href="/irvine-window-tinting">Irvine</a><a href="/newport-beach-window-tinting">Newport Beach</a><a href="/costa-mesa-window-tinting">Costa Mesa</a><a href="/lake-forest-window-tinting">Lake Forest</a></div><a class="vehicle-text-link" href="/mobile-window-tinting">About mobile service <span aria-hidden="true">&#8599;</span></a></div></div></section>
    <section class="vehicle-band vehicle-band--light" id="questions"><div class="vehicle-shell vehicle-faq-layout"><div><p class="vehicle-kicker">Before the appointment</p><h2>A few good<br>questions.</h2><p>Keep the decisions specific to your vehicle.</p></div><div class="vehicle-faq">${v.faqs.map(([question, answer]) => `<details><summary>${escape(question)}</summary><p>${escape(answer)}</p></details>`).join('')}<details><summary>Where can I check tint rules and aftercare?</summary><p>Read the <a href="/california-window-tint-law">California tint guide</a> before selecting coverage, and the <a href="/window-tint-aftercare">aftercare guide</a> before your appointment. Confirm the selected film and care instructions directly with Obsidian.</p></details></div></div></section>
    <section class="vehicle-band vehicle-related"><div class="vehicle-shell"><div class="vehicle-related__heading"><h2>More from the garage.</h2><a class="vehicle-text-link" href="/window-tinting-gallery">All vehicles <span aria-hidden="true">&#8599;</span></a></div><div class="vehicle-related__grid">${related.map((other) => `<a href="${route(other)}"><img src="${photo(other, other.images[0][0])}" alt="${escape(other.images[0][3])}" width="${other.images[0][1]}" height="${other.images[0][2]}" loading="lazy" decoding="async"><h3>${escape(other.name)} <span aria-hidden="true">&#8599;</span></h3><p>Window tinting guide</p></a>`).join('')}</div></div></section>
    <section class="vehicle-next"><div class="vehicle-shell"><div><p class="vehicle-kicker">Let's talk about your ${escape(v.short)}</p><h2>Your tint starts<br>with a conversation.</h2><p>Text your model year, city, and the windows you have in mind.<br>Prefer to talk? Call (714) 600-7134.</p></div><div class="vehicle-next__actions"><div class="vehicle-contact-actions">${contactActions('closing')}</div><a class="vehicle-text-link" href="/booking">Already know your package? Book online <span aria-hidden="true">&#8599;</span></a></div></div></section>
  </main>
  <footer class="vehicle-footer"><div class="vehicle-shell"><a class="paid-brand" href="/">OBSIDIAN<span>AUTOWORKS</span></a><nav aria-label="Footer navigation"><a href="/services">Services</a><a href="/window-tint-pricing">Pricing</a><a href="/window-tinting-gallery">Gallery</a><a href="/window-tint-aftercare">Aftercare</a><a href="/ceramic-coating">Ceramic coating</a><a href="/#contact">Contact</a></nav><p>Mobile window tinting / Orange County</p></div></footer>
  <nav class="vehicle-mobile-contact" aria-label="Call or text Obsidian"><a class="paid-button vehicle-cta--call" href="tel:7146007134" data-lead-action="vehicle_sticky_call">Call Obsidian</a><a class="paid-button vehicle-cta--text" href="${escape(textHref)}" data-lead-action="vehicle_sticky_text">Text for a quote</a></nav>
  <dialog class="vehicle-lightbox" aria-label="Vehicle photo viewer"><form method="dialog"><button class="vehicle-lightbox__close" aria-label="Close photo" title="Close photo">&#215;</button></form><img alt=""><p></p></dialog>
  <script src="/vehicle-pages.js?v=20260916-release1" defer></script>
  <script src="/lead-tracking.js" defer></script>
</body>
</html>
`;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  for (const vehicle of vehicles) {
    await writeFile(new URL(`..${route(vehicle)}`, import.meta.url), renderVehicle(vehicle));
  }
  console.log(`Generated ${vehicles.length} indexable vehicle release candidates. No deployment performed.`);
}
