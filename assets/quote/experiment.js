(function () {
 const experimentId='auto_old_driveway_20261014';
 const params=new URLSearchParams(location.search);
 const valid=value=>['old_setup','driveway_offer'].includes(value);
 const rendered=document.documentElement.dataset.experimentVariant;
 const participating=params.get('experiment_id')===experimentId;
 const explicitOffer=/^\/(driveway-package|package)\/?$/.test(location.pathname);
 const variant=valid(rendered)?rendered:participating&&valid(params.get('experiment_variant'))?params.get('experiment_variant'):params.get('experience')==='driveway'||explicitOffer?'driveway_offer':null;
 if(!variant||(!participating&&variant==='old_setup'))return;
 const labels=participating?{experiment_id:experimentId,experiment_variant:variant}:null;
 if(labels){window.ObsidianExperiment=labels;try{window.gtag?.('set',labels)}catch{}}
 // Carry the existing assignment through browsing pages; never assign or rerandomize a visitor.
 const decorate=()=>{
  for(const a of document.querySelectorAll('a[href]')){
   const raw=a.getAttribute('href');
   if(!raw||raw.startsWith('#')||a.hasAttribute('download'))continue;
   let url;try{url=new URL(a.href,location.origin)}catch{continue}
   if(url.origin!==location.origin||!/^https?:$/.test(url.protocol))continue;
   if(/^\/(api|assets|gallery|\.well-known)(\/|$)/.test(url.pathname)||/\.[a-z0-9]+$/i.test(url.pathname))continue;
   if(/commercial|office-window|residential|home-window/.test(url.pathname))continue;
   // The gallery's generic quote destination has no package offer; return offer visitors to its existing landing page.
   if(variant==='driveway_offer'&&/^\/car-window-tinting-near-me\/?$/.test(url.pathname))url.pathname='/driveway-package';
   if(labels)for(const [key,value] of Object.entries(labels))url.searchParams.set(key,value);
   if(variant==='driveway_offer')url.searchParams.set('experience','driveway');else url.searchParams.delete('experience');
   a.href=url.toString();
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate);else decorate();
})();
