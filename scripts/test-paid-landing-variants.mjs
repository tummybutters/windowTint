import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

const readOptional = async (path) => {
  try {
    return await readFile(new URL(path, root), 'utf8');
  } catch {
    return '';
  }
};

const tesla = await readOptional('tesla-tint-quote');
const nearMe = await readOptional('mobile-window-tinting-near-me');
const windshield = await readOptional('windshield-ceramic-tint');
const ceramicTintPricing = await readOptional('ceramic-window-tint-pricing');
const coatingGeneral = await readOptional('ceramic-coating');
const coatingCost = await readOptional('ceramic-coating-cost-paint-correction');
const coatingIrvine = await readOptional('ceramic-coating-irvine');
const coatingLuxury = await readOptional('luxury-ev-ceramic-coating');
const css = await readOptional('paid-landing.css');
const devServer = await readFile(new URL('dev_server.py', root), 'utf8');
const vercel = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));

assert.ok(tesla, 'The Tesla paid-search variant must exist.');
assert.ok(nearMe, 'The near-me mobile paid-search variant must exist.');
assert.ok(windshield, 'The windshield paid-search variant must exist.');
assert.ok(ceramicTintPricing, 'The ceramic-tint pricing variant must exist.');
assert.ok(coatingGeneral, 'The general ceramic-coating page must exist.');
assert.ok(coatingCost, 'The coating cost and correction variant must exist.');
assert.ok(coatingIrvine, 'The Irvine coating variant must exist.');
assert.ok(coatingLuxury, 'The luxury and EV coating variant must exist.');
assert.ok(css, 'The paid-search variants need a shared stylesheet.');

const squarePattern = /(?:app\.squareup\.com|book\.squareup\.com|squareup\.com\/appointments|square\.site\/appointments)/i;
const prohibitedBrandPattern = /\b(?:Pure|First[- ]Class)\b/i;
const bookingPattern = /href="\/(?:vip-)?booking(?:[?#"])/i;

const paidVariants = [
  ['Tesla', tesla, 'tesla_tint', 'tesla_action_v1', 'tesla-tint-quote'],
  ['near-me mobile', nearMe, 'mobile_tint', 'near_me_mobile_v1', 'mobile-window-tinting-near-me'],
  ['windshield', windshield, 'windshield_tint', 'windshield_action_v1', 'windshield-ceramic-tint'],
  ['ceramic-tint pricing', ceramicTintPricing, 'ceramic_tint', 'ceramic_pricing_v1', 'ceramic-window-tint-pricing'],
  ['coating cost', coatingCost, 'ceramic_coating', 'coating_cost_correction_v1', 'ceramic-coating-cost-paint-correction'],
  ['Irvine coating', coatingIrvine, 'ceramic_coating', 'coating_irvine_v1', 'ceramic-coating-irvine'],
  ['luxury and EV coating', coatingLuxury, 'ceramic_coating', 'coating_luxury_ev_v1', 'luxury-ev-ceramic-coating']
];

for (const [name, page, service, variant, route] of paidVariants) {
  assert.match(page, new RegExp(`<html[^>]+data-lead-service="${service}"`), `${name} must identify its lead service.`);
  assert.match(page, new RegExp(`<html[^>]+data-lead-variant="${variant}"`), `${name} must identify its experiment variant.`);
  assert.match(page, /<meta name="robots" content="noindex, nofollow">/, `${name} must remain outside organic indexing.`);
  assert.match(page, /<script src="\/lead-tracking\.js" defer><\/script>/, `${name} must use the shared attribution tracker.`);
  assert.match(page, /<link rel="stylesheet" href="\/paid-landing\.css/, `${name} must use the shared paid-landing stylesheet.`);
  assert.match(page, /class="paid-hero paid-hero--vip"/, `${name} must use the exact VIP hero shell.`);
  assert.match(
    page,
    /class="paid-shell paid-hero__content paid-hero__content--centered"/,
    `${name} hero content must be centered like the VIP page.`
  );
  assert.match(page, /<section class="paid-hero-strip"/, `${name} must place the photo deck directly under the hero.`);
  assert.equal(
    (page.match(/class="paid-hero-strip__item/g) || []).length,
    7,
    `${name} must use the full seven-photo VIP wall.`
  );
  assert.match(page, /data-hero-tertiary/, `${name} must include an intent-specific third hero action.`);
  assert.match(page, /class="paid-hero-strip__reviewer"/, `${name} photo wall must include proof labels.`);
  assert.doesNotMatch(
    page,
    /class="paid-hero__media"/,
    `${name} must not revert to a left-aligned background-image hero.`
  );
  assert.doesNotMatch(page, squarePattern, `${name} must not expose Square.`);
  assert.doesNotMatch(page, bookingPattern, `${name} must not route paid traffic to booking.`);
  assert.doesNotMatch(page, prohibitedBrandPattern, `${name} must not contain stale customer-facing brands.`);

  const heroCall = page.indexOf('data-hero-primary');
  const heroText = page.indexOf('data-hero-secondary');
  const heroTertiary = page.indexOf('data-hero-tertiary');
  const finalCall = page.indexOf('data-cta-primary');
  const finalText = page.indexOf('data-cta-secondary');

  assert.ok(heroCall >= 0 && heroCall < heroText, `${name} hero actions must be ordered call, then text.`);
  assert.ok(heroText < heroTertiary, `${name} in-page hero action must follow call and text.`);
  assert.ok(finalCall >= 0 && finalCall < finalText, `${name} final actions must be ordered call, then text.`);
  assert.match(page, /href="tel:7146007134"/, `${name} must use the approved call number.`);
  assert.match(page, /href="sms:\+17146007134\?body=/, `${name} must provide a prefilled text action.`);
  assert.match(devServer, new RegExp(`"\\/${route}": "\\/${route}"`), `${name} must be registered in the local server.`);
  assert.ok(
    vercel.headers.some((header) => header.source.includes(route)),
    `${name} must be covered by the production HTML content-type rule.`
  );
}

for (const [name, page] of [
  ['Tesla', tesla],
  ['near-me mobile', nearMe],
  ['windshield', windshield],
  ['ceramic-tint pricing', ceramicTintPricing]
]) {
  assert.match(page, /AW-17846304809/, `${name} must initialize the mobile-tint Ads account.`);
  assert.doesNotMatch(page, /AW-18301955625/, `${name} must not initialize the coating Ads account.`);
}

for (const [name, page] of [
  ['general coating', coatingGeneral],
  ['coating cost', coatingCost],
  ['Irvine coating', coatingIrvine],
  ['luxury and EV coating', coatingLuxury]
]) {
  assert.match(page, /id: 'AW-18301955625'/, `${name} must initialize the coating Ads account.`);
  assert.match(page, /phone_click: 'BU5VCLCasNkcEKnchpdE'/, `${name} must use the coating phone-click action.`);
  assert.match(page, /text_click: 'qbmnCLOasNkcEKnchpdE'/, `${name} must use the coating text-click action.`);
  assert.doesNotMatch(page, /AW-17846304809/, `${name} must not initialize the mobile-tint Ads account.`);
}

assert.match(
  coatingGeneral,
  /<html[^>]+data-lead-service="ceramic_coating"[^>]+data-lead-variant="coating_general_v1"/,
  'The general coating page must identify its baseline variant.'
);

for (const asset of [
  'assets/paid-landing/tesla-model-y-front.webp',
  'assets/paid-landing/tesla-model-y-rear.webp',
  'assets/paid-landing/tesla-glass-roof.webp'
]) {
  assert.match(tesla, new RegExp(asset.replaceAll('/', '\\/')), `Tesla must reference ${asset}.`);
  await access(new URL(asset, root));
}

for (const asset of [
  'assets/paid-landing/mobile-porsche-front.webp',
  'assets/paid-landing/mobile-porsche-rear.webp',
  'assets/paid-landing/mobile-porsche-side.webp'
]) {
  assert.match(nearMe, new RegExp(asset.replaceAll('/', '\\/')), `Near-me mobile must reference ${asset}.`);
  await access(new URL(asset, root));
}

assert.match(tesla, /Model Y Sides &amp; Rear[\s\S]*\$700/, 'Tesla must expose the current Model Y sides-and-rear price.');
assert.match(tesla, /Model 3 Sides &amp; Rear[\s\S]*\$950/, 'Tesla must expose the current Model 3 sides-and-rear price.');
assert.match(tesla, /Model S Sides &amp; Rear[\s\S]*\$600/, 'Tesla must expose the current Model S sides-and-rear price.');
assert.match(tesla, /Panoramic Roof Add-On[\s\S]*\$550/, 'Tesla must expose the current panoramic-roof add-on price.');

assert.match(nearMe, /Orange County/i, 'Near-me mobile must set the local service area.');
assert.match(nearMe, /driveway|garage/i, 'Near-me mobile must qualify the install location.');
assert.match(nearMe, /weather/i, 'Near-me mobile must explain weather qualification.');
assert.match(nearMe, /vehicle, city, and shade/i, 'Near-me mobile text CTA must request useful quote details.');

assert.match(windshield, /Windshield/i, 'Windshield page must match windshield intent.');
assert.match(windshield, /\$220/, 'Windshield page must expose the current sedan/coupe price.');
assert.match(windshield, /\$250/, 'Windshield page must expose the current truck/SUV price.');
assert.match(windshield, /California/i, 'Windshield page must explain California legality qualification.');

assert.match(ceramicTintPricing, /Ceramic Tint/i, 'Ceramic pricing page must match ceramic-tint intent.');
assert.match(ceramicTintPricing, /\$200/, 'Ceramic pricing page must expose the front-two starting price.');
assert.match(ceramicTintPricing, /\$500/, 'Ceramic pricing page must expose the sides-and-rear starting price.');
assert.match(ceramicTintPricing, /\$720/, 'Ceramic pricing page must expose the full-car starting price.');
assert.match(ceramicTintPricing, /heat rejection/i, 'Ceramic pricing page must connect price to ceramic-film value.');

assert.match(coatingCost, /Paint Correction/i, 'Coating cost page must match correction intent.');
assert.match(coatingCost, /\$550/, 'Coating cost page must expose the one-year starting price.');
assert.match(coatingCost, /\$700/, 'Coating cost page must expose the five-year starting price.');
assert.match(coatingCost, /\$900/, 'Coating cost page must expose the Level 2 starting price.');
assert.match(coatingCost, /paint condition/i, 'Coating cost page must qualify prices by paint condition.');

assert.match(coatingIrvine, /Irvine/g, 'Irvine coating page must consistently match local intent.');
assert.match(coatingIrvine, /mobile service/i, 'Irvine coating page must explain local mobile service.');

for (const brand of ['Tesla', 'BMW', 'Porsche', 'Audi']) {
  assert.match(coatingLuxury, new RegExp(brand), `Luxury and EV page must address ${brand} intent.`);
}

assert.match(css, /\.paid-hero/, 'Shared CSS must define the photographic hero.');
assert.match(css, /\.paid-mobile-actions/, 'Shared CSS must define fixed mobile actions.');
assert.match(css, /prefers-reduced-motion/, 'Shared CSS must respect reduced-motion preferences.');

console.log('paid landing variant contract test passed');
