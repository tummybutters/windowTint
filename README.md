# Obsidian website

Static HTML generated from structured content, with the existing Vercel quote APIs retained.

## Everyday changes
- content/pages.json holds page titles, descriptions, sections, FAQs and related links.
- content/reviews.json holds verified Google excerpts and source links.
- content/gallery.json holds real portfolio photos.
- site-builder/components.mjs defines shared header, footer, offer and quote links.
- site-builder/build.mjs defines homepage, directories and page layouts.
- assets/site/style.css and layout.css define the shared visual system.
- Paid experiment HTML and quote behavior live in experiments/ and assets/quote/. assets/paid/ styles those entry points.

Run npm run build to generate 150 pages and package browser assets into public/. Source datasets and build tooling stay outside public output. Local orchestration retains a production-baseline snapshot to verify backend integrity.

## Routes and publishing
site-builder/routing-baseline.json preserves original routing. routes.mjs adds generated routes while retaining explicit original/Driveway assignments and paid-click routing. Keep canonical URLs stable.

Auto uses Obsidian Autoworks. Homes and Commercial use Obsidian Film Solutions with the endorsement. Auto quote links use the existing automotive form, commercial links use the saved-lead commercial quiz, and home links use the verified TintWiz form.

api/ and lib/ retain production quote, CRM and notification behavior. Change content or layout through the builders and content files.

## Evidence
Gallery photos are real portfolio assets. Reviews were read from the Google Business Profile on November 10, 2026. A vehicle image is attributed to a review author only when independently matched. Twenty proposed local case studies became clearly labeled project-planning guides because completed-job facts were unverified.

Run npm run test:site, npm run test:driveway and node scripts/test-presentation-attribution.mjs before release. docs/rollout.md records inherited test limitations and the guarded deployment procedure.
