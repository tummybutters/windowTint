import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {classify,headlineFor}=require('../assets/quote/headline.js');
const key=t=>headlineFor(classify(t))?.key??null;
for(const [term,expected] of [
 ['ceramic tint','ceramic'],['ceramic window tint near me','ceramic'],['nano ceramic tint car','ceramic'],['window tinting and ceramic coating near me','ceramic'],
 ['how much ceramic tint cost','ceramic_price'],['ceramic tint price','ceramic_price'],['window tinting prices near me','ceramic_price'],
 ['mobile tint','mobile'],['mobile window tinting near me','mobile'],['window tint near me mobile','mobile'],
 ['window tinting near me','near_me'],['tinting near me','near_me'],
 ['car window tint','car'],['auto window tinting near me','car'],['car tinting near me','car'],
 ['tesla tint near me','tesla'],['tesla model 3 tint cost','tesla_model_3'],['model 3 tint','tesla_model_3'],['tesla model y tint','tesla_model_y'],['cybertruck window tint','tesla_cybertruck'],
 ['tint shop near me','tint_shop'],['tint shops near me','tint_shop'],
 ['window tint',null],['',null],[null,null],['{keyword}',null],['window+tinting+near+me','near_me'],
])assert.equal(key(term),expected,`"${term}"`);
const h=headlineFor(classify('tesla model y tint'));assert.equal(h.line1,'Model Y Ceramic Tint.');
for(const c of Object.values({a:headlineFor(classify('ceramic tint'))}))assert(!/premium|elite|luxe|ultimate/i.test(c.line1+c.line2+c.sub));
const pages=['car-window-tinting-near-me','mobile-window-tinting-near-me','ceramic-window-tint-pricing','mobile-ceramic-window-tint-near-me/index.html','nano-ceramic-window-tint/index.html','tesla-window-tinting','tesla-model-3-window-tinting','tesla-model-y-window-tinting','tesla-cybertruck-window-tint/index.html','tint-shop-near-me','window-tint-pricing','ceramic-window-tinting','mobile-window-tinting'];
for(const p of pages){
 const s=readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.equal((s.match(/<h1[\s>]/g)||[]).length,1,p);
 assert.match(s,/<section class="intro(?: intro-proof)?" data-headline="[a-z0-9_]+">/,p);
 assert.equal((s.match(/assets\/quote\/headline\.js/g)||[]).length,1,p);
 assert(!s.includes('Premium tint.'),p+' still has generic headline');
 assert(s.indexOf('headline.js')>s.indexOf('<section class="intro'),p+' script must follow intro');
}
console.log('Keyword headline classification and page wiring passed.');
