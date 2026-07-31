# Paid Search Intent Pages Design

## Goal

Create eight paid-search destinations across window tinting and ceramic coating, with each page matching a distinct search intent while preserving one call-first conversion and attribution contract.

## Page Set

### Window tint

1. `/mobile-window-tinting-near-me`
2. `/tesla-tint-quote`
3. `/windshield-ceramic-tint`
4. `/ceramic-window-tint-pricing`

### Ceramic coating

5. `/ceramic-coating`
6. `/ceramic-coating-cost-paint-correction`
7. `/ceramic-coating-irvine`
8. `/luxury-ev-ceramic-coating`

## Shared Experience

The seven new pages reuse `paid-landing.css` and the existing paid-page structure:

- The exact `/vip-booking` hero composition: a centered offer tag, centered headline, centered supporting copy, and centered call/text CTA row on a dark stage
- A three-image real-vehicle strip immediately beneath the hero, spanning the page width with the same overlapping, bordered photo-deck character as `/vip-booking`
- Call as the primary action
- Prefilled text as the secondary action
- Proof strip, service/package section, process, FAQ, and final CTA
- Fixed call/text controls on mobile
- No booking or Square links
- `noindex, nofollow` while the pages are paid-search experiments

Each page changes the headline, proof image, offer details, FAQ, CTA wording, and tracking variant. Exact- and phrase-match versions of the same intent use the same destination.

The VIP hero is a visual contract, not loose inspiration. Paid variants must not use a left-aligned headline over a full-bleed background image, a cream hero, or a split hero. The intent-specific sections below the photo strip remain in place and inherit the VIP page's black, white, silver, and sunset-orange visual language.

## Tracking Boundaries

Tint pages use Google Ads account `AW-17846304809` with:

- Website phone click label `GVSvCK39u70cEKmA5L1C`
- Website text click label `CyqpCMPso9kcEKmA5L1C`

Coating pages explicitly configure Google Ads account `AW-18301955625` with:

- Website phone click label `BU5VCLCasNkcEKnchpdE`
- Website text click label `qbmnCLOasNkcEKnchpdE`

Every page identifies `data-lead-service` and `data-lead-variant`. The shared tracker persists click IDs and campaign context, records an attributed `paid_landing_page_view`, and carries `service`, `landing_variant`, and `lead_action` through GA4 and `/api/lead-events` for each phone or text action.

## Offer Rules

Tint pricing must match the current published Obsidian menu.

The coating cost page may use the campaign's approved starting-price ladder:

- One-year coating with paint enhancement from `$550`
- Five-year coating with paint enhancement from `$700`
- Level 2 correction and five-year coating from `$900`

Every coating price is labeled "from" and requires paint-condition confirmation.

The luxury/EV page serves Tesla, BMW, Porsche, Audi, and similar searches as one shared experience until a brand has enough clicks to justify its own page.

## Verification

Contract tests validate routes, tracking account isolation, CTA ordering, prohibited links/copy, required intent language, price claims, and real image assets. Playwright checks all seven paid routes plus the general coating page at mobile and desktop sizes for layout, media loading, CTA behavior, and console errors.
