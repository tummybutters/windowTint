import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createStore}=require('../lib/automotive-quote-store');
let issueQuery='',sent=0;
const store=createStore({query:async(q)=>{if(q.includes('COUNT(*)')){issueQuery=q;return[{failed:0,unknown:0,pending:0,crm_failed:0,crm_unknown:0,crm_pending:1}]};return[]},send:async()=>sent++,sendCrm:async()=>sent++});
const result=await store.retry();assert.equal(result.crm_pending,1);assert.equal(sent,0);
assert.match(issueQuery,/crm_state='accepted' AND NOT EXISTS\(SELECT 1 FROM crm_quote_contacts/);
assert.match(issueQuery,/received_at<now\(\)-interval '15 minutes'/);
console.log('Accepted-but-unverified CRM handoffs surface without blind resends');
