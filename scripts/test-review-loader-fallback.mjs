import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../assets/quote/reviews.js',import.meta.url),'utf8');
for(const helper of [false,true])for(const mobile of [false,true]){
 let imgs=[], observed=0;
 const element=()=>({classList:{add(){},remove(){}},addEventListener(){},setAttribute(){},append(){},replaceChildren(){}});
 const images=element();Object.defineProperty(images,'innerHTML',{set(html){imgs=[...html.matchAll(/data-deferred-src="([^"]+)" data-deferred-srcset="([^"]*)"/g)].map(m=>({dataset:{deferredSrc:m[1],deferredSrcset:m[2]},removeAttribute(){}}));}});images.querySelectorAll=()=>imgs;
 const els={'.proof':element(),'#work-photo-tiles':images,'#review-content':element(),'#review-pause':element(),'#review-prev':element(),'#review-next':element()};
 const window={};window.parent=window;
 if(helper)window.ObsidianMedia={observe(container){observed++;for(const img of container.querySelectorAll())img.src=img.dataset.deferredSrc;}};
 vm.runInNewContext(source,{window,location:{pathname:'/',origin:'https://example.com'},document:{querySelector:s=>els[s],querySelectorAll:()=>[],createElement:element},matchMedia:q=>({matches:q.includes('700')?mobile:true,addEventListener(){}}),Image:class{},IntersectionObserver:class{observe(){}},setInterval(){},setTimeout});
 assert.equal(imgs.length,mobile?1:3);assert(imgs.every(i=>i.src.startsWith('/')));
 const first=imgs[0].src;els['#review-next'].onclick();assert.notEqual(imgs[0].src,first);assert(imgs.every(i=>i.src.startsWith('/')));
 assert.equal(observed,helper?2:0);
}
console.log('PASS: real photo URLs on initial and next rows, mobile/desktop, with and without helper.');
