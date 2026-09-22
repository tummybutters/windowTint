import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {sendContact}=require('../lib/quote-tintwiz');
const {createStore}=require('../lib/automotive-quote-store');

process.env.TINT_WIZ_ZAPIER_HOOK_URL='https://hooks.zapier.com/hooks/catch/12345/testhook/';
const lead={id:'9c2f8d24-d2d1-49fb-aefe-9a9ec2702b47',name:'Test Customer',phone:'+17145550123',vehicle:'2024 Toyota Tacoma',vehicle_type:'Truck',coverage:'Front two windows',priority:'Cooler cabin',timing:'Sometime this week',service_address:'123 Test Lane, Irvine CA 92618',page_path:'/car-window-tinting-near-me',attribution:{gclid:'private-click-id'}};
let payload;
await sendContact(lead,async(url,options)=>{
 assert.equal(url,process.env.TINT_WIZ_ZAPIER_HOOK_URL);
 assert.equal(options.method,'POST');
 payload=JSON.parse(options.body);
 return {ok:true,status:200};
});
assert.deepEqual(payload,{quote_id:lead.id,name:lead.name,phone:lead.phone,vehicle:lead.vehicle,vehicle_type:lead.vehicle_type,coverage:lead.coverage,priority:lead.priority,timing:lead.timing,service_address:lead.service_address,page_path:lead.page_path,source:'Website tint quote'});
assert(!JSON.stringify(payload).includes('private-click-id'),'Marketing identifiers must stay out of the CRM contact');
await assert.rejects(sendContact(lead,async()=>({ok:false,status:429})),error=>error.retryable===true);
await assert.rejects(sendContact(lead,async()=>{throw Error('timeout')}),error=>error.uncertain===true);
await assert.rejects(sendContact(lead,async()=>({ok:false,status:503})),error=>error.uncertain===true);

let claimed=false,sends=0,queries=[];
const store=createStore({query:async(sql,params)=>{
 queries.push([sql,params]);
 if(sql.includes("SET crm_state='sending'")){
  if(claimed)return [];
  claimed=true;
  return [{...lead,crm_attempts:1}];
 }
 return [];
},sendCrm:async()=>{sends++}});
await Promise.all([store.dispatchCrm(lead.id),store.dispatchCrm(lead.id)]);
assert.equal(sends,1,'Concurrent calls should send one contact');
assert(queries.some(([sql])=>sql.includes("crm_state='accepted'")));

const retryQueries=[];
const retryStore=createStore({query:async(sql,params)=>{
 retryQueries.push([sql,params]);
 if(sql.includes("SELECT id FROM automotive_quotes WHERE crm_state IN ('pending','retry')"))return[{id:lead.id}];
 if(sql.includes("SET crm_state='sending'"))return[{...lead,crm_attempts:1}];
 if(sql.includes('COUNT(*)'))return[{failed:0,unknown:0,pending:0,crm_failed:0,crm_unknown:0,crm_pending:0}];
 return [];
},sendCrm:async()=>{}});
const result=await retryStore.retry();
assert.equal(result.crm_checked,1,'Worker should retry missed CRM deliveries');
assert(retryQueries.some(([sql])=>sql.includes("crm_state='accepted'")));
console.log('Tint Wiz payload, provider failures, concurrent claims and worker retry passed.');
