// Post saved customer requests to the private Zapier trigger for Tint Wiz.
const {commercialSource,commercialAttribution}=require('./lead-source');
// TintWiz renders acquisition notes as HTML with white-space:normal. Plain
// newlines collapse; allow only our block markup and escape every saved value.
const escapeNote=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function contactCoverage(lead,payload,a){
 const d=lead.details||{},commercial=lead.lead_kind==='commercial';
 const section=(title,rows)=>{const items=rows.filter(([,v])=>v!==undefined&&v!==null&&String(v).trim()!=='');return items.length?`<p><strong>${escapeNote(title)}</strong></p><ul>${items.map(([label,value])=>`<li>${escapeNote(label)}: ${escapeNote(value)}</li>`).join('')}</ul>`:''};
 const known=value=>value&&!['unknown','legacy','unassigned','not enrolled','none'].includes(String(value).toLowerCase())?value:'';
 return section(lead.lead_kind==='residential'?'Home consultation':commercial?'Project':'Tint request',lead.lead_kind==='residential'?[['Property','Home'],['Main concern',d.problem],['Priority',d.priority],['ZIP',d.zip]]:commercial?[
  ['Company',lead.company],['Property',d.property],['Glass',d.glass],['Main concern',d.problem],['City',d.city],['Role',d.role],['Timing',d.timing]
 ]:[['Vehicle',lead.vehicle],['Coverage',payload.coverage],['Main priority',lead.priority],['Timing',lead.timing]])+
 section('Attribution',[
  ['Source',a.source],['Device',known(a.device)?`${a.device} (${a.device_basis})`:''],['Search keyword',a.keyword],
  ['Campaign',a.campaign_id],['Ad group',a.ad_group_id],['Ad',a.ad_id],['Landing page',a.landing_page],
  ['Submitted on',a.submission_page!==a.landing_page?a.submission_page:''],['Model',known(a.attribution_model)]
 ])+section('Tracking reference',[
  ['Quote ID',a.quote_id],['Session',a.session_id],['Experiment',a.experiment_variant],['Phase',known(a.flow_version)],
  ['Form test',a.form_test_id],['Form variant',a.form_variant],['Form arm',a.form_test_arm],
  ['Rendered form',known(a.form_rendered_variant)],['Assignment',known(a.form_assignment_status)],['Exposed',a.form_exposed_at],['Tracking',known(a.form_tracking_version)]
 ]);
}
async function sendContact(lead,fetchImpl=fetch){
 const value=process.env.TINT_WIZ_ZAPIER_HOOK_URL;
 let url;try{url=new URL(value)}catch{}
 if(url?.protocol!=='https:'||url.hostname!=='hooks.zapier.com'||!/^\/hooks\/catch\/\d+\/[A-Za-z0-9]+\/$/.test(url.pathname)){
  const error=Error('crm_hook_not_configured');error.code='crm_hook_not_configured';throw error;
 }
 const payload={quote_id:lead.id,name:lead.name,phone:lead.phone,...(lead.email?{email:lead.email}:{}),vehicle:lead.vehicle,vehicle_type:lead.vehicle_type,coverage:lead.coverage,priority:lead.priority||'',timing:lead.timing||'',service_address:lead.service_address,page_path:lead.page_path,source:lead.lead_kind==='commercial'?commercialSource(lead):'Website tint quote',...(lead.lead_kind==='commercial'?{company:lead.company||'',city:lead.details?.city||'',coverage:[commercialSource(lead),'COMMERCIAL',lead.details?.property,lead.details?.glass,lead.details?.problem,lead.details?.city?`City: ${lead.details.city}`:null,lead.company?`Company: ${lead.company}`:null,lead.details?.role,lead.details?.timing].filter(Boolean).join(' · ')}:{})};
 if(lead.lead_kind==='commercial'){
  const a=commercialAttribution(lead);Object.assign(payload,{lead_source:a.source,lead_device:a.device,lead_device_basis:a.device_basis,lead_campaign_id:a.campaign_id,lead_ad_group_id:a.ad_group_id,lead_ad_id:a.ad_id,lead_keyword:a.keyword,lead_landing_page:a.landing_page,lead_attribution_model:a.attribution_model,is_internal:lead.attribution?.is_internal==='true'});
 }
 if(lead.details?.offer_id)Object.assign(payload,{package:lead.details.package,upgrade:lead.details.upgrade,coverage:require('./offer-summary')(lead.details)});
 else if(lead.lead_kind!=='commercial'&&lead.details?.package==='Driveway Package')Object.assign(payload,{
  source:'Website Driveway Package quote',package:'Driveway Package',upgrade:lead.details.upgrade,
  coverage:`Driveway Package · Sides + rear ceramic tint · ${lead.details.upgrade}`
 });
 if(lead.lead_kind!=='commercial'&&lead.details?.city){
  payload.city=lead.details.city;payload.service_address='';
  // The current Zap maps coverage into contact notes, so city remains visible without a Zap migration.
  payload.coverage+=` · City: ${lead.details.city}`;
 }
 if(lead.attribution?.experiment_id==='auto_old_driveway_20261014'&&['old_setup','driveway_offer'].includes(lead.attribution.experiment_variant))Object.assign(payload,{experiment_id:lead.attribution.experiment_id,experiment_variant:lead.attribution.experiment_variant,experiment_label:lead.attribution.experiment_variant==='old_setup'?'Original setup':'Driveway offer'});
 const {summary}=require('./quote-attribution');
 payload.lead_attribution=summary(lead);
 if(lead.lead_kind==='residential')Object.assign(payload,{source:'Website residential consultation',lead_kind:'residential',zip:lead.details.zip,priority:lead.details.priority||'',quiz_version:lead.details.quiz_version||'',vehicle:'',vehicle_type:'',service_address:'',lead_campaign_id:payload.lead_attribution.campaign_id,lead_source:payload.lead_attribution.source});
 payload.coverage=contactCoverage(lead,payload,payload.lead_attribution);
 let response;try{response=await fetchImpl(url.toString(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)})}catch{
  const error=Error('crm_result_unknown');error.code='crm_result_unknown';error.uncertain=true;throw error;
 }
 if(!response.ok){const error=Error('crm_hook_rejected');error.code=`crm_http_${response.status}`;error.retryable=response.status===429;error.uncertain=response.status>=500;throw error}
 return{accepted:true};
}
module.exports={sendContact};
