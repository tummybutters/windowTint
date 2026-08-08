import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let qualifier;

try {
  qualifier = require('../lib/commercial-qualifier.js');
} catch (error) {
  if (error && error.code === 'MODULE_NOT_FOUND' && error.message.includes('commercial-qualifier.js')) {
    assert.fail('The pure CommonJS lib/commercial-qualifier.js module must exist.');
  }
  throw error;
}

const expectedQuestions = [
  {
    id: 'property',
    prompt: 'Property type',
    choices: [
      { id: 'office', label: 'Office' },
      { id: 'storefront_restaurant', label: 'Storefront / restaurant' },
      { id: 'hospitality_healthcare', label: 'Hospitality / healthcare' },
      { id: 'multifamily_common_area', label: 'Multi-family / common area' },
      { id: 'other_commercial', label: 'Other commercial property' }
    ]
  },
  {
    id: 'goal',
    prompt: 'Primary goal',
    choices: [
      { id: 'heat_glare', label: 'Heat / glare' },
      { id: 'privacy_decorative', label: 'Privacy / decorative' },
      { id: 'safety_security', label: 'Safety / security' },
      { id: 'uv_fade', label: 'UV / fade protection' }
    ]
  },
  {
    id: 'scope',
    prompt: 'Scope',
    choices: [
      { id: 'one_area_storefront', label: 'One area / storefront' },
      { id: 'small_building', label: 'Small building' },
      { id: 'multi_floor_large_project', label: 'Multi-floor / large project' },
      { id: 'not_yet_measured', label: 'Not yet measured' }
    ]
  },
  {
    id: 'timing',
    prompt: 'Timing',
    choices: [
      { id: 'as_soon_as_possible', label: 'As soon as possible' },
      { id: 'within_30_days', label: 'Within 30 days' },
      { id: 'one_to_three_months', label: 'One to three months' },
      { id: 'planning_budgeting', label: 'Planning / budgeting' }
    ]
  }
];

assert.deepEqual(qualifier.QUESTIONS, expectedQuestions, 'QUESTIONS must expose the four approved questions and choices in order.');
for (const functionName of ['selectAnswer', 'isComplete', 'buildSummary', 'buildTextMessage']) {
  assert.equal(typeof qualifier[functionName], 'function', `${functionName} must be exported by the CommonJS module.`);
}

const original = Object.freeze({ property: 'office' });
const withGoal = qualifier.selectAnswer(original, 'goal', 'privacy_decorative');
assert.notEqual(withGoal, original, 'selectAnswer must return a new state object.');
assert.deepEqual(original, { property: 'office' }, 'selectAnswer must not mutate its input state.');
assert.deepEqual(withGoal, { property: 'office', goal: 'privacy_decorative' });

const replacedGoal = qualifier.selectAnswer(withGoal, 'goal', 'safety_security');
assert.notEqual(replacedGoal, withGoal, 'Replacing an answer must also return a new state object.');
assert.equal(withGoal.goal, 'privacy_decorative', 'Replacing an answer must leave the previous state unchanged.');
assert.equal(replacedGoal.goal, 'safety_security');

const completeState = {
  property: 'storefront_restaurant',
  goal: 'privacy_decorative',
  scope: 'small_building',
  timing: 'within_30_days'
};
assert.equal(qualifier.isComplete({}), false, 'An empty qualifier is incomplete.');
assert.equal(qualifier.isComplete({ ...completeState, timing: undefined }), false, 'Three answers are incomplete.');
assert.equal(qualifier.isComplete({ ...completeState, timing: 'not_a_choice' }), false, 'An invalid fourth answer is not complete.');
assert.equal(qualifier.isComplete(completeState), true, 'All four valid answers complete the qualifier.');

const summary = qualifier.buildSummary(completeState);
assert.equal(typeof summary, 'string', 'buildSummary must return readable text.');
assert.match(summary, /Property:\s*Storefront \/ restaurant/i);
assert.match(summary, /Goal:\s*Privacy \/ decorative/i);
assert.match(summary, /Scope:\s*Small building/i);
assert.match(summary, /Timing:\s*Within 30 days/i);

const message = qualifier.buildTextMessage(completeState);
assert.equal(typeof message, 'string', 'buildTextMessage must return a text-message body.');
for (const answer of ['Storefront / restaurant', 'Privacy / decorative', 'Small building', 'Within 30 days']) {
  assert.match(message, new RegExp(answer.replace('/', '\\/'), 'i'), `The text message must include ${answer}.`);
}
assert.match(message, /property city/i, 'The text message must request the property city.');
assert.match(message, /photos/i, 'The text message must request photos.');
assert.match(message, /rough measurements/i, 'The text message must request rough measurements.');

assert.throws(
  () => qualifier.selectAnswer({}, 'unknown_question', 'office'),
  /unknown question[^\n]*unknown_question/i,
  'Invalid question IDs must throw a useful error.'
);
assert.throws(
  () => qualifier.selectAnswer({}, 'property', 'unknown_choice'),
  /invalid choice[^\n]*unknown_choice[^\n]*property/i,
  'Invalid choice IDs must throw a useful error.'
);

console.log('commercial window film qualifier contracts passed');
