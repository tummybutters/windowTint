# Internal links and next steps

The November 10 review covers all 150 core pages. Keep the existing visual theme and compact navigation. Links should help the reader make the next decision rather than meet a keyword or link-count quota.

## Editing

`content/pages.json` remains the source for article wording. Four `content/internal-links-*.json` files hold explicit editorial link choices, grouped into Auto, Homes, Commercial and shared pages. Each entry records its page path, review rationale, up to three contextual links, and optional quote label and secondary action.

Each contextual link identifies a zero-based section, an exact unique phrase in that section's body, and another existing core page. Use a meaningful phrase, at most one link per paragraph, and no repeated target within a page's inline links. The renderer escapes content and inserts ordinary HTML links at build time; there is no runtime keyword replacement or additional browser JavaScript.

When changing an annotated sentence, update its annotation in the same edit. Missing phrases, duplicate reviews, self-links and unknown destinations fail the build. Review every new core page explicitly. Do not add arbitrary HTML to article text.

`quoteLabel` changes wording only. `quoteHref` remains the single source for intake destinations, including coverage selections, Tesla model routes, specialty SMS, home TintWiz and the commercial questionnaire. A label must describe the action honestly. The optional secondary action is a quieter informational link next to the primary quote button.

The shared footer contains one pricing shortcut matched to the page division. Service, guide and location directories retain the complete hierarchy; do not repeat all 150 links in the footer. The homepage highlights one guide from each division. Gallery and directory endings now provide a project chooser and a relevant informational alternative; the focused booking chooser stays compact.

## Verification

Run `npm run build`, `npm run test:site` and `node scripts/test-internal-links.mjs`. The internal-link check verifies all annotations in the actual generated HTML, unchanged article wording, established quote destinations and failure on stale annotations. Browser review should cover inline links, long action labels, footer shortcuts, all page families and mobile widths before promotion.

Publishing uses the existing guarded full-site deployment. Confirm its production baseline before staging and retain paid campaigns, experiment routing and lead delivery unchanged.
