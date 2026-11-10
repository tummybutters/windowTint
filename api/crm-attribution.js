const crypto=require('node:crypto');
const {defaultStore,normalize}=require('../lib/crm-attribution');
let store;
const createHandler=(options={})=>async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const given=Buffer.from(String(req.headers?.authorization||''));
 const allowed=(options.secrets||[process.env.CRM_ATTRIBUTION_SECRET,process.env.QUOTE_RETRY_SECRET]).filter(Boolean).some(s=>{const expected=Buffer.from('Bearer '+s);return given.length===expected.length&&crypto.timingSafeEqual(given,expected)});
 if(!allowed)return res.status(401).json({error:'Unauthorized'});
 let records;try{const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(!raw||Buffer.byteLength(raw)>64000)throw Error();const b=JSON.parse(raw);records=Array.isArray(b.records)?b.records:[b];if(!records.length||records.length>100)throw Error();records=records.map(normalize)}catch{return res.status(400).json({error:'Invalid CRM evidence'})}
 try{const db=options.store||(store??=defaultStore());const accepted=[];for(const r of records)accepted.push(await db.ingest(r));return res.status(200).json({accepted})}catch(e){return res.status(['quote_not_found','conflicting_evidence'].includes(e.message)?409:503).json({error:['quote_not_found','conflicting_evidence'].includes(e.message)?e.message:'CRM evidence unavailable'})}
};
module.exports=createHandler();module.exports.createHandler=createHandler;
