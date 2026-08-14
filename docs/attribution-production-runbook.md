# Attribution Production Runbook

Operational truth boundary for the closed-loop attribution foundation. Read
this before touching production Vercel, the production database, Google Ads,
or Square in connection with this work.

## Source-of-truth identities

- Production domain: `https://www.obsidianautoworksoc.com`
- Production Vercel project ID: `prj_mGo067aGnOyc2v4HCoPhPPBHXEfI`
- Production Vercel project name: `obsidianautoworks`
- Google Ads conversion customer: `8605345590`
- Auto-tint campaign: `23899221542`
- Commercial-window-film campaign: `24117892229`
- Production-matching source baseline: this repository at commit
  `e24ca83de00490112b6a5720f4cedbefcd39c6be`

This worktree's local `.vercel/project.json` currently points at a
**different, failed, Thomas-owned project** (`prj_EvuhBoGZhbqjsqjAYugMNnwm50Am`).
That binding is wrong and must never be treated as production. `npm run
verify:production-target` fails closed against it today; that failure is
expected and correct, not a bug to silence.

## Predeploy gate

Before any `vercel link`, `vercel --prod`, or equivalent deploy action:

```bash
npm run verify:production-target
```

- Exit code `0` means the local `.vercel/project.json` matches both the
  approved production `projectId` and `projectName`. Deploy may proceed only
  after this passes **and** after separate, explicit human authorization.
- Any nonzero exit means the local binding is wrong, missing, or malformed.
  Stop. Do not deploy, relink, or override the check.
- The guard (`lib/vercel-project-guard.js`,
  `scripts/verify-production-target.mjs`) is read-only: it only reads
  `.vercel/project.json` from disk. It never runs the `vercel` CLI, never
  writes to that file, never relinks, and never deploys. Relinking to the
  correct project is a separate, explicitly authorized human action outside
  this guard's scope.
- The guard never prints the file's actual contents, the wrong `projectId`,
  the wrong `projectName`, or the `orgId`, on success or failure. Failure
  output is a fixed, generic sentence.

## Production migration, readback, and rollback posture

- Migrations live in `db/migrations/*.sql` and are applied forward-only, in
  filename order, via `npm run db:migrate` (`scripts/migrate-attribution-db.mjs`).
  Applied migrations are recorded in `attribution_schema_migrations`; the
  script is idempotent per statement set but does not skip already-applied
  files on its own — do not run it against production without first reading
  back `attribution_schema_migrations` to confirm which migrations are
  already applied.
- There is no automated down-migration or rollback script. Rollback options
  are, in order of preference: (1) a new forward migration that reverses the
  change, reviewed like any other migration; (2) Neon point-in-time restore,
  which is a data-loss-risk action requiring separate explicit authorization.
  Never hand-edit production schema state outside a committed migration
  file.
- Readback: after any production migration, re-query
  `attribution_schema_migrations` and spot-check the new table/column exists
  with the expected constraints before considering the migration complete.
- Implementation (Tasks 1–7) stayed entirely local: no migration was applied
  to production, no production data was mutated, and no test in those tasks
  read from a production database connection — every test runs against
  local fixtures or fake in-memory query functions.
- Per the 2026-08-14 explicit user authorization recorded in the SDD ledger
  (`progress.md`), **Task 8 is separately authorized** to apply migration
  `004_attribution_foundation` to the exact production database, deploy the
  verified commit to the exact `obsidianautoworks` project
  (`prj_mGo067aGnOyc2v4HCoPhPPBHXEfI`), and perform read-only production
  verification (schema readback, endpoint reachability/rejection behavior,
  deployed-asset markers, and a read-only revenue report run). That
  authorization is scoped narrowly: Google Ads uploads, Data Manager
  uploads, customer-facing messages, and Square billing changes remain
  prohibited regardless of this authorization (see "Prohibited Google Ads
  uploads" below).
- Task 8 must never use or relink this worktree's known-wrong local
  `.vercel/project.json` (`prj_EvuhBoGZhbqjsqjAYugMNnwm50Am`) for any
  production action. It creates a disposable, isolated deployment context
  (a separate directory or scoped Vercel config) explicitly linked to the
  exact production project, and runs the predeploy gate against that
  isolated context's project file before any migration or deploy:
  ```bash
  node scripts/verify-production-target.mjs --project-file=<isolated-path>/.vercel/project.json
  ```
  `<isolated-path>` must resolve to a real, nonempty file linked to the
  exact production project — an empty or omitted `--project-file=` falls
  back to this worktree's known-wrong binding and must fail closed, not be
  treated as a pass. The known-wrong worktree binding itself is left
  untouched: it is never relinked, overwritten, or used as the deploy
  source.

## Report and commission definitions

`node scripts/report-attributed-revenue.mjs --from=YYYY-MM-DD --to=YYYY-MM-DD --format=table|json`
(`lib/attributed-revenue-report.js`) is the canonical, read-only revenue and
commission report. Day boundaries are inclusive local `America/Los_Angeles`
dates.

- **Business-wide completed-job revenue**: gross amount of Square orders in
  `COMPLETED` state whose financial timestamp (`closed_at`, falling back to
  `provider_updated_at`, then `provider_created_at`) falls in range. Each
  completed order counts once; deposits/balances on the same order never add
  on top of the order total, and payment totals are never summed into order
  totals.
- **Refunds**: each completed refund is deduplicated by
  `(provider, provider_refund_id)` and subtracted once, resolved to its
  order via the refund's own `provider_order_id` first, then via its
  payment's `provider_order_id`. A refund is applied only when its currency
  matches its resolved order's currency; a currency mismatch, an
  unresolvable refund, or a refund with no usable timestamp is surfaced as a
  typed anomaly (`currency_mismatch`, `order_not_in_report`, `unresolved`,
  `missing_timestamp`) grouped by currency, never silently dropped and never
  summed across currencies.
- **Net revenue**: `max(0, gross_completed_amount - applied_refund_amount)`.
  Refunds in excess of an order's recorded gross clamp net revenue and
  commission to zero for that order and surface a dynamically computed
  `refund_exceeds_order` flag on the detail row (no schema column stores
  this flag).
- **Commission**: exactly 10% (`1000` basis points),
  `round_half_up(net_revenue_minor * 1000 / 10000)`, computed per completed
  order, then summed for bucket/business totals.
- **Currency**: never guessed or defaulted. Every detail row carries its own
  order currency; the report throws rather than aggregate mixed-currency
  orders together; a report with zero completed orders and no inferable
  currency renders `n/a`, never a guessed `$`/`USD`.
- **Buckets**: `provenAds` (a strict subset of business-wide revenue — see
  Proof tiers below), Tier B/C `candidate`, and `unattributed`. An order
  contributes to at most one bucket. Rejected links, unsupported
  link-status/tier combinations, an approved Tier A link with no resolved
  touch or no click ID, and orders with no ranked link are all
  `unattributed`.
- The report never accepts a browser-submitted revenue value; every figure
  is derived from persisted provider (Square) entities and server-written
  attribution links.
- **The report is current-as-of, not a fixed historical record.** Refunds
  carry no date bound and are always subtracted from their order regardless
  of when the refund happened, so re-running the exact same `--from`/`--to`
  range on a later date can restate a smaller net/commission figure than an
  earlier run of the identical command, with the difference surfacing only
  as an `order_not_in_report` anomaly in the later run. This code does not
  persist a payout ledger or snapshot table. Any report run whose output is
  used to make or justify a real commission payment must have its masked
  `--format=json` output archived (file name or storage location including
  the run timestamp and the exact `--from`/`--to` range) before the payment
  is made, so the figure that was actually paid on can be reproduced later
  even if a subsequent refund restates the range.

## Proof-tier truth boundary

These are ordered from weakest to strongest signal. Do not conflate them in
conversation, in reporting, or in any Google Ads upload:

1. **Soft click** — a visitor clicked a `tel:` link or an SMS link, or a
   landing page recorded a paid click ID (`gclid`/`gbraid`/`wbraid`). This
   proves intent to contact, not a completed contact. A soft phone click
   never proves the call was answered or qualified.
2. **Inquiry / lead intent** — the first phone, text, form, or booking
   action in a browser session, recorded as one `lead_intent_id` with one
   opaque `OA-XXXXXXXXXX` reference. Still not a scheduled or paid job.
3. **Appointment / booking** — a Square booking record exists. Not yet
   revenue; it can be canceled, rescheduled, or no-showed.
4. **Completed order (business-wide revenue)** — a Square order reached
   `COMPLETED` state. This is real, recognized revenue regardless of
   whether it can be tied back to an ad. This is the "business-wide
   completed-job revenue" figure in the report.
5. **Proven Ads revenue** — a completed order that resolves through exactly
   one **approved, Tier A** `attribution_links` row carrying a real
   `touch_id` *and* a surviving click ID (`gclid`, `gbraid`, or `wbraid`) on
   that touch. An approved Tier A link with no resolved touch, or a touch
   with no click ID, is not proven Ads revenue — it buckets as
   `unattributed`, never as a Tier B/C candidate (candidate totals are
   reserved for actual Tier B/C link states). Only Tier A links are written
   automatically in this tranche; Tier B (reviewed strong match) is
   reserved but not yet generated, and Tier C (directional) is never
   proven revenue.

Never describe business-wide completed revenue as "Ads revenue," never
describe a soft click or inquiry as a "sale," and never describe a
Tier B/C candidate as "proven."

## Known remaining gap: no order-to-touch connector

This tranche makes the website half (touch → lead intent → OA reference)
and the Square half (payment → `provider_order_id`) each internally
durable, but it does **not** create the link between a completed order and
the touch that drove it. No application code writes `attribution_links`
rows with `entity_type = 'order'` yet. As a direct consequence:

- Every real completed order today resolves as `unattributed` in the
  report.
- Proven Ads commission is currently `$0`, by design, not by defect.
- Closing this gap requires a future, explicitly separate, authenticated
  integration (Tint Wiz/Zapier lifecycle ingestion, or a reviewed call
  provider, or a manually reviewed Tier B match) — none of which is in
  scope here.

## Known limitations: ingestion trust boundary and click-ID reuse

- **`/api/lead-events` is public analytics ingestion, not cryptographic
  client authentication.** It is protected by a browser same-origin check
  (`Origin` compared against the request's own `Host`/`x-forwarded-host`)
  and a per-minute IP-hashed rate limit -- both are effective against a
  browser but provide no protection against a non-browser caller that can
  send an arbitrary `Origin`/`Host` pair. Such a caller can write
  `attribution_touches` and `attribution_lead_intents` rows, which the
  store converts into `approved`, `proof_tier='A'` `attribution_links`
  rows exactly as a genuine browser click would. A Tier A lead-intent link
  is therefore **not sufficient on its own** for a Google Ads upload or a
  financial attribution decision. It only becomes usable for either once an
  authenticated, reviewed order-to-touch bridge (see "Known remaining gap"
  above) resolves it against independently verified Square order data, and
  that bridge itself is authenticated end to end.
- **Click-ID bearer limitation.** Same-origin paid-field propagation has
  been removed (below), but the *original* paid landing URL itself is not a
  secret: a customer can screenshot, forward, or paste the exact
  `?gclid=...` URL they landed on, and a second, unrelated browser opening
  that exact URL will mint a genuine-looking touch carrying the same click
  ID. Possessing a `gclid`/`gbraid`/`wbraid` value is proof that *someone*
  saw that URL, not proof that the browser presenting it is the one Google
  Ads attributed the click to. A click ID that resolves to touches in more
  than one `session_id` must be treated as an anomaly and investigated
  before any Ads use of a link built from it -- it must never be read as
  proof that two people separately clicked the ad.
- **Same-origin paid-field propagation has been removed (Task 7).**
  Internal `/booking` and `/vip-booking` links now carry only the opaque
  session bridge and existing non-paid contact context that is genuinely
  required (`obsidian_session_id`, CID, phone) -- they no longer carry
  `gclid`, `gbraid`, `wbraid`, any UTM field, or
  campaign/ad-group/creative/keyword/match-type/device/network/location/
  placement/target/extension metadata. `localStorage` already preserves
  this browser's own touch, so the URL copy bought nothing for first-party
  attribution and only enabled the click-ID-sharing vector above. External
  Square booking targets (`squareup.com`, `square.site`,
  `app.squareup.com`, `book.squareup.com`) are unaffected and continue
  receiving the full existing decoration, because the external handoff
  cannot read this browser's `localStorage` and this tranche must not break
  that existing contract.
- **Reference-code collision is fail-closed, not recovered.**
  `attribution_lead_intents.reference_code` is `UNIQUE`. A collision under
  a *different* `lead_intent_id` aborts the whole persist statement,
  including the ordinary event write in the same call; the browser retries
  the identical colliding envelope and that browser's intent stays
  unpersistable until delivery attempts are exhausted. No collision
  regeneration is implemented server- or client-side. This is safe
  (nothing is silently misattributed) but not self-healing, and the
  probability is negligible (a 31-symbol, 10-character space, roughly
  8.2x10^14 combinations) -- do not describe this as "handled" beyond
  fail-closed rejection.

## Inherited pre-existing behavior (out of scope)

`decorateForms` (`lead-tracking.js`) writes the raw, non-opaque
`lead_phone` and `lead_cid` values into every `<form>` on the page,
including any third-party-origin form, from before this tranche began. The
new opaque OA fields it adds alongside them (`lead_intent_id`,
`lead_reference`, `lead_touch_id`, `lead_session_id`) are unaffected and
correctly opaque. This tranche does not alter the raw CID/phone behavior —
it is pre-existing and out of scope here. A one-time confirmation that no
third-party-origin form exists on the paid landing pages remains a Task 8
Step 5 follow-up, not a code change owed by this tranche.

## Secret handling

- Never print `DATABASE_URL`, any Postgres connection string, any Square
  access token or webhook signing secret, any Google Ads/Data Manager
  credential, `.vercel/project.json` contents, or the local `orgId`, in
  logs, reports, commit messages, or this runbook.
- The revenue report masks provider order references and click-ID
  references in all output; it never prints a raw phone number, email,
  HMAC identity, full click ID, or full Square customer/payment/order ID.
- The Vercel guard never prints file contents on success or failure.
- If a script's error path cannot guarantee a message is free of secrets,
  it must fall back to a fixed generic message instead of forwarding the
  underlying error (see `formatCliErrorMessage` in
  `lib/attributed-revenue-report.js` and the guard's `safeToDisplay`-gated
  CLI error handling).
- `.env` files are never committed. `.vercel` is gitignored.

## Prohibited Google Ads uploads

Do not upload, or prepare for upload, any conversion/enhanced-conversion
data to Google Ads (Data Manager or otherwise) for revenue attributed to a
specific click until:

1. A real, approved, Tier A order-to-touch link exists in the database for
   that order (see "Known remaining gap" above) — not a candidate, not a
   manual guess, not a business-wide total; and
2. That link has been produced by the finished order-to-touch integration
   from a future tranche, not fabricated or backfilled by hand; and
3. The click ID on that link's touch has been checked for reuse across more
   than one `session_id` (see "Known limitations: ingestion trust boundary
   and click-ID reuse" above) and is not flagged as a duplicate; and
4. Separate, explicit human authorization for that specific upload has been
   given.

Business-wide revenue, Tier B/C candidate revenue, and unattributed revenue
must never be uploaded to Ads as if they were click-attributed. Today, since
no order-to-touch link exists, the correct proven-Ads-commission figure for
any completed period is `$0`, and no upload of any kind is authorized.
