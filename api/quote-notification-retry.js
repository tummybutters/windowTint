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
  if(id!==undefined){if(typeof id!=='string'||!/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(id))return res.status(400).json({error:'Invalid lead ID'});const lead=await store.status(id);return res.status(lead?200:404).json({lead})}
  return res.status(200).json(await store.retry());
 }catch{return res.status(503).json({error:'Retry unavailable'})}
};
module.exports=createHandler();module.exports.createHandler=createHandler;
