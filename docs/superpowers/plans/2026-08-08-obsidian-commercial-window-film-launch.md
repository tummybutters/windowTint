# Obsidian Commercial Window Film Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to execute this plan task by task.

**Goal:** Publish a dedicated organic commercial-window-film page and a paid commercial landing page, then create and fully verify a paused $25/day Google Search campaign so the only remaining launch action is enabling the campaign.

**Architecture:** Extend the existing static Obsidian site with an indexable commercial service route and a noindex VIP-style paid route. Reuse `lead-tracking.js` for attribution, add a small testable qualifier model plus a browser controller, and add a validation-first Google Ads operations package that researches live demand, plans the account mutation, stages resources paused, and reads them back. Production deployment and Google Ads writes are controller-owned external actions after all local tests pass.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js contract tests, Python route server, Vercel, Google Ads API v24, Python standard-library operations scripts.

## Global Constraints

- Work only in `/Users/tommybutcher/Documents/New project 10/worktrees/obsidian-commercial-window-film-2026-08-08` on branch `codex/obsidian-commercial-window-film-2026-08-08`.
- Preserve all unrelated files and never stage tracked `node_modules` noise.
- Use test-driven development: add a focused failing test, capture the intended failure, implement the minimum production change, then rerun the focused and full suites.
- Do not fabricate customer names, completed projects, performance percentages, warranties, certifications, response times, or business hours.
- Commercial pages must not emit residential or automotive service/variant semantics.
- Generic architecture images may be labeled only as application examples, never as Obsidian project proof.
- The paid route contains no Square or booking link. CTA order is call, text, qualifier.
- Google Ads writes are validation-only by default and require explicit guarded apply flags. The campaign must remain paused.
- Do not alter the existing mobile-tint, residential-film, or ceramic-coating campaigns.
- Never commit secrets or raw access tokens. Redact request/response evidence before saving it.

---

### Task 1: Capture Live Keyword Planner Evidence and Lock the Launch Plan

**Files:**
- Create: `ops/google-ads/commercial_campaign_config.py`
- Create: `ops/google-ads/research_commercial_keywords.py`
- Create: `ops/google-ads/tests/test_commercial_campaign_config.py`
- Create: `docs/evidence/2026-08-08-commercial-keyword-plan.json`
- Create: `docs/evidence/2026-08-08-commercial-keyword-plan.md`

**Step 1: Write the failing configuration test**

Add tests that require:

- Customer ID `8605345590`, campaign name `Search | OC | Commercial Window Film | Obsidian Build`, final URL `https://www.obsidianautoworksoc.com/commercial-window-film-socal`, and a 25,000,000-micros daily budget.
- Four named ad groups with explicit maximum CPC micros.
- Exact and phrase launch keywords only; no broad match.
- Campaign negatives for residential, automotive, DIY/retail, employment/training, and irrelevant research intent while preserving the approved commercial themes.
- Exactly 19 included and four excluded cities matching the live residential geography.

Run: `python3 -m unittest ops/google-ads/tests/test_commercial_campaign_config.py`

Expected: FAIL because the config module does not exist.

**Step 2: Implement the research/config boundary**

Create a pure configuration module containing immutable campaign identity, geography, seed themes, negative categories, and helpers that validate match types and prohibited terms. Create a research CLI that:

- Reads credentials only from the supplied `--env-file`.
- Uses Google Ads API v24 KeywordPlanIdeaService with the exact 19-city geography and English.
- Sends core commercial, office, building, storefront, architectural, solar-control, privacy, decorative, safety, and security film seeds.
- Records average monthly searches, competition, and low/high top-of-page bid micros when Google returns them.
- Classifies rows as launch, research-only, city-modified, negative, or unsupported.
- Writes deterministic redacted JSON and Markdown artifacts.
- Performs no Google Ads mutation.

Use the live output to set conservative Manual CPC launch bids inside the configuration. When Google returns sparse data, record the absence and use a clearly labeled modeled bid bounded by related returned commercial estimates.

**Step 3: Verify the research layer**

Run:

- `python3 -m unittest ops/google-ads/tests/test_commercial_campaign_config.py`
- `python3 ops/google-ads/research_commercial_keywords.py --env-file "/Users/tommybutcher/Documents/New project 10/.env" --output-json docs/evidence/2026-08-08-commercial-keyword-plan.json --output-markdown docs/evidence/2026-08-08-commercial-keyword-plan.md`

Expected: tests pass; both evidence files contain current Google data or explicitly marked unavailable fields, no secrets, and the final launch keyword/bid decisions.

**Step 4: Commit**

Stage only the five Task 1 files and commit with: `Build live commercial keyword plan`

---

### Task 2: Add Failing Website and Qualifier Contracts

**Files:**
- Create: `scripts/test-commercial-window-film-pages.mjs`
- Create: `scripts/test-commercial-window-film-qualifier.mjs`
- Modify: `package.json`

**Step 1: Write the page contract test**

Require the organic route to have:

- `index,follow`, a self-canonical, a commercial title/description/H1, `Service` and `LocalBusiness` JSON-LD, and no paid-only service variant.
- Literal commercial application, solution, process, privacy/decorative, and consultation sections.
- Call and text actions for `(714) 600-7134` / `7146007134`.

Require the paid route to have:

- `noindex,follow`, canonical `/commercial-window-film`, `data-lead-service="commercial_window_film"`, and `data-lead-variant="commercial_socal_v1"`.
- Call CTA before text CTA before the qualifier.
- Anchors `#solutions`, `#process`, `#privacy-decorative`, and `#site-review`.
- Sticky mobile call/text controls, no Square/booking URL, and `lead-tracking.js`.
- Commercial-only event names and zero residential/automotive tracking labels.

Require route plumbing and sitemap behavior: both local routes resolve, only the organic route is in `sitemap.xml`, and the paid route is covered by noindex headers.

**Step 2: Write qualifier model tests**

Specify a pure CommonJS-compatible API from `lib/commercial-qualifier.js`:

- `QUESTIONS` exposes four ordered questions with the approved choices.
- `selectAnswer(state, questionId, choiceId)` returns new state without mutating input.
- `isComplete(state)` is true only after all four answers.
- `buildSummary(state)` creates a readable property/goal/scope/timing summary.
- `buildTextMessage(state)` requests the property city, photos, and rough measurements and includes all four answers.
- Invalid question/choice IDs throw useful errors.

Run:

- `node scripts/test-commercial-window-film-pages.mjs`
- `node scripts/test-commercial-window-film-qualifier.mjs`

Expected: FAIL because the pages, qualifier module, and route registrations do not exist.

**Step 3: Add both tests to `test:tracking`**

Insert both new tests after the existing paid-landing tests so the full suite enforces the new contracts.

**Step 4: Commit tests only**

Stage the two test files and `package.json`; commit with: `Test commercial window film funnel`

---

### Task 3: Implement Both Pages, Qualifier, Tracking, and Route Plumbing

**Files:**
- Create: `commercial-window-film`
- Create: `commercial-window-film-socal`
- Create: `commercial-window-film.css`
- Create: `lib/commercial-qualifier.js`
- Create: `commercial-window-film-qualifier.js`
- Modify: `dev_server.py`
- Modify: `vercel.json`
- Modify: `sitemap.xml`

**Step 1: Implement the pure qualifier model**

Implement exactly the tested four-step data model. Keep state immutable, validate all choices, and return a URL-ready message body without claiming the text has been sent or the lead has qualified.

**Step 2: Build the organic service page**

Use the established Obsidian header/footer and visual tokens. Build a concise commercial page covering solar/heat/glare, privacy/decorative, safety/security, UV/fade, property types, project process, and site-review CTAs. Add honest `Service` and `LocalBusiness` schema, a self-canonical, index/follow, and an application-examples label for any generic imagery.

**Step 3: Build the paid landing page**

Reuse the paid-page shell and create a focused commercial layout with:

- Commercial H1 and Orange County/Southern California service copy.
- Primary `tel:+17146007134` CTA followed by a prefilled `sms:+17146007134` CTA.
- Solution, process, privacy/decorative, and site-review sections matching the sitelink anchors.
- The four-step qualifier and a result screen with call, prefilled text, and start-over controls.
- Sticky mobile call/text actions.
- `data-lead-action` values that let `lead-tracking.js` retain first-touch and click attribution.

The qualifier controller emits only secondary first-party events: `commercial_qualifier_started`, `commercial_qualifier_answered`, `commercial_qualifier_completed`, and `commercial_qualifier_restarted`. It must not fire a Google Ads conversion for answers or completion.

**Step 4: Wire routes, sitemap, and headers**

Register extensionless local routes in `dev_server.py`. Add the organic URL to `sitemap.xml`. Ensure `vercel.json` gives the paid route a `X-Robots-Tag: noindex, follow` response header without adding it to the sitemap.

**Step 5: Run focused and full verification**

Run:

- `node scripts/test-commercial-window-film-pages.mjs`
- `node scripts/test-commercial-window-film-qualifier.mjs`
- `npm run test:tracking`

Expected: all pass.

Start `python3 dev_server.py`, then verify `200` for both routes and referenced local CSS/JS assets. Use browser checks at 390x844 and 1440x900 to complete the qualifier, verify the composed text, test start-over, and confirm no console errors.

**Step 6: Commit**

Stage only the Task 3 production files and commit with: `Build commercial window film funnel`

---

### Task 4: Build and Test the Guarded Google Ads Stager

**Files:**
- Create: `ops/google-ads/google_ads_rest.py`
- Create: `ops/google-ads/stage_commercial_campaign.py`
- Create: `ops/google-ads/tests/test_stage_commercial_campaign.py`
- Create: `docs/evidence/commercial-google-ads-plan.json`

**Step 1: Write failing mutation-plan tests**

Test pure operation builders and validators for:

- One dedicated standard budget and one paused Search campaign using Manual CPC, Search Partners off, Display off, presence-only geography, and English.
- Exact 19 positive and four negative geo criteria cloned from the live source resource names.
- Four ad groups, exact/phrase keywords only, campaign negatives, and one paused RSA per ad group.
- Each RSA has unique policy-safe headlines/descriptions within Google limits and uses the live paid final URL.
- Existing eligible call asset `customers/8605345590/assets/320657161326` plus four sitelinks, four callouts, and one structured snippet.
- A commercial custom goal containing only canonical 60-second calls from ads and qualified 60-second website calls.
- A distinct secondary `Commercial Consultation Request - Obsidian` action that is not biddable until a verified submission exists.
- Default invocation performs validation/read-only output only; `--apply` is mandatory for writes; enabling requires a separate `--enable` phase and cannot be combined with initial creation.
- Idempotency: exact expected resources may be reused; any same-name drift aborts.

Run: `python3 -m unittest ops/google-ads/tests/test_stage_commercial_campaign.py`

Expected: FAIL because the stager does not exist.

**Step 2: Implement the REST client and pure operation plan**

Create a small API v24 client that supports authenticated GAQL search, mutate calls, request-ID capture, and redaction. The stager must:

- Validate customer/account identity, source geography fingerprint, conversion resources, and call asset before planning writes.
- Print a deterministic redacted plan and save it to `docs/evidence/commercial-google-ads-plan.json` during validation.
- On `--apply`, create resources in dependency order and preserve a recovery manifest after every successful mutation.
- Create the campaign and all ads paused, then read back and compare every field.
- Never enable during initial apply.

**Step 3: Verify validation-only behavior**

Run:

- `python3 -m unittest ops/google-ads/tests/test_stage_commercial_campaign.py`
- `python3 ops/google-ads/stage_commercial_campaign.py --env-file "/Users/tommybutcher/Documents/New project 10/.env" --validate --evidence docs/evidence/commercial-google-ads-plan.json`

Expected: tests pass; live validation makes no mutations; evidence fingerprints the source locations, conversions, call asset, final keyword/bid set, RSAs, and asset plan.

**Step 4: Commit**

Stage only the Task 4 files and commit with: `Add guarded commercial Ads stager`

---

### Task 5: Stage the Complete Campaign Paused and Read It Back

**Controller-owned external action; no implementation subagent performs this task.**

**Evidence files:**
- Modify: `docs/evidence/commercial-google-ads-plan.json`
- Create: `docs/evidence/2026-08-08-commercial-google-ads-apply.json`
- Create: `docs/evidence/2026-08-08-commercial-google-ads-readback.json`

**Step 1: Run a final dry run**

Run the validation command from Task 4 and compare its plan fingerprint with the committed configuration and keyword evidence.

**Step 2: Apply while paused**

Run `stage_commercial_campaign.py` with `--apply`, the approved customer ID, and an explicit apply confirmation token defined by the script. Capture redacted request IDs/resource names.

Expected: the budget, paused campaign, locations, four ad groups, exact/phrase keywords, negatives, four paused RSAs, call/sitelink/callout/snippet assets, secondary consultation action, and commercial custom goal exist. Existing campaigns remain unchanged.

**Step 3: Read back independently**

Use GAQL read-only queries to verify the campaign configuration, locations, ads, assets, and goals. Write the readback artifact. Confirm the campaign status is `PAUSED` and no resource points to a residential, automotive, Square, or generic website-lead action.

**Step 4: Commit redacted evidence**

Stage only the three evidence files and commit with: `Record paused commercial Ads campaign`

---

### Task 6: Deploy the Website to Production and Verify It

**Controller-owned external action; no implementation subagent performs this task.**

**Files:**
- Create: `docs/evidence/2026-08-08-commercial-production-verification.md`

**Step 1: Rebase-risk and diff audit**

Fetch the remote, compare the feature branch with its base and current deployment branch, and confirm only intended website/ops/evidence files will ship. Never overwrite unrelated user work.

**Step 2: Run release verification**

Run `npm run test:tracking`, both focused Python suites, and local route checks. Inspect the exact staged diff and confirm no tracked `node_modules`, `.env`, token, or credential file is staged.

**Step 3: Deploy to the linked Vercel production project**

Use the existing verified project linkage and production deployment flow. Record the deployment ID/URL and commit SHA. A preview deployment is not production proof.

**Step 4: Verify production**

Check both final URLs return `200`; verify robots/canonical/schema/sitemap contracts and all CSS/JS assets; complete the qualifier at 390px and inspect the paid page at 1440px; confirm no console errors. Send one explicitly non-conversion test event through `/api/lead-events` and verify success without clicking a call/text CTA.

**Step 5: Commit verification evidence**

Stage only the production verification file and commit with: `Verify commercial funnel in production`

---

### Task 7: Final Google Ads Audit — Stop One Button Before Launch

**Controller-owned external action; no implementation subagent performs this task.**

**Files:**
- Create: `docs/evidence/2026-08-08-commercial-launch-readiness.md`

**Step 1: Validate destination and submit ads for review**

With the campaign still paused, verify the production final URL from the Ads environment and change the four RSAs from paused to enabled while leaving the campaign paused. This allows policy review without serving.

**Step 2: Run an independent final readback**

Verify:

- Campaign name, ID, paused status, $25/day budget, Manual CPC, Search-only networks, English, and presence-only targeting.
- Exactly 19 included and four excluded cities.
- Four enabled ad groups, intended exact/phrase keywords, and one enabled/submitted RSA per ad group.
- Eligible call asset and all requested sitelink, callout, and structured-snippet associations.
- Commercial custom goal includes only the two approved 60-second call outcomes; proxy/text/quiz/residential/automotive/Square actions are not biddable.
- Production final URL returns `200`.

**Step 3: Prove the final action boundary**

Run the stager's separate `--enable` phase in validation-only mode and save the exact single campaign-status mutation it would make. Do not apply it. Confirm the remaining user action is only the Google Ads `Enable` control for `Search | OC | Commercial Window Film | Obsidian Build`.

**Step 4: Record launch readiness**

Write the readiness artifact with campaign ID, final URL, deployment ID, Ads policy states, any Google review delays, and the literal one-button instruction. Keep technical readiness separate from ad approval, serving, qualified opportunities, and revenue.

**Step 5: Final review and verification**

Use `superpowers:requesting-code-review` for an independent repository review, resolve all critical/important findings, then use `superpowers:verification-before-completion`. Rerun every relevant test and live readback immediately before reporting completion.

**Step 6: Commit**

Stage only the readiness artifact and any reviewed fixes; commit with: `Finalize commercial launch readiness`
