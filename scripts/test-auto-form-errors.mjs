import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
for(const file of ['classic-quote.js','package-quote.js','quote.js']){
 const source=fs.readFileSync(new URL('../assets/quote/'+file,import.meta.url),'utf8');
 const helpers=source.slice(0,source.indexOf('const $='));
 const validation=source.slice(source.indexOf('function validate('),source.indexOf('function captureFields('));
 const submit=source.match(/^async function submitStep\(\).*$/m)[0];
 const fields=source.match(/^const fields=.*$/m)[0];
 const calls=[],requests=[],nodes=new Map();let mode='ok';
 const node=s=>{if(!nodes.has(s))nodes.set(s,{setAttribute(){},removeAttribute(){},focus(){},textContent:'',disabled:false});return nodes.get(s)};
 const win={location:new URL('https://example.test/mobile-window-tinting?experience=driveway'),ObsidianExperiment:{experiment_id:'auto_old_driveway_20261014',experiment_variant:file==='classic-quote.js'?'old_setup':'driveway_offer'},gtag:(...args)=>calls.push(args)};win.parent=win;
 const box={window:win,location:win.location,URLSearchParams,Set,context:{tesla:false},document:{querySelector:()=>({value:''})},state:{id:'9c2f8d24-d2d1-49fb-aefe-9a9ec2702b47',answers:{vehicle:'PRIVATE VEHICLE',name:'PRIVATE NAME',phone:'123',city:'',email:'bad-email'},busy:false},captureFields(){},$:node,screen:{querySelector:()=>node('h2')},render(){},fetch:async(url,options)=>{requests.push(JSON.parse(options.body));if(mode==='network')throw Error('private network detail');return{ok:mode==='ok',status:mode==='ok'?200:503,json:async()=>mode==='ok'?{ok:true,id:box.state.id}:{error:'private response detail'}}}};
 vm.createContext(box);vm.runInContext(helpers+'\n'+fields+'\n'+validation+'\n'+submit,box);
 await vm.runInContext('submitStep()',box);
 assert.equal(requests.length,0);assert.equal(calls.filter(c=>c[1]==='quote_submit_attempt').length,1,file);
 const errors=calls.filter(c=>c[1]==='quote_validation_error');assert.deepEqual(errors.map(c=>c[2].field_name).sort(),['city','email','phone']);assert.equal(errors.find(c=>c[2].field_name==='city')[2].error_reason,'required');
 Object.assign(box.state.answers,{city:'Irvine',phone:'2025550113',email:''});mode='server';
 await vm.runInContext('submitStep()',box);assert.equal(requests.length,1);assert.equal(requests[0].city,'Irvine');assert.equal(requests[0].email,'');assert.equal(node('#step-form button[type=submit]').disabled,false);
 const server=calls.filter(c=>c[1]==='quote_submit_error').at(-1)[2];assert.equal(server.error_reason,'http_error');assert.equal(server.http_status,503);
 mode='network';await vm.runInContext('submitStep()',box);assert.equal(calls.filter(c=>c[1]==='quote_submit_error').at(-1)[2].error_reason,'network_error');
 mode='ok';await vm.runInContext('submitStep()',box);assert.equal(box.state.success,true);assert.equal(calls.filter(c=>c[1]==='quote_submit_success').length,1);assert.equal(calls.filter(c=>c[1]==='conversion').length,1);
 for(const privateValue of ['PRIVATE NAME','PRIVATE VEHICLE','2025550113','bad-email','Irvine','private response detail','private network detail'])assert(!JSON.stringify(calls).includes(privateValue),'Analytics leaked '+privateValue);
 assert(calls.filter(c=>c[1].startsWith('quote_')).every(c=>c[2].experiment_variant===win.ObsidianExperiment.experiment_variant));
 assert(calls.filter(c=>['quote_submit_attempt','quote_validation_error','quote_submit_error'].includes(c[1])).every(c=>c[2].send_to==='G-TR9ET60HX3'),'Diagnostic events must target Analytics only');
 console.log(file+': validation, attempts, server/network errors, blank email, successful city submission, arm attribution and PII protection passed.');
}
