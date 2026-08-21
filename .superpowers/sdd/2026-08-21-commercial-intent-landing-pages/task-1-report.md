# Task 1 report — failing contracts for commercial intent variants

## Changes made

- Extended `scripts/test-commercial-window-film-pages.mjs` with the four approved paid-search routes, exact lead variants, title/H1 contracts, and description-intent terms.
- Added shared paid-layout, gallery, script, conversion-order, prohibited-language, canonical/noindex, sitemap, local-route, Vercel rewrite, HTML-header, and robots-header contracts for every variant.
- Added a dynamic qualifier-variant contract requiring the current document's `data-lead-variant` to drive tracking instead of a hard-coded control variant.

## RED verification

Command:

```sh
node --check scripts/test-commercial-window-film-pages.mjs && node scripts/test-commercial-window-film-pages.mjs
```

Result: expected failure (`ERR_ASSERTION`) with these missing implementation conditions:

- Static artifacts missing for `/commercial-window-tinting-orange-county`, `/office-privacy-window-film`, `/commercial-heat-glare-window-film`, and `/storefront-security-window-film`.
- Qualifier does not read `document.documentElement.dataset.leadVariant`.
- Qualifier tracking does not use the landing-page variant and still hard-codes `commercial_socal_v1`.

`git diff --check -- scripts/test-commercial-window-film-pages.mjs` passed. No production code was changed.
