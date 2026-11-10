const {commercialAttribution}=require('./lead-source');
function summary(lead){
 const a=lead.attribution||{},base=commercialAttribution(lead);
 return {quote_id:lead.id,session_id:a.session_id||'',source:a.source_label||base.source.replace(' - Commercial Form',''),device:base.device,device_basis:base.device_basis,campaign_id:a.campaignid||'',ad_group_id:a.adgroupid||'',ad_id:a.creative||'',keyword:a.keyword||a.utm_term||'',landing_page:a.landing_page||lead.page_path||'',submission_page:lead.page_path||'',experiment_id:a.experiment_id||'',experiment_variant:a.experiment_variant||'',flow_version:a.flow_version||'legacy',attribution_version:a.attribution_version||'legacy',attribution_model:a.attribution_model||'Legacy / unknown'};
}
function notes(lead){const a=summary(lead);return ['Attribution (reporting)',`Quote ID: ${a.quote_id}`,`Session: ${a.session_id||'Unknown'}`,`Source: ${a.source}`,`Device: ${a.device} (${a.device_basis})`,`Campaign: ${a.campaign_id||'Unknown'} | Ad group: ${a.ad_group_id||'Unknown'} | Ad: ${a.ad_id||'Unknown'}`,`Landing page: ${a.landing_page}`,`Submitted on: ${a.submission_page}`,`Experiment: ${a.experiment_variant||'Unassigned'} | Phase: ${a.flow_version}`,`Model: ${a.attribution_model}`].join('\n');}
module.exports={summary,notes};
