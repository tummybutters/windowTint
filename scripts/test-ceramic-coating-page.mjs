import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

const page = read('ceramic-coating');
const tracking = read('lead-tracking.js');
const services = read('services');
const home = read('index');
const sitemap = read('sitemap.xml');
const vercel = JSON.parse(read('vercel.json'));

assert.match(page, /<title>Mobile Ceramic Coating \| Obsidian Autoworks<\/title>/);
assert.match(page, /https:\/\/www\.obsidianautoworksoc\.com\/ceramic-coating/);
assert.match(page, /"serviceType": "Mobile automotive ceramic coating"/);
assert.match(page, /<html[^>]+data-lead-service="ceramic_coating"/);
assert.match(page, /href="tel:7146007134"/);
assert.match(page, /href="sms:7146007134"/);
assert.match(page, /id: 'AW-18301955625'/);
assert.match(page, /phone_click: 'BU5VCLCasNkcEKnchpdE'/);
assert.match(page, /text_click: 'qbmnCLOasNkcEKnchpdE'/);
assert.doesNotMatch(page, /AW-17846304809/);
assert.match(page, />Text Paint Photos<\/a>/);
assert.doesNotMatch(page, />Text Photos For An Opinion<\/a>/);
assert.match(page, /Ceramic Coating for a/);
assert.match(page, /Richer Finish and Lasting Gloss/);
assert.match(page, /class="coating-showcase"/);
assert.match(page, /assets\/ceramic-coating\/paint-detail\.webp/);
assert.match(page, /assets\/ceramic-coating\/white-mclaren\.webp/);
assert.ok(
    page.indexOf('class="coating-showcase"') < page.indexOf('class="coating-proof"'),
    'Expected the results showcase immediately after the hero and before the service summary'
);
assert.ok(
    (page.match(/data-lead-action="ceramic_coating_call"/g) || []).length >= 4,
    'Expected frequent call CTAs across the ceramic coating page'
);
assert.ok(
    (page.match(/data-lead-action="ceramic_coating_text"/g) || []).length >= 4,
    'Expected frequent text CTAs across the ceramic coating page'
);
for (const anchor of ['process', 'results', 'fit', 'contact']) {
    assert.match(page, new RegExp(`id="${anchor}"`));
}
assert.doesNotMatch(page, /Pure Mobile Detailing/i);
assert.doesNotMatch(page, /TintWiz/i);

assert.match(services, /href="\/ceramic-coating"/);
assert.match(home, /href="\/ceramic-coating"/);
assert.match(sitemap, /https:\/\/www\.obsidianautoworksoc\.com\/ceramic-coating/);

assert.ok(
    vercel.redirects.some((redirect) => (
        redirect.source === '/ceramic-coating.html'
        && redirect.destination === '/ceramic-coating'
        && redirect.permanent === true
    )),
    'Expected permanent clean-URL redirect for ceramic coating'
);
assert.ok(
    !vercel.rewrites.some((rewrite) => (
        rewrite.source === '/ceramic-coating'
        && rewrite.destination === '/ceramic-coating'
    )),
    'Ceramic coating must not rewrite to itself'
);
assert.ok(
    vercel.headers.some((header) => (
        header.source.includes('ceramic-coating')
        && header.headers.some((item) => item.key === 'Content-Type')
    )),
    'Expected the ceramic coating page in the HTML content-type rule'
);

assert.match(tracking, /path === '\/ceramic-coating'/);
assert.match(tracking, /ceramic_coating_page_visit/);
assert.match(tracking, /data-lead-service/);

console.log('Ceramic coating page contract passed.');
