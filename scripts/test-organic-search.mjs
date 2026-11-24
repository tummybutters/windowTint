import assert from 'node:assert/strict';
import fs from 'node:fs';

// Run after `npm run build`. Checks the organic search copy in content/organic-search.json against the generated pages.
const data = JSON.parse(fs.readFileSync('content/organic-search.json', 'utf8'));
const manifest = new Set(JSON.parse(fs.readFileSync('content/build-manifest.json', 'utf8')).map(page => page.path));
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const visible = html => decode(html.match(/<main id="main">([\s\S]*)<\/main>/)[1].replace(/<(script|style|template)[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const titles = new Set(), descriptions = new Set(), questionBlocks = new Set();

for (const [path, copy] of Object.entries(data.pages)) {
  const html = fs.readFileSync(`public/generated/${path === '/' ? 'index' : path.slice(1)}.html`, 'utf8');
  const text = visible(html);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path} has one H1`);
  const title = decode(html.match(/<title>(.*?)<\/title>/)[1]);
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)[1]);
  if (copy.metaTitle) {
    assert(title.startsWith(copy.metaTitle) && title.length <= 62, `${path} title`);
    assert(!titles.has(title), `${path} unique title`); titles.add(title);
  }
  if (copy.description) {
    assert.equal(description, copy.description, `${path} description`);
    assert(!descriptions.has(description), `${path} unique description`); descriptions.add(description);
    for (const number of description.match(/\$\d{1,3}(?:,\d{3})*|\b82\b/g) || []) assert(text.includes(number), `${path} shows ${number}`);
    if (/lifetime warranty/i.test(description)) assert(/lifetime tint warranty/i.test(text), `${path} shows the warranty`);
    if (/Avery Dennison/.test(description)) assert(text.includes('Avery Dennison'), `${path} shows the film`);
  }
  if (copy.intro) assert(text.includes(copy.intro), `${path} answer-first introduction`);
  if (copy.proof) assert.equal((html.match(/class="proof-stats"/g) || []).length, 1, `${path} shows the four proof figures once`);
  const nodes = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => { const g = JSON.parse(m[1]); return g['@graph'] || [g]; });
  const business = nodes.find(node => node['@type'] === 'AutomotiveBusiness');
  assert(business && business.telephone === '+17146007134' && !business.address, `${path} business markup`);
  assert(!/Rating/.test(JSON.stringify(nodes)), `${path} has no rating markup`);
  for (const city of business.areaServed.filter(area => area['@type'] === 'City')) {
    const slug = city.name.replace(', CA', '').toLowerCase().replaceAll(' ', '-');
    assert(manifest.has(`/${slug}-window-tinting`), `${city.name} has a page`);
  }
  if (copy.questions) {
    const block = html.split('page-questions')[1].split('</section>')[0];
    assert(!block.includes('<details'), `${path} questions are visible`);
    assert((block.match(/class="faq-item"/g) || []).length >= 6, `${path} has at least six questions`);
    const normalized = block.replaceAll(copy.questionCity || copy.questions, 'CITY');
    assert(!questionBlocks.has(normalized), `${path} questions differ from other cities`); questionBlocks.add(normalized);
  }
}
console.log(`${Object.keys(data.pages).length} organic pages: titles, descriptions, visible numbers, introductions, questions and business markup passed.`);
