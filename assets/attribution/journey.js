(function(root){
'use strict';
const KEY='obsidian_journey_v2',TTL=30*86400000,VISIT=30*60000;
const KEYS=['gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','campaignid','adgroupid','creative','keyword','matchtype','device','network'];
function capture({url,previous=null,now=Date.now(),referrer='',ua='',touch=0,presentationVersion='',id=()=>crypto.randomUUID()}){
 const u=new URL(url),current={};
 for(const k of KEYS){const v=u.searchParams.get(k);if(v&&!/[{}\r\n]/.test(v))current[k]=v.slice(0,200)}
 let ref='';try{const r=new URL(referrer);if(r.hostname!==u.hostname)ref=r.hostname}catch{}
 const tagged=Boolean(current.gclid||current.gbraid||current.wbraid||current.utm_source||current.campaignid);
 const valid=previous&&previous.version===2&&now>=previous.touch_at&&now-previous.touch_at<TTL;
 const old=valid?previous:null;
 // Internal links can carry existing tags. Do not rotate on the same touch.
 const signature=JSON.stringify(KEYS.map(k=>current[k]||''));
 const fresh=tagged?signature!==old?.signature:Boolean(ref);
 const data=tagged?(fresh?{...current}:{...old.data}):ref?{utm_source:ref,utm_medium:/(^|\.)(google\.[a-z.]+|bing.com|duckduckgo.com|yahoo.com)$/.test(ref)?'organic':'referral'}:old?{...old.data}:{};
 const newTouch=fresh||!old;
 if(newTouch){data.landing_page=u.pathname;data.referrer_host=ref;data.touch_at=new Date(now).toISOString()}
 const newVisit=!old||fresh||now-old.last_at>=VISIT;
 data.session_id=newVisit?'obsidian_visit_'+id():old.data.session_id;
 data.session_landing_page=newVisit?u.pathname:old.data.session_landing_page;
 data.first_seen_at=newVisit?new Date(now).toISOString():old.data.first_seen_at;
 data.last_seen_at=new Date(now).toISOString();
 data.first_landing_page=old?.data.first_landing_page||u.pathname;
 data.device_category=/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)||(/Macintosh/.test(ua)&&touch>1)?'tablet':/Mobile|iPhone|iPod/i.test(ua)?'mobile':ua?'desktop':'unknown';
 data.ad_click_device=({m:'mobile',c:'desktop',t:'tablet'})[data.device]||'unknown';
 data.device_basis=data.ad_click_device==='unknown'?'browser inference':'Google Ads click parameter';
 data.is_internal=/^(qa|internal|test)$/i.test(data.utm_source||'')||data.utm_medium==='internal'?'true':'false';
 const paid=Boolean(data.gclid||data.gbraid||data.wbraid)||(data.utm_source==='google'&&/^(cpc|ppc|paidsearch|paid_search)$/.test(data.utm_medium));
 data.source_label=data.is_internal==='true'?'Internal test':paid?'Google Ads':data.utm_medium==='organic'?'Organic search':data.utm_source||'Direct / unknown';
 data.attribution_model='last non-direct touch, 30 days';data.attribution_version='journey-v2-20261108';data.flow_version=presentationVersion==='paid-design-20261110'?'paid-design-20261110':'intent-resume-20261108';
 return {version:2,touch_at:newTouch?now:old.touch_at,last_at:now,signature:tagged?signature:newTouch?'':old.signature,data};
}
if(typeof module==='object'&&module.exports){module.exports={capture,KEY};return}
let state;try{state=JSON.parse(localStorage.getItem(KEY))}catch{}
function update(){state=capture({url:location.href,previous:state,now:Date.now(),referrer:document.referrer,ua:navigator.userAgent,touch:navigator.maxTouchPoints,presentationVersion:document.body?.dataset?.presentationVersion||document.documentElement?.dataset?.presentationVersion||'',id:()=>crypto.randomUUID()});try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
update();
root.ObsidianJourney={get:()=>{const e=root.ObsidianExperiment;if(e?.experiment_id==='auto_old_driveway_20261014'&&['old_setup','driveway_offer'].includes(e.experiment_variant)){state.data.experiment_id=e.experiment_id;state.data.experiment_variant=e.experiment_variant;}return {...state.data,rendered_experiment_variant:e?.experiment_variant||'unassigned'}},touch:()=>{state.last_at=Date.now();state.data.last_seen_at=new Date().toISOString();try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}};
})(typeof window==='object'?window:this);
