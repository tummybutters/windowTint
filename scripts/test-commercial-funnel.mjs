import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
const require=createRequire(import.meta.url);
const quiz=require('../assets/commercial/quiz.js');
const {normalizeQuote}=require('../lib/automotive-quote.js');
const {COMMERCIAL_CHOICES}=require('../lib/commercial-lead.js');
const {sendAlert}=require('../lib/quote-notifications.js');
const {sendContact}=require('../lib/quote-tintwiz.js');
const {createStore}=require('../lib/automotive-quote-store.js');

// Every quiz option must be accepted by the server, and vice versa.
for(const step of quiz.STEPS)assert.deepEqual(step.choices.map(c=>c[0]),COMMERCIAL_CHOICES[step.key],step.key);
const id='9c2f8d24-d2d1-49fb-aefe-9a9ec2702b47';
const answers={property:'Office',problem:'Heat / hot offices',glass:'6–20 windows',role:'Property or facility manager',timing:'In 1–3 months',name:'Dana Lee',company:'Irvine Office Plaza',phone:'(714) 555-0123',email:' Dana@Example.com ',address:'100 Spectrum Center Dr, Irvine CA'};
const body=quiz.payload(answers,id,{gclid:'abc'},'/commercial-heat-glare-window-film');
const lead=normalizeQuote(body);
assert.equal(lead.lead_kind,'commercial');assert.equal(lead.type,'Commercial');assert.equal(lead.email,'dana@example.com');assert.equal(lead.company,'Irvine Office Plaza');
assert.equal(lead.phone,'+17145550123');assert.deepEqual(lead.details,{property:'Office',problem:'Heat / hot offices',glass:'6–20 windows',role:'Property or facility manager',timing:'In 1–3 months'});
assert.equal(lead.vehicle,'Office · 6–20 windows');assert.equal(lead.coverage,'Heat / hot offices');assert.equal(lead.attribution.gclid,'abc');
assert.equal(normalizeQuote({...body,company:''}).company,null,'company is optional');
assert.equal(normalizeQuote({...body,email:''}).email,null,'commercial email is optional');
assert.throws(()=>normalizeQuote({...body,email:'nope'}),/invalid_details/);
assert.throws(()=>normalizeQuote({...body,property:'Castle'}),/invalid_choice/);
assert.throws(()=>normalizeQuote({...body,website:'bot'}),/invalid_quote/);
assert.equal(normalizeQuote({id,type:'Car',coverage:'Sides + rear',vehicle:'2022 Honda Accord',address:'123 Test Lane, Irvine CA',name:'Test',phone:'7145550123',contact:'call'}).lead_kind,undefined,'auto quotes unchanged');
assert.equal(quiz.validate('company',''),'');assert.match(quiz.validate('email','x'),/email/);assert.equal(quiz.validate('phone','714 555 0123'),'');

let persisted;const store=createStore({query:async(sql,params)=>{if(/INSERT INTO automotive_quotes/.test(sql)){persisted={sql,params};return [{id}]}return []},send:async()=>({id:'x'}),sendCrm:async()=>{}});
await store.persist(lead);
assert.match(persisted.sql,/email,lead_kind,company,details,crm_state\) VALUES\(.*\$18::jsonb,'pending'\)/);
assert.deepEqual(persisted.params.slice(14,18),['dana@example.com','commercial','Irvine Office Plaza',JSON.stringify(lead.details)]);

Object.assign(process.env,{TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),TWILIO_AUTH_TOKEN:'k',TWILIO_PHONE_NUMBER:'+17145550111',QUOTE_ALERT_TO:'+17145550112',TINT_WIZ_ZAPIER_HOOK_URL:'https://hooks.zapier.com/hooks/catch/12345/testhook/'});
const row={...lead,service_address:lead.address,vehicle_type:lead.type};
let text;await sendAlert(row,async(u,o)=>{text=new URLSearchParams(o.body).get('Body');return{ok:true,json:async()=>({sid:'SM'+'2'.repeat(32),status:'queued'})}});
assert.match(text,/^New COMMERCIAL request - please call\n\nSource: Google Search - Commercial Form\n\nName: Dana Lee \(Property or facility manager\)\nCompany: Irvine Office Plaza\nPhone: \(714\) 555-0123\nEmail: dana@example\.com/);
assert.match(text,/Property: Office\nGlass: 6–20 windows\nProblem: Heat \/ hot offices\nTiming: In 1–3 months/);assert.match(text,/commercial project quote/);
let payload;await sendContact(row,async(u,o)=>{payload=JSON.parse(o.body);return{ok:true}});
assert.equal(payload.source,'Google Search - Commercial Form');assert.equal(payload.company,'Irvine Office Plaza');assert.equal(payload.email,'dana@example.com');assert.match(payload.coverage,/^Google Search - Commercial Form · COMMERCIAL · Office · 6–20 windows · Heat/);

const vercel=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const pages={'commercial-window-tinting-orange-county':'','office-window-tinting-orange-county':''};
for(const [slug,problem] of Object.entries(pages)){
 const f=new URL(`../${slug}/index.html`,import.meta.url);assert(existsSync(f),slug);const html=readFileSync(f,'utf8');
 assert.equal((html.match(/<h1[\s>]/g)||[]).length,1,slug);assert.match(html,/noindex,nofollow/);assert.match(html,/assets\/commercial\/quiz\.js/);assert.match(html,/id="quote"/);
 if(problem){assert.match(html,new RegExp(`data-problem="${problem.replace(/[/]/g,'\\/')}"`));assert(COMMERCIAL_CHOICES.problem.includes(problem))}
 assert(!vercel.redirects.some(r=>r.source==='/'+slug),slug+' must serve the page, not redirect');
 assert(!/premium|elite|luxe|ultimate/i.test(html.replace(/<script[\s\S]*?<\/script>/g,'')),slug+' brand voice');
 assert(!/licensed|free site walk|no downtime/i.test(html),slug+' has no unverified claims');
}
for(const name of ['office','storefront','medical','multifamily','industrial','other'])assert(existsSync(new URL(`../assets/commercial/${name}.webp`,import.meta.url)),name+'.webp missing');
assert.match(readFileSync(new URL('../db/automotive-quotes.sql',import.meta.url),'utf8'),/ADD COLUMN IF NOT EXISTS details jsonb;/);
console.log('Commercial funnel: quiz↔server choices, validation, storage, Elle alert, Tint Wiz, pages and assets passed.');

const {commercialSource}=require('../lib/lead-source');
assert.equal(commercialSource({attribution:{}}),'Website - Commercial Form');
assert.equal(commercialSource({attribution:{utm_source:'google',utm_medium:'organic'}}),'Website - Commercial Form');
assert.equal(commercialSource({attribution:{utm_source:'google',utm_medium:'cpc'}}),'Google Search - Commercial Form');
