(function(root){
 const copy={
  ceramic:['Ceramic Window Tint.','Installed at your door.','Ceramic film that blocks heat and UV, installed at your home or office in Orange County.'],
  ceramic_price:['Ceramic Tint Pricing.','Your car, quoted in a minute.','Tap your vehicle below for an exact price. Installed at your home or office.'],
  mobile:['Mobile Window Tinting.','We come to you.','Ceramic tint installed in your driveway or office lot, anywhere in Orange County.'],
  near_me:['Window Tinting Near You.','Done in your driveway.','No shop visit, no waiting room. We bring the tint to you.'],
  car:['Car Window Tint.','Done in your driveway.','A cooler cabin, a cleaner look, and more privacy, installed at your home.'],
  tesla:['Tesla Ceramic Tint.','Installed at your home.','Ceramic film fitted to your Tesla, installed at your home or office.'],
  tint_shop:['Skip the Tint Shop.','We tint at your door.','Same ceramic tint, installed at your home or office.']
 };
 const teslaModels=[[/model\s*3/,'Model 3'],[/model\s*y/,'Model Y'],[/model\s*s/,'Model S'],[/model\s*x/,'Model X'],[/cyber\s*truck/,'Cybertruck']];
 // Order matters: brand and product intent beat generic location/vehicle words.
 function classify(term){
  const t=String(term||'').toLowerCase().replace(/\+/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  if(!t)return null;
  const model=teslaModels.find(([re])=>re.test(t));
  if(/\btesla\b/.test(t)||model)return {key:'tesla',model:model?.[1]||null};
  const price=/\b(cost|costs|price|prices|pricing|how much|quote)\b/.test(t);
  if(/\b(ceramic|nano)\b/.test(t))return {key:price?'ceramic_price':'ceramic'};
  if(price)return {key:'ceramic_price'};
  if(/\btint shops?\b/.test(t))return {key:'tint_shop'};
  if(/\bmobile\b|come to (me|you)|at home/.test(t))return {key:'mobile'};
  if(/\b(car|cars|auto|automotive|vehicle|truck|suv)\b/.test(t))return {key:'car'};
  if(/\bnear me\b|\bnearby\b/.test(t))return {key:'near_me'};
  return null;
 }
 function headlineFor(match){
  if(!match||!copy[match.key])return null;
  const [line1,line2,sub]=copy[match.key];
  return {key:match.model?`tesla_${match.model.toLowerCase().replace(/\s+/g,'_')}`:match.key,line1:match.model?`${match.model} Ceramic Tint.`:line1,line2,sub};
 }
 function apply(doc,search){
  const intro=doc.querySelector('.intro');if(!intro)return null;
  const h1=intro.querySelector('h1'),p=intro.querySelector('p');
  const term=new URLSearchParams(search).get('utm_term');
  const h=headlineFor(classify(term));
  if(!h||!h1)return {key:intro.dataset.headline||'page_default',swapped:false};
  h1.textContent='';h1.append(h.line1+' ');
  const br=doc.createElement('br');br.className='mobile-break';h1.append(br,' ');
  const em=doc.createElement('em');em.textContent=h.line2;h1.append(em);
  if(p)p.textContent=h.sub;
  return {key:h.key,swapped:true};
 }
 const api={classify,headlineFor,apply};
 if(typeof module==='object'&&module.exports){module.exports=api;return}
 root.ObsidianHeadline=api;
 const result=apply(document,location.search);
 if(result)document.addEventListener('DOMContentLoaded',()=>{
  try{root.obsidianLeadTracking?.trackEvent('headline_view',{headline_variant:result.key,lead_action:result.swapped?'keyword_match':'page_default'})}catch(error){console.error('headline_view tracking failed',error)}
 },{once:true});
})(typeof window==='object'?window:this);
