import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const experiment='auto_old_driveway_20261014';
const routes=['car-window-tinting-near-me','ceramic-window-tint-pricing','ceramic-window-tinting','mobile-ceramic-window-tint-near-me','mobile-window-tinting','mobile-window-tinting-near-me','nano-ceramic-window-tint','quote-widget','tesla-cybertruck-window-tint','tesla-model-3-window-tinting','tesla-model-y-window-tinting','tesla-window-tinting','tint-removal','tint-shop-near-me','vip-booking','window-tint-pricing'];
const config=JSON.parse(fs.readFileSync('vercel.json'));
for(const route of routes){
 for(const path of [route,route+'.html',route+'/index.html'])assert(!fs.existsSync(path)||!fs.statSync(path).isFile(),`Canonical static file shadows conditional route: ${path}`);
 const rewrite=config.rewrites.find(r=>r.source===`/${route}`&&r.has?.some(h=>h.type==='query'&&h.key==='experience'&&h.value==='driveway'));
 assert(rewrite,`Treatment route must precede canonical handling: ${route}`);
 assert(config.rewrites.indexOf(rewrite)<config.rewrites.findIndex(r=>r.source===`/${route}`&&!r.has)||!config.rewrites.some(r=>r.source===`/${route}`&&!r.has));
 const html=fs.readFileSync(rewrite.destination.slice(1)+'.html','utf8');
 assert(html.includes(route==='quote-widget'||['car-window-tinting-near-me','ceramic-window-tint-pricing','tint-removal','vip-booking'].includes(route)?'/assets/quote/quote.js':'package-quote.js'),'Treatment must retain its current quiz');
}
for(const [filename,variant] of [['classic-quote.js','old_setup'],['package-quote.js','driveway_offer']]){
 const source=fs.readFileSync(`assets/quote/${filename}`,'utf8');
 const helpers=source.slice(0,source.indexOf('const $='));
 const submit=source.match(/^async function submitStep\(\).*$/m)[0];
 const calls=[],bodies=[];
 const host={location:{origin:'https://www.obsidianautoworksoc.com',pathname:'/mobile-window-tinting',search:`?experiment_id=${experiment}&experiment_variant=${variant==='old_setup'?'driveway_offer':'old_setup'}&name=PRIVATE`},ObsidianExperiment:{experiment_id:experiment,experiment_variant:variant},gtag:(...args)=>calls.push(args)};host.parent=host;
 const button={},error={};
 const s={window:host,location:host.location,URLSearchParams,Set,document:{querySelector:()=>({value:''})},state:{id:'993278a8-f01a-48fe-bd70-dfd69040a299',answers:{name:'PRIVATE'},busy:false},fields:[],captureFields(){},$:sel=>sel==='#error'?error:button,screen:{querySelector:()=>({setAttribute(){},focus(){}})},render(){},fetch:async(u,o)=>{bodies.push(JSON.parse(o.body));return{ok:true,json:async()=>({ok:true,id:s.state.id})}}};
 vm.createContext(s);vm.runInContext(helpers+'\n'+submit,s);await vm.runInContext('submitStep()',s);
 assert.equal(bodies[0].attribution.experiment_id,experiment);
 assert.equal(bodies[0].attribution.experiment_variant,variant);
 assert.equal(calls.find(x=>x[1]==='quote_submit_success')[2].experiment_variant,variant);
 assert.equal(calls.find(x=>x[1]==='conversion')[2].experiment_variant,variant);
 assert(!JSON.stringify(calls).includes('PRIVATE'));
 await vm.runInContext('submitStep()',s);assert.equal(calls.filter(x=>x[1]==='conversion').length,1);
}
const ctx={window:{},location:{pathname:'/mobile-window-tinting'},URL};vm.createContext(ctx);vm.runInContext(fs.readFileSync('assets/quote/classic-context.js','utf8'),ctx);
assert(ctx.window.ObsidianQuoteContext.contextFor('/mobile-window-tinting').steps.includes(4),'Old control must retain preferred timing');
process.env.TINT_WIZ_ZAPIER_HOOK_URL='https://hooks.zapier.com/hooks/catch/12345/testhook/';
let crm;await require('../lib/quote-tintwiz').sendContact({id:'test',name:'Test',attribution:{experiment_id:experiment,experiment_variant:'old_setup'}},async(u,o)=>{crm=JSON.parse(o.body);return{ok:true}});
assert.equal(crm.experiment_variant,'old_setup');assert.equal(crm.experiment_id,experiment);
console.log('Experiment route separation, original timing, persisted attribution, privacy, CRM metadata and conversion deduplication passed.');
