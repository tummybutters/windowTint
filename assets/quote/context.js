(function(root){
 const generic=[['Car','sedan','Car'],['SUV / crossover','suv','SUV / crossover'],['Truck','truck','Truck'],['Supercar','supercar','Supercar']];
 const teslas=[['Model 3','tesla-model-3','Car'],['Model Y','tesla-model-y','SUV / crossover'],['Model S','tesla-model-s','Car'],['Model X','tesla-model-x','SUV / crossover'],['Cybertruck','tesla-cybertruck','Truck']];
 const presets={'/tesla-model-3-window-tinting':'Model 3','/tesla-model-y-window-tinting':'Model Y','/tesla-cybertruck-window-tint':'Cybertruck'};
 function contextFor(path){
  path=path.replace(/\/$/,'');const tesla=path.startsWith('/tesla-'),model=presets[path],removal=path==='/tint-removal';
  const context={tesla,removal,vehicles:tesla?teslas:generic,steps:model?[3,1,4,2]:removal?[0,3,4,2]:[0,3,1,4,2],answers:{contact:'call'}};
  if(model)Object.assign(context.answers,selectVehicle(context,model));
  if(removal)context.answers.coverage='Tint removal';return context;
 }
 function selectVehicle(context,label){
  const choice=context.vehicles.find(v=>v[0]===label);
  return {type:choice?.[2]||'Other',...(context.tesla?{vehicle:choice?'Tesla '+choice[0]:''}:{})};
 }
 const api={contextFor,selectVehicle};if(typeof module==='object'&&module.exports)module.exports=api;else root.ObsidianQuoteContext=api;
})(typeof window==='object'?window:this);
