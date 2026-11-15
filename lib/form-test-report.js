// Protected report: no contact fields. Customer counts use verified CRM IDs only.
function summarizeFormTest({leads=[],events=[],crm=[]}){
 const groups=new Map();let unassigned=0;
 function group(a={}){
  if(a.form_test_id!=='compact_form_20261111'||!['old_setup','driveway_offer'].includes(a.form_test_arm)||!['current','compact'].includes(a.form_variant)||a.form_rendered_variant!==a.form_variant||a.form_assignment_status!=='enrolled')return null;
  const key=[a.form_test_id,a.form_test_arm,a.form_variant,a.form_tracking_version].join('|');
  if(!groups.has(key))groups.set(key,{test_id:a.form_test_id,arm:a.form_test_arm,variant:a.form_variant,tracking_version:a.form_tracking_version,measured:new Set(),visible:new Set(),submitVisible:new Set(),started:new Set(),completed:{},exposed:new Set(),saved:new Set(),contacts:new Set()});return groups.get(key);
 }
 for(const event of events){
  const a={...event.attribution,...event.payload},g=group(a);if(!g||!a.quote_id)continue;
  if(event.event_name==='quote_form_test_exposure')g.exposed.add(a.quote_id);
  if(a.measurement_version!=='form-engagement-v1')continue;g.measured.add(a.quote_id);
  const set={quote_form_visible:g.visible,quote_submit_visible:g.submitVisible,quote_form_started:g.started}[event.event_name];set?.add(a.quote_id);
  if(event.event_name==='quote_field_completed'&&['vehicle','city','name','phone','email','company'].includes(a.field_name)){g.completed[a.field_name]??=new Set();g.completed[a.field_name].add(a.quote_id)}
 }
 for(const lead of leads){const g=group(lead.attribution);if(!g){unassigned++;continue}g.saved.add(lead.quote_id);for(const c of crm)if(c.kind==='contact'&&c.quote_id===lead.quote_id)g.contacts.add(c.contact_id)}
 return {basis:'Rendered exposure is separate from viewport intersection (not proof of attention or keyboard clearance). Engagement is measured only from form-engagement-v1; earlier history is unknown. Requests exposed and saved in selected period; customers require verified CRM links. Unassigned history excluded from variant comparison.',unassigned_saved_requests:unassigned,groups:[...groups.values()].map(g=>({test_id:g.test_id,arm:g.arm,variant:g.variant,tracking_version:g.tracking_version,exposed_requests:g.exposed.size,engagement_measured_requests:g.measured.size,viewport_visible_requests:g.measured.size?g.visible.size:null,submit_visible_requests:g.measured.size?g.submitVisible.size:null,started_requests:g.measured.size?g.started.size:null,completed_fields:Object.fromEntries(Object.entries(g.completed).map(([k,v])=>[k,v.size])),submitted_exposed_requests:[...g.exposed].filter(id=>g.saved.has(id)).length,saved_requests:g.saved.size,verified_customers:g.contacts.size}))};
}
module.exports={summarizeFormTest};
