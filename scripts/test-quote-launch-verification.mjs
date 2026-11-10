import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createHandler}=require('../api/quote-launch-verification');
const config={QUOTE_LAUNCH_VERIFY_SECRET:'test-key',QUOTE_LAUNCH_VERIFY_EXPIRES:Date.now()+60000,QUOTE_LAUNCH_VERIFY_LEAD_ID:'test-id'};
let lookups=0;
const run=async(method='GET',auth='Bearer test-key',id='test-id',cfg=config)=>{
 const res={setHeader(){},status(n){this.code=n;return this},json(value){this.body=value;return this}};
 await createHandler({config:cfg,store:{status:async(id)=>{lookups++;return{id,notification_provider_id:'SM-test',crm_state:'accepted'}}},readStatus:async()=>({status:'delivered',errorCode:null})})({method,headers:{authorization:auth},query:{lead_id:id}},res);return res;
};
assert.equal((await run('POST')).code,405);
assert.equal((await run('GET','bad')).code,401);
assert.equal((await run('GET','Bearer test-key','customer-id')).code,403);
assert.equal((await run('GET','Bearer test-key','test-id',{...config,QUOTE_LAUNCH_VERIFY_EXPIRES:0})).code,401);
assert.equal(lookups,0);
const success=await run();assert.equal(success.code,200);assert.equal(success.body.delivery.status,'delivered');assert.equal(lookups,1);
console.log('Scoped, expiring launch verification passed');
