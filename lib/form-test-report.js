// Protected report: no contact fields. Customer counts use verified CRM IDs only.
function summarizeFormTest({leads=[],events=[],crm=[]}){
 const groups=new Map();let unassigned=0;
 function group(a={}){
  if(a.form_test_id!=='compact_form_20261111'||!['old_setup','driveway_offer'].includes(a.form_test_arm)||!['current','compact'].includes(a.form_variant)||a.form_rendered_variant!==a.form_variant||a.form_assignment_status!=='enrolled')return null;
  const key=[a.form_test_id,a.form_test_arm,a.form_variant,a.form_tracking_version].join('|');
  if(!groups.has(key))groups.set(key,{test_id:a.form_test_id,arm:a.form_test_arm,variant:a.form_variant,tracking_version:a.form_tracking_version,exposed:new Set(),saved:new Set(),contacts:new Set()});return groups.get(key);
 }
 for(const event of events){if(event.event_name!=='quote_form_test_exposure')continue;const a={...event.attribution,...event.payload},g=group(a);if(g&&a.quote_id)g.exposed.add(a.quote_id)}
 for(const lead of leads){const g=group(lead.attribution);if(!g){unassigned++;continue}g.saved.add(lead.quote_id);for(const c of crm)if(c.kind==='contact'&&c.quote_id===lead.quote_id)g.contacts.add(c.contact_id)}
 return {basis:'Requests exposed and saved in selected period; customers require verified CRM links. Unassigned history excluded from variant comparison.',unassigned_saved_requests:unassigned,groups:[...groups.values()].map(g=>({test_id:g.test_id,arm:g.arm,variant:g.variant,tracking_version:g.tracking_version,exposed_requests:g.exposed.size,submitted_exposed_requests:[...g.exposed].filter(id=>g.saved.has(id)).length,saved_requests:g.saved.size,verified_customers:g.contacts.size}))};
}
module.exports={summarizeFormTest};
