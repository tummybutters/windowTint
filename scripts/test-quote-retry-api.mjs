import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const api=require('../api/quote-notification-retry');
assert.equal(typeof api.createHandler,'function');
let calls=0;const store={retry:async()=>{calls++;return {failed:0,unknown:0,pending:0}},status:async(id)=>({id,notification_delivery_state:'delivered'})};
const handler=api.createHandler({secret:'worker-test-secret',store});
async function run(headers={},method='GET',query={}){const res={code:0,setHeader(){},status(c){this.code=c;return this},json(b){this.body=b;return this}};await handler({headers,method,query},res);return res}
assert.equal((await run()).code,401);assert.equal(calls,0);
assert.equal((await run({authorization:'Bearer 🔐🔐🔐'})).code,401);
assert.equal((await run({authorization:'Bearer worker-test-secret'},'POST')).code,405);
assert.equal((await run({authorization:'Bearer worker-test-secret'})).code,200);assert.equal(calls,1);
assert.equal((await run({authorization:'Bearer worker-test-secret'},'GET',{lead_id:'invalid'})).code,400);
const id='7e6ef9fc-cb8e-4b2b-a09b-b448356c487f';assert.equal((await run({authorization:'Bearer worker-test-secret'},'GET',{lead_id:id})).body.lead.notification_delivery_state,'delivered');
console.log('Private retry and delivery-status lookup require valid authorization.');
