const {normalizeAdIds}=require('../assets/attribution/journey');
function commercialSource(lead) {
 const a=normalizeAdIds(lead.attribution||{});
 if(a.is_internal==='true'||/^(qa|internal|test)$/i.test(a.utm_source||''))return 'Internal test - Commercial Form';
 const paid=Boolean(a.gclid||a.gbraid||a.wbraid)||(String(a.utm_source).toLowerCase()==='google'&&['cpc','ppc','paidsearch','paid_search'].includes(String(a.utm_medium).toLowerCase()));
 return paid?'Google Search - Commercial Form':a.utm_medium==='organic'?'Organic Search - Commercial Form':'Website - Commercial Form';
}
module.exports={commercialSource};

function commercialAttribution(lead){
 const a=normalizeAdIds(lead.attribution||{}),category=['mobile','desktop','tablet'];
 const click=({m:'mobile',c:'desktop',t:'tablet'})[a.device]||'unknown';
 const browser=category.includes(a.device_category)?a.device_category:'unknown';
 return {source:commercialSource(lead),device:click!=='unknown'?click:browser,device_basis:click!=='unknown'?'Google Ads click':browser!=='unknown'?'Browser inference':'Unknown',campaign_id:a.campaignid||'',ad_group_id:a.adgroupid||'',ad_id:a.creative||'',keyword:a.keyword||a.utm_term||'',landing_page:a.landing_page||lead.page_path||'',quote_id:lead.id,attribution_model:a.attribution_model||'Legacy / unknown'};
}
module.exports.commercialAttribution=commercialAttribution;
