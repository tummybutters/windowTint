// Read-only, expiring launch check restricted to the single synthetic test lead.
const crypto=require('node:crypto');
const {defaultStore}=require('../lib/automotive-quote-store');
const {readAlertStatus}=require('../lib/quote-notifications');
const createHandler=(options={})=>async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const config=options.config||process.env,secret=config.QUOTE_LAUNCH_VERIFY_SECRET;
 const expected=Buffer.from(`Bearer ${secret||''}`),actual=Buffer.from(String(req.headers?.authorization||''));
 if(!secret||Date.now()>Number(config.QUOTE_LAUNCH_VERIFY_EXPIRES||0)||actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return res.status(401).json({error:'Unauthorized'});
 if(req.query?.lead_id!==config.QUOTE_LAUNCH_VERIFY_LEAD_ID)return res.status(403).json({error:'Test lead only'});
 try{
  const lead=await (options.store||defaultStore()).status(config.QUOTE_LAUNCH_VERIFY_LEAD_ID);
  if(!lead)return res.status(404).json({error:'Not found'});
  const delivery=lead.notification_provider_id?await (options.readStatus||readAlertStatus)(lead.notification_provider_id):null;
  return res.status(200).json({lead,delivery});
 }catch{return res.status(503).json({error:'Verification unavailable'})}
};
module.exports=createHandler();module.exports.createHandler=createHandler;
