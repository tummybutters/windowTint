# Obsidian website

Static HTML generated from structured content, with the existing Vercel quote APIs retained.

## Everyday changes
- content/pages.json holds page titles, descriptions, sections, FAQs and related links.
- content/reviews.json holds verified Google excerpts and source links.
- content/gallery.json holds real portfolio photos.
- site-builder/components.mjs defines shared header, footer, offer and quote links.
- site-builder/build.mjs defines the homepage, booking and portfolio. site-builder/page-layouts.mjs defines purpose-specific inner page families.
- assets/site/style.css and layout.css define the shared visual system; page-layouts.css and navigation.css extend it.
- Paid experiment HTML and quote behavior live in experiments/ and assets/quote/. assets/paid/ styles those entry points.

Run npm run build to generate 150 pages and package browser assets into public/. Source datasets and build tooling stay outside public output. Local orchestration retains a production-baseline snapshot to verify backend integrity.

## Routes and publishing
site-builder/routing-baseline.json preserves original routing. routes.mjs adds generated routes while retaining explicit original/Driveway assignments and paid-click routing. Keep canonical URLs stable.

All divisions use Obsidian Film Solutions, as confirmed by Tommy on November 10. Auto quote links use the existing automotive form, commercial links use the saved-lead commercial quiz, and home links use the verified TintWiz form.

api/ and lib/ retain production quote, CRM and notification behavior. Change content or layout through the builders and content files.

## Evidence
Gallery photos are real portfolio assets. Reviews were read from the Google Business Profile on November 10, 2026. A vehicle image is attributed to a review author only when independently matched. Twenty proposed local case studies became clearly labeled project-planning guides because completed-job facts were unverified.

Run npm run test:site, npm run test:driveway and node scripts/test-presentation-attribution.mjs before release. docs/rollout.md records inherited test limitations and the guarded deployment procedure.

## Page quality and content ownership

`content/pages.json` is the canonical editable page source. Each entry preserves a stable path and carries its own title, intro, sections, FAQs and related paths. Optional `comparison`, `steps`, `checklist`, `highlights`, `quotePrompt` and `sources` fields support the actual topic. Hub, service, vehicle, guide, city and project layouts share a theme without sharing a generic article. Use project pages only as clearly labeled planning guides until a real completed job is documented.

`content/media-map.json` records matched portfolio imagery. `content/image-variants.json` maps originals to optimized display and thumbnail files; `site-builder/media.mjs` chooses responsive variants. Run `python3 scripts/optimize-portfolio.py` after deliberately adding gallery originals, then check the output. Do not substitute a similar model when the actual vehicle is missing.

`content/city-context.json` records official location facts and sources. The ordinary build attaches current city facts, planning notes and nearby links. City planning implications are separate from these facts; do not claim an installation, review, permit rule or neighborhood result without evidence.

The two `content/revisions-*.json` files and `site-builder/revise-content.mjs` are a November 10 migration snapshot, not the normal editing workflow. Do not rerun that migration after making new changes in pages.json: it replaces authored entries. Routine updates edit pages.json and run npm run build.

Run `node scripts/audit-page-originality.mjs` to check repeated introductions, descriptions, substantive paragraphs, near-duplicate article bodies and repeated related-link sets. This is an editorial guard, not a ranking promise. Review semantic usefulness and mobile rendering too; word counts alone do not establish quality.
