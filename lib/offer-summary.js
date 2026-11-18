module.exports = function offerSummary(details){
 return [details.package, details.body, details.upgrade, details.windshield,
  details.quoted_menu_price===null?'Custom quote':'Menu price $'+details.quoted_menu_price].filter(Boolean).join(' · ');
};
