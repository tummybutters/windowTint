# Task 2 report — commercial intent pages and dynamic attribution

## Changes made

- Added `scripts/generate-commercial-window-film-variants.mjs`, a deterministic generator that starts from the current paid commercial shell and writes four extensionless paid-search artifacts:
  - `/commercial-window-tinting-orange-county`
  - `/office-privacy-window-film`
  - `/commercial-heat-glare-window-film`
  - `/storefront-security-window-film`
- Kept the centered hero, below-headline gallery, shared stylesheet, call/text/qualifier order, commercial tracking configuration, noindex canonical, gallery assets, sticky mobile actions, and save-before-SMS flow unchanged.
- Added the approved route-specific metadata, hero copy, solution and process copy, image alt text, CTA copy, direct-SMS prefill, and `data-lead-variant` to every generated artifact.
- Made the shared qualifier derive `landingVariant` from `document.documentElement.dataset.leadVariant`, use it for every qualifier and lead event, and include it in the lead's existing `attribution` JSON payload.
- Added `landing_variant` to the commercial lead normalizer allowlist, so the existing JSONB persistence path retains it without a schema migration.
- Corrected the four stale Task 1 title contracts to the binding approved-spec titles. Route, H1, description, variant, layout, and behavior contracts remain unchanged.

## Verification

- Ran the generator twice; SHA-256 hashes for all four artifacts matched after the second run.
- `node --check scripts/generate-commercial-window-film-variants.mjs`
- `node --check commercial-window-film-qualifier.js`
- `node --check lib/commercial-lead-normalize.js`
- `node scripts/test-commercial-window-film-qualifier.mjs` passed.
- `node scripts/test-commercial-lead-normalize.mjs` passed, including the `landing_variant` persistence regression assertion.
- `node scripts/test-commercial-lead-store.mjs` passed.
- A focused static check passed for all four generated artifacts: approved metadata/H1, variant IDs, noindex canonical, shared CSS/controller, five direct-SMS prefills, and prohibited-content exclusion.

## Expected remaining failure

`node scripts/test-commercial-window-film-pages.mjs` now reaches the Task 3 boundary and fails only because `/commercial-window-tinting-orange-county` has not yet been added to `dev_server.py`. The Task 2 brief explicitly excludes `dev_server.py` and `vercel.json`; Task 3 owns local/production route, HTML-header, and noindex-header wiring.

## Scope preserved

No routing files, deployment configuration, production deployment, Google Ads settings, or external systems were changed.
