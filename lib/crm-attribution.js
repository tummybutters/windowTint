// Private evidence ledger. This never sends messages or creates TintWiz customers.
const SCHEMA=`CREATE TABLE IF NOT EXISTS crm_attribution_records (
 kind text NOT NULL, record_id text NOT NULL, contact_id text NOT NULL,
 quote_id uuid, project_id text, occurred_at timestamptz NOT NULL,
 status text NOT NULL, amount_minor bigint, currency text,
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,record_id)
)`;
function normalize(x){
 if(!x||!['contact','appointment','proposal','payment'].includes(x.kind))throw Error('invalid_kind');
 const out={kind:x.kind};
 for(const k of ['record_id','contact_id']){if(typeof x[k]!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(x[k]))throw Error('invalid_id');out[k]=x[k]}
 if(x.quote_id){if(!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(x.quote_id))throw Error('invalid_quote_id');out.quote_id=x.quote_id}
 if(x.kind==='contact'&&(!out.quote_id||out.record_id!==out.contact_id))throw Error('invalid_contact_mapping');
 if(x.project_id){if(typeof x.project_id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(x.project_id))throw Error('invalid_project');out.project_id=x.project_id}
 const date=Date.parse(x.occurred_at);if(!Number.isFinite(date)||date>Date.now()+86400000||date<Date.UTC(2020,0,1))throw Error('invalid_time');out.occurred_at=new Date(date).toISOString();
 const statuses={contact:['verified'],appointment:['scheduled','canceled','completed'],proposal:['sent','viewed','accepted','declined'],payment:['paid','refunded','void']};
 out.status=x.status||(x.kind==='contact'?'verified':'');if(!statuses[x.kind].includes(out.status))throw Error('invalid_status');
 if(x.kind==='payment'){
  if(!out.project_id||!Number.isSafeInteger(x.amount_minor)||x.amount_minor<=0||x.amount_minor>100000000||x.currency!=='USD')throw Error('invalid_payment');out.amount_minor=x.amount_minor;out.currency='USD';
 }
 return out;
}
function createStore(query){let ready;return {
 async init(){return ready??=(query(SCHEMA,[]).catch(e=>{ready=null;throw e}))},
 async ingest(input){const r=normalize(input);await this.init();
  if(r.quote_id){const q=await query('SELECT id FROM automotive_quotes WHERE id=$1',[r.quote_id]);if(!q.length)throw Error('quote_not_found')}
  // Conflicting contact->quote mappings require reconciliation, never silent reassignment.
  const rows=await query(`INSERT INTO crm_attribution_records(kind,record_id,contact_id,quote_id,project_id,occurred_at,status,amount_minor,currency) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(kind,record_id) DO UPDATE SET status=EXCLUDED.status,amount_minor=EXCLUDED.amount_minor,currency=EXCLUDED.currency,occurred_at=EXCLUDED.occurred_at,received_at=now() WHERE crm_attribution_records.contact_id=EXCLUDED.contact_id AND crm_attribution_records.quote_id IS NOT DISTINCT FROM EXCLUDED.quote_id AND crm_attribution_records.project_id IS NOT DISTINCT FROM EXCLUDED.project_id AND crm_attribution_records.occurred_at<=EXCLUDED.occurred_at RETURNING record_id`,[r.kind,r.record_id,r.contact_id,r.quote_id||null,r.project_id||null,r.occurred_at,r.status,r.amount_minor||null,r.currency||null]);if(!rows.length)throw Error('conflicting_evidence');return{record_id:r.record_id,kind:r.kind};
 },
 async report(quoteIds){await this.init();return query(`SELECT c.quote_id,r.kind,r.record_id,r.contact_id,r.project_id,r.occurred_at,r.status,r.amount_minor,r.currency,r.received_at FROM crm_attribution_records c JOIN crm_attribution_records r ON r.contact_id=c.contact_id WHERE c.kind='contact' AND r.quote_id=c.quote_id AND c.quote_id=ANY($1::uuid[]) ORDER BY r.occurred_at`,[quoteIds])}
}}
function defaultStore(){const {neon}=require('@neondatabase/serverless');const sql=neon(process.env.DATABASE_URL);return createStore((q,p)=>sql.query(q,p))}
module.exports={normalize,createStore,defaultStore,SCHEMA};
