import fs from 'node:fs';
import {imageTag} from './media.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name,import.meta.url),'utf8'));
const variants=read('image-variants.json');
const curated=read('photo-curation.json').photos;
// Same photograph under different paths resolves to one optimized file.
// defined before the pools are built
const normalized=src=>'/'+String(src).replace(/^\/+/,'');
const photoKey=src=>variants[normalized(src)]?.display||normalized(src);
const e=value=>String(value ?? '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Real Obsidian photos by division. Project photos carry their verified job city; gallery photos name only the vehicle or space.
function buildPools() {
  const pools={auto:[],home:[],commercial:[]};
  for(const job of read('projects.json')){
    if(!pools[job.division])continue;
    for(const image of job.images.filter(image=>curated[image.src]))pools[job.division].push({
      src:image.src,
      ...curated[image.src],
      cityPage:'/'+job.city.toLowerCase().replaceAll(' ','-')+'-window-tinting',
      tag:(sizes,loading)=>`<img src="${e(image.small)}" srcset="${e(image.small)} 640w, ${e(image.src)} ${image.width}w" sizes="${e(sizes)}" alt="${e(`${job.car} with Obsidian window tint, photographed at the job in ${job.city}`)}" width="${image.width}" height="${image.height}" loading="${loading}" decoding="async">`,
      caption:`${job.car} · ${job.city}`
    });
  }
  for(const entry of read('gallery.json')){
    if(!pools[entry.division])continue;
    for(const image of entry.images.filter(image=>curated[normalized(image.src)]))pools[entry.division].push({
      src:image.src,
      ...curated[normalized(image.src)],
      tag:(sizes,loading)=>imageTag(image.src,image.alt,{sizes,loading}),
      caption:entry.title
    });
  }
  return pools;
}
const pools=buildPools();
// Keep the recorded subject in view: for a slot of a given width/height ratio, centre the subject on the visible part of the photo.
const ratioOf=html=>{const w=+html.match(/ width="(\d+)"/)?.[1],h=+html.match(/ height="(\d+)"/)?.[1];return w&&h?w/h:0.8};
const position=(centre,visible)=>visible>=1?50:Math.round(Math.min(1,Math.max(0,(centre-visible/2)/(1-visible)))*100);
for(const list of Object.values(pools))for(const photo of list){
  const tag=photo.tag;
  photo.tag=(sizes,loading,slot=1)=>{
    const html=tag(sizes,loading),source=ratioOf(html);
    const y=position(photo.subject.y,source<slot?source/slot:1),x=position(photo.subject.x,source>slot?slot/source:1);
    return html.replace('<img ',`<img style="object-position:${x}% ${y}%" `);
  };
}

function hash(text) {
  let h=2166136261;
  for(const char of text){h^=char.charCodeAt(0);h=Math.imul(h,16777619)}
  return h>>>0;
}
const gcd=(a,b)=>b?gcd(b,a%b):a;

// A page-specific walk through the pool, so pages get different photos in a different order and never repeat one on the same page.
export function photoPicker(page,exclude=[]) {
  const pool=pools[page.division]||pools.auto;
  const used=new Set([page.image,page.supportImage?.src,...exclude].filter(Boolean).map(photoKey));
  const seed=hash(page.path);
  let stride=1+seed%(pool.length-1||1);
  while(gcd(stride,pool.length)!==1)stride++;
  let cursor=seed%pool.length;
  return function pick(count,{splice=false}={}) {
    const chosen=[];
    for(let tries=0;chosen.length<count&&tries<pool.length*2;tries++){
      const photo=pool[cursor];cursor=(cursor+stride)%pool.length;
      if(splice&&!photo.splice)continue;
      const key=photoKey(photo.src);
      // City pages already list their own projects further down.
      if(used.has(key)||photo.cityPage===page.path)continue;
      used.add(key);chosen.push(photo);
    }
    return chosen;
  };
}

export function photoStrip(pick,label) {
  const photos=pick(3);
  if(photos.length<3)return '';
  return `<section class="container photo-strip" aria-label="${e(label)}">${photos.map(photo=>`<figure>${photo.tag('(max-width:760px) 80vw, 33vw','lazy',0.8)}<figcaption>${e(photo.caption)}</figcaption></figure>`).join('')}</section>`;
}

// Cards with a real photograph behind the text. items: [{eyebrow?, title, html}]
export function photoCards(pick,items,{heading='',className=''}={}) {
  if(!items.length)return '';
  const photos=pick(items.length);
  const cards=items.map((item,i)=>`<article class="photo-card">${photos[i]?photos[i].tag('(max-width:760px) 100vw, 33vw','lazy',items.length===4?1.55:1):''}<div class="photo-card__body">${item.eyebrow?`<p class="eyebrow">${e(item.eyebrow)}</p>`:''}<h3>${e(item.title)}</h3>${item.html}${photos[i]?`<small class="photo-card__caption">${e(photos[i].caption)}</small>`:''}</div></article>`).join('');
  return `<section class="photo-cards${className?' '+className:''}${items.length===4?' photo-cards--pairs':''}">${heading?`<h2>${e(heading)}</h2>`:''}<div class="photo-cards__grid">${cards}</div></section>`;
}

// Three photographs side by side behind a panel's content.
export function photoSplice(pick,slot=1.15) {
  const photos=pick(3,{splice:true});
  if(photos.length<3)return '';
  return `<div class="photo-splice" aria-hidden="true">${photos.map(photo=>photo.tag('(max-width:760px) 100vw, 440px','lazy',slot).replace(/ alt="[^"]*"/,' alt=""')).join('')}</div>`;
}
