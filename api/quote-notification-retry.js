const crypto=require('node:crypto');
const {defaultStore}=require('../lib/automotive-quote-store');
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');const expected=`Bearer ${process.env.CRON_SECRET||''}`,actual=String(req.headers.authorization||'');if(!process.env.CRON_SECRET||actual.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return res.status(401).json({error:'Unauthorized'});try{return res.status(200).json(await defaultStore().retry())}catch{return res.status(503).json({error:'Retry unavailable'})}};
