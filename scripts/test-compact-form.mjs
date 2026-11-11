import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {capture,normalizeAdIds,assignForm}=require('../assets/attribution/journey');
const legacy={utm_source:'google',utm_medium:'cpc',utm_campaign:'23899221542',utm_content:'1234'};
assert.equal(normalizeAdIds(legacy).campaignid,'23899221542');
assert.equal(normalizeAdIds(legacy).creative,'1234');
assert.equal(normalizeAdIds({...legacy,campaignid:'999'}).campaignid,'999');
assert.equal(normalizeAdIds({...legacy,utm_source:'newsletter'}).campaignid,undefined);
assert.equal(normalizeAdIds({...legacy,utm_campaign:'commercial_oc'}).campaignid,undefined);
assert.equal(normalizeAdIds({...legacy,utm_content:'{creative}'}).creative,undefined);
assert.equal(normalizeAdIds(legacy).adgroupid,undefined);
const a=capture({url:'https://example.com/?'+new URLSearchParams(legacy),now:100,id:()=>1});
const b=capture({url:'https://example.com/gallery',previous:a,now:200,id:()=>2});
assert.equal(a.data.campaignid,'23899221542');assert.equal(b.data.creative,'1234');assert.equal(a.data.session_id,b.data.session_id);
const c=capture({url:'https://example.com/?gclid=new&campaignid=456',previous:b,now:300,id:()=>3});
assert.equal(c.data.creative,undefined);
for(const arm of ['old_setup','driveway_offer']){
 const control=assignForm({arm,paid:true,draw:0.1}),compact=assignForm({arm,paid:true,draw:0.8});
 assert.equal(control.form_variant,'current');assert.equal(compact.form_variant,'compact');
 assert.deepEqual(assignForm({arm,paid:true,stored:compact,draw:0.1}),compact);
 assert.equal(assignForm({arm,paid:false,draw:0.9}),null);
}
assert.equal(assignForm({arm:'commercial',paid:true,draw:0.9}),null);
const {summary,notes}=require('../lib/quote-attribution');
const lead={id:'test',attribution:{...legacy,...assignForm({arm:'old_setup',paid:true,draw:0.9})}};
assert.equal(summary(lead).campaign_id,'23899221542');assert.equal(summary(lead).ad_id,'1234');
assert.equal(summary(lead).form_variant,'compact');assert.match(notes(lead),/compact_form_20261111.*compact/);
console.log('Ad ID recovery, independent stable assignments, and CRM metadata passed');
// Exercise the actual form renderers without network calls or a customer submission.
const fs=await import('node:fs'),vm=await import('node:vm');
for(const file of ['quote.js','classic-quote.js','package-quote.js']){
 const src=fs.readFileSync(new URL('../assets/quote/'+file,import.meta.url),'utf8');
 const fields=src.match(/^const fields=.*$/m)[0],panel=src.match(/^function inputPanel\(\).*$/m)[0];
 for(const variant of ['current','compact']){
  const box={context:{tesla:false},state:{answers:{type:'Car',coverage:'Sides + rear'}},escapeHTML:s=>s||'',quoteSummary:()=>'',offerTerms:()=>'',quoteHost:()=>({ObsidianFormExperiment:{get:()=>({form_variant:variant})}})};
  vm.createContext(box);vm.runInContext(fields+'\n'+panel,box);
  const html=vm.runInContext('inputPanel()',box);
  assert.equal((html.match(/ required>/g)||[]).length,4,file);
  assert.equal(html.includes('<details'),variant==='compact',file);
  assert.match(html,/type="submit"/);assert.match(html,/may call you/);
  if(variant==='compact'){assert(!html.includes('quote-optional-email" open'));box.state.answers.email='person@example.test';assert(vm.runInContext('inputPanel()',box).includes('quote-optional-email" open'))}
 }
}
console.log('All automotive renderers retain four required inputs, optional email, consent and submit button');
// Package links add explicit recovered IDs; this is the SAME acquisition/session.
const decorated=capture({url:'https://example.com/package/?'+new URLSearchParams({...legacy,campaignid:legacy.utm_campaign,creative:legacy.utm_content}),previous:a,now:250,id:()=>99});
assert.equal(decorated.data.session_id,a.data.session_id);assert.equal(decorated.data.landing_page,a.data.landing_page);
const rawLegacy={...a,signature:JSON.stringify(['gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','campaignid','adgroupid','creative','keyword','matchtype','device','network'].map(k=>legacy[k]||''))};
assert.equal(capture({url:'https://example.com/package/?'+new URLSearchParams({...legacy,campaignid:legacy.utm_campaign,creative:legacy.utm_content}),previous:rawLegacy,now:250,id:()=>99}).data.session_id,a.data.session_id);
const invalidIds=capture({url:'https://example.com/?gclid=real&campaignid=not-an-id&creative=oops&adgroupid=bad',id:()=>1});
for(const k of ['campaignid','creative','adgroupid'])assert.equal(invalidIds.data[k],undefined);
const {normalizeQuote}=require('../lib/automotive-quote');
const record=normalizeQuote({id:'9c2f8d24-d2d1-49fb-aefe-9a9ec2702b47',type:'Car',coverage:'Sides + rear',vehicle:'2024 Example sedan',city:'Irvine',name:'Local QA',phone:'2025550113',contact:'call',attribution:lead.attribution});
assert.equal(record.attribution.form_variant,'compact');assert.equal(record.attribution.campaignid,'23899221542');
const {buildLeadEventRecord}=require('../lib/lead-event-normalize');
const event=buildLeadEventRecord({event_id:'obsidian_event_compact_001',event_name:'quote_form_test_exposure',event_time:new Date().toISOString(),session_id:'obsidian_visit_compact_001',page_path:'/package/',page_url:'https://www.obsidianautoworksoc.com/package/',lead:record.attribution,payload:{form_test_id:record.attribution.form_test_id,form_variant:'compact',form_test_arm:'old_setup'}});
assert.equal(event.lead.form_variant,'compact');assert.equal(event.payload.form_test_arm,'old_setup');
