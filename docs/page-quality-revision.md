# Page quality revision — November 10, 2026

The first release preserved routes and introduced the shared visual system, but generic fallback extraction left many service/vehicle pages with the same content and every inner page used nearly the same composition. Tommy explicitly requested a deeper revision and smoother navigation.

Keep the approved homepage, Film Solutions brand, dark/orange palette, real photography, Instagram entry, all150 URLs and paid experiments. No customer submissions or messages. Do not change Ads or provider delivery.

Rewrite every auto/home/commercial page around its actual question. Service pages explain scope and tradeoffs; vehicle pages distinguish glass/coverage and use exact vehicle photos; guides emphasize comparisons and useful reference information; local pages explain a specific installation-planning scenario without inventing local projects; project URLs are clearly planning worksheets until actual case evidence exists. Do not disguise near-identical pages with word substitutions. Use accurate content rather than an arbitrary word count.

Create maintainable layout families: division hubs, service/coverage pages, vehicle portfolios, editorial guides, service-area briefs, planning worksheets and individual utility directories. Structured optional fields supply comparisons, checklists, steps and highlights. A page's purpose determines its structure, not a random choice. Photos appear when they explain the service or show the actual model; do not recycle the same generic hero on every page.

Navigation must be stable while scrolling, open and close smoothly on mobile, support keyboard focus/Escape, and respect reduced motion. Avoid scroll-dependent layout changes and excessive backdrop repainting.

Verify all150 routes, unique titles/intros/descriptions, repeated paragraphs, useful related-page diversity, meaningful optional modules, mobile/desktop screenshot samples and navbar keyboard behavior. Preserve API/lib hashes, paid assignment and corrected no-offer control pricing. Stage with production guard and verify before promotion.

## Implementation notes

The revised content covers 77 automotive pages and 66 home/commercial pages, alongside seven shared pages. A checkpoint audit found zero repeated intros or descriptions, zero repeated substantive paragraphs, zero near-duplicate article bodies above the configured five-word-shingle threshold, and no related-link set shared by more than four pages. The check is documented as an editorial guard rather than proof of search ranking.

Matched vehicle imagery replaces generic photo fallbacks. Forty portfolio originals have 320px and display WebP derivatives; the display set is 55% smaller and the thumbnail set 95% smaller than the originals. Real originals remain available in the gallery lightbox. Unmatched vehicle illustrations are labeled.

The mobile navigation uses opacity/transform transitions, Escape/focus handling, inert background content and scroll locking. Independent browser review exposed a 16.67px scrollbar removal shift; stable root scrollbar space removed the width and reading-position jump. Desktop header position remained stable while scrolling. Reduced-motion preferences suppress transitions.

Pricing has a phone-width three-column table. City-specific facts and related local links update during ordinary builds; citations show every fact used by the planning notes. Coating and chrome-delete pages retain call/text inquiries instead of routing into a tint-only form. Tint removal passes the supported coverage choice.

The approved homepage, paid experiment assignments and provider-delivery code remain preserved. This revision changes content, shared layouts and navigation. No customer contacts or messages were created by QA.
