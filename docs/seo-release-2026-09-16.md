# Obsidian organic SEO release candidate

Prepared September 16, 2026. Production promotion authorized by Tommy on September 17: "lets get this is prod ill do the rest". Deployment receipts are reported separately after verification; this document is not itself proof of a live deployment.
Branch: `codex/obsidian-seo-foundation-20260916`.
Base: `d0ffcd66eb4b7bebe92ed7ba9489852639c0dee6` in `tummybutters/windowTint`.
GitHub main matched this SHA during preparation. Recheck immediately before release.

## Scope

- Analytics decision, September 16: use Google Analytics 4 throughout this rollout. No PostHog integration, SDK, project access or launch dependency. Search Console remains the search/indexing source; existing Google Ads conversion tracking and first-party booking reconciliation remain intact.
- Four new photo-led, full-navigation vehicle guides: Toyota Tacoma, BMW M4, Toyota 4Runner and BMW X3. Existing gallery assets, optimized WebP, lazy secondary imagery and on-demand original-image zoom; no new runtime dependency.
- Contextual text/call CTAs, vehicle-specific editable SMS drafts, mobile safe-area call/text bar and placement-level lead tracking. Booking remains a secondary destination.
- Indexable metadata, self-canonicals, breadcrumb schema, Vercel HTML headers, Services/gallery discovery links and 53 sitemap URLs (49 existing plus four new). Lastmod changed only for pages touched in this release.
- Foundation fixes: eight coating city pages link back to their parent; commercial/residential discovery improved; four tint city pages replace unsupported testimonials with useful appointment content; photo alt text no longer invents local job provenance; California tint-law summary corrected against the official statute.
- No paid-page, price, contact number, booking destination, backend, domain, DNS or provider setting changes. The shared lead tracker now allowlists Google event context, omits customer identifiers/free text, and strips destination query strings and SMS bodies. First-party records remain unchanged. New vehicle-page Google initialization filters query parameters and referrers before configuration.
- Woodbridge and further vehicle/neighborhood pages are NOT included. They need distinct useful content and genuine supporting proof, not city-name substitutions.

## Release File Allowlist

Only stage the following groups explicitly. Never use `git add .` in this checkout.

- Existing pages: `architectural-window-film`, `california-window-tint-law`, `ceramic-coating`, `services`, `window-tinting-gallery`, `irvine`, `newport-beach`, `costa-mesa-windowtinting`, `lake-forest-window-tinting`.
- Existing coating city pages: `ceramic-coating-irvine`, `ceramic-coating-lake-forest`, `ceramic-coating-aliso-viejo`, `ceramic-coating-newport-beach`, `ceramic-coating-costa-mesa`, `ceramic-coating-tustin`, `ceramic-coating-mission-viejo`, `ceramic-coating-laguna-hills`.
- Four new routes: `toyota-tacoma-window-tinting`, `bmw-m4-window-tinting`, `toyota-4runner-window-tinting`, `bmw-x3-window-tinting`.
- Assets/config: `ceramic-coating.css`, `vehicle-pages.css`, `vehicle-pages.js`, `vehicle-analytics.js`, `lead-tracking.js`, `sitemap.xml`, `vercel.json`, `package.json`.
- Scripts: `scripts/generate-ceramic-coating-city-pages.mjs`, `scripts/generate-vehicle-pages.mjs`, `scripts/vehicle-page-data.mjs`, `scripts/test-vehicle-pages.mjs`, `scripts/test-vehicle-analytics.mjs`, `scripts/test-seo-foundation.py`, `scripts/test-lead-tracking.mjs`.
- Documentation: this file and `docs/vehicle-page-preview.md`.

Exclude `node_modules`, `__pycache__`, `.playwright-cli`, `output`, local credentials and all unrelated files. This repo tracks some dependencies; the local install's tracked-file changes were restored. Its untracked installed packages are test tooling, not release assets.

## Verification

Run from this isolated clone:

```sh
npm run generate:vehicles
npm run test:seo
npm run test:tracking
git diff --check
```

- SEO contract suite passed: all 53 canonical pages reachable from home, no sitemap-page link orphans, unique canonical paths, one H1 each, new-page generator parity, image existence, breadcrumb JSON, CTA placement, sitemap inclusion and HTML header configuration.
- Existing tracking/booking regression suite passed with mocked providers, including retries, lead event API, paid funnels, coating/commercial pages, Square webhook adapters/reconciliation and retention.
- Fresh browser pass: Services, gallery and four new pages returned 200, with one H1 and no horizontal overflow at 390 and 1440 pixels. Prior vehicle CTA pass also covered 320 and 760 pixels, dialog/FAQ/navigation and footer clearance.
- Local phone/text event emission was observed with native app launch prevented. Local lead API is mocked. No actual call, text, booking or production analytics receipt was tested.
- Google analytics loader uses the site's existing GA4/Ads IDs on `www.obsidianautoworksoc.com` only. Unit tests verify local/preview suppression for this new loader. This does not change existing pages' analytics behavior.
- No standard site build script exists. These are static generated HTML pages; local checks do not prove a Vercel production deployment will succeed.

## Tommy's Post-Release Checks

1. Confirm access to the Obsidian GA4 property behind `G-TR9ET60HX3` and verify pageview/contact-click receipt in Realtime or DebugView. Use existing Google tracking, not a second analytics provider. Regression tests now assert the shared Google event payload excludes phone/customer identifiers, free text and message bodies, while retaining CTA context and first-party attribution. The four new pages filter pageview URLs/referrers. Existing pages' automatic pageview configuration is unchanged: review GA4 stream data-redaction settings for identity-bearing URL parameters (`phone`, `lead_phone`, `cid`, `conversation_id`, `lead_id`, email/name fields) and enhanced measurement. This is not a site-wide privacy certification. Keep first-party booking reconciliation separate from Google reporting.
2. Confirm Search Console access to the canonical domain property; record a pre-launch 28-day baseline by query, landing page, device and country. Search Console access is not required to serve the pages, but it is needed for the requested indexing checks.
3. Test call and editable SMS composer behavior on real iOS and Android, including the vehicle-specific draft and return-to-browser. Do not send test customer messages or place calls without approval.
4. Production promotion is authorized. Release procedure: recheck remote main; if it moved, reconcile changes without resetting the shared dirty checkout. Commit only the allowlist with the configured signed Webdev identity, review the staged diff, and push the reviewed release through the existing deployment path. Verify the resulting production deployment and public routes before reporting completion.

## Immediately After Deployment

- Verify exact GitHub commit/signature and the matching Vercel production deployment is Ready. Record deployment URL/ID and previous known-good deployment. A provider status alone is not website verification.
- On the public canonical domain, verify four new URLs plus Services/gallery, corrected city/coating pages, existing Tesla guides, paid destinations and booking. Confirm 200 HTML, correct content/canonical, no accidental noindex or X-Robots exclusion, no redirect loops, working photos/CSS/JS, valid breadcrumb JSON and sitemap/robots responses.
- Repeat mobile screenshot/interaction checks, fixed-bar safe area, keyboard menu/dialog/FAQ checks and real-device call/SMS composer checks. Stop before sending or booking unless an approved test is arranged.
- Verify one real `page_view`, `phone_click`, `text_click` and booking-link event in the correct GA4 property using approved test traffic. Confirm canonical page path, service and CTA placement; register event-scoped `service` and `lead_action` custom dimensions if needed for reporting. Check for duplicates, exclude personal information, and separate test traffic. An event delivered to the local mock or a CTA click is not a received lead.
- Review GA4 key-event and Google Ads conversion settings before changing them. Do not import GA4 call/text key events as additional primary Ads conversions while the same clicks already fire direct Ads conversion tags. Treat clicks as contact intent, not confirmed inquiries or booked jobs.
- Compare new pages' network/image weight and mobile performance against comparable existing organic pages. Check field Core Web Vitals once enough real traffic accumulates; do not claim a lab screenshot proves field performance.
- Submit the canonical `https://www.obsidianautoworksoc.com/sitemap.xml` in Search Console. Inspect the four new URLs with Live Test, confirm Google can fetch their content and request indexing once per URL. These checks require account access; they are not completed here.

## Follow-Up Measurement

- First 48 hours: watch for deployment errors, missing assets, route failures and broken contact actions. Investigate technical regressions immediately.
- At 7-14 days: review discovery/indexing state, selected canonical, excluded/duplicate reasons and early query/page impressions. Resolve real technical/content problems; avoid repeatedly resubmitting unchanged URLs.
- Weekly, then at 30 and 60 days: report Search Console impressions/clicks/CTR by page and query, organic visits, CTA clicks, qualified inquiries, booked jobs and attributable revenue where independently recorded. Do not label phone/text clicks as leads or infer completed calls from browser events.
- Expand automotive tint first based on useful query demand and actual inquiry quality. Ceramic coating stays secondary. Avoid simultaneously creating overlapping city/neighborhood/model pages without distinct value and internal hierarchy.

## Rollback

For broken routing, contact behavior, major layout/performance regressions or unintended changes, stop promotion or roll back to the recorded known-good deployment with approval. Prefer a narrowly reviewed revert of the release commit; do not reset the shared working tree or revert unrelated subsequent work. Remove reverted new-page discovery/sitemap entries together, then verify canonical routes and contact flow again. Lack of immediate Google indexing is not by itself a rollback trigger.

## Sources And Limits

- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl): crawling can take days to weeks; requests do not guarantee indexing or rankings.
- [California Vehicle Code 26708](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=VEH&sectionNum=26708.): official source checked for the tint-law summary, not a promise that a particular installation is compliant.

Search Console submission, verified GA4 receipt and end-to-end customer outcomes remain operator checks. This document does not prove a deployment; use the matching GitHub/Vercel and public-route receipts reported after release. PostHog is explicitly out of scope by Tommy's decision.
