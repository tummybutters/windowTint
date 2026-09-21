# Organic growth sprint — September 21, 2026

Approved scope: strengthen Irvine, Tustin and Huntington Beach pages, differentiate the mobile/pricing/ceramic page headings, investigate indexing gaps, and measure saved organic inquiries separately from contact clicks.

## Changes

- Three city pages now show real existing Obsidian vehicle-gallery images with descriptive links, an embedded saved-quote flow, repeated links to the same form and mobile call/quote controls.
- Photos are identified as recent Obsidian installations. Their city, film product, shade percentage and performance are not asserted because no job-level location or film evidence was available.
- Removed anonymous city testimonials from Tustin and Huntington Beach; added practical, distinct installation planning copy. Review links lead to the public Google review search. Existing shared quote-widget review content is unchanged.
- Mobile, pricing and ceramic H1s now state their specific subject. Existing pricing tables, URLs, canonical tags, schema, intake API and Google Ads conversion implementation are unchanged.
- Sitemap lastmod reflects these six pages' actual edit date.
- GA4 property 519885109 now marks `quote_submit_success` as a key event, once per event. This records a server-confirmed saved inquiry, not a booked or paid job. Existing qualify_lead, close_convert_lead and purchase settings are unchanged. The service account could read but could not edit; the authorized business account UI was used and the result independently read back through the API.

## Baseline and measurement

Live baseline in `workbenches/obsidian-organic-2026-09-21` in the main workspace: GA4 Aug 24–Sep 20 = 93 organic sessions (previous 111); Search Console Aug 22–Sep 18 = 45 clicks and 6,634 impressions (previous 45 and 5,703). Irvine/Tustin/Huntington Beach = 22 combined clicks. These measures use distinct date windows and are not interchangeable.

URL Inspection: 41 of 53 canonical sitemap pages indexed. All four September vehicle pages indexed. Mobile discovered/not indexed; pricing unknown. These URLs return 200, self-canonicalize, permit indexing and have incoming links. No verified technical blocking cause was identified. Publishing and requesting indexing do not guarantee inclusion.

Review organic sessions and saved quote key events by landing page and session channel. Key-event designation starts now, not retroactively. Confirm callback and booking outcomes using stored leads and operations records; do not promote CTA clicks or raw submit events into revenue claims.

## Validation and release evidence

Evidence folder: `workbenches/obsidian-organic-sprint-2026-09-21` in the main workspace. Local checks verify 53 canonical pages, one H1 each, no noindex or internal-link orphans; 3 city forms and assets; unchanged price tables and routing/API. Existing quote and vehicle tests pass. Browser checks cover desktop/mobile layout and iframe quiz progression. No new test inquiry or SMS is submitted in this sprint.

Historical `test-seo-foundation.py` compares all files to a September 16 release and rejects every later intentional quote script addition. The current targeted graph/route/price checks are used instead; the historical test is not represented as passing.

Remaining content enrichment: add city-specific case details only when actual vehicle/city/film/job records and permitted photos can be matched. Business Profile publishing, review outreach and partner outreach are not part of this website release.
