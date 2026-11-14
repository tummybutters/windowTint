import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {sendContact}=require('../lib/quote-tintwiz');
const {summary}=require('../lib/quote-attribution');
process.env.TINT_WIZ_ZAPIER_HOOK_URL='https://hooks.zapier.com/hooks/catch/12345/testhook/';
const base={id:'fixture-quote',name:'Fixture',phone:'+17145550123',vehicle:'Storefront / retail · Measure it for me',vehicle_type:'Commercial',coverage:'Commercial',page_path:'/commercial-window-tinting-orange-county',lead_kind:'commercial',company:'Example Studio',details:{property:'Storefront / retail',glass:'Measure it for me',problem:'Not sure yet',city:'Fullerton'},attribution:{gclid:'PRIVATE-CLICK',device:'c',campaignid:'24117892229',adgroupid:'196849750257',creative:'826268103747',keyword:'commercial window film',landing_page:'/commercial-window-tinting-orange-county',attribution_model:'last non-direct touch, 30 days'}};
async function payload(lead){let saved;await sendContact(lead,async(_url,options)=>{saved=JSON.parse(options.body);return{ok:true,status:200}});return saved}
test('CRM coverage uses real HTML block spacing, concise commercial fields and one attribution section',async()=>{
 const p=await payload(base);
 assert.match(p.coverage,/<p><strong>Project<\/strong><\/p><ul>/);
 assert.match(p.coverage,/<li>Property: Storefront \/ retail<\/li>/);
 assert.match(p.coverage,/<li>Company: Example Studio<\/li>/);
 assert.equal((p.coverage.match(/<strong>Attribution<\/strong>/g)||[]).length,1);
 assert.doesNotMatch(p.coverage,/Attribution \(reporting\)|Unassigned|unknown|Not enrolled|Main priority:|Preferred timing:/i);
 assert.deepEqual(p.lead_attribution,summary(base));
 assert.equal(p.lead_campaign_id,'24117892229');
 assert.doesNotMatch(JSON.stringify(p),/PRIVATE-CLICK/);
});
test('all customer and tracking values are escaped and cannot inject note markup',async()=>{
 const p=await payload({...base,company:'<img src=x onerror=alert(1)>',details:{...base.details,problem:'Heat & glare <script>x</script>'},attribution:{...base.attribution,keyword:'"bad" <b>query</b>'}});
 assert.doesNotMatch(p.coverage,/<img|<script|<b>/i);
 assert.match(p.coverage,/&lt;img/);assert.match(p.coverage,/Heat &amp; glare/);assert.match(p.coverage,/&lt;b&gt;query/);
});
test('auto/Driveway notes retain the actual request, optional priority and experiment evidence',async()=>{
 const lead={...base,lead_kind:'auto',vehicle:'2026 Example SUV',coverage:'Sides and rear',priority:'Less heat',timing:'This week',details:{city:'Irvine',package:'Driveway Package',upgrade:'Sun strip'},attribution:{experiment_id:'auto_old_driveway_20261014',experiment_variant:'driveway_offer',form_test_id:'compact',form_variant:'compact',form_test_arm:'treatment',form_rendered_variant:'compact'}};
 const p=await payload(lead);
 assert.match(p.coverage,/Driveway Package/);assert.match(p.coverage,/Sun strip/);assert.match(p.coverage,/Irvine/);assert.match(p.coverage,/Less heat/);
 assert.match(p.coverage,/driveway_offer/);assert.match(p.coverage,/compact/);
 assert.equal(p.experiment_label,'Driveway offer');assert.deepEqual(p.lead_attribution,summary(lead));
});
