import assert from 'node:assert/strict';
import {escape as e} from './components.mjs';

// Editorial choices are explicit; never auto-link a keyword across every page.
export function attachInternalLinks(pages, plans) {
  const byPath = new Map(pages.map(page => [page.path, page]));
  const reviewed = new Set();
  for (const plan of plans) {
    const page = byPath.get(plan.path);
    assert(page, `Unknown reviewed page: ${plan.path}`);
    assert(!reviewed.has(plan.path), `Duplicate link review: ${plan.path}`);
    reviewed.add(plan.path);
    assert(plan.note?.trim(), `Missing review rationale: ${plan.path}`);
    assert(Array.isArray(plan.links) && plan.links.length <= 3, `Too many contextual links: ${plan.path}`);
    const destinations = new Set();
    const paragraphs = new Set();
    for (const link of plan.links) {
      const body = page.sections?.[link.section]?.body;
      assert(typeof body === 'string' && Number.isInteger(link.section), `Unknown section: ${plan.path}`);
      assert(link.anchor?.trim() === link.anchor && link.anchor.length >= 3, `Invalid anchor: ${plan.path}`);
      assert(body.split(link.anchor).length === 2, `Anchor must appear exactly once: ${plan.path} / ${link.anchor}`);
      const paragraph = body.split(/\n\n/).findIndex(text => text.includes(link.anchor));
      assert(paragraph >= 0, `Anchor crosses paragraphs: ${plan.path}`);
      const key = `${link.section}:${paragraph}`;
      assert(!paragraphs.has(key), `More than one link in a paragraph: ${plan.path}`);
      assert(byPath.has(link.href) && link.href !== page.path, `Invalid or self destination: ${plan.path} -> ${link.href}`);
      assert(!destinations.has(link.href), `Repeated contextual destination: ${plan.path}`);
      paragraphs.add(key);
      destinations.add(link.href);
    }
    if (plan.quoteLabel) assert(plan.quoteLabel.length <= 48, `Quote label too long: ${plan.path}`);
    if (plan.secondary) {
      assert(byPath.has(plan.secondary.href) && plan.secondary.href !== page.path, `Invalid secondary destination: ${plan.path}`);
      assert(plan.secondary.label?.trim() && plan.secondary.label.length <= 48, `Invalid secondary label: ${plan.path}`);
    }
    page.linkPlan = plan;
  }
  assert.equal(reviewed.size, pages.length, 'Every core page needs an internal-link review');
}

export function linkedParagraphs(body, links = []) {
  return String(body || '').split(/\n\n/).map(text => {
    const link = links.find(item => text.includes(item.anchor));
    if (!link) return `<p>${e(text)}</p>`;
    const start = text.indexOf(link.anchor);
    return `<p>${e(text.slice(0, start))}<a class="context-link" href="${e(link.href)}">${e(link.anchor)}</a>${e(text.slice(start + link.anchor.length))}</p>`;
  }).join('');
}
