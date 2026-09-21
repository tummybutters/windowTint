# Automotive quote launch — September 21, 2026

Twilio replaces the unconfigured AgentPhone adapter, using the user's authorized Malohn/Qortana intake account. No customer SMS is sent. Internal alerts go to +17146007134 from +18449023577.

## Flow

The existing Search landing URLs use the approved three-step quiz. Pricing and organic mobile service pages embed the same form, preserving pricing tables and canonical URLs. Submission saves a durable Neon lead before an alert is attempted. UUID/payload checks make a repeated submission idempotent; atomic claims prevent concurrent duplicate alerts. The customer sees a callback acknowledgement after the lead is saved.

Server-only variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, QUOTE_ALERT_TO, QUOTE_RETRY_SECRET, AUTOMOTIVE_QUOTES_ENABLED, DATABASE_URL, ATTRIBUTION_HMAC_SECRET. Credentials are not in source or client JavaScript.

## Persistence and operations

The additive automotive quote schema was applied transactionally in an authenticated staged deployment. The release preserves the original zero-configuration static build. Do not set the database migration script as the site's sole build command: the staged attempt omitted static output and was rolled back immediately. Run scripts/migrate-automotive-quotes.mjs only in an authorized environment with DATABASE_URL before future schema-dependent releases. Existing attribution/Square tables are unchanged.

.github/workflows/quote-notifications.yml invokes the authenticated retry/status endpoint every five minutes and supports manual dispatch. GitHub schedules can be delayed; initial SMS sends happen synchronously with form submission and do not wait for the scheduler. Each run processes up to three pending sends and three delivery lookups. Explicit rate-limit rejection can retry; ambiguous timeout/server failures become unknown for manual review rather than sending duplicates. Delivered, failed and undelivered statuses are persisted separately from provider acceptance. Failed, unknown, stale-pending or lookup-error results fail the workflow for operational attention. Check GitHub Actions after a failure; review the saved lead before resending. There is no automatic secondary SMS/email provider.

GET /api/quote-notification-retry?lead_id=<uuid> with the worker Bearer secret returns restricted operational metadata (no name, phone or address). The endpoint exposes no queue information without authorization. Never put the worker secret in a URL.

## Verification

A labeled adapter test was delivered to the callback number. A staged form API test saved lead 90d6f5b3-4eae-49fd-8520-46e25d281e85; two identical submissions resulted in one notification attempt. Independent readback confirmed delivered with no error. These are setup tests, not customer leads or bookings.

Quote/API tests cover validation, origin, rate limits, persistence failures, recipient isolation, retry authentication, ambiguous send failures, provider rejection, duplicate claims and delivery failures. The full existing tracking/Square suite and vehicle-page tests pass. Paid-page tests now reflect the approved callback quiz rather than the previous VIP photo-wall contract. The historical SEO-foundation release test still assumes no additional script URLs on any existing page; the quote-route test instead checks unchanged canonicals and pricing tables for the intentional embeds.

Desktop/mobile visual checks cover vehicle selection, coverage selection, final inputs, empty-form validation, autofill attributes, loaded images, and pricing CTA/iframe height. Local development now maps /quote-widget to its HTML file, matching Vercel clean URLs.

## Measurement and rollback

Google Analytics only. quote_start, quote_step_complete, quote_submit_success and quote_submit_error contain no customer details. Saved-form events remain distinct from call/text clicks. No Google Ads campaign, bid, budget or conversion configuration changes are included in this release. Do not count a successful API response as an attributed booked job.

Production promotion and workflow execution must be recorded in the launch evidence after verification. Keep dpl_6krbUhc4E4bU7ZYmgANAT1ShEafn available as the prior deployment for rollback. Rolling back must preserve saved inquiries; do not drop the added database tables.
