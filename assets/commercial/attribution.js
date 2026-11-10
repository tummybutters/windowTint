(function(root){
 'use strict';
 const KEY='obsidian_commercial_attribution_v1',TTL=30*24*60*60*1000;
 const PARAMS=['gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','campaignid','adgroupid','creative','keyword','matchtype','device','network'];
 const clean=v=>String(v||'').replace(/[\r\n\t]/g,' ').slice(0,200);
 function device(ua,touch){if(/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)||(/Macintosh/.test(ua)&&touch>1))return 'tablet';return /Mobile|iPhone|iPod/i.test(ua)?'mobile':ua?'desktop':'unknown'}
 function capture({url,referrer='',previous=null,now=Date.now(),ua='',touch=0,sessionId=''}){
  const u=new URL(url),p=u.searchParams;let current={};
  for(const k of PARAMS){const v=p.get(k);if(v&&!/[{}]/.test(v))current[k]=clean(v)}
  let ref='';try{const r=new URL(referrer);if(r.hostname!==u.hostname)ref=r.hostname}catch{}
  const hasTag=Boolean(current.gclid||current.gbraid||current.wbraid||current.utm_source||current.utm_medium||current.campaignid);
  const old=previous&&now-previous.saved_at<TTL&&now>=previous.saved_at?previous:null;
  let a;
  if(hasTag){a=current}
  else if(ref){a={utm_source:ref,utm_medium:/(^|\.)(google\.[a-z.]+|bing.com|duckduckgo.com|yahoo.com)$/.test(ref)?'organic':'referral'}}
  else a=old?{...old.data}:{};
  if(hasTag||ref||!old){a.landing_page=u.pathname;a.referrer_host=ref;a.touch_at=new Date(now).toISOString()}
  const isInternal=['qa','internal','test'].includes(String(a.utm_source).toLowerCase())||a.utm_medium==='internal';
  const paid=Boolean(a.gclid||a.gbraid||a.wbraid)||(a.utm_source==='google'&&['cpc','ppc','paidsearch','paid_search'].includes(a.utm_medium));
  a.source_label=isInternal?'Internal test':paid?'Google Ads':a.utm_medium==='organic'?'Organic search':a.utm_source?clean(a.utm_source)+(a.utm_medium?' / '+clean(a.utm_medium):''):'Direct / unknown';
  a.device_category=device(ua,touch);a.ad_click_device=({m:'mobile',c:'desktop',t:'tablet'})[a.device]||'unknown';
  a.device_basis=a.ad_click_device==='unknown'?'browser inference':'Google Ads click parameter';
  a.attribution_model='last non-direct touch, 30 days';a.attribution_version='commercial-v1';a.is_internal=isInternal?'true':'false';
  a.session_id=clean(sessionId||old?.data?.session_id);a.first_landing_page=old?.data?.first_landing_page||u.pathname;
  return {saved_at:hasTag||ref||!old?now:old.saved_at,data:a};
 }
 const api={capture,device,KEY};if(typeof module==='object'&&module.exports){module.exports=api;return}
 let previous=null;try{previous=JSON.parse(localStorage.getItem(KEY))}catch{}
 let sessionId='';try{sessionId=root.obsidianLeadTracking?.getLead?.().session_id||''}catch{}
 const state=capture({url:location.href,referrer:document.referrer,previous,ua:navigator.userAgent,touch:navigator.maxTouchPoints,sessionId:sessionId||'commercial_'+crypto.randomUUID()});
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}
 root.ObsidianCommercialAttribution={get:()=>root.ObsidianJourney?.get?.()||({...state.data}),isInternal:()=>state.data.is_internal==='true'};
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href^="tel:"],a[href^="sms:"]');if(!link)return;
  const a=state.data;root.gtag?.('event','commercial_contact_click',{contact_method:link.getAttribute('href').startsWith('tel:')?'call':'text',lead_source:a.source_label,lead_device:a.ad_click_device!=='unknown'?a.ad_click_device:a.device_category,lead_campaign_id:a.campaignid||'',internal_test:a.is_internal,page_path:location.pathname});
 });
})(typeof window==='object'?window:this);
