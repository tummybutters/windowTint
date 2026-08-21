# Task 3 — Routes and local build verification

## Delivered

- Added local extensionless route mappings in `dev_server.py` for:
  - `/commercial-window-tinting-orange-county`
  - `/office-privacy-window-film`
  - `/commercial-heat-glare-window-film`
  - `/storefront-security-window-film`
- Added matching Vercel self-rewrites.
- Added all four routes to the existing production HTML `Content-Type` rule.
- Extended the existing paid-commercial `X-Robots-Tag: noindex, follow` header rule to cover all four routes.
- Left `sitemap.xml` and `commercial-window-film.css` unchanged.

## Verification

| Check | Result |
| --- | --- |
| `node scripts/test-commercial-window-film-pages.mjs` | Passed |
| `node scripts/test-commercial-window-film-qualifier.mjs` | Passed |
| `node scripts/test-commercial-lead-normalize.mjs` | Passed |
| `node scripts/test-commercial-lead-store.mjs` | Passed |
| `npm run test:tracking` | Passed (complete repository tracking suite) |
| `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` | Passed |
| `python3 -m py_compile dev_server.py` | Passed |
| `git diff --check -- dev_server.py vercel.json` | Passed |
| `git diff --exit-code -- sitemap.xml commercial-window-film.css` | Passed (both unchanged) |

## Local route checks

Started `python3 dev_server.py` on port 5173 and read every route over HTTP. Each page returned `200` with `text/html; charset=utf-8`, its approved title and H1, the `/commercial-window-film` canonical, `noindex,follow` robots metadata, both tracking scripts, the shared commercial stylesheet, and `200` responses for the stylesheet, lead-tracking controller, qualifier controller, and real-project photo asset.

## Visual checks

Desktop and mobile full-page captures were produced for each route. The desktop comparison against `/commercial-window-film-socal` and the mobile comparison confirm the preserved centered hero, call/text/qualifier hierarchy, gallery below the hero, shared dark visual system, and sticky mobile actions. Only intent-specific copy changes.

- `output/playwright/commercial-intent-pages-2026-08-21/commercial-tint-desktop.png`
- `output/playwright/commercial-intent-pages-2026-08-21/commercial-tint-mobile.png`
- `output/playwright/commercial-intent-pages-2026-08-21/office-privacy-desktop.png`
- `output/playwright/commercial-intent-pages-2026-08-21/office-privacy-mobile.png`
- `output/playwright/commercial-intent-pages-2026-08-21/heat-glare-desktop.png`
- `output/playwright/commercial-intent-pages-2026-08-21/heat-glare-mobile.png`
- `output/playwright/commercial-intent-pages-2026-08-21/storefront-security-desktop.png`
- `output/playwright/commercial-intent-pages-2026-08-21/storefront-security-mobile.png`
- `output/playwright/commercial-intent-pages-2026-08-21/control-desktop.png`
- `output/playwright/commercial-intent-pages-2026-08-21/control-mobile.png`
- `output/playwright/commercial-intent-pages-2026-08-21/desktop-top-comparison.png`
- `output/playwright/commercial-intent-pages-2026-08-21/mobile-top-comparison.png`

The `output/` screenshots are ignored and are not part of the commit.

## Delivery boundary

No deployment, push, Google Ads change, or other production mutation was performed.
