import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

const readOptional = async (relativePath) => {
  try {
    return await readFile(new URL(relativePath, root), 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return '';
    throw error;
  }
};

const tagAttribute = (tag, attribute) => {
  const match = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? match[2] : '';
};

const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => match[0]);

const metaContent = (html, name) => {
  const tag = tags(html, 'meta').find((candidate) => tagAttribute(candidate, 'name').toLowerCase() === name);
  return tag ? tagAttribute(tag, 'content') : '';
};

const canonicalHref = (html) => {
  const tag = tags(html, 'link').find((candidate) => tagAttribute(candidate, 'rel').toLowerCase() === 'canonical');
  return tag ? tagAttribute(tag, 'href') : '';
};

const visibleText = (html) => html
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const schemaTypes = (html) => {
  const values = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value['@type'])) values.push(...value['@type']);
    else if (typeof value['@type'] === 'string') values.push(value['@type']);
    Object.values(value).forEach(visit);
  };

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    assert.doesNotThrow(() => JSON.parse(match[1]), 'Commercial JSON-LD must be valid JSON.');
    visit(JSON.parse(match[1]));
  }
  return values;
};

const requireSection = (html, id, labelPattern) => {
  const match = html.match(new RegExp(`<section\\b[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/section>`, 'i'));
  assert.ok(match, `Expected a literal #${id} section.`);
  assert.match(visibleText(match[1]), labelPattern, `#${id} must visibly identify its commercial purpose.`);
};

const headerCovers = (header, route) => {
  const source = header && typeof header.source === 'string' ? header.source : '';
  if (source === route) return true;
  if (!source.startsWith('/(') || !source.endsWith(')')) return false;
  return source.slice(2, -1).split('|').includes(route.replace(/^\//, ''));
};

const organic = await readOptional('commercial-window-film');
const paid = await readOptional('commercial-window-film-socal');
const qualifierController = await readOptional('commercial-window-film-qualifier.js');
const commercialCss = await readOptional('commercial-window-film.css');
const devServer = await readFile(new URL('dev_server.py', root), 'utf8');
const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
const vercel = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));

assert.ok(organic, 'The /commercial-window-film organic page must exist.');
assert.ok(paid, 'The /commercial-window-film-socal paid page must exist.');
assert.ok(qualifierController, 'The paid page qualifier controller must exist.');

assert.match(metaContent(organic, 'robots'), /^index\s*,\s*follow$/i, 'The organic page must be indexable.');
assert.equal(
  canonicalHref(organic),
  'https://www.obsidianautoworksoc.com/commercial-window-film',
  'The organic page must self-canonicalize.'
);
assert.match(organic, /<title>[^<]*Commercial Window Film[^<]*<\/title>/i, 'The organic title must target commercial window film.');
assert.match(metaContent(organic, 'description'), /commercial/i, 'The organic description must identify the commercial service.');
assert.match(metaContent(organic, 'description'), /window (?:film|tint)/i, 'The organic description must describe window film or tint.');
assert.match(organic, /<h1\b[^>]*>[\s\S]*?Commercial Window Film[\s\S]*?<\/h1>/i, 'The organic H1 must target commercial window film.');
const organicSchemaTypes = schemaTypes(organic);
assert.ok(organicSchemaTypes.includes('Service'), 'The organic page must expose Service JSON-LD.');
assert.ok(organicSchemaTypes.includes('LocalBusiness'), 'The organic page must expose LocalBusiness JSON-LD.');
assert.doesNotMatch(organic, /data-lead-variant=/i, 'The organic page must not carry a paid-only variant.');

requireSection(organic, 'applications', /commercial applications?/i);
requireSection(organic, 'solutions', /(?:film )?solutions?/i);
requireSection(organic, 'process', /(?:project )?process/i);
requireSection(organic, 'privacy-decorative', /privacy[^.]{0,80}decorative|decorative[^.]{0,80}privacy/i);
requireSection(organic, 'site-review', /consultation|site review/i);

assert.match(organic, /href=["']tel:\+17146007134["']/i, 'The organic page must provide the canonical call action for 7146007134.');
assert.match(organic, /href=["']sms:\+17146007134(?:\?[^"']*)?["']/i, 'The organic page must provide a text action for 7146007134.');
assert.match(visibleText(organic), /\(714\) 600-7134/, 'The organic page must display (714) 600-7134.');

assert.match(metaContent(paid, 'robots'), /^noindex\s*,\s*follow$/i, 'The paid page must be noindex,follow.');
assert.equal(
  canonicalHref(paid),
  'https://www.obsidianautoworksoc.com/commercial-window-film',
  'The paid page must canonicalize to the organic commercial page.'
);
const htmlTag = tags(paid, 'html')[0] || '';
assert.equal(tagAttribute(htmlTag, 'data-lead-service'), 'commercial_window_film', 'The paid page must identify the commercial service.');
assert.equal(tagAttribute(htmlTag, 'data-lead-variant'), 'commercial_socal_v1', 'The paid page must identify the approved paid variant.');

const firstCall = paid.search(/<a\b[^>]*href=["']tel:\+17146007134["']/i);
const firstText = paid.search(/<a\b[^>]*href=["']sms:\+17146007134(?:\?[^"']*)?["']/i);
const qualifier = paid.search(/\bid=["']commercial-qualifier["']/i);
assert.ok(firstCall >= 0, 'The paid page must lead with a call CTA.');
assert.ok(firstText > firstCall, 'The paid page text CTA must follow the call CTA.');
assert.ok(qualifier > firstText, 'The project qualifier must follow the call and text CTAs.');

for (const anchor of ['solutions', 'process', 'privacy-decorative', 'site-review']) {
  assert.match(paid, new RegExp(`\\bid=["']${anchor}["']`, 'i'), `The paid page must expose #${anchor}.`);
  assert.match(paid, new RegExp(`href=["']#${anchor}["']`, 'i'), `The paid page must link to #${anchor}.`);
}

const mobileActionsStart = paid.search(/class=["'][^"']*\bpaid-mobile-actions\b[^"']*["']/i);
assert.ok(mobileActionsStart >= 0, 'The paid page must include sticky mobile actions.');
const mobileActions = paid.slice(mobileActionsStart, mobileActionsStart + 1200);
assert.match(mobileActions, /href=["']tel:\+17146007134["']/i, 'Sticky mobile actions must include the canonical call URI.');
assert.match(mobileActions, /href=["']sms:\+17146007134(?:\?[^"']*)?["']/i, 'Sticky mobile actions must include text.');
assert.match(
  commercialCss,
  /\.paid-mobile-actions\b[^{]*\{[\s\S]*?position\s*:\s*(?:fixed|sticky)\b/i,
  'Commercial CSS must keep the paid mobile call/text controls sticky.'
);

const squareUrl = /(?:app\.squareup\.com|book\.squareup\.com|squareup\.com\/appointments|square\.site\/appointments)/i;
const bookingUrl = /href\s*=\s*(["'])(?:\/(?:vip-)?booking|https?:\/\/(?:www\.)?obsidianautoworksoc\.com\/(?:vip-)?booking)(?:[?#][^"']*)?\1/i;
assert.doesNotMatch(paid, squareUrl, 'The paid commercial page must not contain a Square URL.');
assert.doesNotMatch(paid, bookingUrl, 'The paid commercial page must not contain a booking URL.');
assert.match(paid, /<script\b[^>]*src=["']\/lead-tracking\.js["'][^>]*><\/script>/i, 'The paid page must load lead-tracking.js.');
assert.match(paid, /<script\b[^>]*src=["']\/commercial-window-film-qualifier\.js["'][^>]*><\/script>/i, 'The paid page must load its qualifier controller.');

const leadActions = [...paid.matchAll(/data-lead-action=["']([^"']+)["']/gi)].map((match) => match[1]);
assert.ok(leadActions.includes('commercial_window_film_call'), 'Call CTAs must carry the commercial call tracking label.');
assert.ok(leadActions.includes('commercial_window_film_text'), 'Text CTAs must carry the commercial text tracking label.');
assert.ok(leadActions.every((action) => action.startsWith('commercial_')), 'Every paid-page lead action must use commercial-only tracking semantics.');
assert.doesNotMatch(
  `${paid}\n${qualifierController}`,
  /data-lead-(?:service|variant|action)=["'][^"']*(?:residential|automotive|vehicle|tesla|mobile_tint|ceramic_tint)[^"']*["']/i,
  'Commercial artifacts must contain zero residential or automotive tracking labels.'
);

const approvedQualifierEvents = [
  'commercial_qualifier_started',
  'commercial_qualifier_answered',
  'commercial_qualifier_completed',
  'commercial_qualifier_restarted'
];
for (const eventName of approvedQualifierEvents) {
  assert.match(qualifierController, new RegExp(`['"]${eventName}['"]`), `The qualifier controller must emit ${eventName}.`);
}
const qualifierEvents = [...qualifierController.matchAll(/['"](commercial_qualifier_[a-z_]+)['"]/g)].map((match) => match[1]);
assert.deepEqual(
  new Set(qualifierEvents),
  new Set(approvedQualifierEvents),
  'The qualifier controller must use only the four approved commercial engagement events.'
);
assert.doesNotMatch(qualifierController, /gtag\s*\([\s\S]{0,160}['"]conversion['"]|\bsend_to\b|\bAW-\d+/i, 'Qualifier progress and completion must never fire a Google Ads conversion.');

assert.match(devServer, /"\/commercial-window-film"\s*:\s*"\/commercial-window-film"/, 'The organic local route must resolve.');
assert.match(devServer, /"\/commercial-window-film-socal"\s*:\s*"\/commercial-window-film-socal"/, 'The paid local route must resolve.');

assert.match(
  sitemap,
  /<loc>https:\/\/www\.obsidianautoworksoc\.com\/commercial-window-film<\/loc>/,
  'Only the organic commercial route belongs in the sitemap.'
);
assert.doesNotMatch(
  sitemap,
  /<loc>https:\/\/www\.obsidianautoworksoc\.com\/commercial-window-film-socal<\/loc>/,
  'The paid commercial route must stay out of the sitemap.'
);

for (const route of ['/commercial-window-film', '/commercial-window-film-socal']) {
  assert.ok(
    vercel.headers.some((header) => headerCovers(header, route) && header.headers.some((item) => (
      item.key.toLowerCase() === 'content-type' && /text\/html/i.test(item.value)
    ))),
    `${route} must be covered by the production HTML header rule.`
  );
}
assert.ok(
  vercel.headers.some((header) => headerCovers(header, '/commercial-window-film-socal') && header.headers.some((item) => (
    item.key.toLowerCase() === 'x-robots-tag' && /^noindex\s*,\s*follow$/i.test(item.value)
  ))),
  'The paid route must be covered by an X-Robots-Tag: noindex, follow header.'
);

console.log('commercial window film page contracts passed');
