const crypto=require('node:crypto');
const {defaultStore}=require('../lib/automotive-quote-store');
const createHandler=(options={})=>async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const secret=options.secret||process.env.QUOTE_RETRY_SECRET||process.env.CRON_SECRET;
 const expected=Buffer.from(`Bearer ${secret||''}`),actual=Buffer.from(String(req.headers?.authorization||''));
 if(!secret||actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return res.status(401).json({error:'Unauthorized'});
 try{
  const store=options.store||defaultStore(),id=req.query?.lead_id;
  if(['commercial','funnel','delivery'].includes(req.query?.report)){
   const {start,end}=req.query;
   const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
   if(!valid(start)||!valid(end)||Date.parse(end)<Date.parse(start)||Date.parse(end)-Date.parse(start)>90*86400000)return res.status(400).json({error:'Use a valid date range of at most 90 days'});
   if(req.query.report==='funnel'){const report=await store.funnelReport(start,end);const crm=await (options.crmStore||require('../lib/crm-attribution').defaultStore()).report(report.leads.map(l=>l.quote_id));return res.status(200).json({start,end,timezone:'America/Los_Angeles',...report,crm_evidence:crm});}
   if(req.query.report==='delivery'){const offset=Number(req.query.offset||0);if(!Number.isInteger(offset)||offset<0||offset>10000)return res.status(400).json({error:'Invalid offset'});return res.status(200).json({start,end,timezone:'America/Los_Angeles',...(await store.deliveryReport(start,end,offset))});}
   const leads=await store.commercialReport(start,end);return res.status(200).json({start,end,timezone:'America/Los_Angeles',leads,truncated:leads.length===1000});
  }
  if(id!==undefined){if(typeof id!=='string'||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(id))return res.status(400).json({error:'Invalid lead ID'});const lead=await store.status(id);return res.status(lead?200:404).json({lead})}
  return res.status(200).json(await store.retry());
 }catch{return res.status(503).json({error:'Retry unavailable'})}
};
module.exports=createHandler();module.exports.createHandler=createHandler;
