import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
const pages=read('content/pages.json');
for(const file of ['content/revisions-auto.json','content/revisions-buildings.json']){
 if(!fs.existsSync(new URL(file,root)))continue;
 for(const update of read(file)){
  const index=pages.findIndex(p=>p.path===update.path);
  if(index<0)throw new Error('Unknown page '+update.path);
  pages[index]=update;
 }
}
const shared={
 '/':{title:'Mobile Window Tinting Orange County',description:'Mobile ceramic window tinting in Orange County, plus home and commercial window film. Explore real work and the Driveway Package from Obsidian.',intro:'Mobile ceramic tint for your vehicle. Thoughtful window film for the spaces you live and work in.',sections:[],faqs:[],relatedPaths:['/mobile-window-tinting','/architectural-window-film','/commercial-window-film']},
 '/window-tinting-gallery':{title:'The work, in the real world.',description:'Explore Obsidian’s real automotive, residential and commercial window-film gallery. Filter by project type and open photographs for a closer look.',intro:'From a classic Karmann Ghia to glass-filled homes and offices. Explore photographs from the Obsidian portfolio, then take a closer look.',sections:[],faqs:[],relatedPaths:['/booking']},
 '/booking':{title:'Tell us what you have in mind.',description:'Start an automotive tint quote or request a home or commercial window-film review. Choose the project type to reach the right Obsidian quote flow.',intro:'A vehicle, a home or a commercial property: choose your starting point and we’ll help define the details.',sections:[],faqs:[],relatedPaths:['/window-tint-pricing','/commercial-window-film-cost','/home-window-film-cost']},
 '/services':{title:'Different glass. The right approach.',description:'Explore automotive tint and coating, residential solar and privacy film, and commercial window-film services from Obsidian Autoworks.',intro:'Start with what you want to change. Each service below explains its own coverage, decisions and next steps.',sections:[],faqs:[],relatedPaths:[]},
 '/guides':{title:'Good decisions start here.',description:'Read practical Obsidian guides to tint shades, vehicle coverage, home privacy, commercial film and project planning before choosing a service.',intro:'Compare your options, understand the tradeoffs and prepare a useful project brief. Pick a question, not just a product.',sections:[],faqs:[],relatedPaths:[]},
 '/service-areas':{title:'Find your place in the plan.',description:'Find Obsidian automotive, home and commercial film information by Orange County service area, with practical details for planning a visit.',intro:'Choose your city and the kind of work you need. We confirm access and installation conditions for the actual vehicle or property.',sections:[],faqs:[],relatedPaths:[]},
 '/about':{title:'Care for the glass. Respect for your day.',description:'Meet the approach behind Obsidian Autoworks: mobile automotive work, thoughtful building-film recommendations and clear project expectations.',intro:'Obsidian Autoworks brings vehicle tinting to your location and helps homeowners and businesses make better decisions about their glass.',image:'/gallery/tintwiz-20261025/volkswagen-karmann-ghia-02.webp',imageAlt:'Detail of the glass on a classic Volkswagen Karmann Ghia in the Obsidian portfolio',sections:[
 {heading:'The work starts with listening',body:'A darker-looking car, a cooler-feeling room and a private meeting space are different goals. We ask how you use the vehicle or space before defining the work. Glass coverage, product choice, location and access belong in that conversation from the start.'},
 {heading:'One team, three kinds of projects',body:'Automotive projects focus on the vehicle and requested glass, with ceramic tint, removal, coating and other services discussed by scope. Home projects begin with the room, daylight and privacy needs. Commercial projects add the practical requirements of an occupied property, from access to the people who approve the work.'},
 {heading:'Let the details speak',body:'The portfolio shows actual vehicles and building glass from Obsidian’s work. Google reviews share customers’ experiences with Kislev and the team. We keep those two kinds of evidence separate: a photograph illustrates the work, while a review belongs to the person who wrote it.'},
 {heading:'Know what happens next',body:'Send the vehicle details or property photographs, tell us what you want to improve and include the installation city. We use that information to clarify the scope and any questions before the estimate or appointment. You should know which glass, film and work the project includes.'}],faqs:[],relatedPaths:['/window-tinting-gallery','/services','/booking'],quotePrompt:'Choose Auto, Homes or Commercial and tell us what you would like to improve.'}
};
for(const page of pages)if(shared[page.path])Object.assign(page,shared[page.path]);
const seoTitles={'/window-tinting-gallery':'Window Tinting Gallery','/guides':'Window Tint and Film Guides','/service-areas':'Orange County Window Tint Service Areas','/services':'Auto, Home and Commercial Window Film Services','/booking':'Request a Window Tint Quote','/about':'About Obsidian'};
for(const page of pages)if(seoTitles[page.path])page.seoTitle=seoTitles[page.path];
const media=read('content/media-map.json');
const map=media.byPath;
if(map)for(const page of pages){
 const found=map[page.path];
 if(found&&['hub','vehicle','service'].includes(page.type))Object.assign(page,{image:found.image,imageAlt:found.imageAlt});
}
// A missing real model photograph is not replaced by a different vehicle.
for(const [pathname,file]of Object.entries({'/tesla-model-3-window-tinting':'tesla-model-3.webp','/tesla-model-x-window-tinting':'tesla-model-x.webp'})){
 const page=pages.find(p=>p.path===pathname);
 if(page&&!page.image)Object.assign(page,{image:'/assets/quote/'+file,imageAlt:page.title+' vehicle illustration',imageKind:'illustration',imageCaption:'Vehicle illustration. See the gallery for actual Obsidian installations.'});
}
for(const page of pages)delete page.cityContext;
fs.writeFileSync(new URL('content/pages.json',root),JSON.stringify(pages,null,2)+'\n');
console.log('Merged authored revisions and shared utility content.');
