// Post saved customer requests to the private Zapier trigger for Tint Wiz.
async function sendContact(lead,fetchImpl=fetch){
 const value=process.env.TINT_WIZ_ZAPIER_HOOK_URL;
 let url;try{url=new URL(value)}catch{}
 if(url?.protocol!=='https:'||url.hostname!=='hooks.zapier.com'||!/^\/hooks\/catch\/\d+\/[A-Za-z0-9]+\/$/.test(url.pathname)){
  const error=Error('crm_hook_not_configured');error.code='crm_hook_not_configured';throw error;
 }
 const payload={quote_id:lead.id,name:lead.name,phone:lead.phone,vehicle:lead.vehicle,vehicle_type:lead.vehicle_type,coverage:lead.coverage,priority:lead.priority||'',timing:lead.timing||'',service_address:lead.service_address,page_path:lead.page_path,source:'Website tint quote'};
 let response;try{response=await fetchImpl(url.toString(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)})}catch{
  const error=Error('crm_result_unknown');error.code='crm_result_unknown';error.uncertain=true;throw error;
 }
 if(!response.ok){const error=Error('crm_hook_rejected');error.code=`crm_http_${response.status}`;error.retryable=response.status===429;error.uncertain=response.status>=500;throw error}
 return{accepted:true};
}
module.exports={sendContact};
