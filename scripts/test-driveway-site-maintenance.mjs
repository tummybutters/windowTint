import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {renderOffers} from '../site-builder/auto-offers.mjs';
import {normalizeQuote} from '../lib/automotive-quote.js';
import packages from '../assets/auto-offers/packages.js';

const publicRoot=new URL('../public/',import.meta.url);
function checkPublicMarkup(root){
 for(const entry of readdirSync(root,{withFileTypes:true})){
  const child=new URL(encodeURIComponent(entry.name)+(entry.isDirectory()?'/':''),root);
  if(entry.isDirectory())checkPublicMarkup(child);
  else if(entry.name.endsWith('.html')||!entry.name.includes('.')){
   const text=readFileSync(child,'utf8');
   assert.doesNotMatch(text,/\$795|\b(?:26|14) ways to explore\b/,child.pathname);
  }
 }
}
checkPublicMarkup(publicRoot);
const page=renderOffers();
for(const [key,p] of Object.entries(packages.packages)){
 const card=page.split('id="'+key+'" class="package-card"')[1].split('</article>')[0];
 const eligible=key==='front-cabin'||key==='complete';
 if(eligible)assert.match(card,/Optional clear 3M ceramic windshield: \+\$50/);
 else assert.doesNotMatch(card,/clear 3M ceramic windshield/);
 for(const [index,body] of packages.bodies.slice(0,3).entries()){
  const input={id:'affc9f31-d59e-4f18-bd57-2db54dbb6612', type:index===2?'SUV / crossover':'Car', coverage:p.coverage, vehicle:'2024 Honda Civic',city:'Irvine',name:'Synthetic Test',phone:'9495550100',contact:'call',offer_id:key,body_style:body,upgrade_choice:packages.choices(key,'2024 Honda Civic')[0],clear_windshield:false};
  const base=normalizeQuote(input);
  assert.equal(base.details.quoted_menu_price,p.prices[index]);
  if(eligible){
   const upgraded=normalizeQuote({...input, clear_windshield:true});
   assert.equal(upgraded.details.quoted_menu_price,p.prices[index]+50);
   assert.match(upgraded.details.windshield,/Clear 3M/);
  }else assert.throws(()=>normalizeQuote({...input,clear_windshield:true}),/invalid_offer/);
 }
}
assert.match(page,/Clear 3M ceramic \(\+\$50\)/);
console.log('Public copy clean; offer cards and selector agree with quote normalization across all body styles.');
