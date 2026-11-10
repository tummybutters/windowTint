import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {capture}=require('../assets/attribution/journey');
const paidVersion='paid-design-20261110';
const oldVersion='intent-resume-20261108';
const url='https://www.obsidianautoworksoc.com/mobile-window-tinting?gclid=test-click&campaignid=123';
const baseline=capture({url,now:1000000000000,id:()=> 'fixed'});
const redesigned=capture({url,now:1000000000000,presentationVersion:paidVersion,id:()=> 'fixed'});
assert.equal(baseline.data.flow_version,oldVersion);
assert.equal(redesigned.data.flow_version,paidVersion);
assert.deepEqual({...redesigned,data:{...redesigned.data,flow_version:oldVersion}},baseline);
const returnToOld=capture({url,now:1000000000001,previous:redesigned,id:()=> 'unused'});
assert.equal(returnToOld.data.flow_version,oldVersion);
assert.equal(returnToOld.data.session_id,redesigned.data.session_id);
assert.equal(capture({url,presentationVersion:'arbitrary-user-input'}).data.flow_version,oldVersion);

const journeySource=fs.readFileSync(new URL('../assets/attribution/journey.js',import.meta.url),'utf8');
for(const presentationVersion of [paidVersion,undefined]){
  const stored=new Map();
  const location=new URL(url);
  const window={location};
  window.parent=window;
  const document={referrer:'',body:{dataset:{presentationVersion}},documentElement:{dataset:{}}};
  window.document=document;
  const context={window,document,location,URL,navigator:{userAgent:'iPhone Mobile',maxTouchPoints:1},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},crypto:{randomUUID:()=> 'test-visit'}};
  vm.runInNewContext(journeySource,context);
  const expected=presentationVersion||oldVersion;
  assert.equal(window.ObsidianJourney.get().flow_version,expected);
  assert.equal(window.ObsidianJourney.get().attribution_version,'journey-v2-20261108');
  for(const filename of ['classic-quote','quote','package-quote']){
    const firstParty=[],google=[];
    window.obsidianLeadTracking={recordEvent:(...args)=>firstParty.push(args)};
    window.gtag=(...args)=>google.push(args);
    const source=fs.readFileSync(new URL(`../assets/quote/${filename}.js`,import.meta.url),'utf8');
    const snippet=source.slice(0,source.indexOf('// Count a persisted request'));
    const quoteContext={...context,URLSearchParams,state:{id:'quote-test-id'}};
    vm.runInNewContext(snippet+'\nquoteEvent("quote_submit_attempt");',quoteContext);
    assert.equal(firstParty[0][1].flow_version,expected,filename+' first-party phase');
    assert.equal(google[0][2].quote_flow_version,expected,filename+' Google phase');
    assert.equal(firstParty[0][1].quote_id,'quote-test-id');
  }
}
console.log('Paid presentation phase reaches saved attribution and quote events; legacy defaults, visit identity and journey-v2 remain intact.');
