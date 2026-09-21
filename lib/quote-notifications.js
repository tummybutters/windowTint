// Twilio https://www.twilio.com/docs/messaging/api/message-resource
async function sendAlert(lead,fetchImpl=fetch){
 const sid=process.env.TWILIO_ACCOUNT_SID,key=process.env.TWILIO_AUTH_TOKEN,from=process.env.TWILIO_PHONE_NUMBER,to=process.env.QUOTE_ALERT_TO;
 if(!/^AC[0-9a-fA-F]{32}$/.test(sid||'')||!key||!/^\+\d{10,15}$/.test(from||'')||!/^\+\d{10,15}$/.test(to||'')){const e=Error('sender_not_configured');e.code='sender_not_configured';throw e}
 const phone=lead.phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3');
 const wants={'Glass roof':'Glass roof tint','Tint removal':'Existing window tint removal','Front two windows':'Front two window tint','Sides + rear':'Side and rear window tint','Windshield / other':'Windshield tint or another tint request','Help me choose':'Help choosing which windows to tint'}[lead.coverage]||lead.coverage;
 const vehicle=lead.vehicle+(lead.vehicle_type?` (${lead.vehicle_type})`:'');
 const text=`New tint quote - please call\n\nName: ${lead.name}\nPhone: ${phone}\nVehicle: ${vehicle}\nWants: ${wants}\nService address: ${lead.service_address}`;
 const body=new URLSearchParams({From:from,To:to,Body:text});
 let response;try{response=await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${sid}:${key}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),signal:AbortSignal.timeout(8000)})}catch{const e=Error('provider_result_unknown');e.code='provider_result_unknown';e.uncertain=true;throw e}
 if(!response.ok){const e=Error('provider_rejected');e.code=`provider_http_${response.status}`;e.retryable=response.status===429;e.uncertain=response.status>=500;throw e}
 let data;try{data=await response.json()}catch{data=null}if(!/^SM[0-9a-fA-F]{32}$/.test(data?.sid||'')){const e=Error('provider_result_unknown');e.code='provider_result_unknown';e.uncertain=true;throw e}if(['failed','undelivered','rejected','canceled'].includes(String(data.status).toLowerCase())){const e=Error('provider_rejected');e.code='provider_reported_failure';throw e}return{id:String(data.sid)};
}
async function readAlertStatus(id,fetchImpl=fetch){
 const sid=process.env.TWILIO_ACCOUNT_SID,key=process.env.TWILIO_AUTH_TOKEN;
 if(!/^SM[0-9a-fA-F]{32}$/.test(id||'')||!/^AC[0-9a-fA-F]{32}$/.test(sid||'')||!key)throw Error('invalid_message_configuration');
 const response=await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages/${id}.json`,{method:'GET',headers:{Authorization:`Basic ${Buffer.from(`${sid}:${key}`).toString('base64')}`},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('delivery_lookup_failed');
 const data=await response.json();
 if(!['accepted','scheduled','queued','sending','sent','delivered','undelivered','failed','canceled','read'].includes(data.status))throw Error('invalid_delivery_status');
 return {status:data.status,errorCode:data.error_code==null?null:String(data.error_code)};
}
module.exports={sendAlert,readAlertStatus};
