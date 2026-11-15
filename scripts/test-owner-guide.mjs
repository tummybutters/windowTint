import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateOwnerGuide,ownerGuide} from '../site-builder/owner-guides.mjs';
const root=path.resolve(import.meta.dirname,'..');
const proof=validateOwnerGuide(root);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'obsidian-guide-'));
try {
 for(const i of proof.images){fs.mkdirSync(path.dirname(path.join(temp,i.path)),{recursive:true});fs.copyFileSync(path.join(root,i.path),path.join(temp,i.path));}
 fs.mkdirSync(path.join(temp,'site-builder/private'),{recursive:true});
 const write=p=>fs.writeFileSync(path.join(temp,'site-builder/private/m3-owner-guide-proof.json'),JSON.stringify(p));
 for(const key of ['provenanceVerified','modelVerified','privacyReviewed','websiteReuseAuthorized','claimsReviewed']){write({...proof,[key]:false});assert.throws(()=>validateOwnerGuide(temp));}
 write(proof);fs.appendFileSync(path.join(temp,proof.images[0].path),'changed');assert.throws(()=>validateOwnerGuide(temp));
 const html=fs.readFileSync(path.join(root,'public/generated'+ownerGuide.path+'.html'),'utf8');
 assert.equal((html.match(/<h1>/g)||[]).length,1);
 assert(html.includes('rel="canonical" href="https://www.obsidianautoworksoc.com'+ownerGuide.path+'"'));
 assert(!/noindex|app\.tintwiz\.com\/app\/|customer.?id|verified-complete/.test(html));
 assert(html.includes('/car-window-tinting-near-me#quote'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'content/build-manifest.json')));
 assert.equal(manifest.filter(p=>p.path===ownerGuide.path).length,1);
 assert.equal(manifest.length,151);
 for(const p of ['guides','window-tinting-gallery'])assert(fs.readFileSync(path.join(root,'public/generated/'+p+'.html'),'utf8').includes('href="'+ownerGuide.path+'"'));
 assert(!fs.existsSync(path.join(root,'public/site-builder')));
 console.log('PASS: five required review gates, changed-image rejection, article metadata, discovery links,151 routes and private-source exclusion');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
