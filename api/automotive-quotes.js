const {normalizeQuote}=require('../lib/automotive-quote');
const {defaultStore}=require('../lib/automotive-quote-store');
let sharedStore;
const createHandler=(options={})=>async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
 const host=String(req.headers?.['x-forwarded-host']||req.headers?.host||'').split(',')[0].trim();let same=false;try{const origin=new URL(req.headers?.origin);same=origin.host===host&&['https:','http:'].includes(origin.protocol)}catch{}
 if(!same)return res.status(403).json({error:'Request not allowed.'});
 if(!(options.enabled??process.env.AUTOMOTIVE_QUOTES_ENABLED==='true'))return res.status(503).json({error:'Online quotes are temporarily unavailable. Please call (714) 600-7134.'});
 let record;try{let body=req.body;if(!body){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192)throw Error('too_large');chunks.push(chunk)}body=Buffer.concat(chunks).toString()}if(Buffer.byteLength(typeof body==='string'?body:JSON.stringify(body))>8192)throw Error('too_large');record=normalizeQuote(typeof body==='string'?JSON.parse(body):body)}catch{return res.status(400).json({error:'Please check your vehicle, address, name and phone number.'})}
 let store;try{store=options.store||(sharedStore??=defaultStore());if(!await store.checkRateLimit(String(req.headers?.['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0]))return res.status(429).json({error:'Please wait a minute and try again.'});await store.persist(record)}catch(e){return res.status(e.status===409?409:503).json({error:e.status===409?'This request was already received with different details. Please refresh to start another.':'We couldn’t save your request. Please try again or call (714) 600-7134.'})}
 try{await store.dispatch(record.id)}catch{console.error('[automotive-quote-notification-pending]',record.id)}
 return res.status(200).json({ok:true,id:record.id});
};
module.exports=createHandler();module.exports.createHandler=createHandler;
