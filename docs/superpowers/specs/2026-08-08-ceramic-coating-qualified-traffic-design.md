# Ceramic Coating Qualified-Traffic Optimization Design

## Objective

Improve ceramic-coating lead quality by showing the real $795 minimum before the click, aligning the two highest-volume ad groups with the real package ladder, and measuring qualified outcomes without increasing spend.

## Confirmed Source Truth

- Manager account: `2189276309` (`Qortana Ads Manager`).
- Serving customer account: `8591070105` (`Pure Mobile Detailing OC` billing container).
- Serving campaign: `24054610950` (`Search | OC | Ceramic Coating | Obsidian Build`).
- The paused same-name campaign in customer account `8605345590` remains paused and must not be activated.
- The serving campaign remains at $71 per day, Manual CPC, Google Search only, presence-only geography, and the current 7:00 AM to 9:00 PM daily schedule.
- Core and Cost + Paint Correction produced 44 of the campaign's first 50 clicks and are the only ad groups receiving price-led ad changes in this pass.
- The current public price ladder of $550, $700, and $900 is obsolete and must be replaced.

## Approved Package Truth

### Ceramic Refresh Package

- Ideal for newer vehicles or protection on a budget.
- Exterior detail, iron decontamination, clay treatment when needed, and one-step paint correction.
- GYEON CanCoat EVO with a 1.5 to 2 year protection term.
- Starting range: $795 to $995.

### Premium Protection Package

- Marked as the most popular package.
- Full exterior detail, decontamination, clay treatment, and one-step or light two-step paint correction.
- GYEON Pure EVO with a 2 to 3 year protection term.
- Starting range: $1,295 to $1,695.

### Signature Correction & Coating

- Flagship package.
- Complete exterior preparation and two-step paint correction.
- GYEON Mohs EVO with a 4 year protection term.
- Starting range: $2,495 to $2,995.

### Concours Package

- Intended for exotics, collectors, and enthusiasts.
- Multi-stage paint correction, GYEON Syncro EVO, wheel coating, and glass coating.
- Starting price: $3,500 and above.

The protection terms above must not be described as warranties unless a separate written warranty is supplied.

## Google Ads Design

### Core Ad Group

Create a price-led responsive search ad that keeps the existing mobile Orange County positioning while making `Ceramic Coating From $795` a prominent headline. Supporting assets should communicate that preparation and paint correction are included and that the protection plan is matched to the vehicle.

The new ad routes to `/ceramic-coating`. The page and ad must use the same $795 floor.

### Cost + Paint Correction Ad Group

Create a separate price-led responsive search ad tailored to cost and correction intent. It should lead with `Ceramic Coating Cost $795+`, mention four package levels, and distinguish the service from DIY coating products or correction-only information.

The new ad routes to `/ceramic-coating-cost-paint-correction#packages`.

### Approval-Safe Cutover

- Create the two new responsive search ads without deleting historical ads.
- Keep the existing ads serving while the replacements are under review so the campaign has no avoidable downtime.
- After each replacement is approved and eligible, pause the overlapping unpriced ad or ads in that ad group.
- Do not change the Cities or Luxury + EV ads in this pass.
- Do not change campaign budget, bidding strategy, ad-group bids, networks, schedule, geography, or the paused duplicate campaign.

## Landing-Page Design

### General Ceramic-Coating Page

- Preserve a result-led hero rather than making the page feel like a discount offer.
- Show `Packages from $795` prominently above the fold and link directly to the package comparison.
- State that paint preparation/correction is included and that the service is mobile across the approved Orange County service area.
- Preserve the current authentic project imagery and do not invent reviews, certifications, or guarantees.

### Cost and Paint-Correction Page

- Replace the obsolete $550/$700/$900 packages with the four approved packages and exact ranges.
- Show the GYEON product, correction level, included work, and protection term for each package.
- Mark Premium Protection as most popular and Signature as the flagship offer.
- Keep calls and vehicle-photo texts as the primary page actions.
- Explain that final scope depends on vehicle size and paint condition without weakening the $795 minimum qualification.

### Service Areas

Preserve the current campaign targets and existing city-page structure. This pass does not add, remove, or expand cities.

## Search-Intent Controls

- Preserve the August 4 campaign negatives and the paused phrase `paint correction and ceramic coating`.
- Do not add broad negatives based only on one query without confirming that it cannot produce an eligible service lead.
- Continue excluding DIY products, coating brands sought as retail products, training, how-to research, toppers, and unrelated paint-repair intent when new terms appear.

## Measurement Design

- Keep ordinary phone clicks and text clicks as secondary intent signals.
- Use the existing 60-second website-call destination as the qualified-call signal after its production installation and firing behavior are verified.
- Preserve GCLID, GBRAID, WBRAID, UTM, campaign, ad-group, keyword, device, network, landing-page, and session capture in the first-party lead event.
- Treat a confirmed booking as stronger than a click or call, and a joined paid job as the revenue outcome.
- Do not report campaign ROI from aggregate Square payments. Revenue attribution remains partial until a deterministic lead-to-booking-to-payment join exists.
- Manual CPC remains in place until qualified outcome volume is sufficient for a separate bidding-strategy decision.

## Delivery Diagnosis

Before or alongside the guarded ad cutover, re-read campaign, ad, policy, budget, schedule, location, and daily serving status to explain the absence of delivery after August 5. Do not make speculative delivery changes when the API already reports the campaign as enabled and serving.

## Implementation Safety

- Capture Ads resources and live page responses before every mutation.
- Use validation-first, idempotent Ads scripts that require the exact customer, campaign, ad-group, budget, bidding, network, location, and URL identities above.
- Never delete historical ads; pause them only after replacements are eligible.
- Update generator sources and generated city pages together when shared package or tracking copy changes.
- Run the full tracking and paid-page test suite before deployment.
- Verify a preview at desktop and phone widths, then verify the production routes and Ads tracking configuration after deployment.
- Save live Ads readback evidence after every mutation.

## Success Criteria

- Eligible price-led ads serve in Core and Cost + Paint Correction with the $795 minimum visible before the click.
- The general page and cost page agree with the approved four-package ladder.
- The obsolete $550/$700/$900 package claims no longer appear on production ceramic-coating routes.
- Qualified website calls are distinguishable from ordinary phone clicks.
- Budget, Manual CPC, geography, schedule, Cities, Luxury + EV, and the paused duplicate remain unchanged.
- Performance is reviewed after at least 14 full serving days and at least 20 price-led ad clicks; lead quality, confirmed bookings, and paid-job joins take priority over CTR alone.

## Explicit Non-Goals

- No budget increase.
- No automated bidding migration.
- No city expansion.
- No new claims about warranties, certifications, or reviews.
- No attribution of aggregate Square revenue to Google Ads.
