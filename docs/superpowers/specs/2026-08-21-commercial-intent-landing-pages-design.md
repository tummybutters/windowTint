# Commercial Intent Landing Pages Design

## Goal

Add four paid-search landing pages that preserve the current `/commercial-window-film-socal` visual system and conversion flow while matching the language and intent of four commercial Google Ads ad groups.

## Routes and intent

| Route | Search intent | Lead variant |
|---|---|---|
| `/commercial-window-tinting-orange-county` | General commercial window tinting in Orange County | `commercial_tint_oc_v1` |
| `/office-privacy-window-film` | Office privacy and frosted glass film | `office_privacy_frost_v1` |
| `/commercial-heat-glare-window-film` | Commercial solar, heat, and glare control film | `commercial_solar_glare_v1` |
| `/storefront-security-window-film` | Storefront safety and security window film | `storefront_security_v1` |

## Shared design and behavior

Every page must reuse the current paid commercial page's:

- centered hero and image gallery below the H1;
- navigation, spacing, typography, color, responsive behavior, and shared CSS;
- three-image gallery in the same order, with only the authentic office image labeled as a real Obsidian project;
- solution cards, process, intent-specific callout, site-review quiz, final CTA, and sticky mobile controls;
- call-first, text-second, quiz-third conversion hierarchy;
- phone number `(714) 600-7134`, commercial-only tracking semantics, Google Ads account configuration, qualified-call configuration, Neon lead save, and save-before-SMS behavior.

No page may display internal labels such as `AI-generated`, `application visualization`, or `not an Obsidian project`. No page may contain automotive, residential, Square, or booking language.

## Search relevance

Each variant receives unique title, description, overline, H1, hero paragraph, solution headings and supporting copy, image alt text, direct-SMS prefill, and `data-lead-variant`. Copy must be specific and useful without unverifiable performance claims or keyword stuffing.

### Approved hero and metadata copy

| Route | Title | Description | Overline | H1 | Hero paragraph |
|---|---|---|---|---|---|
| `/commercial-window-tinting-orange-county` | `Commercial Window Tinting Orange County | Obsidian` | `Commercial window tinting for Orange County offices, storefronts, and building glass. Request a site review for heat, glare, privacy, UV, or safety goals.` | `Orange County commercial tinting` | `Commercial Window Tinting <span>in Orange County</span>` | `For offices, storefronts, and building glass, start with the problem the film needs to solve. We review sun exposure, glass, access, sightlines, and project goals before recommending a direction.` |
| `/office-privacy-window-film` | `Office Privacy Window Film Orange County | Obsidian` | `Office privacy and frosted window film for Orange County conference rooms, partitions, entries, and glass walls. Request a site review tailored to your space.` | `Office privacy / frosted glass` | `Office Privacy Window Film <span>in Orange County</span>` | `Privacy film can define rooms, soften direct sightlines, and preserve a more open feel. We review the glass, viewing angles, daylight, finish, and access before selecting a film direction.` |
| `/commercial-heat-glare-window-film` | `Commercial Heat & Glare Film Orange County | Obsidian` | `Commercial heat and glare window film for Orange County offices and storefronts. Review sun-exposed glass, comfort, screen glare, and fade concerns.` | `Solar control for commercial glass` | `Commercial Heat & Glare Window Film <span>in Orange County</span>` | `When sun-facing glass makes rooms uncomfortable or screens hard to use, the right starting point is the affected elevation. We review exposure, glazing, use of the space, and desired appearance before discussing film options.` |
| `/storefront-security-window-film` | `Storefront Security Film Orange County | Obsidian` | `Storefront safety and security window film for Orange County retail and commercial glass. Request a site review for entry, display, and ground-level glass.` | `Storefront safety / security film` | `Storefront Security Window Film <span>in Orange County</span>` | `For entry, display, and ground-level storefront glass, the conversation starts with the glass, frame, access, and protection goal. We review the site before recommending a safety or security-film direction.` |

### Approved section themes

- Commercial tinting: `Commercial window tinting starts with the glass you have.` Cards cover heat and glare, privacy and appearance, UV/fade concerns, and safety/security intent. Intent callout: `A site review is where scope becomes clear.`
- Office privacy: `Privacy can be clear in intent without closing off the room.` Cards cover conference rooms, interior partitions, entry glass, and daylight/sightlines. Intent callout: `Review every view before selecting a finish.`
- Heat and glare: `Find the windows causing the heat or glare.` Cards cover sun-facing glass, screen glare, occupant comfort, and interiors exposed to sun. Intent callout: `Review exposure before choosing solar-control film.`
- Storefront security: `Start with the glass customers and staff use every day.` Cards cover entry/display glass, safety versus security intent, glass-retention goals, and frame/access conditions. Intent callout: `Security film requires a site-specific conversation.`

### Approved direct-SMS prefills

- Commercial tinting: `Hi Obsidian Autoworks, I'd like a commercial window tinting site review in Orange County.\nProperty city:\nProperty type:\nPrimary issue (heat, glare, privacy, UV, safety):\nPhotos / rough measurements:`
- Office privacy: `Hi Obsidian Autoworks, I'd like office privacy or frosted window film.\nProperty city:\nGlass area (conference room, entry, partition, exterior):\nPrivacy goal:\nPhotos / rough measurements:`
- Heat and glare: `Hi Obsidian Autoworks, I'd like commercial heat and glare window film.\nProperty city:\nSun-facing area / room:\nMain issue (heat, glare, fading, screen visibility):\nPhotos / rough measurements:`
- Storefront security: `Hi Obsidian Autoworks, I'd like storefront safety or security window film.\nProperty city:\nGlass area (entry, display, ground-level storefront):\nPrimary concern:\nPhotos / rough measurements:`

The four pages are paid-search destinations, not new organic doorway pages. Each must use `noindex,follow`, canonicalize to `/commercial-window-film`, stay out of `sitemap.xml`, and receive the same production `X-Robots-Tag` protection as the existing paid page.

## Attribution

The qualifier controller must derive `landing_variant` from the current document's `data-lead-variant` instead of hard-coding `commercial_socal_v1`. The saved commercial lead payload must carry that variant through the existing endpoint when supported by the current normalizer/store contract; if persistence requires a backwards-compatible normalizer/store addition, add it with tests and no migration that threatens existing records.

## Delivery boundary

Implement, test, and prepare the routes locally. Do not deploy, push, change Google Ads destinations, or mutate production systems in this task.
