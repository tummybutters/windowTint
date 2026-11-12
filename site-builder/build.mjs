import {withBuildingPhoto} from './building-photos.mjs';
import {attachCityContext} from './city-context.mjs';
import {imageTag} from './media.mjs';
import {renderInner,renderDirectory,sharedNextStep} from './page-layouts.mjs';
import {instagramSection} from './social.mjs';
import {attachInternalLinks} from './internal-links.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {origin, escape as e, divisions, button, shell, offer, reviews, servicePanels, card, quotePanel} from './components.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pages=JSON.parse(read(process.env.OBSIDIAN_LAYOUT_DATA || 'content/pages.json')).map(withBuildingPhoto);
attachInternalLinks(pages,['shared','auto','home','commercial'].flatMap(division=>JSON.parse(read(`content/internal-links-${division}.json`))));
attachCityContext(pages,JSON.parse(read('content/city-context.json')));
const reviewData=JSON.parse(read('content/reviews.json'));
const byPath=new Map(pages.map(page=>[page.path,page]));
const destination=p=>'/generated/'+(p==='/'?'index':p.slice(1))+'.html';
const write=(file,contents)=>{
  fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});
  fs.writeFileSync(path.join(root,file),contents);
};
if(pages.length!==150 || byPath.size!==150) throw new Error('Expected 150 unique page entries');

function linkedPages(title,selected) {
  if(!selected.length)return '';
  return `<section class="section container"><div class="section-heading"><h2>${e(title)}</h2></div><div class="card-grid">${selected.map(card).join('')}</div></section>`;
}
function home(page) {
  return `<section class="hero hero--home container"><div class="hero-heading"><div><p class="eyebrow">Obsidian Autoworks · We come to you</p><h1>Mobile Window Tinting<br><em>Orange County.</em></h1></div><div><p>Ceramic tint in your driveway.<br>Window film for homes and businesses.</p>${button('Explore the free upgrade','/driveway-package')}</div></div>${servicePanels()}</section>${offer()}${reviews(reviewData)}<section class="section container split"><div><p class="eyebrow">Made for life in the sun</p><h2>Keep the light.<br>Make it yours.</h2><p>From the morning commute to the afternoon sun in your living room, choose film around the way you use your space.</p>${button('Explore home film','/architectural-window-film',true)}</div>${imageTag("/gallery/tintwiz-20261111/living-room-glass.webp","Living-room sliding glass door opening onto a patio")}</section>${linkedPages('A little guidance goes a long way',Object.keys(divisions).map(division=>pages.find(p=>p.type==='guide'&&p.division===division)).filter(Boolean))}${instagramSection()}${quotePanel('auto')}`;
}
function gallery() {
  const entries=JSON.parse(read('content/gallery.json'));
  return `<section class="section container" data-gallery><div class="gallery-filters" role="group" aria-label="Filter gallery">${[['all','All work'],['auto','Auto'],['home','Homes'],['commercial','Commercial']].map(([value,label])=>`<button data-gallery-filter="${value}" aria-pressed="${value==='all'}">${label}</button>`).join('')}</div><p data-gallery-count aria-live="polite">${entries.length} collections</p><div class="gallery-grid">${entries.map(entry=>`<figure class="gallery-item" data-gallery-category="${entry.division}"><a href="${entry.images[0].src}" data-lightbox data-caption="${e(entry.title)}">${imageTag(entry.images[0].src,entry.images[0].alt,{sizes:'(max-width: 650px) calc(100vw - 40px), 30vw'})}</a><figcaption>${e(entry.title)}</figcaption><div class="gallery-thumbnails">${entry.images.slice(1).map(image=>`<a href="${image.src}" data-lightbox data-caption="${e(entry.title)}">${imageTag(image.src,image.alt,{thumbnail:true})}</a>`).join('')}</div></figure>`).join('')}</div></section>`;
}
function booking(page) {
  const names={auto:'My vehicle',home:'My home',commercial:'My business'};
  return `<section class="container project-picker"><h1>What are we working on?</h1><p>Choose your project to start.</p><div class="project-options">${Object.entries(divisions).map(([key,d])=>`<a class="project-option" href="${d.quote}"><img src="${d.image}" alt="" width="800" height="900"><span>${names[key]}</span><span aria-hidden="true">↗</span></a>`).join('')}</div></section>`;
}

for(const page of pages) {
  page.sections??=[];page.relatedPaths??=[];
  let body;
  if(page.path==='/')body=home(page);
  else if(page.path==='/booking')body=booking(page);
  else if(['/services','/guides','/service-areas'].includes(page.path))body=renderDirectory(page,pages);
  else if(page.path==='/window-tinting-gallery')body=`<section class="hero hero--home container"><p class="eyebrow">The Obsidian portfolio</p><h1>${e(page.title)}</h1><p>${e(page.intro)}</p></section>`+gallery()+sharedNextStep(page);
  else body=renderInner(page,pages,reviewData);

  write(destination(page.path).slice(1),shell(page,body));
}
write('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+pages.map(p=>`  <url><loc>${origin}${e(p.path)}</loc></url>`).join('\n')+'\n</urlset>\n');
write('content/build-manifest.json',JSON.stringify(pages.map(p=>({path:p.path,file:destination(p.path),title:p.title,division:p.division,type:p.type})),null,2));
console.log(`Rendered ${pages.length} pages with shared templates, metadata, navigation and sitemap.`);
