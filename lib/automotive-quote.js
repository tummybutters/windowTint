const crypto = require('node:crypto');
const ATTRIBUTION_KEYS=['session_id','gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','campaignid','adgroupid','creative','keyword','matchtype','device','network','rendered_experiment_variant','experiment_id','experiment_variant','source_label','device_category','ad_click_device','device_basis','landing_page','session_landing_page','first_landing_page','referrer_host','touch_at','first_seen_at','last_seen_at','attribution_model','attribution_version','flow_version','is_internal'];
function normalizeQuote(input){
 if(input&&input.lead_kind==='commercial')return require('./commercial-lead').normalizeCommercialLead(input);
 if(!input||typeof input!=='object'||Array.isArray(input)||input.website)throw Error('invalid_quote');
 const out={};for(const key of ['id','type','coverage','vehicle','name','phone']){if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>240)throw Error('invalid_quote');out[key]=input[key].trim().replace(/[\r\n\t]+/g,' ')}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(out.id))throw Error('invalid_id');
 if(!['Car','SUV / crossover','Truck','Supercar','Other'].includes(out.type)||!['Front two windows','Sides + rear','Full car','Windshield / other','Help me choose','Glass roof','Tint removal'].includes(out.coverage))throw Error('invalid_choice');
 const choices={priority:['Cooler cabin','More privacy','Less glare','A cleaner look','Clearer windows','Removing bubbles','Preparing for new tint'],timing:['As soon as possible','Sometime this week','Next week','Just exploring']};
 for(const [key,values] of Object.entries(choices)){if(Object.hasOwn(input,key)){if(!values.includes(input[key]))throw Error('invalid_choice');out[key]=input[key]}}
 if(Object.hasOwn(input,'package')||Object.hasOwn(input,'upgrade')){
  if(input.package!=='Driveway Package'||out.coverage!=='Sides + rear'||!['FREE sunroof tint','FREE sun strip'].includes(input.upgrade))throw Error('invalid_package');
  out.details={package:'Driveway Package',upgrade:input.upgrade};
 }
 // Retain the existing storage column for older forms; details.city identifies city-only requests.
 if(Object.hasOwn(input,'city')){
  if(typeof input.city!=='string'||input.city.trim().length<2||input.city.length>240)throw Error('invalid_details');
  out.address=input.city.trim().replace(/[\r\n\t]+/g,' ');out.details={...out.details,city:out.address};
 }else{
  if(typeof input.address!=='string'||input.address.trim().length<8||input.address.length>240)throw Error('invalid_details');
  out.address=input.address.trim().replace(/[\r\n\t]+/g,' ');
 }
 const digits=out.phone.replace(/\D/g,'');if(!/^1?\d{10}$/.test(digits)||input.contact!=='call'||out.name.length<2||out.vehicle.length<3)throw Error('invalid_details');out.phone='+'+(digits.length===10?'1':'')+digits;out.contact='call';
 if(input.email!==undefined&&input.email!==''){const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))throw Error('invalid_details');out.email=email}
 out.attribution={};for(const k of ATTRIBUTION_KEYS){const v=input.attribution?.[k];if(typeof v==='string'&&v.length<=200)out.attribution[k]=v}
 out.page_path=typeof input.page_path==='string'&&/^\/[A-Za-z0-9/_-]*$/.test(input.page_path)?input.page_path:'/';
 out.consent_version='callback-2026-09-20';out.payload_hash=crypto.createHash('sha256').update(JSON.stringify({type:out.type,coverage:out.coverage,vehicle:out.vehicle,address:out.address,name:out.name,phone:out.phone,contact:out.contact,...(out.priority?{priority:out.priority}:{}),...(out.timing?{timing:out.timing}:{}),...(out.email?{email:out.email}:{}),...(out.details?{details:out.details}:{})})).digest('hex');return out;
}
module.exports={normalizeQuote};
