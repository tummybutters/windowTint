import assert from 'node:assert/strict';
import fs from 'node:fs';
for (const variant of ['original','driveway']) {
 const p=fs.readFileSync(`experiments/${variant}/window-tint-pricing.html`,'utf8');
 assert(p.indexOf('id="visible-pricing"')<p.indexOf('<section class="quiz"'));
 for (const text of ['$200','$500','The Driveway Package','Tesla: free sun strip only','Glass roofs are excluded','quote_coverage=front_two']) assert(p.includes(text),text);
 const c=fs.readFileSync(`experiments/${variant}/ceramic-window-tinting.html`,'utf8');
 assert(c.indexOf('id="ceramic-guide"')<c.indexOf('<section class="quiz"'));
 assert(!c.includes('href="/ceramic-window-tinting"'));
}
const front=fs.readFileSync('front-two-window-tinting','utf8');
assert(front.includes('quote_coverage=front_two'));
assert(!front.includes('href="/booking"'));
console.log('Funnel content contract passed');
