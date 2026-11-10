(function(){
 const offer={offer_id:'driveway_package',offer_version:'20261012_full_rollout'};
 window.ObsidianOffer=offer;
 try{window.gtag?.('set',offer)}catch{}
 const params=new URLSearchParams(location.search),lead=window.obsidianLeadTracking?.getLead?.()||{};
 const keys=['session_id','gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','campaignid','adgroupid','creative','keyword','matchtype','device','network','experience','experiment_id','experiment_variant'];
 for(const link of document.querySelectorAll('a.package-link,a.journey-back')){
  const url=new URL(link.href,location.origin);if(url.origin!==location.origin)continue;
  if(url.pathname.replace(/\/$/,'')==='/package'&&location.pathname.startsWith('/tesla-'))url.searchParams.set('vehicle_family','tesla');
  for(const key of keys){const value=params.get(key)||lead[key];if(value&&!url.searchParams.has(key))url.searchParams.set(key,String(value).slice(0,200))}
  link.href=url.toString();
 }
})();
