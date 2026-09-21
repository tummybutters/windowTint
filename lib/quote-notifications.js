// AgentPhone https://docs.agentphone.ai/documentation/guides/messages
async function sendAlert(lead,fetchImpl=fetch){
 const key=process.env.AGENTPHONE_API_KEY,from=process.env.AGENTPHONE_FROM_NUMBER,to=process.env.QUOTE_ALERT_TO;
 if(!key||!/^\+\d{10,15}$/.test(from||'')||!/^\+\d{10,15}$/.test(to||'')){const e=Error('sender_not_configured');e.code='sender_not_configured';throw e}
 const text=`New Obsidian quote — CALL REQUESTED\n${lead.name} · ${lead.phone}\n${lead.vehicle} · ${lead.coverage}\nService address: ${lead.service_address}\nLead ${lead.id}\nPlease call to confirm the quote.`;
 let response;try{response=await fetchImpl('https://api.agentphone.ai/v1/messages',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from_number:from,to_number:to,body:text}),signal:AbortSignal.timeout(8000)})}catch{const e=Error('provider_result_unknown');e.code='provider_result_unknown';e.uncertain=true;throw e}
 if(!response.ok){const e=Error('provider_rejected');e.code=`provider_http_${response.status}`;e.retryable=response.status===429;e.uncertain=response.status>=500;throw e}
 let data;try{data=await response.json()}catch{data=null}if(!data?.id){const e=Error('provider_result_unknown');e.code='provider_result_unknown';e.uncertain=true;throw e}if(['failed','undelivered','rejected'].includes(String(data.status).toLowerCase())){const e=Error('provider_rejected');e.code='provider_reported_failure';throw e}return{id:String(data.id)};
}
module.exports={sendAlert};
