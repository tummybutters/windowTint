import {imageTag} from './media.mjs';
import {escape as e, divisions, button, reviews, card} from './components.mjs';

const paragraph = body => String(body||'').split(/\n\n/).map(text=>`<p>${e(text)}</p>`).join('');
const label = page => divisions[page.division]?.label || 'Obsidian';
const topic = page => page.title.replace(/\s+(in|across) Orange County$/i,'');
const specialty=page=>page.path.includes('ceramic-coating')||page.path==='/chrome-delete';
export function quoteHref(page) {
  if(specialty(page))return 'sms:+17146007134';
  if(page.path==='/tint-removal')return '/car-window-tinting-near-me?quote_coverage=Tint%20removal#quote';
  const presets={'/front-two-window-tinting':'front_two','/sides-rear-window-tinting':'sides_rear','/full-car-window-tinting':'full_car','/windshield-window-tinting':'windshield'};
  if(presets[page.path])return '/car-window-tinting-near-me?quote_coverage='+presets[page.path]+'#quote';
  if(page.path==='/tesla-model-y-window-tinting')return '/tesla-model-y-window-tint#quote';
  if(page.path==='/tesla-model-3-window-tinting')return '/tesla-model-3-window-tint#quote';
  return divisions[page.division]?.quote||'/booking';
}
function crumbs(page) {
  const parent=divisions[page.division];
  return `<nav class="page-breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a>${parent&&parent.path!==page.path?`<span aria-hidden="true">/</span><a href="${parent.path}">${parent.label}</a>`:''}<span aria-hidden="true">/</span><span>${e(page.type==='project'?'Planning guide':page.type==='guide'?'Guide':page.type==='city'?'Service area':topic(page))}</span></nav>`;
}
function image(page, className='page-photo') {
  if(!page.image)return '';
  return `<figure class="${className}">${imageTag(page.image,page.imageAlt||page.title,{loading:'eager'})}${page.imageCaption?`<figcaption>${e(page.imageCaption)}</figcaption>`:''}</figure>`;
}
function eyebrow(page) {
  return page.type==='guide'?`${label(page)} / Field notes`:page.type==='project'?`${label(page)} / Project planner`:page.type==='city'?`${label(page)} / At your location`:page.type==='vehicle'?'Your vehicle. Your glass.':`${label(page)} / Obsidian Film Solutions`;
}
function intro(page,kind,{photo=true,action=true}={}) {
  return `<section class="container page-intro page-intro--${kind}${photo&&page.image?' has-photo':''}" data-layout="${kind}">${crumbs(page)}<div class="page-intro-grid"><div><p class="eyebrow">${e(eyebrow(page))}</p><h1>${e(page.title)}</h1><p class="page-deck">${e(page.intro)}</p>${action?`<div class="actions">${button(specialty(page)?'Text us about your vehicle':page.division==='auto'?'Get my quote':page.division==='home'?'Explore my options':'Request a site review',quoteHref(page),page.type==='city')}${specialty(page)?button('Call (714) 600-7134','tel:+17146007134',true):''}</div>`:''}</div>${photo?image(page):''}</div></section>`;
}
function highlights(page) {
  if(!page.highlights?.length)return '';
  return `<dl class="page-highlights">${page.highlights.map(h=>`<div><dt>${e(h.label)}</dt><dd>${e(h.value)}</dd></div>`).join('')}</dl>`;
}
function comparison(page) {
  if(!page.comparison?.rows?.length)return '';
  const {columns,rows}=page.comparison;
  const pricing=rows.some(row=>row.some(cell=>String(cell).includes('$')));
  return `<section class="comparison-module${pricing?' comparison-module--pricing':''}" data-columns="${columns.length}" aria-label="${e(page.comparison.title||'Compare the options')}"><p class="eyebrow">${e(page.comparison.title||'The decision, side by side')}</p><div class="comparison-scroll" tabindex="0" role="region" aria-label="Scrollable comparison table"><table><thead><tr>${columns.map(c=>`<th scope="col">${e(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,i)=>i===0?`<th scope="row">${e(cell)}</th>`:`<td>${e(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
}
function checklist(page) {
  if(!page.checklist?.length)return '';
  return `<aside class="checklist-module"><p class="eyebrow">${e(page.checklistTitle||'Bring this to the conversation')}</p><ul>${page.checklist.map((item,i)=>`<li><span aria-hidden="true">${String(i+1).padStart(2,'0')}</span>${e(item)}</li>`).join('')}</ul></aside>`;
}
function steps(page) {
  if(!page.steps?.length)return '';
  return `<section class="steps-module" aria-label="Project steps">${page.steps.map((s,i)=>`<div><span class="step-number">${String(i+1).padStart(2,'0')}</span><h3>${e(s.title)}</h3><p>${e(s.body)}</p></div>`).join('')}</section>`;
}
function contentSections(page,kind='article') {
  return `<div class="content-sections content-sections--${kind}">${page.sections.map((s,i)=>`<section id="detail-${i}"><span class="section-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><div><h2>${e(s.heading)}</h2>${paragraph(s.body)}</div></section>`).join('')}</div>`;
}
function faq(page) {
  return page.faqs?.length?`<section class="container section page-faq"><div><p class="eyebrow">A little clarity</p><h2>${page.type==='vehicle'?'Before you tint.':page.type==='city'?'Before we come to you.':'Questions worth asking.'}</h2></div><div class="faq">${page.faqs.map(f=>`<details><summary>${e(f.question)}</summary><p>${e(f.answer)}</p></details>`).join('')}</div></section>`:'';
}
function related(page,index) {
  const selected=[...new Set(page.relatedPaths||[])].filter(p=>p!==page.path).map(p=>index.get(p)).filter(Boolean).slice(0,5);
  if(!selected.length)return '';
  return `<section class="section container related-reading"><p class="eyebrow">A useful next step</p><div class="related-list">${selected.map(p=>`<a href="${e(p.path)}"><span>${e(label(p))}</span><h3>${e(p.title)}</h3><span aria-hidden="true">↗</span></a>`).join('')}</div></section>`;
}
function close(page) {
  return `<section class="container section"><div class="page-close"><div><p class="eyebrow">${e(topic(page))}</p><h2>${e(page.quotePrompt||'Tell us what you want to change, and we’ll help define the right scope.')}</h2></div>${button(specialty(page)?'Text us about your project':page.division==='commercial'?'Request a site review':page.division==='home'?'Discuss my windows':'Start my quote',quoteHref(page))}</div></section>`;
}
function contents(page) {
  return `<aside class="reading-nav"><p class="eyebrow">In this guide</p><ol>${page.sections.map((s,i)=>`<li><a href="#detail-${i}">${e(s.heading)}</a></li>`).join('')}</ol></aside>`;
}
function coverageDiagram(page) {
  const matches={'/front-two-window-tinting':['front','Front two windows'],'/sides-rear-window-tinting':['sides','Side windows + rear glass'],'/full-car-window-tinting':['full','Confirm full-vehicle coverage'],'/windshield-window-tinting':['windshield','Windshield, quoted separately']};
  const config=matches[page.path]; if(!config)return '';
  const [key,text]=config;const active=(part)=>key==='full'&&part!=='windshield'||key==='sides'&&part!=='windshield'||key==='front'&&part==='front'||key==='windshield'&&part==='windshield';
  const fill=part=>active(part)?'#ff754e':'#353c32';
  return `<figure class="coverage-diagram"><svg viewBox="0 0 560 270" role="img" aria-label="Illustrated glass coverage: ${e(text)}"><path d="M98 90Q130 38 240 38h70q80 0 130 59l45 29v68H65v-66Z" fill="#1c201a" stroke="#737b6c" stroke-width="2"/><circle cx="145" cy="194" r="38" fill="#111310" stroke="#737b6c" stroke-width="2"/><circle cx="405" cy="194" r="38" fill="#111310" stroke="#737b6c" stroke-width="2"/><path d="m125 91 25-27 76-10v57H110Z" fill="${fill('rear')}"/><path d="M238 54h60q21 1 40 9l21 48H238Z" fill="${fill('front')}"/><path d="m350 66 61 45h-39Z" fill="${fill('windshield')}"/><path d="M90 116h372" stroke="#737b6c" stroke-width="1"/><path d="M232 121v51M366 120v51" stroke="#737b6c"/><path d="M259 126h24" stroke="#eeeae2" stroke-width="3"/></svg><figcaption><span class="coverage-key"></span>${e(text)}<small>Coverage illustration · the exact glass is confirmed for your vehicle.</small></figcaption></figure>`;
}
function sources(page) {
  if(!page.sources?.length)return '';
  return `<aside class="container source-links"><p class="eyebrow">Further reading</p><ul>${page.sources.map(source=>`<li><a href="${e(source.url)}" target="_blank" rel="noopener">${e(source.title)} ↗</a></li>`).join('')}</ul></aside>`;
}
function cityContext(page) {
  const c=page.cityContext;if(!c)return '';
  const facts=c.facts||[];
  const links=(list)=>list.map(p=>`<a href="${e(p.path)}">${e(p.title)} <span aria-hidden="true">↗</span></a>`).join('');
  return `<section class="container city-context"><div><p class="eyebrow">At your ${e(c.city)} address</p><h2>A visit that fits<br>your location.</h2>${c.planning?`<p>${e(c.planning)}</p><details class="local-source"><summary>Local setting</summary>${facts.map(fact=>`<p>${e(fact.text)} <a href="${e(fact.sourceUrl)}" target="_blank" rel="noopener">City information ↗</a></p>`).join('')}</details>`:'<p>Explore the services available at your address, or find a nearby service area.</p>'}</div><nav aria-label="Related local services">${c.otherServices.length?`<p class="eyebrow">Also in ${e(c.city)}</p>${links(c.otherServices)}`:''}${c.nearby.length?`<p class="eyebrow">Looking nearby?</p>${links(c.nearby)}`:''}</nav></section>`;
}
function directoryGroup(title,selected,{photos=false,excludeImage=null}={}) {
  if(!selected.length)return '';
  return `<section class="section container directory-group"><div class="section-heading"><h2>${e(title)}</h2><span class="eyebrow">${selected.length} ways to explore</span></div><div class="${photos?'catalog-cards':'directory-links'}">${selected.map(p=>photos?`<a class="catalog-card" href="${p.path}">${p.image&&p.image!==excludeImage&&selected.findIndex(item=>item.image===p.image)===selected.indexOf(p)?`${imageTag(p.image,p.imageAlt||p.title,{sizes:'(max-width: 760px) calc(100vw - 40px), 30vw'})}`:''}<span class="eyebrow">${e(label(p))}</span><h3>${e(p.title)}</h3><p>${e(p.description)}</p><span aria-hidden="true">↗</span></a>`:`<a href="${p.path}"><span>${e(p.title)}</span><span aria-hidden="true">↗</span></a>`).join('')}</div></section>`;
}
export function renderInner(page,pages,reviewData) {
  const index=new Map(pages.map(p=>[p.path,p])); let body='';
  const tail=()=>faq(page)+sources(page)+related(page,index)+close(page);
  if(page.path==='/about')return intro(page,'story')+`<section class="container section">${contentSections(page,'feature')}</section>`+reviews(reviewData)+related(page,index)+close(page);
  if(page.type==='hub') {
    body=intro(page,'division')+directoryGroup('Choose your '+(page.division==='auto'?'coverage':'film'),pages.filter(p=>p.division===page.division&&p.type==='service'),{photos:true,excludeImage:page.image});
    if(page.division==='auto')body+=`<section class="container compact-offer"><div><p class="eyebrow">The Driveway Package</p><h2>Ceramic sides + rear.<br><em>A free upgrade, too.</em></h2><p>Explore eligible sun strip or standard single-panel sunroof options. Tesla and specialty vehicles quoted separately.</p></div>${button('See package details','/driveway-package')}</section>`;
    body+=`<section class="container hub-story">${highlights(page)}${contentSections(page,'feature')}${steps(page)}${comparison(page)}${checklist(page)}</section>`;
    if(page.division==='auto')body+=directoryGroup('Find your vehicle',pages.filter(p=>p.type==='vehicle'));
    body+=directoryGroup('Where we come to you',pages.filter(p=>p.division===page.division&&p.type==='city'));
    return body+tail();
  }
  if(page.type==='vehicle') {
    return intro(page,'vehicle')+`<section class="container vehicle-details">${highlights(page)}${comparison(page)}<div class="detail-columns">${contentSections(page,'numbered')}<div>${checklist(page)}${page.image&&page.imageKind!=='illustration'?`<p class="photo-context">Photography shows this vehicle model from the Obsidian gallery. Your glass and requested coverage are confirmed individually.</p>`:''}</div></div>${steps(page)}</section>`+tail();
  }
  if(page.type==='guide') {
    const count=(page.sections.map(s=>s.body).join(' ').match(/\S+/g)||[]).length;
    return intro(page,'editorial',{photo:false,action:false})+`<div class="container reading-meta"><span>${Math.max(2,Math.ceil(count/180))} minute read</span><span>${e(label(page))} advice</span></div><section class="container editorial-layout">${contents(page)}<div>${highlights(page)}${contentSections(page)}${comparison(page)}${steps(page)}${checklist(page)}</div></section>`+sources(page)+related(page,index)+faq(page)+close(page);
  }
  if(page.type==='city') {
    const hasPlanner=Boolean(page.checklist?.length||page.steps?.length);
    return intro(page,'local',{photo:false})+`<section class="container local-layout${hasPlanner?'':' local-layout--wide'}"><div>${highlights(page)}${contentSections(page,'brief')}</div>${hasPlanner?`<div class="local-planner"><p class="eyebrow">Plan the visit</p>${checklist(page)}${steps(page)}</div>`:''}</section>${page.comparison?`<section class="container section">${comparison(page)}</section>`:''}`+cityContext(page)+tail();
  }
  if(page.type==='project') {
    return intro(page,'worksheet',{photo:false,action:false})+`<section class="container worksheet-layout"><aside class="planner-note"><p class="eyebrow">A planning guide</p><p>Use this page to prepare your own project. It describes decisions to make, rather than a completed installation.</p>${highlights(page)}${checklist(page)}</aside><div>${steps(page)}${contentSections(page,'numbered')}${comparison(page)}</div></section>`+tail();
  }
  if(page.type==='service') {
    const diagram=coverageDiagram(page);
    return intro(page,page.path==='/window-tint-pricing'?'pricing':page.comparison?'comparison':'service',{action:page.path!=='/window-tint-pricing'})+`<section class="container service-detail">${highlights(page)}${diagram}${comparison(page)}<div class="detail-columns">${contentSections(page,'feature')}<div>${checklist(page)}</div></div>${steps(page)}</section>`+tail();
  }
  return intro(page,'utility',{photo:false})+`<section class="container section">${contentSections(page)}</section>`+tail();
}
export function renderDirectory(page,pages) {
  let out=intro(page,'directory',{photo:false,action:false});
  if(page.path==='/services')for(const [key,division]of Object.entries(divisions))out+=directoryGroup(division.label,pages.filter(p=>p.division===key&&['service','hub'].includes(p.type)),{photos:false});
  if(page.path==='/services')out+=directoryGroup('Vehicle-specific tinting',pages.filter(p=>p.type==='vehicle'));
  if(page.path==='/guides')for(const [key,division]of Object.entries(divisions))out+=directoryGroup(division.label+' guides',pages.filter(p=>p.division===key&&p.type==='guide'),{photos:true})+directoryGroup(division.label+' project planners',pages.filter(p=>p.division===key&&p.type==='project'));
  if(page.path==='/service-areas')for(const [key,division]of Object.entries(divisions))out+=directoryGroup(division.label+' — service areas',pages.filter(p=>p.division===key&&p.type==='city'));
  return out;
}
