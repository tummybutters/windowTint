// Post saved customer requests to the private Zapier trigger for Tint Wiz.
const {commercialSource,commercialAttribution}=require('./lead-source');
async function sendContact(lead,fetchImpl=fetch){
 const value=process.env.TINT_WIZ_ZAPIER_HOOK_URL;
 let url;try{url=new URL(value)}catch{}
 if(url?.protocol!=='https:'||url.hostname!=='hooks.zapier.com'||!/^\/hooks\/catch\/\d+\/[A-Za-z0-9]+\/$/.test(url.pathname)){
  const error=Error('crm_hook_not_configured');error.code='crm_hook_not_configured';throw error;
 }
 const payload={quote_id:lead.id,name:lead.name,phone:lead.phone,...(lead.email?{email:lead.email}:{}),vehicle:lead.vehicle,vehicle_type:lead.vehicle_type,coverage:lead.coverage,priority:lead.priority||'',timing:lead.timing||'',service_address:lead.service_address,page_path:lead.page_path,source:lead.lead_kind==='commercial'?commercialSource(lead):'Website tint quote',...(lead.lead_kind==='commercial'?{company:lead.company||'',city:lead.details?.city||'',coverage:[commercialSource(lead),'COMMERCIAL',lead.details?.property,lead.details?.glass,lead.details?.problem,lead.details?.city?`City: ${lead.details.city}`:null,lead.company?`Company: ${lead.company}`:null,lead.details?.role,lead.details?.timing].filter(Boolean).join(' · ')}:{})};
 if(lead.lead_kind==='commercial'){
  const a=commercialAttribution(lead);Object.assign(payload,{lead_source:a.source,lead_device:a.device,lead_device_basis:a.device_basis,lead_campaign_id:a.campaign_id,lead_ad_group_id:a.ad_group_id,lead_ad_id:a.ad_id,lead_keyword:a.keyword,lead_landing_page:a.landing_page,lead_attribution_model:a.attribution_model,is_internal:lead.attribution?.is_internal==='true'});
  // Existing Zap maps coverage to contact notes; preserve attribution there as well as structured fields.
  payload.coverage+='\n\nLead attribution: '+a.source+' | '+a.device+' ('+a.device_basis+')'+(a.campaign_id?'\nCampaign: '+a.campaign_id:'')+(a.ad_group_id?' | Ad group: '+a.ad_group_id:'')+(a.keyword?'\nSearch keyword: '+a.keyword:'')+'\nLanding page: '+a.landing_page+'\nAttribution: '+a.attribution_model;
 }
 if(lead.lead_kind!=='commercial'&&lead.details?.package==='Driveway Package')Object.assign(payload,{
  source:'Website Driveway Package quote',package:'Driveway Package',upgrade:lead.details.upgrade,
  coverage:`Driveway Package · Sides + rear ceramic tint · ${lead.details.upgrade}`
 });
 if(lead.lead_kind!=='commercial'&&lead.details?.city){
  payload.city=lead.details.city;payload.service_address='';
  // The current Zap maps coverage into contact notes, so city remains visible without a Zap migration.
  payload.coverage+=` · City: ${lead.details.city}`;
 }
 if(lead.attribution?.experiment_id==='auto_old_driveway_20261014'&&['old_setup','driveway_offer'].includes(lead.attribution.experiment_variant))Object.assign(payload,{experiment_id:lead.attribution.experiment_id,experiment_variant:lead.attribution.experiment_variant,experiment_label:lead.attribution.experiment_variant==='old_setup'?'Original setup':'Driveway offer'});
 const {summary,notes}=require('./quote-attribution');
 payload.lead_attribution=summary(lead);
 payload.coverage+='\n\n'+notes(lead);
 let response;try{response=await fetchImpl(url.toString(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)})}catch{
  const error=Error('crm_result_unknown');error.code='crm_result_unknown';error.uncertain=true;throw error;
 }
 if(!response.ok){const error=Error('crm_hook_rejected');error.code=`crm_http_${response.status}`;error.retryable=response.status===429;error.uncertain=response.status>=500;throw error}
 return{accepted:true};
}
module.exports={sendContact};
