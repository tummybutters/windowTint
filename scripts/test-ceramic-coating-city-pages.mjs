import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

const cities = [
  ['Irvine', 'irvine', 'business parks and residential garages'],
  ['Lake Forest', 'lake-forest', 'garage and covered-driveway setups'],
  ['Aliso Viejo', 'aliso-viejo', 'hillside sun and inland dust'],
  ['Newport Beach', 'newport-beach', 'coastal air and salt residue'],
  ['Costa Mesa', 'costa-mesa', 'daily freeway driving and open-air parking'],
  ['Tustin', 'tustin', 'garage, driveway, or suitable workplace'],
  ['Mission Viejo', 'mission-viejo', 'sun exposure and hillside dust'],
  ['Laguna Hills', 'laguna-hills', 'warm inland sun and regular road dust']
];

const sitemap = await read('sitemap.xml');
const homepage = await read('index');
const services = await read('services');
const devServer = await read('dev_server.py');
const vercel = JSON.parse(await read('vercel.json'));
const productionHeaderSources = vercel.headers.map(({ source }) => source).join('\n');

for (const [city, citySlug, localMarker] of cities) {
  const route = `ceramic-coating-${citySlug}`;
  const page = await read(route);
  const variant = `coating_${citySlug.replaceAll('-', '_')}_v1`;

  assert.match(page, new RegExp(`<title>Mobile Ceramic Coating ${city} \\| Obsidian Autoworks<\\/title>`));
  assert.match(page, new RegExp(`<meta name="description"[\\s\\S]{0,240}${city}`, 'i'));
  assert.match(page, /<meta name="robots" content="index, follow">/);
  assert.match(
    page,
    new RegExp(`<link rel="canonical" href="https:\\/\\/www\\.obsidianautoworksoc\\.com\\/${route}">`)
  );
  assert.match(page, new RegExp(`<html[^>]+data-lead-service="ceramic_coating"`));
  assert.match(page, new RegExp(`<html[^>]+data-lead-variant="${variant}"`));
  assert.match(page, /class="paid-hero paid-hero--vip"/);
  const h1 = page.match(/<h1>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const heroCopy = page.match(/<p class="paid-hero__copy">([\s\S]*?)<\/p>/)?.[1].replace(/\s+/g, ' ').trim();
  assert.equal(h1, `Ceramic Coating in ${city}`, `${city} H1 must say only what the page offers and where.`);
  assert.ok(heroCopy.split(/\s+/).length <= 18, `${city} hero support copy must stay plain and brief.`);
  assert.match(page, new RegExp(localMarker, 'i'));
  assert.equal((page.match(/class="paid-hero-strip__item/g) || []).length, 7);
  assert.match(page, new RegExp(`data-lead-action="coating_${citySlug.replaceAll('-', '_')}_call"`));
  assert.match(page, new RegExp(`data-lead-action="coating_${citySlug.replaceAll('-', '_')}_text"`));
  assert.match(page, /id: 'AW-18301955625'/);
  assert.doesNotMatch(page, /AW-17846304809/);
  assert.doesNotMatch(page, /(?:app\.squareup\.com|book\.squareup\.com|href="\/(?:vip-)?booking)/i);

  assert.match(sitemap, new RegExp(`https:\\/\\/www\\.obsidianautoworksoc\\.com\\/${route}`));
  assert.doesNotMatch(homepage, new RegExp(`href="\\/${route}`));
  assert.doesNotMatch(services, new RegExp(`href="\\/${route}`));
  assert.match(devServer, new RegExp(`"\\/${route}": "\\/${route}"`));
  assert.match(productionHeaderSources, new RegExp(route));
}

console.log('ceramic coating city page contract test passed');
