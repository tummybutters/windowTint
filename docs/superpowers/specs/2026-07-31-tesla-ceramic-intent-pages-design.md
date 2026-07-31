# Tesla and Ceramic Tint Intent Pages Design

## Goal

Create five ad-only landing pages that more closely match high-value Tesla and ceramic-window-tint searches without inventing proof, prices, or service claims.

## Routes

- `/tesla-model-y-window-tint`
- `/tesla-model-3-window-tint`
- `/tesla-cybertruck-window-tint`
- `/mobile-ceramic-window-tint-near-me`
- `/nano-ceramic-window-tint`

## Page Contract

- Use the existing paid-page/VIP visual system: centered hero, call then text then in-page action, and the seven-photo proof wall immediately below the hero.
- Use short, search-matching H1 copy readable by a 12-year-old.
- Keep every page `noindex, nofollow` and absent from the main navigation and sitemap.
- Initialize mobile-tint Ads tag `AW-17846304809` only. Never initialize the ceramic-coating Ads account.
- Load `/lead-tracking.js` and expose unique `data-lead-service`, `data-lead-variant`, and `data-lead-action` values.
- Preserve `gclid`, `wbraid`, `gbraid`, campaign, ad-group, device, phone-click, and text-click persistence through the shared tracker.
- Use `(714) 600-7134`, call-first actions, and a prefilled text that requests vehicle/model, year, city, requested glass, and shade goal.
- Do not expose booking or Square links.
- Do not use Pure, First-Class, or unsupported competitor-film claims.

## Content

### Model Y

- H1: `Tesla Model Y Window Tint`
- Use the three supplied Model Y/Tesla photos.
- Publish the current approved menu: sides and rear `$700`; full car `$950`; panoramic roof add-on `$550` where applicable.
- Emphasize heat, glare, privacy, clean glass continuity, and qualified mobile service.

### Model 3

- H1: `Tesla Model 3 Window Tint`
- Publish the current approved menu: sides and rear `$950`; full car `$1,150`.
- Use supplied Tesla work as general Tesla proof and never label a Model Y photo as a Model 3.

### Cybertruck

- H1: `Cybertruck Window Tint`
- Quote-first only. Do not publish unconfirmed Cybertruck pricing.
- Explain that glass selection, shade, windshield/roof scope, year, and install space determine the quote.
- Use supplied Tesla work as general Tesla proof and label it honestly.

### Mobile Ceramic Near Me

- H1: `Mobile Ceramic Window Tint`
- Emphasize service at a qualified home or workplace, ceramic-film heat rejection, and fast call/text quoting.
- Reuse the real mobile Porsche installation assets and current ceramic package menu.

### Nano Ceramic

- H1: `Nano Ceramic Window Tint`
- Explain heat rejection, UV protection, visibility, shade choice, and mobile installation without claiming a numerical performance rating not present in the approved menu.
- Reuse real ceramic-tint proof and current package pricing.

## Validation

- A contract test must fail before implementation because all five routes are absent.
- Contract tests must verify routes, H1s, tracking identity, call/text order, noindex, no booking/Square links, price rules, photo honesty, and production registration.
- Run `npm run test:tracking` after implementation.
- Verify all pages with Playwright at `390x844` and `1440x1000`, checking screenshots, console errors, CTA visibility, and absence of overlap.
- Deploy the exact pushed commit with the isolated Obsidian Vercel project and verify every production route returns HTTP 200 with the expected canonical/H1.

## Out Of Scope

- Google Ads keyword, ad-group, RSA, bid, budget, network, targeting, asset, and conversion changes.
- Model S or Model X pages.
- Main navigation, sitemap, or organic city-page changes.

