# Obsidian Commercial Window Film Launch Design

**Date:** 2026-08-08

**Status:** Approved for implementation planning

**Website:** `https://www.obsidianautoworksoc.com`

**Google Ads customer:** `8605345590`

**Approved launch budget:** `$25/day`

## Objective

Launch a separate commercial architectural-window-film acquisition lane for Obsidian Autoworks. The website and campaign must attract property owners, facility managers, contractors, and other commercial decision-makers without mixing residential or automotive traffic into the campaign.

The launch is successful when both website pages are live, the commercial campaign is configured and read back through the Google Ads API, conversion signals are isolated from the existing automotive and residential campaigns, and Google can review the new ads without a serving gap or an unverified destination.

## Source of Truth

Implementation starts from commit `c50817292a554699235fe3f3972ba8b136e16b39` on the Obsidian website repository. That commit contains the latest deployed paid-funnel patterns and is a descendant of the current production-main commit.

Work is isolated on branch `codex/obsidian-commercial-window-film-2026-08-08` in:

`/Users/tommybutcher/Documents/New project 10/worktrees/obsidian-commercial-window-film-2026-08-08`

Existing dirty checkouts and unrelated coating changes are out of scope and must remain untouched.

## Recommended Launch Shape

### 1. Organic commercial service page

Create `/commercial-window-film` as the indexable, self-canonical service page.

The page will:

- Target commercial window film, commercial window tinting, office window film, building window film, and architectural window film in Orange County and Southern California.
- Explain solar-control, glare, UV, privacy, decorative, safety, and security use cases in plain language.
- Speak to offices, storefronts, restaurants, hospitality, schools, healthcare, multi-family common areas, and other managed properties.
- Describe a real project workflow: property review, glass and scope assessment, film recommendation, estimate, scheduling, and installation.
- Use `Service` and `LocalBusiness` structured data, an index/follow directive, a self-canonical URL, and a sitemap entry.
- Stay out of the primary navigation at launch while remaining discoverable through contextual internal links and the sitemap.
- Avoid fabricated client names, savings figures, certifications, warranties, or project claims.

### 2. Paid commercial landing page

Create `/commercial-window-film-socal` as a paid-search-only VIP-style landing page.

The page will:

- Use `noindex,follow` and canonicalize to `/commercial-window-film`.
- Use the existing high-contrast VIP paid-page shell and simple, literal commercial copy.
- Lead with a call CTA, then a prefilled text CTA, then an in-page project qualifier.
- Include a sticky mobile call/text bar and anchored sitelink sections.
- Use honest architectural imagery. Generic licensed images may illustrate applications, but must not be presented as Obsidian-completed projects.
- Exclude Square booking links and residential/automotive language.
- Set `data-lead-service="commercial_window_film"` and `data-lead-variant="commercial_socal_v1"`.

### 3. Commercial project qualifier

The paid page will include a four-step questionnaire modeled on the VIP booking router:

1. Property type: office, storefront/restaurant, hospitality/healthcare, multi-family/common area, or other commercial property.
2. Primary goal: heat/glare, privacy/decorative, safety/security, or UV/fade protection.
3. Scope: one area/storefront, small building, multi-floor/large project, or not yet measured.
4. Timing: as soon as possible, within 30 days, one to three months, or planning/budgeting.

The result screen will summarize the answers and offer:

- `Call About This Project`
- A prefilled text containing the qualification answers and a request for the property city, photos, and rough measurements
- `Start Over`

Quiz progress and completion are engagement signals only. A click to open a text message is not treated as a qualified commercial opportunity.

## Keyword Research

Use the live Google Ads Keyword Planner API before finalizing keyword lists or CPC bids. Research will cover:

- Core commercial, office, building, storefront, architectural, solar-control, privacy, decorative, safety, and security film seeds.
- The live 19-city included geography.
- Close variants and commercial-intent queries returned by Google.
- Average monthly searches, competition, and low/high top-of-page bid estimates when available.

The research artifact will separate:

- Launch keywords
- Research-only candidates
- Negative keywords
- City-modified queries
- Unsupported or ambiguous queries

City pages are not part of the initial launch. Creating 19 thin pages before first-party demand data supports them would add doorway-page risk. Future city pages require unique local copy, self-canonicals, sitemap entries, production `200` checks, and a clear search-intent reason.

## Google Ads Campaign

### Identity and controls

- Name: `Search | OC | Commercial Window Film | Obsidian Build`
- Type: Search
- Budget: dedicated `$25/day` standard budget
- Bidding: Manual CPC at launch; starting bids are set from live Keyword Planner estimates and recorded in the evidence artifact
- Networks: Google Search on; Search Partners off; Display off
- Geography mode: presence only
- Language: English
- Devices: all devices initially
- Schedule: all day initially; call-asset scheduling is not assumed without verified business hours
- Final URL: `https://www.obsidianautoworksoc.com/commercial-window-film-socal`

The campaign is created paused. It can be enabled only after the production destination and tracking checks pass and at least one RSA per ad group is submitted successfully for review.

### Live geography to clone

Included cities:

- Aliso Viejo
- Costa Mesa
- Dana Point
- Irvine
- Ladera Ranch
- Laguna Beach
- Laguna Hills
- Laguna Niguel
- Laguna Woods
- Lake Forest
- Mission Viejo
- Newport Beach
- Rancho Mission Viejo
- Rancho Santa Margarita
- San Clemente
- San Juan Capistrano
- Tustin
- Villa Park
- Yorba Linda

Excluded cities:

- Garden Grove
- Santa Ana
- Stanton
- Westminster

The exact positive and negative geo-target resource names must be cloned from the live residential campaign and read back after creation.

### Ad groups

Use four tightly themed ad groups:

1. `Commercial Window Film`
2. `Solar Heat Glare Film`
3. `Safety Security Film`
4. `Privacy Decorative Film`

Launch with exact and phrase match only. Broad match and automated bidding remain off until qualified-opportunity data exists at useful volume.

Each ad group receives one responsive search ad with up to 15 distinct headlines and four descriptions. Copy must align with the ad group's keyword intent and the paid page. No ad may claim a commercial project, savings percentage, warranty, certification, or response time that has not been verified.

### Negative keywords

Campaign-level negatives will block these categories:

- Residential/home-only intent
- Automotive, vehicle, Tesla, windshield, and car-film intent
- DIY, rolls, kits, precut film, wholesale, and retail-store intent
- Jobs, careers, salaries, courses, schools, and training intent
- Free downloads, definitions, laws, percentages, and other research-only intent where it is demonstrably irrelevant

Do not block `privacy`, `decorative`, `security`, `safety`, `solar`, `heat`, `glare`, `UV`, `office`, `building`, `storefront`, `contractor`, `property manager`, or `facility manager`.

### Assets

Attach:

- Existing eligible call asset for `(714) 600-7134`
- Sitelinks to anchored sections for Film Solutions, Project Process, Privacy & Decorative, and Request a Site Review
- Callouts for on-site project review, heat and glare control, privacy and safety options, and Southern California service
- A structured snippet listing Solar Control, Privacy Film, Decorative Film, Safety Film, and UV Protection

Do not upload generic images as proof of Obsidian commercial work. Image assets wait for real, authorized project photography.

## Conversion and Attribution Design

### First-party tracking

Reuse the existing lead-tracking infrastructure to persist:

- `gclid`, `gbraid`, and `wbraid`
- UTM parameters
- campaign ID and ad-group ID
- keyword, match type, device, and network
- first landing page, session ID, and commercial service/variant metadata

Track page visits, questionnaire answers, questionnaire completion, calls, and texts with commercial-specific event names and metadata. The event stream must continue posting to `/api/lead-events` with the existing retry behavior.

### Google Ads goals

Create a campaign-specific custom goal. Initial biddable outcomes are limited to:

- Canonical 60-second calls from ads
- Qualified 60-second website calls

Create a distinct `Commercial Consultation Request - Obsidian` action for future verified submissions, but do not count a page visit, quiz completion, phone click, or opened text composer as a qualified opportunity.

Website text clicks, ordinary phone clicks, and quiz completions remain secondary reporting signals. Existing residential, automotive, Square booking, generic website-lead, and local-action goals must not become biddable for this campaign.

The campaign stays on Manual CPC until the account has enough real qualified commercial outcomes to justify a separate bidding-strategy review.

## Guarded Ads Rollout

Create a dedicated script that is validation-only by default and requires `--apply` for writes. It must:

1. Verify customer `8605345590` and abort if a campaign with the target name already exists unexpectedly.
2. Read and fingerprint the source geography and canonical call asset/action.
3. Create the dedicated budget and paused Search campaign.
4. Apply exact presence-only geography, networks, language, and device settings.
5. Create ad groups, exact/phrase keywords, negatives, paused RSAs, and assets.
6. Create or reuse only the approved commercial conversion resources and custom goal.
7. Read back every created resource and compare it with the plan.
8. Enable the campaign only through a separate guarded phase after website and RSA submission checks pass.

Every apply phase writes a redacted evidence artifact containing before/after fingerprints and Google request IDs.

## Deployment and Verification

### Website checks

- Unit/contract tests for both new routes and commercial tracking semantics
- `npm run test:tracking`
- Local `200` checks for both routes and referenced assets
- Responsive checks at 390px and 1440px
- Call-first order, prefilled text content, sticky mobile CTA, and quiz-result validation
- No console errors
- Organic page: indexable, self-canonical, in sitemap
- Paid page: noindex, canonical to organic page, absent from sitemap
- Production `200` and metadata checks after deployment
- Production lead-event delivery test with a non-conversion test event

### Ads checks

- Campaign ID/name/status/budget readback
- Manual CPC and Search-only network readback
- Presence-only geo mode
- Exact 19 included and four excluded cities
- Four enabled ad groups with the intended keywords and one submitted RSA each
- Call asset eligibility
- Sitelink, callout, and structured-snippet associations
- Commercial-only custom goal and non-biddable proxy signals
- Final URL production `200`

Technical health, ad approval, serving, and attributable business outcomes are reported separately. The launch is live when the production pages return `200` and the enabled campaign is eligible or under review; this does not claim that a qualified commercial opportunity or revenue has occurred.

## Out of Scope

- Modifying the paused residential campaign
- Changing the existing mobile-tint or ceramic-coating budgets, bids, keywords, goals, or destinations
- Creating 19 commercial city pages without demand evidence
- Automated bidding or broad match
- Fabricated commercial-project proof
- Claiming revenue attribution before the click/call/opportunity/payment chain is proven
