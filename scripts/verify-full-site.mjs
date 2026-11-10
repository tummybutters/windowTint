import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendBaseline = JSON.parse(fs.readFileSync(path.join(root,'site-builder/backend-baseline.json'),'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const artifactRoot = config.outputDirectory ? path.resolve(root, config.outputDirectory) : root;
const oldConfig = JSON.parse(fs.readFileSync(path.join(root, 'site-builder/routing-baseline.json'), 'utf8'));
const baseArgument = process.argv.find(value => value.startsWith('--base-url='));
const baseUrl = baseArgument?.slice('--base-url='.length);
const failures = [];
const checks = [];
const fail = message => failures.push(message);
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');


function localFile(route) {
  const relative = decodeURIComponent(route.split('?')[0]).replace(/^\/+/, '');
  const candidates = relative ? [relative, `${relative}.html`, `${relative}/index.html`] : ['index', 'index.html'];
  return candidates.map(candidate => path.join(artifactRoot, candidate)).find(candidate => {
    return candidate.startsWith(`${artifactRoot}${path.sep}`) && fs.existsSync(candidate) && fs.statSync(candidate).isFile();
  });
}

function matches(rule, requested) {
  if (rule.source !== requested.pathname) return false;
  return (rule.has || []).every(condition => {
    if (condition.type !== 'query') return false;
    return condition.value === undefined ? requested.searchParams.has(condition.key) : requested.searchParams.get(condition.key) === condition.value;
  });
}

function resolveRoute(route, seen = new Set()) {
  const requested = new URL(route, 'https://www.obsidianautoworksoc.com');
  if (seen.has(requested.href)) return null;
  seen.add(requested.href);
  const redirect = (config.redirects || []).find(rule => matches(rule, requested));
  if (redirect) return resolveRoute(redirect.destination, seen);
  const rewrite = (config.rewrites || []).find(rule => matches(rule, requested));
  if (rewrite) return localFile(rewrite.destination);
  return localFile(requested.pathname);
}

for (const [relative, expected] of Object.entries(backendBaseline)) {
  const current = path.join(root, relative);
  const actual = fs.existsSync(current) ? crypto.createHash('sha256').update(fs.readFileSync(current)).digest('hex') : null;
  if (actual !== expected) fail('Inherited backend changed: ' + relative);
}
checks.push('Inherited API and lib files compared with the verified November 8 release');
if (artifactRoot !== root) {
  for (const privatePath of ['api','lib','content','site-builder','scripts','docs','node_modules','.vercel','.git']) {
    if (fs.existsSync(path.join(artifactRoot, privatePath))) fail(`Source/private folder exposed in public artifact: ${privatePath}`);
  }
  checks.push('Public artifact excludes internal source and dependency directories');
}
for (const redirect of oldConfig.redirects || []) {
  if (!(config.redirects || []).some(rule => JSON.stringify(rule) === JSON.stringify(redirect))) {
    fail(`Existing redirect changed or disappeared: ${redirect.source}`);
  }
}
for (const rule of oldConfig.rewrites || []) {
  if (!rule.has?.some(condition => condition.key === 'experience')) continue;
  const query = rule.has.map(condition => `${condition.key}=${condition.value}`).join('&');
  const actual = resolveRoute(`${rule.source}?${query}`);
  const expected = localFile(rule.destination);
  if (!expected || actual !== expected) fail(`Experiment route no longer reaches its original destination: ${rule.source}?${query}`);
}
for (const rule of oldConfig.rewrites || []) {
  if (rule.has || !rule.destination.startsWith('/experiments/original/')) continue;
  const actual = resolveRoute(`${rule.source}?experience=original`);
  if (actual !== localFile(rule.destination)) fail(`Explicit original experiment route changed: ${rule.source}`);
}
for (const rule of oldConfig.rewrites || []) {
  if (rule.has || !rule.destination.startsWith('/experiments/original/')) continue;
  for (const query of ['experiment_variant=old_setup', 'gclid=qa-routing-only', 'gbraid=qa-routing-only', 'wbraid=qa-routing-only']) {
    if (resolveRoute(`${rule.source}?${query}`) !== localFile(rule.destination)) fail(`Paid routing changed: ${rule.source}?${query}`);
  }
  const offerRule = (oldConfig.rewrites || []).find(candidate => candidate.source === rule.source && candidate.has?.some(condition => condition.key === 'experience' && condition.value === 'driveway'));
  if (offerRule && resolveRoute(`${rule.source}?experience=driveway&gclid=qa-routing-only`) !== localFile(offerRule.destination)) fail(`Paid click overrides explicit Driveway choice: ${rule.source}`);
}
checks.push('Legacy redirects, both experiment arms, ad identifiers and explicit-offer precedence checked');

const manifestPath = path.join(root, 'content/pages.json');
if (!fs.existsSync(manifestPath)) {
  fail('Missing content/pages.json');
} else {
  const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const pages = Array.isArray(parsed) ? parsed : parsed.pages;
  assert(Array.isArray(pages), 'content/pages.json must contain an array or {pages: []}');
  if (pages.length !== 150) fail(`Expected 150 planned pages, found ${pages.length}`);
  if (new Set(pages.map(page => page.path)).size !== pages.length) fail('Duplicate manifest paths');
  const plannedPaths = new Set(pages.map(page => page.path));
  const pageLinks = new Map();
  const checkedAssets = new Set();
  const titles = new Map();
  for (const page of pages) {
    const generatedRule = (config.rewrites || []).find(rule => rule.source === page.path && !rule.has && rule.destination.startsWith('/generated'));
    const physicalCanonical = generatedRule && localFile(page.path);
    if (physicalCanonical) fail(`Physical canonical file shadows generated rewrite: ${page.path} (${path.relative(artifactRoot, physicalCanonical)})`);
    const filename = resolveRoute(page.path);
    if (!filename) { fail(`Page route does not resolve: ${page.path}`); continue; }
    const document = fs.readFileSync(filename, 'utf8');
    if ((document.match(/<h1\b/gi) || []).length !== 1) fail(`Expected exactly one H1: ${page.path}`);
    const title = document.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    if (!title) fail(`Missing title: ${page.path}`);
    if (/<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*(noindex|none)/i.test(document)) fail(`Planned SEO page has noindex meta: ${page.path}`);
    if (!/<meta\s+[^>]*name=["']description["']/i.test(document)) fail(`Missing meta description: ${page.path}`);
    if (!/<link\s+[^>]*rel=["']canonical["']/i.test(document)) fail(`Missing canonical: ${page.path}`);
    if (title && !/content=["'][^"']*noindex/i.test(document)) {
      if (titles.has(title)) fail(`Duplicate indexable title: ${page.path} and ${titles.get(title)}`);
      titles.set(title, page.path);
    }
    const markup = document.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi, '$1</script>').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
    const links = new Set();
    for (const anchor of markup.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
      try {
        const linked = new URL(decode(anchor[1]), 'https://www.obsidianautoworksoc.com' + page.path);
        const linkedPath = linked.pathname === '/' ? '/' : linked.pathname.replace(/\/$/, '');
        if (linked.origin === 'https://www.obsidianautoworksoc.com' && plannedPaths.has(linkedPath)) links.add(linkedPath);
      } catch { /* Other link protocols do not create site-navigation edges. */ }
    }
    pageLinks.set(page.path, links);
    for (const match of markup.matchAll(/(?:href|src)=["'](\/[^"']*)["']/g)) {
      const target = decode(match[1]);
      if (target.startsWith('//') || target.startsWith('/api/')) continue;
      const pathname = target.split(/[?#]/)[0];
      if (checkedAssets.has(pathname)) continue;
      checkedAssets.add(pathname);
      if (!resolveRoute(pathname)) fail(`Broken local target ${pathname} linked from ${page.path}`);
    }
    if (baseUrl) {
      try {
        const response = await fetch(new URL(page.path, baseUrl), { signal: AbortSignal.timeout(15000) });
        const live = await response.text();
        if (response.status !== 200) fail(`HTTP ${response.status}: ${page.path}`);
        if (!response.headers.get('content-type')?.includes('text/html')) fail(`Expected HTML content type: ${page.path}`);
        if (!(process.env.OBSIDIAN_STAGING_ACCESS && new URL(baseUrl).hostname.endsWith('.vercel.app')) && /noindex|none/i.test(response.headers.get('x-robots-tag') || '')) fail(`Public SEO route has noindex response header: ${page.path}`);
        if (/<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*(noindex|none)/i.test(live)) fail(`Public SEO route has noindex meta: ${page.path}`);
        if (title && !live.includes(title)) fail(`Published title differs from local output: ${page.path}`);
      } catch (error) { fail(`HTTP check failed ${page.path}: ${error.message}`); }
    }
  }
  const reachable = new Set();
  const queue = ['/'];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const linked of pageLinks.get(current) || []) {
      if (!reachable.has(linked)) queue.push(linked);
    }
  }
  for (const pathname of plannedPaths) {
    if (!reachable.has(pathname)) fail(`Page is unreachable through navigation links from the homepage: ${pathname}`);
  }
  checks.push(`${reachable.size} planned pages reachable through real anchor links from the homepage`);
  checks.push(`${pages.length} manifest routes, headings, metadata, titles and local targets checked`);
  if (baseUrl) checks.push(`Read-only HTTP checks against ${new URL(baseUrl).origin}`);
}
for (const match of fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)) {
  const pathname = new URL(match[1]).pathname;
  if (!resolveRoute(pathname)) fail(`Sitemap route does not resolve: ${pathname}`);
}
console.log(JSON.stringify({ passed: failures.length === 0, checks, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
