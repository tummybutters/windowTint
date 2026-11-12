import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const {normalizeQuote}=require('../lib/automotive-quote');
const id='9c2f8d24-d2d1-49fb-aefe-9a9ec2702b47';
const fields={form_rendered_variant:'compact',form_exposure_id:id,form_exposed_at:'2026-11-12T17:00:00Z',form_tracking_version:'rendered-form-v1',form_assignment_status:'enrolled'};
const base={id,type:'Car',coverage:'Full car',vehicle:'2024 Example sedan',city:'Irvine',name:'Local QA',phone:'2025550113',contact:'call'};
const r=normalizeQuote({...base,attribution:{...fields,form_test_id:'compact_form_20261111',form_test_arm:'old_setup',form_variant:'compact'}});
for(const [k,v] of Object.entries(fields))assert.equal(r.attribution[k],v,`saved quote retains ${k}`);
for(const file of ['quote.js','classic-quote.js','package-quote.js']){
 const src=fs.readFileSync(new URL('../assets/quote/'+file,import.meta.url),'utf8');
 const restart=src.match(/\$\('#restart'\)\.onclick=\(\)=>\{([\s\S]*?)\};return/)[1];
 const state={step:2,answers:{},success:true,id:'old',formViewed:true,formTestExposed:true};
 vm.runInNewContext(restart,{state,context:{steps:[0],baseSteps:[0],answers:{}},crypto:{randomUUID:()=>id},quoteDraft:{clear(){}},render(){}});
 assert.equal(state.formViewed,false,`${file}: new vehicle has independent form exposure`);
 assert.equal(state.formTestExposed,false,`${file}: new vehicle gets test exposure event`);
}
console.log('Saved rendered form evidence and independent repeat-vehicle exposures passed');
// Execute the shipped collector in a browser-like sandbox without network access.
const journey=fs.readFileSync(new URL('../assets/attribution/journey.js',import.meta.url),'utf8');
for(const arm of ['old_setup','driveway_offer'])for(const draw of [0.1,0.9]){
 const cache=new Map(),window={ObsidianExperiment:{experiment_id:'auto_old_driveway_20261014',experiment_variant:arm}};
 const box={window,URL,URLSearchParams,Date,Math,crypto:{randomUUID:()=>id,getRandomValues:a=>{a[0]=Math.floor(draw*4294967296);return a}},location:{href:'https://example.test/?utm_source=google&utm_medium=cpc&campaignid=23899221542',hostname:'example.test',search:'?utm_source=google&utm_medium=cpc'},navigator:{userAgent:'iPhone Mobile',maxTouchPoints:1},document:{referrer:'',body:{dataset:{presentationVersion:'paid-design-20261110'}}},localStorage:{getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)}};
 vm.runInNewContext(journey,box);
 const assignment=window.ObsidianFormExperiment.assign();assert.equal(assignment.form_variant,draw<.5?'current':'compact');
 const evidence=window.ObsidianFormExperiment.expose(id);assert.equal(evidence.form_rendered_variant,assignment.form_variant);assert.equal(window.ObsidianJourney.get().form_exposure_id,id);
 const next='9c2f8d24-d2d1-49fb-aefe-9a9ec2702b48';assert.equal(window.ObsidianFormExperiment.expose(next).form_exposure_id,next);assert.equal(window.ObsidianFormExperiment.get().form_variant,assignment.form_variant);
 const saved=normalizeQuote({...base,id:next,attribution:window.ObsidianJourney.get()});assert.equal(saved.attribution.form_exposure_id,next);assert.equal(saved.attribution.form_test_arm,arm);
 const {notes}=require('../lib/quote-attribution');assert.match(notes(saved),new RegExp('Rendered form: '+assignment.form_variant));
}
console.log('Both arms x both variants retain actual form evidence through collector, saved lead and CRM note');
