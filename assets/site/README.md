# Shared Obsidian design assets

Load `/assets/site/style.css` and defer `/assets/site/interactions.js` on the new website pages. Font files are local. The design follows the selected dark green-black, warm paper and orange panel concept.

## Markup contract

- Header uses `.site-header` containing a `.brand`, a `button.nav-toggle` and `nav.site-nav`. Give the toggle a visible `Menu` label. The script sets `aria-controls`, `aria-expanded` and the accessible name. Navigation remains visible without JavaScript. At mobile sizes the button toggles the menu, Escape closes it and restores focus, and the menu closes after following a link.
- `.brand` contains `.brand-mark` with two empty `span` children, followed by a text wrapper containing `.brand-name`, `.brand-division` and optional `.brand-endorsement`. Set `aria-hidden="true"` on the decorative mark.
- `.container` constrains width. `.section` adds consistent vertical space. Use both on the same element or nest a container inside a full-width section.
- `.hero.hero--home` is the homepage layout, with `.hero-copy` and a `.service-grid`. `.hero.hero--split` contains `.hero-copy` and `.hero-media` for service and city pages. An unmodified `.hero` supports a full-width article header.
- `.service-grid` contains three `.service-card` links. Each card uses an image as a direct child and `.service-card-content` wrapping an optional `.eyebrow`, `h3`, and short `p`. The card image fills its background and the text sits at the bottom.
- `.offer` contains `.offer-copy` and `.offer-media`. `.offer-copy` uses `h2`, supporting copy, `.offer-free`, `.offer-price`, a button and native details for terms. `.offer-free` contains a large `strong` such as FREE, a `span` naming the upgrade, and optional `small` qualification. `.offer-price` can contain a `small` note.
- `.section-heading` holds the title/eyebrow group and optional supporting paragraph. `.split` is a 2-column image/content section.
- `.card-grid` contains `.card` links or articles. `.city-grid` contains simple city links. `.review-grid` contains `.review-card` articles with `.stars`, `blockquote`, `cite` and source anchor.
- `.article-layout` contains `.article` and `.article-nav`. Article navigation is sticky on desktop and stacked on smaller screens. `.faq` uses native `details/summary` with the answer in a `p` or `div`.
- `.quote-panel` is the orange conversion section. `.sticky-quote` contains mobile quote/call links. `.site-footer` contains `.footer-grid` and optional `.footer-bottom`.
- `.button` and `.button-secondary` work on buttons and links. `.actions` or `.hero-actions` wraps multiple CTAs.

## Optional gallery behavior

Wrap a gallery in `[data-gallery]`. Use filter buttons with `data-gallery-filter="all"` or a category value and `aria-pressed`. Items use `data-gallery-category="auto"`, `"home"`, or `"commercial"`; space-delimited categories are supported. Optional `[data-gallery-count]` gets the visible project count. Use a live region on that count if desired.

For photo enlargement, use an ordinary `a[data-lightbox]` whose href points to the full image. Include an img with an accurate alt. Optional `data-caption` supplies the viewer caption. The script creates a native dialog only when needed. Escape, the close button and an outside click close it and restore the trigger focus. Without script or dialog support, the image link remains usable.

## Assets and provenance

- `space-grotesk.woff2` — existing prototype font.
- `home.webp`, `commercial.webp`, `work-home.webp`, `work-commercial.webp`, `auto.webp`, `work-auto.webp` — copies of the original selected concept's existing real-photo assets. Home/commercial source mapping is documented in the October 25 design workbench. Photos establish portfolio imagery only; attach a city or performance specification only with separately verified job evidence.
- `mercedes-amg-gt.webp` — existing finished TintWiz portfolio photo, copied from the November 8 site gallery's `mercedes-amg-gt-01.webp`. October 25 selected-photo metadata records the upload as `tint (complete)` and the car as Mercedes-AMG GT.
- `porsche-driveway.webp` — existing mobile Porsche side photo from the site's paid-landing assets.

All files preserve the original image pixels. No generated studio imagery is included.
