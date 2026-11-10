import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeQuote}=require('../lib/automotive-quote');
const {createStore}=require('../lib/automotive-quote-store');
const {createHandler}=require('../api/automotive-quotes');
const {sendAlert}=require('../lib/quote-notifications');
const {sendContact}=require('../lib/quote-tintwiz');
Object.assign(process.env,{TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),TWILIO_AUTH_TOKEN:'test-only',TWILIO_PHONE_NUMBER:'+17145550111',QUOTE_ALERT_TO:'+17145550112',TINT_WIZ_ZAPIER_HOOK_URL:'https://hooks.zapier.com/hooks/catch/12345/testhook/'});
const base={id:'9c2f8d24-d2d1-49fb-aefe-9a9ec2702b47',type:'Car',coverage:'Sides + rear',vehicle:'2024 Example sedan',address:'123 Example Lane, Irvine CA 92618',name:'Preview Customer',phone:'7145550123',contact:'call',priority:'Cooler cabin',page_path:'/package',attribution:{gclid:'private-click-id'}};
const ordinary=normalizeQuote(base);
for(const upgrade of ['FREE sunroof tint','FREE sun strip']){
 const input={...base,package:'Driveway Package',upgrade};
 const record=normalizeQuote(input);
 assert.deepEqual(record.details,{package:'Driveway Package',upgrade},'The selected offer must survive input validation');
 assert.notEqual(record.payload_hash,ordinary.payload_hash,'Changing the offer must not silently replay a different request');
 let saved, sms, crm;
 const query=async(sql,params)=>{
  if(sql.startsWith('INSERT INTO automotive_quotes(')){
   saved={id:params[0],name:params[1],phone:params[2],service_address:params[3],vehicle_type:params[4],vehicle:params[5],coverage:params[6],page_path:params[9],attribution:JSON.parse(params[10]),payload_hash:params[11],priority:params[12],lead_kind:params[15],details:JSON.parse(params[17]),notification_attempts:1,crm_attempts:1};
   return [{id:saved.id}];
  }
  if(sql.includes("SET notification_state='sending'")||sql.includes("SET crm_state='sending'"))return[saved];
  return [];
 };
 const store=createStore({query,send:lead=>sendAlert(lead,async(url,options)=>{sms=new URLSearchParams(options.body);return{ok:true,json:async()=>({sid:'SM'+'2'.repeat(32),status:'queued'})}}),sendCrm:lead=>sendContact(lead,async(url,options)=>{crm=JSON.parse(options.body);return{ok:true,status:200}})});
 const res={status(n){this.code=n;return this},setHeader(){},json(body){this.body=body;return this}};
 await createHandler({store:{...store,checkRateLimit:async()=>true},enabled:true})({method:'POST',headers:{host:'example.test',origin:'https://example.test'},body:input},res);
 assert.equal(res.code,200);
 assert.deepEqual(saved.details,{package:'Driveway Package',upgrade},'Offer is stored durably before dispatch');
 const text=sms.get('Body');
 assert(text.startsWith('New Driveway Package request - please call\n\n'));
 assert(text.includes('Package: Driveway Package\nCoverage: Sides + rear ceramic tint\nIncluded upgrade: '+upgrade));
 assert(text.includes('Name: Preview Customer\nPhone: (714) 555-0123'));
 assert(text.includes('\n\nVehicle: 2024 Example sedan (Car)\n\n'));
 assert(text.includes('\n\nService address:\n123 Example Lane, Irvine CA 92618'));
 assert(!text.includes(base.id)&&!text.includes('private-click-id'),'Elle gets customer information, not tracking IDs');
 assert.equal(sms.get('To'),'+17145550112','Alert goes to configured internal recipient, never the prospect');
 assert.equal(crm.package,'Driveway Package');
 assert.equal(crm.upgrade,upgrade);
 assert.equal(crm.source,'Website Driveway Package quote');
 assert.equal(crm.coverage.split('\n\n')[0],'Driveway Package · Sides + rear ceramic tint · '+upgrade,'Existing Zap coverage mapping must display the offer without needing new fields');
 assert(!JSON.stringify(crm).includes('private-click-id'));
}
assert.notEqual(normalizeQuote({...base,package:'Driveway Package',upgrade:'FREE sunroof tint'}).payload_hash,normalizeQuote({...base,package:'Driveway Package',upgrade:'FREE sun strip'}).payload_hash);
for(const bad of [{package:'Driveway Package'},{upgrade:'FREE sunroof tint'},{package:'Other',upgrade:'FREE sun strip'},{package:'Driveway Package',upgrade:'FREE full windshield'},{package:'Driveway Package',upgrade:'FREE sun strip',coverage:'Front two windows'},{package:'Driveway Package',upgrade:null}])assert.throws(()=>normalizeQuote({...base,...bad}),'Reject incomplete or invalid package requests');
assert.equal(ordinary.details,undefined,'Regular requests must not acquire an offer');
console.log('Driveway Package validated, persisted and included in both SMS and CRM payloads for both upgrades; invalid combinations rejected. No external messages sent.');
