import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { vehicles } from './vehicle-page-data.mjs';
import { renderVehicle } from './generate-vehicle-pages.mjs';

const root = new URL('../', import.meta.url);
assert.equal(new Set(vehicles.map(v => v.slug)).size, vehicles.length);
for (const vehicle of vehicles) {
  const path = `${vehicle.slug}-window-tinting`;
  const html = await readFile(new URL(path, root), 'utf8');
  assert.equal(html, renderVehicle(vehicle), `Regenerate ${path}`);
  assert.ok(html.includes('content="index, follow"'), 'Release pages must be indexable');
  assert.ok(!html.includes('noindex'));
  assert.ok(html.includes('src="/vehicle-analytics.js"'));
  assert.ok(html.includes('data-page-type="vehicle-guide"'));
  assert.ok(!html.includes('data-lead-variant'), 'Do not label organic guides as paid traffic');
  assert.ok(html.includes('src="/lead-tracking.js"'));
  const message = `Hi Obsidian, I'd like a window tint quote for my ${vehicle.name}. Year: __. City: __. Windows to tint: __.`;
  assert.ok(html.includes(encodeURIComponent(message).replace(/'/g, '&#39;')), 'Vehicle-aware SMS draft is required');
  for (const placement of ['intro', 'closing', 'sticky']) {
    for (const action of ['call', 'text']) {
      assert.equal(html.split(`data-lead-action="vehicle_${placement}_${action}"`).length - 1, 1, `${placement} ${action} tracking must appear once`);
    }
  }
  assert.ok(html.includes('aria-label="Call or text Obsidian"'));
  assert.ok(html.includes(`href="https://www.obsidianautoworksoc.com/${path}"`));
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(schema['@type'], 'BreadcrumbList');
  assert.deepEqual(schema.itemListElement.map(item => item.position), [1, 2, 3]);
  assert.equal(schema.itemListElement[2].item, `https://www.obsidianautoworksoc.com/${path}`);
  assert.equal(schema.itemListElement[2].name, vehicle.name);
  assert.ok(html.includes('viewport-fit=cover'));
  for (const [number, width, height] of vehicle.images) {
    assert.ok(width > 0 && height > 0);
    assert.ok((await stat(new URL(`gallery/optimized/gallery-cards/${vehicle.slug}-${number}.webp`, root))).size > 0);
    assert.ok((await stat(new URL(`gallery/${vehicle.slug}-${number}.jpg`, root))).size > 0);
  }
  const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
  assert.ok(sitemap.includes(`/${path}<`), 'Release pages must be in sitemap');
}
console.log(`PASS: ${vehicles.length} reproducible release pages, assets, canonical paths, CTA tracking, indexability and sitemap inclusion.`);
