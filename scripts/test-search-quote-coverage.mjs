import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const direct=['car-window-tinting-near-me','mobile-window-tinting-near-me','tint-shop-near-me','ceramic-window-tint-pricing','ceramic-window-tinting','mobile-ceramic-window-tint-near-me/index.html','mobile-window-tinting','nano-ceramic-window-tint/index.html','tesla-cybertruck-window-tint/index.html','tesla-model-3-window-tinting','tesla-model-y-window-tinting','tesla-window-tinting','window-tint-pricing','tint-removal','vip-booking'];
const embedded=['services','window-tinting-gallery','index'];
for(const file of [...direct,...embedded]){
 const s=fs.readFileSync(file,'utf8'),old=execFileSync('git',['show',`1e90ccd:${file}`],{encoding:'utf8'});
 assert.equal((s.match(/<h1\b/g)||[]).length,1,file+' h1');
 assert.deepEqual(s.match(/<link rel="canonical"[^>]*>/g),old.match(/<link rel="canonical"[^>]*>/g),file+' canonical');
 assert.deepEqual(s.match(/<table\b[\s\S]*?<\/table>/g),old.match(/<table\b[\s\S]*?<\/table>/g),file+' pricing');
 assert.deepEqual(s.match(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g),old.match(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g),file+' schema');
 if(direct.includes(file)){assert(s.includes('/assets/quote/context.js'),file);assert(s.includes('/assets/quote/quote.js'),file);assert(s.includes('/assets/quote/reviews.js'),file);assert(s.includes('/lead-tracking.js'),file)}
 else assert(s.includes('data-quote-frame')&&s.includes('/assets/quote/embed.js'),file);
 const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicate IDs');
}
for(const m of ['model-3','model-y','model-s','model-x','cybertruck'])assert(fs.statSync(`assets/quote/tesla-${m}.webp`).size>1000);
console.log('18 automotive Search entry pages: intake coverage, pricing, canonical, schema, unique IDs and Tesla assets passed.');
