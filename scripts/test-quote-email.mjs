import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {normalizeQuote}=require('../lib/automotive-quote.js');
const {sendAlert}=require('../lib/quote-notifications.js');
const {sendContact}=require('../lib/quote-tintwiz.js');
const {createStore}=require('../lib/automotive-quote-store.js');

const base={id:'9c2f8d24-d2d1-49fb-aefe-9a9ec2702b47',type:'Car',coverage:'Sides + rear',vehicle:'2022 Honda Accord',address:'123 Test Lane, Irvine CA 92618',name:'Test',phone:'7145550123',contact:'call'};
const without=normalizeQuote(base);assert.equal(without.email,undefined);
assert.equal(normalizeQuote({...base,email:''}).email,undefined,'email stays optional');
assert.equal(normalizeQuote({...base,email:''}).payload_hash,without.payload_hash,'blank email keeps the existing duplicate hash');
const withEmail=normalizeQuote({...base,email:'  Test.Person@Example.com '});
assert.equal(withEmail.email,'test.person@example.com');assert.notEqual(withEmail.payload_hash,without.payload_hash);
for(const bad of ['nope','a@b','a b@c.com','x'.repeat(250)+'@a.com',42])assert.throws(()=>normalizeQuote({...base,email:bad}),/invalid_details/,String(bad));

let persisted;const store=createStore({query:async(sql,params)=>{if(/INSERT INTO automotive_quotes/.test(sql)){persisted={sql,params};return [{id:base.id}]}return []},send:async()=>({id:'x'}),sendCrm:async()=>{}});
await store.persist(withEmail);
assert.match(persisted.sql,/timing,email,crm_state\) VALUES\(\$1,.*\$15,'pending'\)/);assert.equal(persisted.params[14],'test.person@example.com');
await store.persist(without);assert.equal(persisted.params[14],null);

Object.assign(process.env,{TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),TWILIO_AUTH_TOKEN:'k',TWILIO_PHONE_NUMBER:'+17145550111',QUOTE_ALERT_TO:'+17145550112',TINT_WIZ_ZAPIER_HOOK_URL:'https://hooks.zapier.com/hooks/catch/12345/testhook/'});
const lead={id:base.id,name:'Test',phone:'+17145550123',email:'test.person@example.com',vehicle:'2022 Honda Accord',vehicle_type:'Car',coverage:'Sides + rear',service_address:'123 Test Lane',page_path:'/'};
let body;await sendAlert(lead,async(u,o)=>{body=new URLSearchParams(o.body).get('Body');return{ok:true,json:async()=>({sid:'SM'+'2'.repeat(32),status:'queued'})}});
assert.match(body,/Phone: \(714\) 555-0123\nEmail: test\.person@example\.com\n/);
await sendAlert({...lead,email:null},async(u,o)=>{body=new URLSearchParams(o.body).get('Body');return{ok:true,json:async()=>({sid:'SM'+'2'.repeat(32),status:'queued'})}});
assert(!body.includes('Email:'));
let payload;await sendContact(lead,async(u,o)=>{payload=JSON.parse(o.body);return{ok:true}});assert.equal(payload.email,'test.person@example.com');

const quiz=readFileSync(new URL('../assets/quote/quote.js',import.meta.url),'utf8');
assert.match(quiz,/\['email','Email \(for your appointment details\)','you@example\.com','email'\]/);
assert.match(quiz,/Expect a call from Elle at <a href="tel:\+17146007134">\(714\) 600-7134<\/a>/);
assert.match(readFileSync(new URL('../db/automotive-quotes.sql',import.meta.url),'utf8'),/ADD COLUMN IF NOT EXISTS email text;\s*$/);
console.log('Optional email: validation, storage, Elle alert, Tint Wiz payload and end screen passed.');
