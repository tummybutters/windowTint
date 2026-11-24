import {shell,escape} from './components.mjs';
import {readFileSync} from 'node:fs';
import catalog from '../assets/auto-offers/packages.js';
export const offerPage={path:'/ceramic-tint-packages',division:'auto',type:'service',title:'Mobile ceramic window tint packages in Orange County',description:'Compare front window matching, front cabin, sides and rear, and complete ceramic tint. See mobile installation pricing and choose your sun strip or eligible roof upgrade.'};
const entries=Object.entries(catalog.packages);
const jobs = JSON.parse(readFileSync(new URL('../content/projects.json', import.meta.url)));
const shots = {
  'front-match': ['range-rover-window-tint-newport-beach', 1, 2],
  'front-cabin': ['bmw-x5-m-window-tint-anaheim-hills', 0, 1],
  driveway: ['bmw-2-series-window-tint-yorba-linda', 1, 0],
  complete: ['bmw-7-series-window-tint-orange', 0, 1]
};
function projectImage(image, attributes = '') {
  return `<img src="${image.src}" srcset="${image.small} 640w, ${image.src} ${image.width}w" sizes="(max-width: 720px) 94vw, 50vw" alt="${escape(image.alt)}" width="${image.width}" height="${image.height}" ${attributes}>`;
}
function clearWindshieldSurcharge(slug) {
 const [body]=catalog.bodies;
 const vehicle='Standard vehicle';
 const [upgrade]=catalog.choices(slug,vehicle);
 const standard=catalog.selection(slug,body,vehicle,upgrade,false);
 if(!standard.windshield)return null;
 const clear=catalog.selection(slug,body,vehicle,upgrade,true);
 return clear.quoted_menu_price-standard.quoted_menu_price;
}
export function renderOffers(){
 const cards=entries.map(([slug,p])=>{
   const [path, angle, detail] = shots[slug];
   const job = jobs.find(j=>j.path==='/projects/'+path);
   const caption = escape(job.car+' · '+job.city);
   const clearSurcharge=clearWindshieldSurcharge(slug);
   return `<article id="${slug}" class="package-card"><figure>${projectImage(job.images[angle],'loading="lazy"')}<figcaption>${caption}</figcaption></figure>
   <div class="package-copy"><header><h3>${p.name}</h3><p class="package-from">From <b>$${p.prices[0]}</b></p></header><strong class="package-bonus">${p.benefit}</strong><p>${escape(p.description)}</p>${clearSurcharge!==null?`<p class="package-clear-windshield">Optional clear 3M ceramic windshield: +$${clearSurcharge}</p>`:''}
   <a class="button button-secondary" data-select="${slug}" href="?offer=${slug}#build">Build my package <span aria-hidden="true">↗</span></a></div>
   <template class="detail-photo">${projectImage(job.images[detail],'loading="lazy"')}</template></article>`;
 }).join('');
 const cover = jobs.find(j=>j.car==='Mercedes-AMG CLE');
 const body=`<section class="container offer-hero"><div class="hero-copy"><p class="eyebrow">Mobile ceramic tint · Orange County</p><h1 id="offer-title">Ceramic tint packages.</h1><p class="offer-benefit" id="offer-benefit">Installed in your driveway.</p><p id="offer-description">From two front windows to the entire cabin. Choose your coverage and see what’s included.</p><p id="offer-price">Front windows from $200 · sides and rear from $500</p><a id="hero-link" class="button button-primary" href="#choose">Compare packages</a></div><figure class="cover-shot">${projectImage(cover.images[0],'id="offer-photo" fetchpriority="high"')}<figcaption id="offer-photo-caption">Mercedes-AMG CLE · Mission Viejo</figcaption></figure></section>
 <section class="container offer-build" id="build" hidden><div><p class="eyebrow">Avery Dennison IR ceramic</p><h2>Build your package.</h2><figure id="build-photo" aria-hidden="true"></figure><p id="estimate" aria-live="polite"></p></div><form id="offer-form">
 <label>Package<select name="offer">${entries.map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select></label>
 <div class="offer-fields"><label>Vehicle<input name="vehicle" id="vehicle" required minlength="3" maxlength="200" placeholder="Year, make and model"></label><label>Body style<select name="body" required><option value="">Choose a body style</option>${catalog.bodies.map(b=>`<option>${escape(b)}</option>`).join('')}</select></label></div>
 <label>Package upgrade<select name="upgrade"></select></label><label id="windshield-field">Windshield film<select name="windshield"><option value="standard">Standard ceramic</option><option value="clear">Clear 3M ceramic (+$${clearWindshieldSurcharge('front-cabin')})</option></select></label>
 <div class="offer-fields"><label>Your name<input id="name" name="name" autocomplete="name" required minlength="2" maxlength="120"></label><label>Phone<input id="phone" name="phone" type="tel" autocomplete="tel" required maxlength="24"></label></div><label>Installation city<input id="city" name="city" autocomplete="address-level2" required minlength="2" maxlength="120"></label>
 <div hidden><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><p>We’ll call to confirm vehicle eligibility, final pricing and availability.</p><button type="submit" class="button button-primary">Request my quote</button><p id="offer-status" role="status" aria-live="polite"></p></form></section>
 <section id="choose" class="container offer-options"><h2>Choose your coverage.</h2><div>${cards}</div></section><section class="container offer-terms"><h2>Glass eligibility</h2><p>Eligible single-panel and small dual-panel sunroofs qualify for the included roof upgrade. Tesla’s included upgrade is the sun strip only. Panoramic or full glass roofs, Tesla roof and rear glass, exotic vehicles and highly curved windshields need a custom quote. Offers cannot be combined.</p><a href="tel:+17146007134">Call (714) 600-7134</a></section>`;
 return shell(offerPage,body,'<link rel="stylesheet" href="/assets/auto-offers/offers.css"><script defer src="/assets/auto-offers/packages.js"></script><script defer src="/assets/auto-offers/quote.js"></script>');
}
