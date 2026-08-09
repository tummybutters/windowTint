# Ceramic Coating Price Qualification Handoff

Date: 2026-08-08

Manager account: `2189276309`

Customer account: `8591070105`

Campaign: `24054610950` (`Search | OC | Ceramic Coating | Obsidian Build`)

## Production site

- Production commit: `3cae02ba0e97fd9577529bdff1c82468d8312b42`
- Vercel production deployment completed successfully.
- `https://www.obsidianautoworksoc.com/ceramic-coating` returned HTTP 200 and showed `Packages start at $795` above the primary actions.
- `https://www.obsidianautoworksoc.com/ceramic-coating-cost-paint-correction` returned HTTP 200 and showed all four approved packages, price ranges, products, and protection durations.
- Desktop viewport checked at 1280 x 720; mobile viewport checked at 390 x 844.
- Neither checked page had horizontal overflow.

## Verification

- `npm run test:tracking`: passed.
- `python3 -m unittest discover -s ops/google-ads/tests -p 'test_*.py' -v`: 52 tests passed.
- Branch preview deployment: successful. The preview content was protected by Vercel team access, so rendered content was verified on the public production deployment after the fast-forward promotion.

## Live Google Ads change

The preflight guard confirmed the intended live campaign before mutation:

- Budget: `$71/day`
- Bidding: Manual CPC with enhanced CPC disabled
- Networks: Google Search only; Search Partners and Display disabled
- Locations: unchanged exact set of 10 IDs
- Schedule: unchanged, 7:00 AM to 9:00 PM daily
- Campaign negatives: unchanged count of 59
- Duplicate campaign `24058475904` in customer `8605345590`: still paused
- Protected Cities and Luxury + EV ad groups: unchanged

Created exactly two enabled responsive search ads:

1. Core ad `820276851574`
   - Pinned headline 1: `Ceramic Coating From $795`
   - Final URL: `https://www.obsidianautoworksoc.com/ceramic-coating`
2. Cost + Paint Correction ad `820276851577`
   - Pinned headline 1: `Ceramic Coating Cost $795+`
   - Final URL: `https://www.obsidianautoworksoc.com/ceramic-coating-cost-paint-correction#packages`

The post-create readback found both ads enabled with `PENDING` primary status and `UNKNOWN` policy approval status. A second readback returned the same status. No existing ad was paused because the cutover guard requires both replacements to be `APPROVED` and `ELIGIBLE`.

## Pending cutover

After Google approves both replacement ads, rerun validation and use the guarded cutover command:

```bash
/opt/homebrew/bin/python3 ops/google-ads/apply_ceramic_price_qualification.py \
  --env-file '/Users/tommybutcher/Documents/New project 10/.env' \
  --cutover \
  --confirm PAUSE_UNPRICED_RSAS_AFTER_APPROVAL_2026_08_08 \
  --evidence docs/evidence/2026-08-08-ceramic-price-ads-cutover.json
```

The command will refuse to mutate if either replacement is not approved and eligible or if any protected campaign setting drifts. When allowed, it pauses only these three named older ads:

- Core: `199530647918~818560843375`
- Cost + Paint Correction: `199530568558~818560843378`
- Cost + Paint Correction: `199530568558~819021913646`

It does not delete ads or change budget, bids, locations, schedule, keywords, networks, or conversion actions.

## Delivery note

The live readback reported the campaign as enabled and serving, with a `LIMITED` primary status. The latest metric row was 2026-08-05, so the current snapshot does not prove delivery after that date. Do not represent calls, texts, booking clicks, or aggregate payment revenue as attributable ROI without a durable Ads/session/booking/payment join.

## Evidence files

- `docs/evidence/2026-08-08-ceramic-price-ads-validation.json`
- `docs/evidence/2026-08-08-ceramic-price-ads-create.json`
- `docs/evidence/2026-08-08-ceramic-price-ads-post-create.json`
