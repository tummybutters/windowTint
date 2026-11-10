import {instagramSection} from './social.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {origin, escape as e, divisions, button, shell, offer, reviews, servicePanels, card, quotePanel} from './components.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pages=JSON.parse(read(process.env.OBSIDIAN_LAYOUT_DATA || 'content/pages.json'));
const reviewData=JSON.parse(read('content/reviews.json'));
const byPath=new Map(pages.map(page=>[page.path,page]));
const destination=p=>'/generated/'+(p==='/'?'index':p.slice(1))+'.html';
const write=(file,contents)=>{
  fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
  fs.writeFileSync(path.join(root,file),contents);
};
if(pages.length!==150 || byPath.size!==150) throw new Error('Expected 150 unique page entries');

function heading(page) {
  return `<section class="hero hero--split container"><div class="hero-copy"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a> / ${divisions[page.division]?`<a href="${divisions[page.division].path}">${divisions[page.division].label}</a>`:'Explore'}</nav><p class="eyebrow">${page.division==='auto'?'We come to you': 'Orange County window film'}</p><h1>${e(page.title)}</h1><p>${e(page.intro||page.description)}</p>${button('Start my project',divisions[page.division]?.quote||'/booking')}</div><div class="hero-media"><img src="${e(page.image||divisions[page.division]?.image||'/assets/site/auto.webp')}" alt="${page.division==='home'?'Residential window film':page.division==='commercial'?'Commercial window film':'Automotive window tint from the Obsidian gallery'}" width="1000" height="1000" fetchpriority="high"></div></section>`;
}
function article(page) {
  return `<section class="section container article-layout"><aside class="article-nav"><p class="eyebrow">On this page</p>${page.sections.map((s,i)=>`<a href="#section-${i}">${e(s.heading)}</a>`).join('')}${button('Get a quote',divisions[page.division]?.quote||'/booking')}</aside><div class="article">${page.sections.map((s,i)=>`<section id="section-${i}"><h2>${e(s.heading)}</h2>${String(s.body).split(/\n\n/).map(p=>`<p>${e(p)}</p>`).join('')}</section>`).join('')}</div></section>`;
}
function faq(page) {
  if(!page.faqs?.length)return '';
  return `<section class="section container"><div class="section-heading"><h2>A few things<br>worth knowing.</h2></div><div class="faq">${page.faqs.map(f=>`<details><summary>${e(f.question)}</summary><p>${e(f.answer)}</p></details>`).join('')}</div></section>`;
}
function linkedPages(title,selected) {
  if(!selected.length)return '';
  return `<section class="section container"><div class="section-heading"><h2>${e(title)}</h2></div><div class="card-grid">${selected.map(card).join('')}</div></section>`;
}
function directory(page) {
  if(page.path==='/services')return linkedPages('Choose your service',pages.filter(p=>['service','hub'].includes(p.type)&&p.division!=='shared'&&p.path!==page.path))+
    linkedPages('Find your vehicle',pages.filter(p=>p.division==='auto'&&p.type==='vehicle'));
  if(page.path==='/guides')return ['auto','home','commercial'].map(d=>linkedPages(divisions[d].label+' guides',pages.filter(p=>p.division===d&&['guide','project'].includes(p.type)))).join('');
  if(page.path==='/service-areas')return ['auto','home','commercial'].map(d=>linkedPages(divisions[d].label+' service areas',pages.filter(p=>p.division===d&&p.type==='city'))).join('');
  if(Object.values(divisions).some(d=>d.path===page.path)){
    return linkedPages('Find the right film',pages.filter(p=>p.division===page.division&&p.type==='service'&&p.path!==page.path))+
      linkedPages('Find your vehicle',pages.filter(p=>p.division===page.division&&p.type==='vehicle'))+
      linkedPages('We come to your area',pages.filter(p=>p.division===page.division&&p.type==='city'));
  }
  return '';
}
function home(page) {
  return `<section class="hero hero--home container"><div class="hero-heading"><div><p class="eyebrow">Obsidian Film Solutions · We come to you</p><h1>Mobile Window Tinting<br><em>Orange County.</em></h1></div><div><p>Ceramic tint in your driveway.<br>Window film for homes and businesses.</p>${button('Explore the free upgrade','/driveway-package')}</div></div>${servicePanels()}</section>${offer()}${reviews(reviewData)}<section class="section container split"><div><p class="eyebrow">Made for life in the sun</p><h2>Keep the light.<br>Make it yours.</h2><p>From the morning commute to the afternoon sun in your living room, choose film around the way you use your space.</p>${button('Explore home film','/architectural-window-film',true)}</div><img src="/assets/site/work-home.webp" width="1000" height="900" alt="Window film in a bright residential space" loading="lazy"></section>${linkedPages('A little guidance goes a long way',pages.filter(p=>p.type==='guide').slice(0,3))}${instagramSection()}${quotePanel('auto')}`;
}
function gallery() {
  const entries=JSON.parse(read('content/gallery.json'));
  return `<section class="section container" data-gallery><div class="gallery-filters" role="group" aria-label="Filter gallery">${[['all','All work'],['auto','Auto'],['home','Homes'],['commercial','Commercial']].map(([value,label])=>`<button data-gallery-filter="${value}" aria-pressed="${value==='all'}">${label}</button>`).join('')}</div><p data-gallery-count aria-live="polite">${entries.length} projects</p><div class="gallery-grid">${entries.map(entry=>`<figure class="gallery-item" data-gallery-category="${entry.division}"><a href="${entry.images[0].src}" data-lightbox data-caption="${e(entry.title)}"><img src="${entry.images[0].src}" alt="${e(entry.images[0].alt)}" loading="lazy" width="900" height="900"></a><figcaption>${e(entry.title)}</figcaption><div class="gallery-thumbnails">${entry.images.slice(1).map(image=>`<a href="${image.src}" data-lightbox data-caption="${e(entry.title)}"><img src="${image.src}" alt="${e(image.alt)}" loading="lazy" width="160" height="160"></a>`).join('')}</div></figure>`).join('')}</div></section>`;
}
function booking(page) {
  return `<section class="hero hero--home container"><p class="eyebrow">Let's make it yours</p><h1>What are we<br><em>working on?</em></h1><p>Choose your project to start your quote.</p><div class="service-grid">${Object.values(divisions).map(d=>`<a class="service-card" href="${d.quote}"><img src="${d.image}" alt="" width="800" height="900"><div class="service-card-content"><span class="eyebrow">${d.label}</span><h2>${d.subtitle}</h2><span>Start my project ↗</span></div></a>`).join('')}</div></section>${offer()}`;
}
for(const page of pages) {
  page.sections??=[];page.relatedPaths??=[];
  let body;
  if(page.path==='/')body=home(page);
  else if(page.path==='/booking')body=booking(page);
  else {
    body=heading(page);
    if(page.path==='/window-tinting-gallery')body+=gallery();
    if(page.division==='auto'&&['hub','service'].includes(page.type))body+=offer();
    body+=directory(page)+article(page)+faq(page);
    body+=linkedPages('Keep exploring',page.relatedPaths.map(p=>byPath.get(p)).filter(Boolean).slice(0,6));
    if(['hub','service','vehicle'].includes(page.type))body+=reviews(reviewData);
    body+=quotePanel(page.division);
  }
  write(destination(page.path).slice(1),shell(page,body));
}
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(p=>`  <url><loc>${origin}${e(p.path)}</loc></url>`).join('\n')+'\n</urlset>\n');
write('content/build-manifest.json',JSON.stringify(pages.map(p=>({path:p.path,file:destination(p.path),title:p.title,division:p.division,type:p.type})),null,2));
console.log(`Rendered ${pages.length} pages with shared templates, metadata, navigation and sitemap.`);
