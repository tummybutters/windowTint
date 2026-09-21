# Automotive quote launch — September 20

Prepared on codex/automotive-quote-funnel-2026-09-20. Production cutover is held until AgentPhone credentials and sender are provided and delivery is verified.

## Routing

Preserve active URLs; no keyword, ad copy, bid, or budget mutation needed:
- Full approved quiz experience: /mobile-window-tinting-near-me, /car-window-tinting-near-me, /tint-shop-near-me.
- Same form embedded in /window-tint-pricing (retain prices/tables) and /mobile-window-tinting (retain organic content).
- Recent September 14–20 paid landing clicks: pricing 24, car 14, mobile paid 12, tint-shop 1; 57 total landing clicks. Remaining low-volume vehicle/booking routes retain existing intent-specific pages.

## Activation checklist

1. Confirm user means AgentPhone at api.agentphone.ai. Store AGENTPHONE_API_KEY and AGENTPHONE_FROM_NUMBER as server-only Vercel environment variables. Set QUOTE_ALERT_TO=+17146007134. Never use a customer-submitted value as alert recipient.
2. Apply db/automotive-quotes.sql to configured Neon database. New additive tables only. The schema is not applied automatically.
3. Set AUTOMOTIVE_QUOTES_ENABLED=true only in the verified deployment environment. Until enabled the API returns a clear call fallback; do not route production to disabled form.
4. Run a clearly labeled authorized test to the alert recipient, confirm receipt, and reconcile the same ID in automotive_quotes. API accepted is not proof of handset delivery.
5. Vercel Hobby rejected a 5-minute cron during preview deployment, so that schedule was removed. Wire the authenticated quote-notification-retry endpoint to an existing server scheduler before production; no account upgrade was requested. Existing attribution cron remains unchanged. Worker retries explicit 429 rejects; ambiguous timeouts/5xx are marked unknown for manual reconciliation rather than blindly duplicating alerts.
6. Operations must review pending/failed/unknown alerts; establish a fallback email recipient/provider before release. No email fallback is currently configured. AgentPhone acceptance does not establish delivered status; confirm the account's actual receipt/status capabilities when credentials arrive.
7. Verify public form, call tracking, safe GA4 quote events, pricing iframe height, and known paid destinations. No customer contact details in GA4; quote_submit_success is distinct from phone/text clicks. Google Ads primary conversion configuration has not been changed; wire the verified saved-lead action once delivery is tested, without counting button clicks as saved leads.
8. Deploy/promote only after the above. Keep prior production deployment dpl_6krbUhc4E4bU7ZYmgANAT1ShEafn available for rollback. Do not remove new database records on rollback.

## Credentials and data

Server-only credentials; DATABASE_URL and ATTRIBUTION_HMAC_SECRET already present in production. New queue is stored on the lead row atomically with the inquiry. UUID and payload hash provide idempotency; notification claims prevent concurrent sends. Stage supports new/contacted/qualified/quoted/booked/closed. Staff UI and provider delivery receipt reconciliation are not implemented; use authenticated operational database access for now.

Customer contact method is call only. No customer SMS is sent. Notification includes name, phone, vehicle, coverage and service address to the configured internal recipient. Original local preview at localhost:8765 remains separate and does not send messages.

Review sources: existing homepage Google review excerpts. Photo stream is separate from review strip because older paired vehicle/reviewer claims contradicted review text. Generated cars are illustrations, not customer work.
