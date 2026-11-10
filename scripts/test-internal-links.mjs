import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {attachInternalLinks,linkedParagraphs} from '../site-builder/internal-links.mjs';
import {escape as e,quoteHref} from '../site-builder/components.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const pages=JSON.parse(read('content/pages.json'));
const plans=['shared','auto','home','commercial'].flatMap(name=>JSON.parse(read(`content/internal-links-${name}.json`)));
attachInternalLinks(pages,plans);
let contextualLinks=0,secondaryActions=0;
for(const page of pages) {
  const html=read('generated/'+(page.path==='/'?'index':page.path.slice(1))+'.html');
  const plan=page.linkPlan;
  assert.equal((html.match(/class="context-link"/g)||[]).length,plan.links.length,`Rendered link count: ${page.path}`);
  for(const link of plan.links) {
    assert(html.includes(`<a class="context-link" href="${e(link.href)}">${e(link.anchor)}</a>`),`Missing rendered annotation: ${page.path}`);
    contextualLinks++;
  }
  for(const [i,section] of (page.sections||[]).entries()) {
    const output=linkedParagraphs(section.body,plan.links.filter(link=>link.section===i));
    const textOnly=output.replace(/<a\b[^>]*>/g,'').replaceAll('</a>','');
    assert.equal(textOnly,String(section.body||'').split(/\n\n/).map(p=>`<p>${e(p)}</p>`).join(''),`Article copy changed: ${page.path}`);
  }
  if(plan.quoteLabel)assert(html.includes(`href="${e(quoteHref(page))}">${e(plan.quoteLabel)} `),`Quote action missing: ${page.path}`);
  if(plan.secondary) {
    assert(html.includes(`<a class="next-step-link" href="${e(plan.secondary.href)}">${e(plan.secondary.label)} `),`Secondary action missing: ${page.path}`);
    secondaryActions++;
  }
}
// Keep the specialized intake paths intact as article labels change.
assert.equal(quoteHref({path:'/front-two-window-tinting',division:'auto'}),'/car-window-tinting-near-me?quote_coverage=front_two#quote');
assert.equal(quoteHref({path:'/tesla-model-y-window-tinting',division:'auto'}),'/tesla-model-y-window-tinting?experience=original#quote');
assert.equal(quoteHref({path:'/chrome-delete',division:'auto'}),'sms:+17146007134');
assert.equal(quoteHref({path:'/home-solar-window-film',division:'home'}),'https://app.tintwiz.com/web/cs/dsvpiyfwkbahjx40fiox90tkhqgnhqpu');
assert.equal(quoteHref({path:'/commercial-privacy-film',division:'commercial'}),'/commercial-window-tinting-orange-county#quote');
// A later copy edit must fail loudly rather than silently remove an editorial link.
const stale=structuredClone(plans);stale.find(p=>p.links.length).links[0].anchor='Phrase no longer present in the article';
assert.throws(()=>attachInternalLinks(structuredClone(pages),stale),/Anchor must appear exactly once/);
assert.equal(linkedParagraphs('Use <samples> & compare.',[{anchor:'<samples>',href:'/samples'}]),'<p>Use <a class="context-link" href="/samples">&lt;samples&gt;</a> &amp; compare.</p>');
console.log(JSON.stringify({passed:true,reviewedPages:pages.length,contextualLinks,secondaryActions,checks:['Every reviewed annotation renders as a crawlable link','Article wording preserved','Quote destinations and selected coverage preserved','Stale annotations fail the build','Visible copy and link attributes are escaped']},null,2));
