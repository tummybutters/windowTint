import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const notifications=require('../lib/quote-notifications');
const {createStore}=require('../lib/automotive-quote-store');
Object.assign(process.env,{TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),TWILIO_AUTH_TOKEN:'test-token'});
assert.equal(typeof notifications.readAlertStatus,'function','Accepted sends need a delivery-status reader');
const status=await notifications.readAlertStatus('SM'+'2'.repeat(32),async(url,opts)=>{
 assert.equal(url,'https://api.twilio.com/2010-04-01/Accounts/AC'+'1'.repeat(32)+'/Messages/SM'+'2'.repeat(32)+'.json');
 assert.equal(opts.method,'GET');
 return {ok:true,json:async()=>({sid:'SM'+'2'.repeat(32),status:'undelivered',error_code:30006})};
});
assert.deepEqual(status,{status:'undelivered',errorCode:'30006'});
await assert.rejects(notifications.readAlertStatus('../Accounts',async()=>{throw Error('must not fetch')}));
let changes=[],sends=0;
const store=createStore({query:async(q,p)=>{
 changes.push([q,p]);
 if(q.includes('SELECT id,notification_provider_id'))return [{id:'lead-1',notification_provider_id:'SM'+'2'.repeat(32)}];
 if(q.includes('COUNT(*)'))return [{failed:1,unknown:0,pending:0}];
 return [];
},send:async()=>{sends++;},readStatus:async()=>({status:'undelivered',errorCode:'30006'})});
const result=await store.retry();
assert.equal(sends,0,'Delivery failure must not blindly resend an accepted message');
assert.equal(result.failed,1,'Worker must expose failed delivery for operational alerting');
assert(changes.some(([q,p])=>q.includes('notification_delivery_state=$2')&&p[0]==='lead-1'&&p[1]==='undelivered'&&p[2]==='30006'));
console.log('Delivery failure is recorded, surfaced, and never blindly resent.');
