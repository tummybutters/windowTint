import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.argv.find(x => x.startsWith('--ref='))?.slice(6);
const read = name => ref ? execFileSync('git', ['show', `${ref}:${name}`], {cwd:root, encoding:'utf8',stdio:['ignore','pipe','pipe']}) : fs.readFileSync(path.join(root,name),'utf8');
for(const route of ['car-window-tinting-near-me','tint-shop-near-me']) {
 const html=read(route);
 assert.match(html, /<h1[\s>]/);
 assert.ok(html.includes('https://www.obsidianautoworksoc.com/mobile-window-tinting'), `${route}: canonical`);
 assert.match(html,/href="tel:7146007134"/);
 assert.match(html,/href="sms:\+17146007134/);
 for(const m of html.matchAll(/(?:src|href)=["'](\/[^"']+)["']/g)) {
  const name=m[1].split('?')[0].slice(1);
  assert.ok(read(name).length,`${route}: dependency ${name}`);
 }
}
for(const name of ['api/square-availability.js','lib/square-availability.js']) assert.ok(read(name).length);
console.log('Paid landing routes, contact links and local dependencies passed');
