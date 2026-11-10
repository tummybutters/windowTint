import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const route='/tint-shop-in-your-driveway', config=JSON.parse(fs.readFileSync('vercel.json'));
const rules=config.rewrites.filter(r=>r.source===route);
assert.equal(rules.length,2);assert.equal(rules[0].has[0].value,'driveway');assert(!rules[1].has);
assert(!fs.existsSync(route.slice(1)),'Static file must not shadow conditional rewrites');
const exception='Tesla vehicles: free sun strip only.';
for(const arm of ['original','driveway']){
 const html=fs.readFileSync(`experiments/${arm}${route}.html`,'utf8');
 assert.equal((html.match(/<h1[ >]/g)||[]).length,1);
 assert(html.includes('Tint shop in your driveway.'));
 assert(!html.includes('data-source="/assets/quote/headline.js"'),'Broad keyword script must not overwrite approved headline');
 assert(html.includes(arm==='original'?'classic-quote.js':'package-quote.js'));
 assert(html.includes(arm==='original'?'data-experiment-variant="old_setup"':'data-experiment-variant="driveway_offer"'));
 assert.equal(html.includes('class="package-offer"'),arm==='driveway');
 if(arm==='driveway'){assert(html.includes(exception));assert(html.includes('Coupe $500 · Sedan $600 · SUV / truck $700'));}
 for(const m of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)(?:\?[^\"]*)?"/g))assert(fs.existsSync(m[1].slice(1)),`Missing asset ${m[1]}`);
 const experiment=html.match(/<script data-source="\/assets\/quote\/experiment.js">([\s\S]*?)<\/script>/)[1];
 const loc=new URL(`https://www.obsidianautoworksoc.com${route}?gclid=unit-click&utm_campaign=123&experiment_id=auto_old_driveway_20261014&experiment_variant=${arm==='original'?'old_setup':'driveway_offer'}${arm==='driveway'?'&experience=driveway':''}`);
 const link={href:'https://www.obsidianautoworksoc.com/package/',getAttribute(){return this.href},hasAttribute(){return false}};
 const doc={documentElement:{dataset:{experimentVariant:arm==='original'?'old_setup':'driveway_offer'}},readyState:'complete',querySelectorAll(){return[link]}};
 const win={gtag(){},obsidianLeadTracking:{getLead(){return{}}}};
 vm.runInNewContext(experiment,{window:win,location:loc,document:doc,URL,URLSearchParams});
 assert.equal(win.ObsidianExperiment.experiment_variant,arm==='original'?'old_setup':'driveway_offer');
 if(arm==='driveway'){
  vm.runInNewContext(fs.readFileSync('assets/quote/driveway-tracking.js','utf8'),{window:win,location:loc,document:doc,URL,URLSearchParams});
  const dest=new URL(link.href);for(const [k,v] of [['gclid','unit-click'],['utm_campaign','123'],['experiment_variant','driveway_offer'],['experience','driveway']])assert.equal(dest.searchParams.get(k),v);
 }
}
for(const path of ['driveway-package/index.html','package/index.html','assets/quote/package-quote.js'])assert(fs.readFileSync(path,'utf8').includes(exception),path);
const context=fs.readFileSync('assets/quote/package-context.js','utf8');assert(context.includes("tesla?['FREE sun strip']"));
console.log('PASS: route separation, approved headline, both existing quote flows, visible Tesla exception, offer pricing, assets and CTA attribution. No network or lead submission.');
