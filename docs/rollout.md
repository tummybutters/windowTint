# Full-site rollout

The November 10 build starts from the verified production snapshot in `workbenches/crm-attribution-2026-11-08/release`. A read-only Vercel project check confirmed production `dpl_GQy5GJpyEUSpN2gtup2CSf2CDA6n` was READY. The production project uses the existing Vercel functions, environment, database, quote delivery and TintWiz integration.

## Ownership and routes

The main site owner maintains `content/pages.json`, 150 generated organic pages, the public navigation and routing merge. The paid-page owner maintains both `experiments` arms and the existing `/driveway-package` and `/package` conversion interfaces. Follow the parent workspace `PAID-HANDOFF.md` when integrating their changes.

The existing configuration routes many popular service URLs into `experiments/original/*.html` by default and `experiments/driveway/*.html` for `?experience=driveway`. The generated organic destination must follow both explicit arm conditions. Preserve original paid-route attribution semantics, legacy redirects, public conversion routes and the actual normal entry points. A root HTML edit alone may be bypassed by the rewrite rules.

## Baseline regression results

All 57 checks from the five package suites plus the journey and CRM tests ran individually before the full-site content was generated. Fifty passed. All backend quote, provider delivery, CRM, tracking, city intake, offer validation and Driveway checks passed.

Seven inherited checks failed. `test-call-first-funnel.mjs`, `test-paid-landing-variants.mjs`, `test-search-quote-coverage.mjs`, `test-gallery-proof.mjs` and `test-quote-headline.mjs` inspect old root paid-route files that the current deployment resolves through experiment rewrites. `test-vehicle-pages.mjs` expects exact output from an earlier generator. `test-seo-foundation.py` reads a historical Git object absent from this release snapshot. Original tests remain unmodified. Baseline detail is in `/tmp/obsidian-full-site-baseline-tests.json` for this session.

After implementation run the same suites and investigate every new failure relative to this baseline. Explicitly run `node scripts/test-journey-attribution.mjs` and `node scripts/test-crm-attribution.mjs`. Test browser interactions separately, including both experiment arms, mobile quote steps, empty optional email, detour/resume, Tesla choices, commercial selection and eligible package upgrades. Use mocked final quote responses for browser testing to avoid generating unintended contacts and messages.

## Structural verification

Run `node scripts/verify-full-site.mjs` from the site directory. It checks query-presence matching for ad click IDs, explicit-offer precedence, the 150-page manifest, local routing, one H1, metadata, unique indexable titles, local links/assets, sitemap destinations, existing redirects, experiment routing and byte-for-byte preservation of inherited API/lib files. It fails when any requirement is missing. This check does not judge content accuracy or visual design.

Run `node scripts/verify-full-site.mjs --base-url=https://DEPLOYMENT.vercel.app` after staging. This adds read-only HTTP status, HTML content type, title and noindex checks for all 150 public routes. It catches an X-Robots-Tag leaking from the /generated implementation path onto an indexable public URL. Browser screenshots and interaction checks are separate acceptance requirements.

## Source push

The canonical repository is `https://github.com/tummybutters/windowTint`, default branch `main`. Main currently ends at `680745179a61bfa1aca470a032e2f7bb707605e4` from September 22. The November 8 attribution readback branch changes only a GitHub audit workflow. Current production has runtime changes beyond main.

Create a clean branch `codex/full-site-2026-11-10` from a fresh origin/main checkout. Overlay the verified production snapshot and full-site work while excluding `node_modules`, `.vercel`, credentials, local outputs and Git metadata. Review and commit the inherited runtime differences as deliberate production synchronization. Retain existing repository files unless their removal is necessary and verified. Push the branch with full source history. The existing commercial worktree contains dirty tracked dependency files and should not be reused.

## Deployment helper

The parent `deploy-verified.py` supports `status`, `stage` and `promote`. It reads the existing configuration and Keychain credential through the established release helper without printing the credential. Use `/Library/Frameworks/Python.framework/Versions/3.12/bin/python3`.

`stage` requires the local verifier to pass and the production target to match the verified baseline. It deploys production configuration with domain assignment skipped, records the READY deployment, and captures a source digest. `promote` verifies the source digest, runs staged HTTP checks, rechecks the production target and promotes the exact staged version. It then reads back production. Concurrent source or production changes cause the helper to stop for reconciliation.

Complete browser QA before promotion. After promotion verify the production domain, sample each page type, both experiment arms, forms, assets, sitemap and the correct deployment target. Provider delivery should be claimed only from a separately authorized internal test with exact record and delivery readback. Keep the prior deployment ID for rollback if production verification finds a regression.

## Paid presentation phase

Paid HTML sets `data-presentation-version="paid-design-20261110"`. The journey collector reads this marker for `flow_version` while retaining `journey-v2-20261108` for attribution. All three quote scripts use the captured phase for first-party and Google event labels. Unmarked pages retain `intent-resume-20261108`. Run `node scripts/test-presentation-attribution.mjs`; it verifies marker capture, fallback, quote events and unchanged visit/click fields. Quote normalization, delivery, TintWiz, Driveway and CRM regression checks also passed after this frontend change.

## Final local regression pass

On the completed generated site, 52 of 59 individual checks passed with no newly failing checks. The same seven legacy checks remain incompatible with the current route/generator structure. The SEO foundation check now stops at its historical 53-URL assertion because the sitemap correctly contains 150 entries. The new route-aware full-site verifier and paid presentation test pass. Session evidence is `/tmp/obsidian-full-site-final-tests.json`.
