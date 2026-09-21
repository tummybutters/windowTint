const crypto = require('node:crypto');
const ATTRIBUTION_KEYS=['session_id','gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','campaignid','adgroupid','creative','keyword','matchtype','device','network'];
function normalizeQuote(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.website)throw Error('invalid_quote');
 const out={};for(const key of ['id','type','coverage','vehicle','address','name','phone']){if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>240)throw Error('invalid_quote');out[key]=input[key].trim().replace(/[\r\n\t]+/g,' ')}
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(out.id))throw Error('invalid_id');
 if(!['Car','SUV / crossover','Truck','Supercar','Other'].includes(out.type)||!['Front two windows','Sides + rear','Windshield / other','Help me choose','Glass roof','Tint removal'].includes(out.coverage))throw Error('invalid_choice');
 const choices={priority:['Cooler cabin','More privacy','Less glare','A cleaner look','Clearer windows','Removing bubbles','Preparing for new tint'],timing:['As soon as possible','Sometime this week','Next week','Just exploring']};
 for(const [key,values] of Object.entries(choices)){if(Object.hasOwn(input,key)){if(!values.includes(input[key]))throw Error('invalid_choice');out[key]=input[key]}}
 const digits=out.phone.replace(/\D/g,'');if(!/^1?\d{10}$/.test(digits)||input.contact!=='call'||out.name.length<2||out.address.length<8||out.vehicle.length<3)throw Error('invalid_details');out.phone='+'+(digits.length===10?'1':'')+digits;out.contact='call';
 out.attribution={};for(const k of ATTRIBUTION_KEYS){const v=input.attribution?.[k];if(typeof v==='string'&&v.length<=200)out.attribution[k]=v}
 out.page_path=typeof input.page_path==='string'&&/^\/[A-Za-z0-9/_-]*$/.test(input.page_path)?input.page_path:'/';
 out.consent_version='callback-2026-09-20';out.payload_hash=crypto.createHash('sha256').update(JSON.stringify({type:out.type,coverage:out.coverage,vehicle:out.vehicle,address:out.address,name:out.name,phone:out.phone,contact:out.contact,...(out.priority?{priority:out.priority}:{}),...(out.timing?{timing:out.timing}:{})})).digest('hex');return out;
}
module.exports={normalizeQuote};
