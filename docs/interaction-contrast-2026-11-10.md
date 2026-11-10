# Interaction contrast audit — November 10, 2026

Tommy requested a site-wide desktop/mobile state review after the navigation CTA lost its orange background on hover. The baseline was production `dpl_CjazVYKCD5u8H2QAiqS7GqVwz1RF`, source `f38c559`.

## Findings and corrections

- Commercial/office closing-panel “Text us” retained dark text when its hover background changed to dark gray (1.17:1). Late shared paid styles now set an explicit dark background and light foreground for hover, keyboard focus and pressed states.
- Auto/package placeholders measured 3.94:1 and commercial placeholders 3.44:1. Shared quote placeholders now use the readable muted token at full opacity against both field backgrounds.
- Orange keyboard outlines could disappear into orange closing panels. Those panels now use dark focus outlines; surrounding dark surfaces retain the orange outline.
- The commercial supporting paragraph is already dark in the current source; a stale cached local render initially appeared gray. Fresh rendered source confirmed its contrast, so no redundant copy-color override was added.

## Verification

The source inventory covered 205 packaged HTML documents and 12 actual quiz-screen DOM snapshots. Repeated control contexts were deduplicated into 57 representative documents covering 461 distinct stylesheet/ancestor/control combinations. Default, hover, focus, pressed and disabled presentations were rendered at 1440px and 360px: 570 state renders and 28,380 text/placeholder measurements. No remaining measured text failures or visible focus-ring failures in the corrected fixtures.

For deterministic CSS-state testing, fixtures replace pseudo-classes with equal-specificity test classes and strip executable scripts. Selected quiz and gallery states remain in their actual captured markup. Fixtures are not published and are not substitutes for click-through tests. CUA separately exercised auto, package and commercial choices, Next/Back and contact screens on desktop/mobile without contact data or submissions.

Gradient fills were checked separately. Silver gradient buttons retain black text with sufficient contrast. Three old files have white-on-orange gradient CTAs, but `/irvine`, `/newport-beach` and `/tustin` are permanent redirects to the new audited pages; their old HTML is not the public route experience. Photo-overlay controls were visually reviewed; the numeric background check does not claim to measure photographs pixel by pixel.

No quote JavaScript, backend, attribution, ad routing or budgets changed. The normal 150-route structural verifier and paid attribution/delivery regression checks passed. Session evidence, snapshots and fixture generator are retained in the parent `interaction-qa/` directory.
