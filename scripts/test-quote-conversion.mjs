import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('assets/quote/quote.js','utf8');
const helpers=source.slice(0,source.indexOf('const $='));
const submit=source.match(/^async function submitStep\(\).*$/m)[0];
const id='f4b829db-584a-4248-b91d-01cd66b7c554';
async function run(response, {embedded=false,throwTag=false}={}) {
 const calls=[],button={innerHTML:'',disabled:false},error={textContent:''};
 const host={location:{origin:'https://www.obsidianautoworksoc.com',pathname:'/tesla-window-tinting',search:'?name=PRIVATE'},gtag(...args){if(throwTag)throw Error('blocked');calls.push(args)}};
 const win=embedded?{parent:host,location:{origin:host.location.origin,pathname:'/quote-widget'}}:host;if(!embedded)host.parent=host;
 const sandbox={window:win,location:win.location,URLSearchParams,Set,document:{querySelector:()=>({value:''})},state:{id,answers:{name:'PRIVATE',phone:'5551234567',address:'PRIVATE'},busy:false},fields:[],captureFields(){},$:sel=>sel==='#error'?error:button,screen:{querySelector:()=>({setAttribute(){},focus(){}})},render(){},fetch:async()=>({ok:response.httpOK!==false,json:async()=>response.body})};
 vm.createContext(sandbox);vm.runInContext(helpers+'\n'+submit,sandbox);
 await vm.runInContext('submitStep()',sandbox);
 return {sandbox,calls,error};
}
for(const embedded of [false,true]){
 const good=await run({body:{ok:true,id}},{embedded});
 const conversions=good.calls.filter(x=>x[1]==='conversion');
 assert.equal(conversions.length,1,'A saved quiz must emit one Ads conversion');
 assert.match(conversions[0][2].send_to,/^AW-17846304809\/[A-Za-z0-9_-]+$/);
 assert.equal(conversions[0][2].transaction_id,id);
 assert(!JSON.stringify(good.calls).includes('PRIVATE'),'Do not send form details or query strings to Google');
 assert.equal(good.sandbox.state.success,true);
 // A repeat response for the same persisted request must not create a second event.
 await vm.runInContext('submitStep()',good.sandbox);
 assert.equal(good.calls.filter(x=>x[1]==='conversion').length,1);
}
for(const response of [{httpOK:false,body:{error:'Save failed'}},{body:{ok:false,id}},{body:{ok:true,id:'wrong-id'}}]){
 const bad=await run(response);assert.equal(bad.calls.filter(x=>x[1]==='conversion').length,0);assert(!bad.sandbox.state.success);
}
const blocked=await run({body:{ok:true,id}},{throwTag:true});assert.equal(blocked.sandbox.state.success,true,'Analytics failure must not hide successful save');
console.log('Saved quiz conversion: API success only, correct request ID, deduplication, parent-frame routing, privacy and blocked-tag behavior passed.');
