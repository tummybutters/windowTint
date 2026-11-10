import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {contextFor,applyCoverage}=require('../assets/quote/package-context');
assert.equal(typeof applyCoverage,'function','Ordinary quote coverage must control package eligibility');
for(const path of ['/mobile-window-tinting','/ceramic-window-tinting','/tesla-window-tinting']){
 const context=contextFor(path),answers={...context.answers};
 applyCoverage(context,answers,'Sides + rear');
 assert.equal(answers.package,'Driveway Package');
 assert.deepEqual(context.steps,path==='/ceramic-window-tinting'?[3,1,0,4,2]:[0,1,4,2]);
 answers.upgrade='FREE sun strip';
 applyCoverage(context,answers,'Front two windows');
 assert.equal(answers.package,undefined,'Changing away from eligible coverage removes the offer');
 assert.equal(answers.upgrade,undefined,'Changing coverage cannot accidentally submit an ineligible bonus');
 assert.deepEqual(context.steps,path==='/ceramic-window-tinting'?[3,1,0,2]:[0,1,2]);
}
const tesla=contextFor('/package',{family:'tesla'});
assert.equal(tesla.tesla,true);
assert.equal(tesla.vehicles[0][0],'Model 3');
assert.equal(tesla.priceRange,'$600–$950');
assert.deepEqual(tesla.upgrades,['FREE sun strip'],'Tesla glass roofs are not eligible for the standard sunroof freebie');
assert.equal(tesla.answers.coverage,'Sides + rear');
assert.equal(contextFor('/package').priceRange,'$500–$700');
assert.equal(contextFor('/tesla-model-3-window-tinting').priceRange,'$950');
assert.equal(contextFor('/tesla-model-y-window-tinting').priceRange,'$700');
assert.equal(contextFor('/tesla-cybertruck-window-tint').priceRange,'Quoted separately');
console.log('Eligible coverage gets one bonus; changing coverage clears it; Tesla package retains vehicle choices and separate pricing.');
