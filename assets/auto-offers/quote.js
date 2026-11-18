(() => {
 const {packages,bodies,choices,selection}=window.AutoPackages;
 const form=document.querySelector('#offer-form'), f=form.elements;
 const get=id=>document.getElementById(id);
 const params=new URLSearchParams(location.search);
 const slug=params.get('offer')||location.hash.slice(1);
 const phase='auto-packages-20261118';
 let id=crypto.randomUUID(), pending=null, saving=false, started=false;
 function track(name,extra={}){
   const labels={quote_id:id,flow_version:phase,offer_id:f.offer.value,...extra};
   window.obsidianLeadTracking?.recordEvent?.(name,labels);
   window.gtag?.('event',name,{...labels,send_to:'G-TR9ET60HX3',page_location:location.origin+location.pathname});
 }
 function refresh(){
   const key=f.offer.value,p=packages[key];
   const upgrades=choices(key,f.vehicle.value), previous=f.upgrade.value;
   f.upgrade.replaceChildren(...upgrades.map(u=>new Option(u,u,false,u===previous)));
   const windshield=['front-cabin','complete'].includes(key);
   get('windshield-field').hidden=!windshield;
   if(!windshield) f.windshield.value='standard';
   const summary=f.body.value?selection(key,f.body.value,f.vehicle.value,f.upgrade.value,f.windshield.value==='clear'):null;
   get('estimate').textContent=summary?(summary.quoted_menu_price===null?'Custom quote for this glass or vehicle.':p.name+' · $'+summary.quoted_menu_price):'Choose your vehicle to see package pricing.';
 }
 function show(key,scroll=false){
   if(!Object.hasOwn(packages,key))return;
   f.offer.value=key; const p=packages[key];
   get('offer-title').textContent=p.name;get('offer-benefit').textContent=p.benefit;
   get('offer-description').textContent=p.description;
   const [coupe,sedan,suv]=p.prices;
   get('offer-price').textContent=(coupe===sedan?'Sedan or coupe $'+sedan:'Standard coupe $'+coupe+' · sedan $'+sedan)+' · SUV or truck $'+suv;
   const card=get(key);
   const source=card.querySelector('figure img'), hero=get('offer-photo');
   for(const attr of ['srcset','src','alt','width','height']) hero.setAttribute(attr,source.getAttribute(attr));
   get('offer-photo-caption').textContent=card.querySelector('figcaption').textContent;
   get('build-photo').replaceChildren(card.querySelector('template').content.cloneNode(true));
   get('hero-link').href='#build';get('hero-link').textContent='Build my package';
   get('build').hidden=false;refresh();
   if(scroll)get('build').scrollIntoView({behavior:'instant'});
 }
 if(Object.hasOwn(packages,slug))show(slug);
 window.addEventListener('DOMContentLoaded',()=>{
   const a=window.ObsidianJourney?.get()||{};
   if(a.campaignid||a.gclid)track('paid_landing_page_view');
   window.ObsidianFormDiagnostics?.mount({form,quoteId:id,fields:['vehicle','city','name','phone'].map(key=>[key]),validate:(key,value)=>key==='phone'?!/^1?\d{10}$/.test(value.replace(/\D/g,'')):!form.elements[key].validity.valid,emit:track,kind:'auto'});
 });
 for(const a of document.querySelectorAll('[data-select]'))a.addEventListener('click',ev=>{
   if(pending)return;
   ev.preventDefault();const url=new URL(location.href);url.searchParams.set('offer',a.dataset.select);url.hash='build';
   history.replaceState(null,'',url);show(a.dataset.select,true);track('quote_step_complete',{step_name:'package'});
 });
 f.offer.addEventListener('change',()=>{
   const url=new URL(location.href);url.searchParams.set('offer',f.offer.value);history.replaceState(null,'',url);
   show(f.offer.value);track('quote_step_complete',{step_name:'package'});
 });
 for(const el of [f.body,f.upgrade,f.windshield])el.addEventListener('change',refresh);
 f.vehicle.addEventListener('input',refresh);
 form.addEventListener('focusin',()=>{if(!started){started=true;track('quote_start')}});
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){track('quiz_form_view');observer.disconnect()}});
 observer.observe(form);
 form.addEventListener('invalid',ev=>track('quote_validation_error',{field_name:ev.target.name}),true);
 form.addEventListener('submit',async ev=>{
   ev.preventDefault();if(saving)return;
   const digits=f.phone.value.replace(/\D/g,'');
   if(!/^1?\d{10}$/.test(digits)){f.phone.setCustomValidity('Enter a 10-digit phone number.');f.phone.reportValidity();f.phone.setCustomValidity('');return}
   const k=f.offer.value;
   const base={...window.ObsidianJourney?.get(),flow_version:phase,form_rendered_variant:'package_quote',form_assignment_status:'not_enrolled'};
   const payload=pending||{id,offer_id:k,body_style:f.body.value,upgrade_choice:f.upgrade.value,clear_windshield:f.windshield.value==='clear',coverage:packages[k].coverage,
     type:f.body.value===bodies[2]?'SUV / crossover':f.body.value===bodies[3]?'Other':'Car',vehicle:f.vehicle.value.trim(),city:f.city.value.trim(),name:f.name.value.trim(),phone:f.phone.value.trim(),website:f.website.value,contact:'call',page_path:location.pathname,attribution:base};
   saving=true;const btn=form.querySelector('[type=submit]');btn.disabled=true;track('quote_submit_attempt');
   try{
     const res=await fetch('/api/automotive-quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
     if(res.status>=400&&res.status<500&&res.status!==409){pending=null;throw new Error('invalid')}
     pending=payload;
     const saved=await res.json();if(!res.ok||saved.ok!==true||saved.id!==id)throw new Error('unknown');
     track('quote_submit_success');window.gtag?.('event','conversion',{send_to:'AW-17846304809/X2M1CLr3o4AdEKmA5L1C',transaction_id:id,page_location:location.origin+location.pathname});
     form.replaceChildren(Object.assign(document.createElement('h3'),{textContent:'Request received.'}),Object.assign(document.createElement('p'),{textContent:'We’ll call to confirm your package and installation details.'}));
     get('build').scrollIntoView();
   }catch(err){if(err.message!=='invalid')pending=payload;track('quote_submit_error');if(pending){for(const el of form.elements)if(el!==btn)el.disabled=true}
     get('offer-status').textContent=pending?'We couldn’t confirm your request. Retry to check the same request, or call us.':'Please check your details and try again.';
   }finally{saving=false;btn.disabled=false}
 });
})();
