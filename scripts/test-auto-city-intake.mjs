import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {normalizeQuote}=require('../lib/automotive-quote');
const {createStore}=require('../lib/automotive-quote-store');
const {sendAlert}=require('../lib/quote-notifications');
const {sendContact}=require('../lib/quote-tintwiz');
Object.assign(process.env,{TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),TWILIO_AUTH_TOKEN:'test',TWILIO_PHONE_NUMBER:'+12025550111',QUOTE_ALERT_TO:'+12025550112',TINT_WIZ_ZAPIER_HOOK_URL:'https://hooks.zapier.com/hooks/catch/12345/testhook/'});
const input={id:'9c2f8d24-d2d1-49fb-aefe-9a9ec2702b47',type:'Car',coverage:'Sides + rear',vehicle:'2024 Toyota Camry',city:' Irvine ',name:'Test',phone:'2025550113',contact:'call',email:''};
for(const offer of [{},{package:'Driveway Package',upgrade:'FREE sun strip'},{package:'Driveway Package',upgrade:'FREE sunroof tint'}]){
 const normalized=normalizeQuote({...input,...offer});
 assert.equal(normalized.details.city,'Irvine');assert.equal(normalized.email,undefined);
 let params;await createStore({query:async(sql,p)=>{params=p;return[{id:input.id}]}}).persist(normalized);
 const lead={id:params[0],name:params[1],phone:params[2],service_address:params[3],vehicle_type:params[4],vehicle:params[5],coverage:params[6],details:JSON.parse(params[17])};
 assert.equal(lead.details.city,'Irvine');
 let sms;await sendAlert(lead,async(url,opts)=>{sms=new URLSearchParams(opts.body);return{ok:true,json:async()=>({sid:'SM'+'2'.repeat(32),status:'queued'})}});
 assert.equal(sms.get('To'),'+12025550112');assert(sms.get('Body').includes('\n\nCity: Irvine'));assert(!sms.get('Body').includes('Service address:'));assert(!sms.get('Body').includes('Email:'));
 let crm;await sendContact(lead,async(url,opts)=>{crm=JSON.parse(opts.body);return{ok:true}});
 assert.equal(crm.city,'Irvine');assert(crm.coverage.includes('City: Irvine'),'Existing Zap contact notes must include city');assert.equal(crm.service_address,'','City must not become a street address');
 if(offer.package){assert.equal(crm.package,'Driveway Package');assert.equal(crm.upgrade,offer.upgrade);assert(sms.get('Body').includes(offer.upgrade));assert(crm.coverage.includes(offer.upgrade))}
}
for(const city of ['', ' ', 'A', null, {}, 'x'.repeat(241)])assert.throws(()=>normalizeQuote({...input,city}));
assert.equal(normalizeQuote({...input,city:'La'}).details.city,'La');
assert.throws(()=>normalizeQuote({...input,email:'not-an-email'}));
assert.equal(normalizeQuote({...input,email:' Test@Example.com '}).email,'test@example.com');
const legacy={...input,address:'123 Test Lane, Irvine CA 92618'};delete legacy.city;
assert.equal(normalizeQuote(legacy).address,legacy.address);assert.equal(normalizeQuote(legacy).details,undefined);
assert.notEqual(normalizeQuote(input).payload_hash,normalizeQuote({...input,city:'Tustin'}).payload_hash);
console.log('City-only quotes and blank email survive persistence, SMS, CRM, and both package choices; legacy requests remain valid.');
