import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{createStore}=require('../lib/crm-attribution');
const mappings=new Map();
const query=async(q,p)=>{
 if(q.includes('SELECT id FROM automotive_quotes'))return [{id:p[0]}];
 if(q.includes('INSERT INTO crm_quote_contacts')&&p.length){
  const [quote,contact]=p;if(mappings.has(quote)&&mappings.get(quote)!==contact)return[];mappings.set(quote,contact);return[{record_id:contact}];
 }
 if(q.includes('INSERT INTO crm_attribution_records'))return[];
 return[];
};
const store=createStore(query),base={kind:'contact',record_id:'123',contact_id:'123',occurred_at:'2026-11-12T17:00:00Z'};
const one='f0235e20-8fac-465b-8bf3-1fcb7c0a4f60',two='f0235e20-8fac-465b-8bf3-1fcb7c0a4f61';
await store.ingest({...base,quote_id:one});await store.ingest({...base,quote_id:two});await store.ingest({...base,quote_id:one});
assert.equal(mappings.size,2,'two requests by one real customer remain independently linked');
await assert.rejects(store.ingest({...base,quote_id:one,record_id:'456',contact_id:'456'}),/conflicting_evidence/);
console.log('Many requests per contact, idempotency and conflicting-contact protection passed');
