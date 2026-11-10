export const origin = 'https://www.obsidianautoworksoc.com';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const divisions = {
  auto: {label:'Auto', path:'/mobile-window-tinting', image:'/assets/site/auto.webp', quote:'/car-window-tinting-near-me', subtitle:'Your drive. Upgraded.'},
  home: {label:'Homes', path:'/architectural-window-film', image:'/assets/site/home.webp', quote:'https://app.tintwiz.com/web/cs/dsvpiyfwkbahjx40fiox90tkhqgnhqpu', subtitle:'Love the light. Feel at home.'},
  commercial: {label:'Commercial', path:'/commercial-window-film', image:'/assets/site/commercial.webp', quote:'/commercial-window-tinting-orange-county#quote', subtitle:'A better place to work.'}
};
export function button(label, href, secondary=false) {
  return `<a class="button${secondary?' button-secondary':''}" href="${escape(href)}">${escape(label)} <span aria-hidden="true">↗</span></a>`;
}
export function brand(division='auto') {
  return `<a class="brand" href="/" aria-label="Obsidian Film Solutions home"><span class="brand-mark" aria-hidden="true"><span></span><span></span></span><span class="brand-name"><strong>OBSIDIAN</strong><span class="brand-division">FILM SOLUTIONS</span></span></a>`;
}
export function header(division) {
  return `<a class="skip-link" href="#main">Skip to content</a><header class="site-header">${brand(division)}<button class="nav-toggle" aria-expanded="false" aria-controls="site-navigation">Menu <span aria-hidden="true">☰</span></button><nav class="site-nav" id="site-navigation" aria-label="Main navigation">${Object.entries(divisions).map(([key,d])=>`<a href="${d.path}"${division===key?' aria-current="location"':''}>${d.label}</a>`).join('')}<a href="/window-tinting-gallery">Our Work</a><a href="/guides">Guides</a>${button('Start my project','/booking')}</nav></header>`;
}
export function footer() {
  return `<footer class="site-footer"><div class="container"><div class="footer-grid"><div>${brand()}<p>Mobile window tinting.<br>Architectural window film.<br>Orange County, California.</p></div><div><h2>Find your film</h2>${Object.values(divisions).map(d=>`<a href="${d.path}">${d.label}</a>`).join('')}<a href="/driveway-package">Driveway Package</a><a href="/services">All services</a></div><div><h2>Explore</h2><a href="/window-tinting-gallery">Our work</a><a href="/guides">Film guides</a><a href="/service-areas">Service areas</a><a href="/about">About Obsidian</a></div><div><h2>Let's talk</h2><a href="/booking">Get a quote</a><a href="tel:+17146007134">(714) 600-7134</a><a href="https://www.instagram.com/obsidianautoworksoc/" target="_blank" rel="noopener">Instagram ↗</a></div></div><p class="footer-note">© ${new Date().getFullYear()} Obsidian Film Solutions.</p></div></footer>`;
}
export function offer() {
  return `<section class="section container" aria-labelledby="driveway-heading"><div class="offer"><div class="offer-copy"><p class="eyebrow">Your driveway. Our workshop.</p><h2 id="driveway-heading">The Driveway<br>Package.</h2><p>Sides + rear ceramic tint, installed right at home.</p><p class="offer-price">$500–$700 <small>Depending on vehicle size</small></p><div class="offer-free"><strong>FREE UPGRADE</strong><span>Choose a sun strip or a standard single-panel sunroof.</span><small>One eligible upgrade with your package.</small></div>${button('Build my package','/driveway-package')}<details class="offer-terms"><summary>Offer details and eligibility</summary><p>Tesla and specialty vehicles quoted separately. For an eligible Tesla, the free upgrade is the sun strip only. One free upgrade per vehicle; no cash value. Free upgrade uses Avery Dennison Encore Supreme IR ceramic film in 45%, 25%, 15% or 5%. Clear film, panoramic roofs and Tesla glass roofs excluded. Travel fees apply outside the complimentary service area.</p></details></div><div class="offer-media"><img src="/gallery/tintwiz-20261025/mercedes-amg-gt-01.webp" alt="Mercedes-AMG GT from the Obsidian tint gallery" loading="lazy" width="1152" height="2048"></div></div></section>`;
}
export function reviews(data) {
  return `<section class="section container"><div class="section-heading"><div><p class="eyebrow">From our automotive customers</p><h2>Good work gets<br>talked about.</h2></div><p><a href="${escape(data.source)}" target="_blank" rel="noopener">${data.rating.toFixed(1)} / 5 on Google · ${data.count} reviews ↗</a><small class="review-date">Checked November 10, 2026</small></p></div><div class="review-grid">${data.reviews.slice(0,3).map(r=>`<figure class="review-card"><span aria-label="5 out of 5 stars">★★★★★</span><blockquote>“${escape(r.text)}”</blockquote><figcaption>${escape(r.author)}<a href="${escape(r.source)}" target="_blank" rel="noopener">Google review ↗</a></figcaption></figure>`).join('')}</div></section>`;
}
export function servicePanels() {
  return `<div class="service-grid">${Object.values(divisions).map(d=>`<a class="service-card" href="${d.path}"><img src="${d.image}" alt="${d.label==='Auto'?'Finished automotive window tint':d.label==='Homes'?'Window film in a light-filled home':'Commercial windows overlooking greenery'}" width="800" height="900"><div class="service-card-content"><span class="eyebrow">${d.label}</span><h2>${d.subtitle}</h2><span aria-hidden="true">↗</span></div></a>`).join('')}</div>`;
}
export function quotePanel(division='auto') {
  const d=divisions[division];
  return `<section class="section container"><div class="quote-panel"><p class="eyebrow">Let's make it yours</p><h2>${division==='home'?'Start with your windows.':division==='commercial'?'Tell us about your space.':'Ready for your upgrade?'}</h2><p>${division==='home'?'Tell us your city, which windows you want treated and what you want the film to do. Your request goes directly to the Obsidian team.':division==='commercial'?'Share the property type, glass and access requirements to start a project review.':'Choose your vehicle and tell us what you would like tinted.'}</p>${button('Start my project',d?.quote||'/booking')}</div></section>`;
}
export function card(page) {
  return `<a class="card" href="${escape(page.path)}"><span class="eyebrow">${escape(divisions[page.division]?.label || 'Obsidian')}</span><h3>${escape(page.title)}</h3><p>${escape(page.description)}</p><span aria-hidden="true">↗</span></a>`;
}
export function shell(page, body, extraHead='') {
  const image=page.image||divisions[page.division]?.image||'/assets/site/auto.webp';
  const title=page.path==='/'?'Mobile Window Tinting Orange County | Obsidian Film Solutions':(page.seoTitle||page.title)+' | Obsidian Film Solutions';
  const parent=divisions[page.division];
  const breadcrumbItems=[{name:'Home',url:origin+'/'}];
  if(parent&&parent.path!==page.path)breadcrumbItems.push({name:parent.label,url:origin+parent.path});
  if(page.path!=='/')breadcrumbItems.push({name:page.title,url:origin+page.path});
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'Organization','@id':origin+'/#organization',name:'Obsidian Film Solutions',url:origin,telephone:'+17146007134',sameAs:['https://www.instagram.com/obsidianautoworksoc/']},
    {'@type':'WebPage','@id':origin+page.path,name:page.title,description:page.description,url:origin+page.path,isPartOf:{'@id':origin+'/#website'},about:{'@id':origin+'/#organization'}},
    {'@type':'WebSite','@id':origin+'/#website',name:'Obsidian Film Solutions',url:origin},
    {'@type':'BreadcrumbList',itemListElement:breadcrumbItems.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:item.url}))}
  ]};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><meta name="description" content="${escape(page.description)}"><link rel="canonical" href="${origin+page.path}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${origin+page.path}"><meta property="og:image" content="${origin+image}"><meta property="og:type" content="website"><link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/assets/site/style.css"><link rel="stylesheet" href="/assets/site/layout.css"><link rel="stylesheet" href="/assets/site/page-layouts.css"><link rel="stylesheet" href="/assets/site/navigation.css"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>${extraHead}<script defer src="/assets/site/interactions.js"></script><script defer src="/assets/attribution/journey.js?v=20261108"></script><script defer src="/lead-tracking.js"></script><script src="/assets/quote/experiment.js?v=20261016-speed"></script><script async src="https://www.googletagmanager.com/gtag/js?id=G-TR9ET60HX3"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-TR9ET60HX3');</script></head><body data-division="${escape(page.division)}">${header(page.division)}<main id="main">${body}</main>${footer()}</body></html>`;
}
