import fs from 'node:fs';
import {withBuildingPhoto} from './building-photos.mjs';
const gallery=JSON.parse(fs.readFileSync(new URL('../content/gallery.json',import.meta.url),'utf8'));
const normalized=src=>'/'+src.replace(/^\/+/, '');
const catalog=gallery.flatMap(group=>group.images.map(image=>({...image,src:normalized(image.src),group:group.title,division:group.division})));
const photo=src=>catalog.find(image=>image.src===src);
const cycle=(items,path)=>items[[...path].reduce((sum,char)=>sum+char.charCodeAt(0),0)%items.length];
const autoPool=catalog.filter(image=>image.division==='auto'&& !/interior|roof/i.test(image.alt));
// Generic auto pages lead with a reviewed premium photo (content/photo-curation.json).
const curated=JSON.parse(fs.readFileSync(new URL('../content/photo-curation.json',import.meta.url),'utf8')).photos;
const premiumPool=autoPool.filter(image=>curated[image.src]);
const exactGroups=[['bmw-m4','BMW M4'],['bmw-x3','BMW X3'],['toyota-tacoma','Toyota Tacoma'],['toyota-4runner','Toyota 4Runner'],['porsche-911','Porsche 911'],['tesla-model-y','Tesla Model Y']];
function autoChoices(page){
 const path=page.path;
 const exact=exactGroups.find(([key])=>path.includes(key));
 if(exact)return catalog.filter(image=>image.group===exact[1]);
 if(/ceramic-coating/.test(path))return [
  {src:'/assets/ceramic-coating/foam-bmw.webp',alt:'BMW being washed during exterior preparation'},
  {src:'/assets/ceramic-coating/paint-detail.webp',alt:'Close view of vehicle paint from the Obsidian portfolio'}];
 if(/sunroof|tesla-model-[3x]/.test(path))return [photo('/assets/paid-landing/tesla-glass-roof.webp'),photo('/assets/paid-landing/tesla-model-y-front.webp')].filter(Boolean);
 if(/windshield/.test(path))return catalog.filter(image=>image.group==='Chevrolet Corvette');
 if(/front-two|front-window|matching|factory-privacy|range-rover/.test(path))return catalog.filter(image=>image.group==='Lexus GX');
 if(/sides-rear|family-suv|rear-tint/.test(path))return catalog.filter(image=>image.group==='Porsche Cayenne Coupe');
 if(/mercedes|luxury|full-car|chrome-delete/.test(path))return catalog.filter(image=>image.group==='Mercedes-AMG GT');
 if(/mobile|workplace|apartment/.test(path))return catalog.filter(image=>image.group==='Porsche 911');
 if(/tesla/.test(path))return catalog.filter(image=>image.group==='Tesla Model Y');
 const primary=cycle(premiumPool.length?premiumPool:autoPool,path);
 return [primary,...catalog.filter(image=>image.group===primary.group&&image.src!==primary.src)];
}
export function withPortfolioPhoto(record){
 let page=withBuildingPhoto(record);
 if(!['auto','home','commercial'].includes(page.division))return page;
 const choices=page.division==='auto'?autoChoices(page):catalog.filter(image=>image.division===page.division);
 // Auto city pages keep a set photo only if it is on the reviewed premium list.
 const existing=page.image&&page.imageKind!=='illustration'&&!page.image.endsWith('.svg')&&!(page.division==='auto'&&['city','service','hub'].includes(page.type)&&!curated[normalized(page.image)]);
 const selected=existing?{src:normalized(page.image),alt:page.imageAlt||photo(normalized(page.image))?.alt}:choices[0];
 if(!selected)return page;
 let caption=page.imageCaption;
 if(['city','project'].includes(page.type))caption='From our work';
 // When the precise vehicle is absent, name what the real photograph actually shows.
 const vehicleExample=page.type==='vehicle'&&!exactGroups.some(([key])=>page.path.includes(key));
 if(vehicleExample)caption='Portfolio example: '+selected.alt;
 if(page.path==='/chrome-delete')caption='AMG GT from our tint portfolio';
 const support=choices.find(image=>image.src!==selected.src);
 const insetOnly=['/mercedes-c-class-window-tinting','/range-rover-sport-window-tinting'].includes(page.path);
 return {...page,photoInsetOnly:insetOnly,image:selected.src,imageAlt:selected.alt||'Obsidian portfolio photograph',imageKind:'photo',...(caption?{imageCaption:caption}:{}),...(insetOnly?{supportImage:{src:selected.src,alt:selected.alt,caption:'Portfolio example: '+selected.alt}}:support?{supportImage:{src:support.src,alt:support.alt,...(vehicleExample?{caption:'Portfolio example: '+support.alt}:{})}}:{})};
}
