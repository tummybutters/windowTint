import assert from 'node:assert/strict';import {createRequire} from 'node:module';const require=createRequire(import.meta.url);
const {summarizeFormTest}=require('../lib/form-test-report');
const a={form_test_id:'compact_form_20261111',form_test_arm:'driveway_offer',form_variant:'compact',form_rendered_variant:'compact',form_tracking_version:'rendered-form-v1',form_assignment_status:'enrolled'};
const r=summarizeFormTest({leads:[{quote_id:'q1',attribution:a},{quote_id:'q2',attribution:a},{quote_id:'old',attribution:{}}],events:[{event_name:'quote_form_test_exposure',payload:{...a,quote_id:'q1'}},{event_name:'quote_form_test_exposure',payload:{...a,quote_id:'q1'}},{event_name:'quote_form_test_exposure',payload:{...a,quote_id:'q3'}}],crm:[{kind:'contact',quote_id:'q1',contact_id:'c1'},{kind:'contact',quote_id:'q2',contact_id:'c1'}]});
assert.equal(r.groups[0].exposed_requests,2);assert.equal(r.groups[0].submitted_exposed_requests,1);assert.equal(r.groups[0].saved_requests,2);assert.equal(r.groups[0].verified_customers,1);assert.equal(r.unassigned_saved_requests,1);
console.log('Form report deduplicates exposure and customer IDs without inventing legacy assignment');
