import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {contextFor,selectVehicle}=require('../assets/quote/context.js');
const {normalizeQuote}=require('../lib/automotive-quote.js');
assert.equal(contextFor('/tesla-window-tinting').vehicles.length,5);
for(const [path,vehicle,type] of [['/tesla-model-3-window-tinting','Tesla Model 3','Car'],['/tesla-model-y-window-tinting','Tesla Model Y','SUV / crossover'],['/tesla-cybertruck-window-tint','Tesla Cybertruck','Truck']]){
 const c=contextFor(path);assert.deepEqual(c.steps,[1,2]);assert.equal(c.answers.vehicle,vehicle);assert.equal(c.answers.type,type);
}
for(const model of contextFor('/tesla-window-tinting').vehicles){const a=selectVehicle(contextFor('/tesla-window-tinting'),model[0]);assert(a.vehicle.startsWith('Tesla '));assert(['Car','SUV / crossover','Truck'].includes(a.type));}
assert.deepEqual(contextFor('/car-window-tinting-near-me').steps,[0,1,2]);
const removal=contextFor('/tint-removal');assert.deepEqual(removal.steps,[0,2]);assert.equal(removal.answers.coverage,'Tint removal');
const input={id:'9c2f8d24-d2d1-49fb-aefe-9a9ec2702b47',...selectVehicle(contextFor('/tesla-window-tinting'),'Model X'),coverage:'Glass roof',address:'123 Test Lane, Irvine CA 92618',name:'Test',phone:'7145550123',contact:'call'};
assert.equal(normalizeQuote(input).vehicle,'Tesla Model X');assert.equal(normalizeQuote({...input,coverage:'Tint removal'}).coverage,'Tint removal');
console.log('Tesla model selection, model-specific step skipping, and removal/roof payloads passed.');
