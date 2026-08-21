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

const requireCommercialAdsConfig = (html, pageLabel) => {
  const trackingScript = html.search(/<script\b[^>]*src=["']\/lead-tracking\.js["'][^>]*><\/script>/i);
  const configStart = html.indexOf('window.OBSIDIAN_GOOGLE_ADS_CONFIG');
  assert.ok(configStart >= 0, `${pageLabel} must define window.OBSIDIAN_GOOGLE_ADS_CONFIG.`);
  assert.ok(configStart < trackingScript, `${pageLabel} must define the commercial Ads config before lead-tracking.js.`);

  const configEnd = html.indexOf('</script>', configStart);
  const configSource = html.slice(configStart, configEnd);
  assert.match(configSource, /\bid\s*:\s*["']AW-18301955625["']/, `${pageLabel} must use the commercial Ads account.`);
  assert.match(
    configSource,
    /\bwebsiteCallConfigId\s*:\s*["']AW-18301955625\/1asCCLrhh9wcEKnchpdE["']/,
    `${pageLabel} must configure the qualified 60-second website-call action.`
  );
  assert.match(configSource, /\bphone_click\s*:\s*["']["']/, `${pageLabel} phone clicks must remain diagnostic only.`);
  assert.match(configSource, /\btext_click\s*:\s*["']["']/, `${pageLabel} text clicks must remain diagnostic only.`);
  assert.match(
    html.slice(0, trackingScript),
    /gtag\s*\(\s*["']config["']\s*,\s*["']AW-18301955625["']\s*\)/,
    `${pageLabel} must initialize the commercial Ads account.`
  );
  assert.doesNotMatch(html, /AW-17846304809/, `${pageLabel} must not initialize or inherit the mobile-tint Ads account.`);
};

const organic = await readOptional('commercial-window-film');
const paid = await readOptional('commercial-window-film-socal');
const qualifierController = await readOptional('commercial-window-film-qualifier.js');
const commercialCss = await readOptional('commercial-window-film.css');
const devServer = await readFile(new URL('dev_server.py', root), 'utf8');
const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
const vercel = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
const commercialPhoto = await readOptional('assets/commercial-window-film/obsidian-commercial-office.webp');
const privacyVisualization = await readOptional('assets/commercial-window-film/commercial-privacy-visualization.webp');
const installationVisualization = await readOptional('assets/commercial-window-film/commercial-installation-visualization.webp');

const paidVariantMatrix = [
  {
    route: '/commercial-window-tinting-orange-county',
    variant: 'commercial_tint_oc_v1',
    title: 'Commercial Window Tinting in Orange County | Obsidian Autoworks',
    h1: 'Commercial Window Tinting in Orange County',
    descriptionTerms: ['commercial window tinting', 'orange county']
  },
  {
    route: '/office-privacy-window-film',
    variant: 'office_privacy_frost_v1',
    title: 'Office Privacy Window Film | Obsidian Autoworks',
    h1: 'Office Privacy Window Film in Orange County',
    descriptionTerms: ['office privacy', 'frosted', 'window film']
  },
  {
    route: '/commercial-heat-glare-window-film',
    variant: 'commercial_solar_glare_v1',
    title: 'Commercial Heat & Glare Window Film | Obsidian Autoworks',
    h1: 'Commercial Heat & Glare Window Film in Orange County',
    descriptionTerms: ['commercial', 'heat', 'glare', 'window film']
  },
  {
    route: '/storefront-security-window-film',
    variant: 'storefront_security_v1',
    title: 'Storefront Security Window Film | Obsidian Autoworks',
    h1: 'Storefront Security Window Film in Orange County',
    descriptionTerms: ['storefront', 'security', 'window film']
  }
];
const paidVariantPages = await Promise.all(paidVariantMatrix.map(async (page) => ({
  ...page,
  html: await readOptional(page.route.slice(1))
})));

assert.ok(organic, 'The /commercial-window-film organic page must exist.');
assert.ok(paid, 'The /commercial-window-film-socal paid page must exist.');
assert.ok(qualifierController, 'The paid page qualifier controller must exist.');
assert.ok(commercialPhoto, 'The commercial pages must ship the real office project photo.');
assert.ok(privacyVisualization, 'The commercial pages must ship the privacy-film application visualization.');
assert.ok(installationVisualization, 'The paid commercial page must ship the installation-detail visualization.');

requireCommercialAdsConfig(organic, 'The organic page');
requireCommercialAdsConfig(paid, 'The paid page');

for (const [html, label] of [[organic, 'organic'], [paid, 'paid']]) {
  assert.match(html, /src=["']\/assets\/commercial-window-film\/obsidian-commercial-office\.webp["']/i, `${label} page must use the real commercial office photo.`);
  assert.match(html, /src=["']\/assets\/commercial-window-film\/commercial-privacy-visualization\.webp["']/i, `${label} page must use the commercial privacy visualization.`);
  assert.match(visibleText(html), /Real project photo/i, `${label} page must visibly identify the real project photo.`);
  assert.doesNotMatch(visibleText(html), /AI-generated|application visualization|not an Obsidian project/i, `${label} page must not show internal visualization disclaimers.`);
  assert.doesNotMatch(html, /Generic architectural image/i, `${label} page must not retain generic architectural imagery.`);
}

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

const paidHero = paid.match(/<header\b[^>]*class=["'][^"']*commercial-paid-hero[^"']*["'][^>]*>[\s\S]*?<\/header>/i)?.[0] || '';
assert.ok(paidHero, 'The paid page must expose its commercial hero.');
assert.match(paidHero, /commercial-paid-hero__content--centered/i, 'The paid hero copy must use the centered layout.');
assert.match(
  paidHero,
  /<h1\b[^>]*>\s*Commercial Window Film Installation\s*<span>in Orange County<\/span>\s*<\/h1>/i,
  'The paid hero H1 must directly match commercial installation intent and Orange County.'
);
assert.match(paidHero, /commercial-paid-hero__gallery/i, 'The paid hero must place an image gallery below the centered headline and CTAs.');
const heroContentEnd = paidHero.search(/<\/div>\s*<div\b[^>]*class=["'][^"']*commercial-paid-hero__gallery/i);
const heroH1Start = paidHero.search(/<h1\b/i);
assert.ok(heroContentEnd > heroH1Start, 'The hero image gallery must follow, not split beside, the headline content.');
for (const imagePath of [
  '/assets/commercial-window-film/obsidian-commercial-office.webp',
  '/assets/commercial-window-film/ads/generated-storefront-landscape.jpg',
  '/assets/commercial-window-film/commercial-installation-visualization.webp'
]) {
  assert.match(paidHero, new RegExp(`src=["']${imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i'), `The paid hero gallery must include ${imagePath}.`);
}
assert.match(visibleText(paidHero), /Real project photo[^.]{0,40}Obsidian/i, 'The authentic hero photo must be identified as a real Obsidian project.');
assert.doesNotMatch(visibleText(paidHero), /AI-generated|application visualization|not an Obsidian project/i, 'The paid hero must not show internal visualization disclaimers.');

assert.doesNotMatch(paid, /id=["']commercial-consultation-form["']/i, 'The paid page must not put a separate intake form before the quiz.');
assert.doesNotMatch(paid, /src=["']\/commercial-consultation-form\.js["']/i, 'The retired separate intake controller must not load.');
for (const fieldName of ['name', 'phone', 'property_city', 'additional_notes']) {
  assert.match(qualifierController, new RegExp(`name=["']${fieldName}["']`, 'i'), `The quiz result must collect ${fieldName}.`);
}
assert.match(qualifierController, /\/api\/commercial-leads/i, 'The quiz result must persist to the dedicated Neon endpoint.');
assert.match(qualifierController, /Save[^<]*open text|Text us your info/i, 'The quiz result must present the save-and-text action.');

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
assert.match(
  qualifierController,
  /\.focus\s*\(\s*\{\s*preventScroll\s*:\s*true\s*\}\s*\)/,
  'Dynamic qualifier steps must restore focus without causing scroll jumps.'
);
assert.match(
  qualifierController,
  /querySelector\(\s*['"]\.commercial-qualifier__choice['"]\s*\)/,
  'The qualifier must focus the first choice after a step replacement.'
);
assert.match(
  qualifierController,
  /querySelector\(\s*['"]\.commercial-qualifier__result h3['"]\s*\)/,
  'The qualifier must focus the result heading after completion.'
);
assert.match(
  qualifierController,
  /renderQuestion\(\s*\{\s*focusChoice\s*:\s*true\s*\}\s*\)/,
  'Restart and answer transitions must request focus on the newly rendered first choice.'
);

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

const dynamicVariantRead = qualifierController.match(
  /const\s+(\w+)\s*=\s*clean\(\s*document\.documentElement\.dataset\.leadVariant\s*\)\s*\|\|\s*["']commercial_socal_v1["']/
);
const landingVariantVariable = dynamicVariantRead ? dynamicVariantRead[1] : 'landingVariant';
const trackingPayloadUsesLandingVariant = (eventPattern) => new RegExp(
  `tracking\\.recordEvent\\(\\s*${eventPattern}\\s*,\\s*\\{[\\s\\S]{0,320}?landing_variant\\s*:\\s*${landingVariantVariable}\\b`
);
const newVariantContractFailures = [
  ...paidVariantPages
    .filter((page) => !page.html)
    .map((page) => `${page.route} static page artifact is missing`),
  ...(!dynamicVariantRead ? ['qualifier does not read document.documentElement.dataset.leadVariant'] : []),
  ...(new RegExp(`landing_variant\\s*:\\s*${landingVariantVariable}\\b`).test(qualifierController)
    ? []
    : ['qualifier tracking does not use the landing-page variant']),
  ...(/landing_variant\s*:\s*["']commercial_socal_v1["']/.test(qualifierController)
    ? ['qualifier tracking hard-codes commercial_socal_v1']
    : [])
];
assert.deepEqual(
  newVariantContractFailures,
  [],
  `New paid variant contracts are incomplete:\n${newVariantContractFailures.map((failure) => `- ${failure}`).join('\n')}`
);
assert.match(
  qualifierController,
  trackingPayloadUsesLandingVariant('eventName'),
  'The shared qualifier tracking helper must attach the document-derived landing variant to every qualifier event.'
);
for (const eventName of ['commercial_lead_submit', 'commercial_lead_saved']) {
  assert.match(
    qualifierController,
    trackingPayloadUsesLandingVariant(`["']${eventName}["']`),
    `${eventName} must attach the document-derived landing variant.`
  );
}

for (const page of paidVariantPages) {
  const html = page.html;
  const pageLabel = `${page.route} paid variant`;
  const pageHtmlTag = tags(html, 'html')[0] || '';
  const pageHero = html.match(/<header\b[^>]*class=["'][^"']*commercial-paid-hero[^"']*["'][^>]*>[\s\S]*?<\/header>/i)?.[0] || '';
  const pageH1 = pageHero.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
  const pageDescription = metaContent(html, 'description').toLowerCase();

  assert.ok(html, `${pageLabel} must exist as an extensionless static page artifact.`);
  assert.equal(tagAttribute(pageHtmlTag, 'data-lead-service'), 'commercial_window_film', `${pageLabel} must identify the commercial service.`);
  assert.equal(tagAttribute(pageHtmlTag, 'data-lead-variant'), page.variant, `${pageLabel} must expose its approved lead variant.`);
  assert.match(html, new RegExp(`<title>\\s*${page.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<\\/title>`, 'i'), `${pageLabel} must use its search-intent title.`);
  assert.equal(visibleText(pageH1), page.h1, `${pageLabel} must use its search-intent H1.`);
  for (const term of page.descriptionTerms) {
    assert.match(pageDescription, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${pageLabel} description must address ${term} intent.`);
  }

  requireCommercialAdsConfig(html, pageLabel);
  assert.match(html, /href=["']\/commercial-window-film\.css(?:\?[^"']*)?["']/i, `${pageLabel} must reuse the shared commercial page stylesheet.`);
  assert.match(pageHero, /commercial-paid-hero__content--centered/i, `${pageLabel} must retain the centered paid hero layout.`);
  assert.match(pageHero, /commercial-paid-hero__gallery/i, `${pageLabel} must retain the paid hero gallery.`);
  for (const imagePath of [
    '/assets/commercial-window-film/obsidian-commercial-office.webp',
    '/assets/commercial-window-film/ads/generated-storefront-landscape.jpg',
    '/assets/commercial-window-film/commercial-installation-visualization.webp'
  ]) {
    assert.match(pageHero, new RegExp(`src=["']${imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i'), `${pageLabel} gallery must retain ${imagePath}.`);
  }
  const galleryFigures = [...pageHero.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)].map((match) => match[0]);
  const officePhotoFigure = galleryFigures.find((figure) => /src=["']\/assets\/commercial-window-film\/obsidian-commercial-office\.webp["']/i.test(figure)) || '';
  assert.match(visibleText(officePhotoFigure), /Real project photo[^.]{0,40}Obsidian/i, `${pageLabel} must label the authentic office photo as a real Obsidian project.`);
  for (const figure of galleryFigures.filter((candidate) => candidate !== officePhotoFigure)) {
    assert.doesNotMatch(visibleText(figure), /Real project photo[^.]{0,40}Obsidian/i, `${pageLabel} must not label generated or illustrative gallery figures as real Obsidian projects.`);
  }
  assert.match(html, /<script\b[^>]*src=["']\/lead-tracking\.js["'][^>]*><\/script>/i, `${pageLabel} must load lead-tracking.js.`);
  assert.match(html, /<script\b[^>]*src=["']\/commercial-window-film-qualifier\.js["'][^>]*><\/script>/i, `${pageLabel} must load the shared qualifier controller.`);
  assert.match(qualifierController, /\/api\/commercial-leads/i, `${pageLabel} qualifier must persist leads through the commercial lead endpoint.`);
  assert.match(qualifierController, /saveThenOpenText/i, `${pageLabel} qualifier must save the lead before opening SMS.`);
  assert.doesNotMatch(html, /id=["']commercial-consultation-form["']/i, `${pageLabel} must not restore a separate intake form before the qualifier.`);
  assert.doesNotMatch(html, /src=["']\/commercial-consultation-form\.js["']/i, `${pageLabel} must not load the retired separate intake controller.`);

  const variantCall = html.search(/<a\b[^>]*href=["']tel:\+17146007134["']/i);
  const variantText = html.search(/<a\b[^>]*href=["']sms:\+17146007134(?:\?[^"']*)?["']/i);
  const variantQualifier = html.search(/\bid=["']commercial-qualifier["']/i);
  assert.ok(variantCall >= 0, `${pageLabel} must lead with a call CTA.`);
  assert.ok(variantText > variantCall, `${pageLabel} text CTA must follow the call CTA.`);
  assert.ok(variantQualifier > variantText, `${pageLabel} qualifier must follow call and text CTAs.`);
  const variantLeadActions = [...html.matchAll(/data-lead-action=["']([^"']+)["']/gi)].map((match) => match[1]);
  assert.ok(variantLeadActions.includes('commercial_window_film_call'), `${pageLabel} call CTAs must retain the commercial call tracking label.`);
  assert.ok(variantLeadActions.includes('commercial_window_film_text'), `${pageLabel} text CTAs must retain the commercial text tracking label.`);
  assert.ok(variantLeadActions.every((action) => action.startsWith('commercial_')), `${pageLabel} CTAs must use commercial-only tracking labels.`);

  for (const anchor of ['solutions', 'process', 'privacy-decorative', 'site-review']) {
    assert.match(html, new RegExp(`\\bid=["']${anchor}["']`, 'i'), `${pageLabel} must retain #${anchor}.`);
  }

  assert.match(metaContent(html, 'robots'), /^noindex\s*,\s*follow$/i, `${pageLabel} must be noindex,follow.`);
  assert.equal(canonicalHref(html), 'https://www.obsidianautoworksoc.com/commercial-window-film', `${pageLabel} must canonicalize to the organic commercial page.`);
  assert.doesNotMatch(visibleText(html), /AI-generated|application visualization|not an Obsidian project|automotive|residential|vehicle|tesla|mobile tint|ceramic tint|square|booking/i, `${pageLabel} must exclude prohibited language.`);
  assert.doesNotMatch(html, squareUrl, `${pageLabel} must not contain a Square URL.`);
  assert.doesNotMatch(html, bookingUrl, `${pageLabel} must not contain a booking URL.`);

  assert.match(devServer, new RegExp(`["']${page.route}["']\\s*:\\s*["']${page.route}["']`), `${pageLabel} local route must resolve.`);
  assert.ok(
    vercel.rewrites.some((rewrite) => rewrite.source === page.route && rewrite.destination === page.route),
    `${pageLabel} must have a production self-rewrite.`
  );
  assert.ok(
    vercel.headers.some((header) => headerCovers(header, page.route) && header.headers.some((item) => (
      item.key.toLowerCase() === 'content-type' && /text\/html/i.test(item.value)
    ))),
    `${pageLabel} must be covered by the production HTML header rule.`
  );
  assert.ok(
    vercel.headers.some((header) => headerCovers(header, page.route) && header.headers.some((item) => (
      item.key.toLowerCase() === 'x-robots-tag' && /^noindex\s*,\s*follow$/i.test(item.value)
    ))),
    `${pageLabel} must be protected by an X-Robots-Tag: noindex, follow header.`
  );
  assert.doesNotMatch(sitemap, new RegExp(`<loc>https:\\/\\/www\\.obsidianautoworksoc\\.com${page.route}<\\/loc>`, 'i'), `${pageLabel} must stay out of the sitemap.`);
}

console.log('commercial window film page contracts passed');
