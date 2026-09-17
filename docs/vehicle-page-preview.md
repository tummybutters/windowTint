# Vehicle guide release candidate

Release candidate prepared September 16, 2026; production promotion authorized September 17. See `seo-release-2026-09-16.md` for scope and follow-up checks. Deployment verification is reported separately.

## Design

Use the existing paid-page brand, button, color, and image assets without copying the paid funnel. These are ordinary site destinations with full navigation, breadcrumbs, coverage comparisons, model-specific quote questions, FAQs, location links, related vehicles, and the existing booking destination.

The compact editorial header leads into a photo strip with thin white frames. Original images open in a keyboard-dismissable native dialog. Optimized WebP images are reused for the page; full-size JPEGs are requested only when opened. Related imagery and non-primary photos are lazy loaded. New styles are scoped to the vehicle guide classes. Paid-page source files are unchanged; existing organic-page foundation changes are listed in the release checklist.

No framework migration or new dependency. The site's existing static generation pattern is used:

Call/text-first CTA pass: introduction and closing actions prioritize text quotes and calls; coverage offers contextual text help; the desktop navigation offers text contact. Booking remains a secondary option. On mobile, a fixed two-action bar reserves footer clearance and safe-area padding. SMS links include the vehicle name and editable year/city/window prompts; they only open a draft and never automatically send it.

The existing lead tracker receives unique `data-lead-action` values for navigation, introduction, coverage, closing, and sticky placements. Browser QA verified one `phone_click` and one `text_click` for the sticky actions, including page path and service, with native phone/SMS launch prevented. These are local click events, not verified GA4 receipt, received inquiries, or bookings. Actual iOS/Android composer behavior still needs device verification.

```sh
node scripts/generate-vehicle-pages.mjs
node scripts/test-vehicle-pages.mjs
node --check vehicle-pages.js
```

## Local destinations

- `/toyota-tacoma-window-tinting`
- `/bmw-m4-window-tinting`
- `/toyota-4runner-window-tinting`
- `/bmw-x3-window-tinting`

The preview server uses the existing extensionless handler, bound only to 127.0.0.1 on port 5186. It mocks the local lead-event endpoint as existing dev tooling does; this is not proof of production event receipt.

## Verification

- All four routes returned HTTP 200 with one H1 and no horizontal document overflow at 1440, 390, and 320 CSS pixels.
- Gallery and related images loaded after scrolling in the 12 page/viewport combinations. Screenshots are under `output/playwright/`.
- Mobile navigation, photo opening, Escape dismissal, focus restoration, and FAQ expansion passed on the X3 preview. Its 21 unique local destinations returned HTTP 200.
- Generator parity/assets/release-gate tests and JavaScript syntax checks passed. No full-site production build or provider verification is claimed.
- CTA pass: all four routes checked at 320, 390, 760, and 1440 pixels. Mobile bar appears only at mobile widths, touch targets are at least 44px tall, text fits, and the footer clears the fixed bar. Vehicle-specific SMS drafts and placement tags passed generation tests.

## Release gates

- All four candidate pages are `index, follow`, included in the sitemap, linked from Services and the gallery, and have explicit Vercel HTML headers.
- Confirm gallery usage and any job-specific facts before adding film, year, location, shade, warranty, compatibility, or performance claims. Current copy avoids asserting these unknown facts.
- Analytics decision: Google Analytics 4 only; no PostHog integration or access requirement. Keep Search Console for indexing and search performance, and preserve existing Google Ads conversion tracking. The shared lead tracker is included without a paid-landing variant. Production GA4 receipt remains to be verified.
- The earlier foundation fixes are included and checked by `npm run test:seo`. Tracking and booking regression tests pass with mocked providers; this is not a live booking or analytics delivery test.
- Existing Google analytics IDs are loaded only on the canonical production hostname. Local and preview Google traffic is suppressed by the new vehicle loader. GA4 property access and privacy-safe event delivery are the analytics launch checks.
- Woodbridge and the other neighborhoods are still briefs, not fabricated local job pages.
