import {neon} from '@neondatabase/serverless';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),{readAlertStatus}=require('../lib/quote-notifications');
const sql=neon(process.env.DATABASE_URL);
const rows=await sql.query(`SELECT id,received_at,lead_kind,notification_state,notification_provider_id,notification_delivery_state,crm_state,stage FROM automotive_quotes WHERE received_at>now()-interval '14 days' AND name !~* '^(INTERNAL TEST|DEPLOYMENT TEST|QA TEST|TEST)' ORDER BY received_at DESC`);
const results=[];
for(const r of rows){let provider=null;try{provider=r.notification_provider_id?await readAlertStatus(r.notification_provider_id):null}catch{provider={status:'lookup_unavailable'}}results.push({id:r.id,received_at:r.received_at,kind:r.lead_kind,notification_state:r.notification_state,provider_status:provider?.status||'missing',crm_handoff:r.crm_state});}
const result={checked_at:new Date().toISOString(),recipient_matches_elle:process.env.QUOTE_ALERT_TO==='+17146007134',count:results.length,confirmed:results.filter(r=>['delivered','read'].includes(r.provider_status)).length,issues:results.filter(r=>!['delivered','read'].includes(r.provider_status)),leads:results};
fs.writeFileSync('../delivery-readback.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,leads:undefined}));
