(function(root){
 const A='#ff6846',S='#c7ccd1',D='#444a50';
 const svg=body=>`<div class="diagram" aria-hidden="true"><svg viewBox="0 0 160 100" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg></div>`;
 const pane=(x,y,w,h,fill=D)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${S}" stroke-width="1.5"/>`;
 const icons={
  heat:svg(`${pane(40,30,58,56)}<path d="M69 30v56M40 58h58" stroke="${S}" stroke-width="1.5"/><circle cx="118" cy="26" r="10" fill="${A}"/><path d="M118 8v4m0 28v4m18-18h-4m-28 0h-4m17-13-3 3m-20 20-3 3m26 0-3-3m-20-20-3-3" stroke="${A}" stroke-width="2"/><path d="M50 74q6-6 12 0t12 0" stroke="${A}" stroke-width="2"/>`),
  glare:svg(`<rect x="42" y="22" width="76" height="48" rx="4" fill="${D}" stroke="${S}" stroke-width="1.5"/><path d="M72 70v12m-14 0h44" stroke="${S}" stroke-width="2"/><path d="M52 32l22 26M64 30l20 24" stroke="${A}" stroke-width="3" opacity=".9"/><circle cx="128" cy="18" r="8" fill="${A}"/>`),
  privacy:svg(`${pane(46,16,68,70,'#5a6066')}<path d="M46 40h68M46 64h68" stroke="#7b8288" stroke-width="1"/><circle cx="80" cy="44" r="8" fill="#2a2e32"/><path d="M66 70q14-16 28 0" fill="#2a2e32"/><path d="M108 20 52 82" stroke="#ffffff" stroke-opacity=".25" stroke-width="8"/>`),
  security:svg(`${pane(40,18,80,66)}<path d="M52 28l14 16-10 12 16 18M100 30l-12 14 14 10-12 20" stroke="#8a9096" stroke-width="1.5"/><path d="M80 34l18 7v13q0 16-18 24-18-8-18-24V41Z" fill="${A}" stroke="#ffb49f" stroke-width="1.5"/><path d="M72 57l6 6 11-12" stroke="#1a1a1a" stroke-width="3"/>`),
  uv:svg(`<circle cx="46" cy="34" r="12" fill="${A}"/><path d="M46 12v5m0 34v5m22-22h-5m-34 0h-5" stroke="${A}" stroke-width="2"/><rect x="72" y="46" width="22" height="34" rx="3" fill="#8a4a3a"/><rect x="98" y="46" width="22" height="34" rx="3" fill="#c07a62"/><rect x="124" y="46" width="22" height="34" rx="3" fill="#e0b7a6"/>`),
  unsure:'<div class="diagram help" aria-hidden="true">?</div>',
  few:svg(`${pane(50,20,60,62)}<path d="M80 20v62" stroke="${S}" stroke-width="1.5"/><path d="M40 86h80" stroke="${S}" stroke-width="2"/>`),
  mid:svg([0,1,2].map(c=>[0,1].map(r=>pane(34+c*32,18+r*34,26,28)).join('')).join('')+`<path d="M28 88h104" stroke="${S}" stroke-width="2"/>`),
  many:svg(`<rect x="46" y="6" width="68" height="84" rx="3" fill="#2d3136" stroke="${S}" stroke-width="1.5"/>`+[0,1,2].map(c=>[0,1,2,3].map(r=>`<rect x="${54+c*19}" y="${14+r*19}" width="13" height="13" rx="1.5" fill="${A}" fill-opacity="${r%2?'.55':'.9'}"/>`).join('')).join('')),
  measure:svg(`<rect x="30" y="38" width="78" height="26" rx="4" fill="#d9b24a" stroke="#8a6f22" stroke-width="1.5"/>`+Array.from({length:9},(_,i)=>`<path d="M${38+i*8} 38v${i%2?7:12}" stroke="#5a4712" stroke-width="1.5"/>`).join('')+`<circle cx="120" cy="51" r="16" fill="${D}" stroke="${S}" stroke-width="1.5"/><circle cx="120" cy="51" r="5" fill="${A}"/>`),
  manager:svg(`<rect x="52" y="14" width="56" height="72" rx="5" fill="${D}" stroke="${S}" stroke-width="1.5"/><rect x="68" y="8" width="24" height="12" rx="3" fill="${A}"/><path d="M62 38h36M62 50h36M62 62h24" stroke="${S}" stroke-width="2"/><path d="M92 62l5 5 9-10" stroke="${A}" stroke-width="3"/>`),
  owner:svg(`<path d="M34 40h92v44H34Z" fill="${D}" stroke="${S}" stroke-width="1.5"/><path d="M30 40l8-18h84l8 18Z" fill="${A}"/><rect x="44" y="52" width="34" height="32" fill="#2a2e32" stroke="${S}"/><rect x="88" y="52" width="26" height="32" fill="#2a2e32" stroke="${S}"/>`),
  landlord:svg(`<circle cx="62" cy="50" r="18" fill="none" stroke="${A}" stroke-width="5"/><path d="M78 50h52m-14 0v12m10-12v8" stroke="${A}" stroke-width="5"/>`),
  hoa:svg(`<path d="M24 56 48 36l24 20v28H24Z" fill="${D}" stroke="${S}" stroke-width="1.5"/><path d="M68 52l24-22 24 22v32H68Z" fill="#555b61" stroke="${S}" stroke-width="1.5"/><path d="M108 56l24-20 24 20v28h-48Z" fill="${D}" stroke="${S}" stroke-width="1.5"/><rect x="84" y="62" width="16" height="22" fill="${A}"/>`),
  contractor:svg(`<path d="M50 56q0-26 30-26t30 26" fill="${A}"/><rect x="44" y="54" width="72" height="10" rx="4" fill="#ffb49f"/><path d="M80 30v24" stroke="#1a1a1a" stroke-width="2"/><path d="M40 82h80" stroke="${S}" stroke-width="3"/>`),
  soon:svg(`<rect x="46" y="20" width="68" height="64" rx="6" fill="${D}" stroke="${S}" stroke-width="1.5"/><path d="M46 36h68M62 14v12m36-12v12" stroke="${S}" stroke-width="2"/><circle cx="80" cy="60" r="10" fill="${A}"/>`),
  quarter:svg(`<rect x="36" y="22" width="58" height="56" rx="6" fill="${D}" stroke="${S}" stroke-width="1.5"/><path d="M36 38h58" stroke="${S}" stroke-width="2"/><path d="M104 50h26m-8-8 8 8-8 8" stroke="${A}" stroke-width="3"/>`),
  later:svg(`<rect x="50" y="16" width="60" height="72" rx="5" fill="${D}" stroke="${S}" stroke-width="1.5"/><path d="M62 34h36M62 46h36M62 58h20" stroke="${S}" stroke-width="2"/><path d="M92 76h16m-8-8v16" stroke="${A}" stroke-width="3"/>`)
 };
 const propertyPhotos = {
  office: ['/assets/site/commercial.webp', 'Office windows from the Obsidian portfolio'],
  other: ['/assets/site/work-commercial.webp', 'Commercial glass from the Obsidian portfolio']
 };
 const img = name => {
  const photo = propertyPhotos[name];
  const source = photo ? photo[0] : `/assets/commercial/${name}.webp`;
  const alt = photo ? photo[1] : `${name} property illustration`;
  return `<img src="${source}" alt="${alt}" width="600" height="400" loading="eager" decoding="async">`;
 };
 const STEPS=[
  {key:'property',title:'What kind of property is it?',choices:[['Office',img('office')],['Storefront / retail',img('storefront')],['Medical / healthcare',img('medical')],['Multi-family / HOA',img('multifamily')],['Industrial / warehouse',img('industrial')],['Something else',img('other')]]},
  {key:'problem',title:'What do you want to fix?',choices:[['Heat / hot offices',icons.heat],['Glare on screens',icons.glare],['Privacy / frosting',icons.privacy],['Security / break-ins',icons.security],['Sun fading (UV)',icons.uv],['Not sure yet',icons.unsure]]},
  {key:'glass',title:'About how much glass?',choices:[['A few windows or one storefront',icons.few],['6–20 windows',icons.mid],['20+ windows or multiple floors',icons.many],['Not sure, measure it for me',icons.measure]]},
 ];
 const FIELDS=[['name','Your name','First and last name','name',true],['company','Company or property name (optional)','e.g. Irvine Office Plaza','organization',false],['phone','Phone','(714) 555-0123','tel',true],['email','Email (optional)','you@company.com','email',false],['city','City','e.g. Irvine','address-level2',true]];
 function validate(key,value){
  const v=(value||'').trim();
  if(key==='company'||(key==='email'&&!v))return '';
  if(!v)return 'Please fill this in so we can respond to your request.';
  if(key==='phone'&&!/^1?\d{10}$/.test(v.replace(/\D/g,'')))return 'Please enter a valid 10-digit phone number.';
  if(key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))return 'Please check your email address.';
  if(key==='name'&&v.length<2)return 'Please enter your name.';
  if(key==='city'&&v.length<2)return 'Please enter your city.';
  return '';
 }
 const ATTRIBUTION_KEYS=['session_id','gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','campaignid','adgroupid','creative','keyword','matchtype','device','network'];
 function payload(answers,id,attribution,pagePath){
  return {lead_kind:'commercial',id,property:answers.property,problem:answers.problem,glass:answers.glass,name:(answers.name||'').trim(),company:(answers.company||'').trim(),phone:(answers.phone||'').trim(),email:(answers.email||'').trim(),city:(answers.city||'').trim(),contact:'call',website:answers.website||'',attribution,page_path:pagePath};
 }
 const api={STEPS,FIELDS,validate,payload};
 if(typeof module==='object'&&module.exports){module.exports=api;return}

 const quiz=document.getElementById('quote');if(!quiz)return;
 const $=s=>quiz.querySelector(s),screen=$('#screen');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const gtagEvent=(name,params={})=>{try{root.obsidianLeadTracking?.recordEvent?.(name,{...params,quote_id:state.id,flow_version:'intent-resume-20261108'});root.gtag?.('event',name,{lead_source:attribution().source_label||'Direct / unknown',lead_device:attribution().ad_click_device!=='unknown'?attribution().ad_click_device:attribution().device_category,lead_campaign_id:attribution().campaignid||'',internal_test:attribution().is_internal||'false',...params,page_path:location.pathname})}catch(error){console.error(`${name} tracking failed`,error)}};
 const state={step:0,answers:{},id:crypto.randomUUID(),busy:false,success:false,formViewed:false};
 if(quiz.dataset.problem)state.answers.problem=quiz.dataset.problem;
 const total=STEPS.length+1;
 function progress(){
  $('#counter').textContent=state.success?'COMPLETE':`${String(state.step+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
  quiz.querySelector('[role=progressbar]').setAttribute('aria-valuemax',total);
  quiz.querySelector('[role=progressbar]').setAttribute('aria-valuenow',state.success?total:state.step);
  $('#progress-fill').style.width=`${state.success?100:state.step/total*100}%`;
  $('#back').hidden=state.step===0||state.success;
 }
 function render(){
  progress();
  screen.classList.remove('enter');void screen.offsetWidth;screen.classList.add('enter');
  if(state.success){
   screen.innerHTML=`<div class="success" role="status"><div class="success-icon">✓</div><h2 tabindex="-1">You’re all set, ${esc(state.answers.name.split(' ')[0])}.</h2><p>Expect a call from our team at <a href="tel:+17146007134">(714) 600-7134</a> to discuss your project and the next step.<br>Your request is saved. An appointment has not been booked.</p><p class="summary">${esc([state.answers.property,state.answers.glass,state.answers.problem].join(' · '))}</p></div>`;
   screen.querySelector('h2').focus({preventScroll:true});return;
  }
  if(state.step<STEPS.length){
   const s=STEPS[state.step];
   screen.innerHTML=`<div class="question-head"><h2 id="question" tabindex="-1">${s.title}</h2></div><div class="choices${s.choices.length>4?' choices-six':''}">${s.choices.map(([label,art])=>`<button type="button" class="choice${state.answers[s.key]===label?' selected':''}" data-answer="${esc(label)}" aria-pressed="${state.answers[s.key]===label}">${art}<span class="choice-label">${label}<i aria-hidden="true">✓</i></span></button>`).join('')}</div>`;
   screen.querySelectorAll('.choice').forEach(b=>b.onclick=()=>choose(s,b.dataset.answer));
   return;
  }
  if(!state.formViewed){state.formViewed=true;gtagEvent('commercial_form_view')}
  screen.innerHTML=`<div class="question-head"><h2 id="question" tabindex="-1">How can we reach you?</h2></div><form id="step-form" class="input-wrap combined-form" novalidate><div class="quote-honeypot" aria-hidden="true"><label for="website">Leave empty</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div><div class="field-grid">${FIELDS.map(([key,label,ph,ac,req])=>`<div class="field${key==='city'?' address-field':''}"><label for="${key}">${label}</label><input id="${key}" name="${key}" type="${key==='phone'?'tel':key==='email'?'email':'text'}" ${key==='phone'?'inputmode="tel"':key==='email'?'inputmode="email"':''} autocomplete="${ac}" placeholder="${ph}" maxlength="${key==='email'?254:120}" value="${esc(state.answers[key]||'')}" aria-describedby="error-${key}" ${req?'required':''}><div class="field-error" id="error-${key}" aria-live="polite"></div></div>`).join('')}</div><div class="summary">${esc([state.answers.property,state.answers.glass,state.answers.problem].join(' · '))}</div><div id="error" class="error" aria-live="polite"></div><div class="input-footer"><span class="hint">We’ll call to discuss your project.</span><button class="primary" type="submit">Send project request <span>→</span></button></div><p class="consent">By submitting, you agree that Obsidian may call or email you about this request. We use your details only to respond to it.</p></form>`;
  $('#step-form').onsubmit=e=>{e.preventDefault();submit()};
 }
 function choose(step,label){
  if(state.busy)return;
  if(state.step===0&&!state.started){state.started=true;gtagEvent('commercial_quiz_start')}
  state.answers[step.key]=label;
  gtagEvent(`commercial_step_${state.step+1}_${step.key}`);
  state.step++;render();screen.querySelector('h2')?.focus({preventScroll:true});
 }
 function attribution(){return root.ObsidianCommercialAttribution?.get?.()||{}}
 async function submit(){
  if(state.busy)return;
  const form=$('#step-form');let first=null;
  FIELDS.map(([key])=>form.querySelector('#'+key)).forEach(i=>{state.answers[i.name]=i.value.trim();const err=validate(i.name,i.value);form.querySelector('#error-'+i.name).textContent=err;if(err){i.setAttribute('aria-invalid','true');first??=i}else i.removeAttribute('aria-invalid')});
  if(first){first.focus();return}
  state.answers.website=form.querySelector('#website').value;
  state.busy=true;const button=form.querySelector('button[type=submit]');button.disabled=true;button.textContent='Sending your request…';
  try{
   const response=await fetch('/api/automotive-quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload(state.answers,state.id,attribution(),location.pathname))});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||data.ok!==true||data.id!==state.id)throw Error(data.error||'We could not save your request.');
   gtagEvent('commercial_submit_success',{property:state.answers.property,problem:state.answers.problem,quote_id:state.id});
   try{if(!root.ObsidianCommercialAttribution?.isInternal?.())root.gtag?.('event','conversion',{send_to:'AW-17846304809/hB4aCLK0tt4cEKmA5L1C',transaction_id:state.id})}catch(error){console.error('commercial conversion failed',error)}
   state.success=true;render();
  }catch(error){
   console.error('Commercial request failed',error);gtagEvent('commercial_submit_error');
   $('#error').textContent='That didn’t go through. Try again, or call or text (714) 600-7134.';
   button.disabled=false;button.innerHTML='Try again <span>→</span>';
  }finally{state.busy=false}
 }
 $('#back').onclick=()=>{if(state.step>0&&!state.busy){const form=$('#step-form');if(form)FIELDS.map(([key])=>form.querySelector('#'+key)).forEach(i=>state.answers[i.name]=i.value.trim());state.step--;render()}};
 document.getElementById('resume')?.addEventListener('click',()=>quiz.scrollIntoView({behavior:'smooth',block:'start'}));
 render();
})(typeof window==='object'?window:this);
