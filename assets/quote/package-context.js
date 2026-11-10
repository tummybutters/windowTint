(function(root){
 const generic=[['Car','sedan','Car'],['SUV / crossover','suv','SUV / crossover'],['Truck','truck','Truck'],['Supercar','supercar','Supercar']];
 const teslas=[['Model 3','tesla-model-3','Car'],['Model Y','tesla-model-y','SUV / crossover'],['Model S','tesla-model-s','Car'],['Model X','tesla-model-x','SUV / crossover'],['Cybertruck','tesla-cybertruck','Truck']];
 const presets={'/tesla-model-3-window-tinting':'Model 3','/tesla-model-y-window-tinting':'Model Y','/tesla-cybertruck-window-tint':'Cybertruck'};
 function contextFor(path,options={}){
  path=path.replace(/\/$/,'');const tesla=path.startsWith('/tesla-')||(path==='/package'&&options.family==='tesla'),model=presets[path],removal=path==='/tint-removal';
  const context={tesla,removal,vehicles:tesla?teslas:generic,steps:model?[1,2]:removal?[0,2]:path==='/ceramic-window-tinting'?[3,1,0,2]:path==='/window-tint-pricing'?[1,0,2]:[0,1,2],answers:{contact:'call'}};
  if(model)Object.assign(context.answers,selectVehicle(context,model));
  if(removal)context.answers.coverage='Tint removal';
  if(path==='/package'){context.package=true;context.steps=[0,4,2];Object.assign(context.answers,{coverage:'Sides + rear',package:'Driveway Package'});}
  context.baseSteps=[...context.steps];context.priceRange=tesla?'$600–$950':'$500–$700';context.upgrades=tesla?['FREE sun strip']:['FREE sunroof tint','FREE sun strip'];
  context.priceNote=tesla?'depending on model':'depending on vehicle size';
  if(model){context.priceRange={'Model 3':'$950','Model Y':'$700','Cybertruck':'Quoted separately'}[model];context.priceNote=model==='Cybertruck'?'Vehicle-specific quote':model+' sides + rear';}
  return context;
 }
 function applyCoverage(context,answers,label){
  answers.coverage=label;
  if(label==='Sides + rear'){
   answers.package='Driveway Package';context.steps=[...context.baseSteps.slice(0,-1),4,2];
  }else{
   delete answers.package;delete answers.upgrade;context.steps=[...context.baseSteps];
  }
 }
 function selectVehicle(context,label){
  const choice=context.vehicles.find(v=>v[0]===label);
  return {type:choice?.[2]||'Other',...(context.tesla?{vehicle:choice?'Tesla '+choice[0]:''}:{})};
 }
 const api={contextFor,selectVehicle,applyCoverage};if(typeof module==='object'&&module.exports)module.exports=api;else root.ObsidianQuoteContext=api;
})(typeof window==='object'?window:this);
