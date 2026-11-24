import fs from 'node:fs';
const e=value=>String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

const data=JSON.parse(fs.readFileSync(new URL('../content/organic-search.json',import.meta.url),'utf8'));
const reviewData=JSON.parse(fs.readFileSync(new URL('../content/reviews.json',import.meta.url),'utf8'));
const titleSuffix=' | Obsidian Autoworks';
const maxTitle=60;

export const organicSearch=data;

// Full organic title: the approved title, plus the brand only when it still fits in a search result.
export function organicTitle(page) {
  if(!page.metaTitle)return null;
  return page.metaTitle.length+titleSuffix.length<=maxTitle?page.metaTitle+titleSuffix:page.metaTitle;
}

export function applyOrganicSearch(pages) {
  const byPath=new Map(pages.map(page=>[page.path,page]));
  for(const [path,copy] of Object.entries(data.pages)) {
    const page=byPath.get(path);
    if(!page)continue; // Packages page is rendered outside pages.json.
    for(const key of ['metaTitle','description','intro','introExtra','proof','questions','questionCity'])if(copy[key]!==undefined)page[key]=copy[key];
  }
  return pages;
}

// Four proof figures, each from the site's own sources (reviews.json and the approved offer terms).
export function proofItems() {
  return [
    {value:reviewData.rating.toFixed(1),label:`stars from ${reviewData.count} Google reviews`},
    {value:'From $500',label:'ceramic sides and rear, installed at your home or office'},
    {value:'Lifetime',label:'tint warranty'},
    {value:'Avery Dennison',label:'nano ceramic film'}
  ];
}
export function proofStats(page={proof:true}) {
  if(!page.proof)return '';
  return `<ul class="proof-stats" aria-label="Why customers choose Obsidian">${proofItems().map(item=>`<li><strong>${e(item.value)}</strong><span>${e(item.label)}</span></li>`).join('')}</ul>`;
}
// Notes that sit with the introduction: the pricing page's package list and the city pages' tint-law line.
export function proofLine(page) {
  if(!page.proof)return '';
  const extra=page.introExtra?`<p class="page-packages">${e(page.introExtra)}</p>`:'';
  const law=page.type==='city'&&page.questions?`<p class="page-law">California treats front side windows and the windshield differently from rear glass, so we review your front-window plan against the current rule. <a href="/california-window-tint-law">California tint law <span aria-hidden="true">↗</span></a></p>`:'';
  return extra+law;
}

// The automotive cities that have their own window tinting page, in content order.
export function servedCities() {
  return Object.entries(data.pages).filter(([path,copy])=>/^\/[a-z-]+-window-tinting$/.test(path)&&typeof copy.questions==='string'&&copy.questions!=='orange-county').map(([,copy])=>copy.questions);
}

export function businessSchema(origin) {
  const b=data.business;
  const cities=servedCities();
  return {'@type':'AutomotiveBusiness','@id':origin+'/#business',name:b.name,url:origin+'/',telephone:b.telephone,priceRange:b.priceRange,image:origin+'/assets/site/auto.webp',areaServed:[...cities.map(name=>({'@type':'City',name:name+', CA'})),{'@type':'AdministrativeArea',name:'Orange County, CA'}],sameAs:b.sameAs,parentOrganization:{'@id':origin+'/#organization'}};
}

const P='(714) 600-7134';
// Each question has three phrasings; a city's position picks the phrasing so neighbouring pages differ.
const templates=[
  {
    q:[c=>`How much does window tinting cost in ${c}?`,c=>`What does ceramic tint cost in ${c}?`,c=>`How much is window tint for my car in ${c}?`],
    a:[
      c=>`Ceramic sides and rear are $500 for a coupe, $600 for a sedan and $700 for an SUV or truck. Two front windows start at $200 ($220 for an SUV or truck) and a full car starts at $720. Tesla sides and rear are $600 for a Model S, $700 for a Model Y and $950 for a Model 3.`,
      c=>`In ${c}, ceramic sides and rear are $500 on a coupe, $600 on a sedan and $700 on an SUV or truck. A two-window front match is $200 to $220 and a full car is $720 to $950. Tesla Model S, Y and 3 sides and rear are $600, $700 and $950.`,
      c=>`Two front windows cost $200 to $220, ceramic sides and rear cost $500 to $700 by vehicle size, and a full car costs $720 to $950. Tesla sides and rear are $600 (Model S), $700 (Model Y) and $950 (Model 3). Specialty glass is quoted separately.`
    ],
    link:{href:'/window-tint-pricing',label:'See every price'}
  },
  {
    q:[c=>`Do you come to my home or office in ${c}?`,c=>`Can you tint my car at my ${c} home or workplace?`,c=>`Is this a mobile service in ${c}?`],
    a:[
      c=>`Yes. We are a mobile tint service and install at your ${c} home, driveway or workplace. We confirm the location, workspace and any travel fee with your quote; travel fees may apply outside the complimentary service area.`,
      c=>`Yes. There is no shop to drive to: we bring the film and tools to your address in ${c}. Your quote confirms the spot, the timing and whether a travel fee applies.`,
      c=>`Yes. Every appointment is at your location, so your car is tinted at home or at work in ${c}. Tell us the address city and we confirm the workspace and any travel fee before booking.`
    ]
  },
  {
    q:[()=>`How long does window tinting take?`,c=>`How long will my ${c} appointment take?`,()=>`How much time should I set aside for tint?`],
    a:[
      ()=>`Two front windows take about an hour. Sides and rear take about 2½ hours on a coupe, 3½ hours on a sedan and 4 hours on an SUV or truck, and a full car takes about 3½ to 4 hours. Old-film removal adds time.`,
      ()=>`Plan on about an hour for two front windows and 2½ to 4 hours for sides and rear, depending on the vehicle. A full car takes about 3½ to 4 hours. Tell us about old film, since removal adds time.`,
      ()=>`About an hour for a front-window match, 2½ hours (coupe) to 4 hours (SUV or truck) for sides and rear, and 3½ to 4 hours for a full car. We confirm the time window with your quote, including any removal.`
    ],
    link:{href:'/how-long-does-window-tinting-take',label:'Timing guide'}
  },
  {
    q:[()=>`What tint is legal in California?`,c=>`What window tint is legal on my car in ${c}?`,()=>`Is dark tint legal on the front windows in California?`],
    a:[
      ()=>`California treats the windshield, front side windows and rear glass differently. Film on the windshield and front side windows is governed by Vehicle Code section 26708, and CHP guidance ties rear-window tint to having outside mirrors on both sides. We review your front-glass plan against the current rule before installing.`,
      ()=>`It depends on the window. The windshield and front side windows fall under California Vehicle Code section 26708, while rear glass can be darker when the car has outside mirrors on both sides, per CHP guidance. We check the front-window plan with you before any film goes on.`,
      ()=>`Front side windows and the windshield are restricted under California Vehicle Code section 26708; rear windows follow CHP guidance tied to dual outside mirrors. A percentage alone does not settle it, so we review your front glass and the film before installing.`
    ],
    link:{href:'/california-window-tint-law',label:'California tint law guide'}
  },
  {
    q:[()=>`Which film do you use and what's the warranty?`,()=>`What tint brand do you install?`,()=>`Is the tint covered by a warranty?`],
    a:[
      ()=>`We install Avery Dennison nano ceramic film, and the tint carries a lifetime warranty. You get the written warranty terms for your film with your installation.`,
      ()=>`Avery Dennison nano ceramic film, chosen for heat and glare reduction with a clean look. Your tint comes with a lifetime warranty, and we give you the written terms for the exact film installed.`,
      ()=>`Yes. The tint carries a lifetime warranty and is Avery Dennison nano ceramic film. Keep your invoice and window list; the written terms for your film come with your installation.`
    ],
    link:{href:'/window-tint-warranty-questions',label:'Warranty questions to ask'}
  },
  {
    q:[c=>`Can you tint at my apartment or office parking lot in ${c}?`,c=>`Can you work in an apartment garage or office lot in ${c}?`,c=>`What if I live in an apartment in ${c}?`],
    a:[
      ()=>`Usually, yes, if the property allows vehicle work in that space and there is room to work around the car. Check the building or parking rules, send a wide photo of the spot and tell us about gates or height limits.`,
      ()=>`Often, yes. We need permission to work in the space, room around the car and reliable access. Send a wide photo of the parking spot and note any gate, garage clearance or loading rules.`,
      ()=>`Apartment and office lots work when the property allows it and the car can stay available for the appointment. Ask the property contact about permission, then send us a photo of the space and any access instructions.`
    ],
    link:{href:'/apartment-office-mobile-tint',label:'Apartment and office tips'}
  }
];

export function questionsFor(page) {
  if(!page.questions)return [];
  const county=page.questions==='orange-county';
  const city=county?'Orange County':(page.questionCity||page.questions);
  const order=servedCities();
  const shift=county?0:Math.max(0,order.indexOf(page.questions))+1;
  const generated=templates.map((t,i)=>{
    const v=(shift+i)%3;
    return {question:t.q[v](city),answer:t.a[(shift+2*i)%3](city),link:t.link};
  });
  // Keep the page's own city-specific questions, now visible as well.
  return [...generated,...(page.faqs||[]).map(f=>({question:f.question,answer:f.answer}))];
}

export function questionsSection(page) {
  const items=questionsFor(page);
  if(!items.length)return '';
  const place=page.questions==='orange-county'?'Orange County':(page.questionCity||page.questions);
  return `<section class="container section page-faq page-questions" aria-labelledby="questions-heading"><div><h2 id="questions-heading">Window tinting questions in ${e(place)}.</h2><p>Call or text <a href="tel:+17146007134">${P}</a> for anything not answered here.</p></div><div class="faq faq--open">${items.map(item=>`<div class="faq-item"><h3>${e(item.question)}</h3><p>${e(item.answer)}${item.link?` <a href="${e(item.link.href)}">${e(item.link.label)} <span aria-hidden="true">↗</span></a>`:''}</p></div>`).join('')}</div></section>`;
}
