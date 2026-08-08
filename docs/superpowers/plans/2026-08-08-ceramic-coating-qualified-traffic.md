# Ceramic Coating Qualified-Traffic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Price-qualify ceramic-coating traffic at $795 in the two highest-volume ad groups, publish the approved four-package ladder, and preserve trustworthy qualified-call attribution without changing budget, bidding, geography, or protected ad groups.

**Architecture:** The website remains a static Vercel site with shared JavaScript attribution. A guarded Python Google Ads REST workflow performs exact live-state validation, creates one replacement RSA in Core and one in Cost + Paint Correction, and permits old-ad pausing only after the new ads are approved and eligible. Redacted evidence snapshots make every external change auditable and rerunnable.

**Tech Stack:** Static HTML/CSS, Node.js contract tests, Python 3.14, Google Ads REST API v24, existing `ops/google-ads/google_ads_rest.py`, Vercel.

## Global Constraints

- Target only customer `8591070105`, campaign `24054610950`, Core ad group `199530647918`, and Cost + Paint Correction ad group `199530568558`.
- Keep the paused duplicate campaign `24058475904` in customer `8605345590` paused.
- Keep $71 per day, Manual CPC, Google Search only, presence-only geography, and the current 7:00 AM to 9:00 PM daily schedule.
- Do not change Cities ad group `199530570158` or Luxury + EV ad group `199530652518`.
- Do not describe the supplied protection terms as warranties.
- Keep phone and text clicks secondary; use the existing 60-second website-call destination as the qualified-call signal.
- Do not attribute aggregate Square revenue to Google Ads.
- Do not delete historical ads. Pause overlapping ads only after replacements are approved and eligible.
- Never commit `.env`, credentials, access tokens, raw request IDs, or unredacted Google Ads errors.

---

### Task 1: Publish the approved package ladder in the page contracts

**Files:**
- Modify: `scripts/test-ceramic-coating-page.mjs`
- Modify: `scripts/test-paid-landing-variants.mjs`
- Modify: `ceramic-coating`
- Modify: `ceramic-coating-cost-paint-correction`
- Modify: `paid-landing.css`

**Interfaces:**
- Consumes: the four approved package definitions in `docs/superpowers/specs/2026-08-08-ceramic-coating-qualified-traffic-design.md`.
- Produces: page contracts that require a $795 floor, all four package names, exact GYEON products, exact price ranges, exact protection terms, and the absence of obsolete prices.

- [ ] **Step 1: Add failing general-page price assertions**

Replace the `$550` assertion in `scripts/test-ceramic-coating-page.mjs` with:

```js
assert.match(page, /Packages from \$795/);
assert.match(page, /Paint correction is included in every package/);
assert.doesNotMatch(page, /Packages? (?:start|from|starting at) \$(?:550|700|900)/i);
```

- [ ] **Step 2: Add failing package-detail assertions**

After the existing `coatingCost` setup in `scripts/test-paid-landing-variants.mjs`, add:

```js
for (const required of [
  'Ceramic Refresh Package',
  'GYEON CanCoat EVO',
  '1.5–2 years',
  '$795–$995',
  'Premium Protection Package',
  'GYEON Pure EVO',
  '2–3 years',
  '$1,295–$1,695',
  'Signature Correction &amp; Coating',
  'GYEON Mohs EVO',
  '4 years',
  '$2,495–$2,995',
  'Concours Package',
  'GYEON Syncro EVO',
  '$3,500+'
]) {
  assert.ok(coatingCost.includes(required), `Coating cost page must include ${required}.`);
}
assert.match(coatingCost, /Most popular/i);
assert.match(coatingCost, /Flagship package/i);
assert.doesNotMatch(coatingCost, /\$(?:550|700|900)\b/);
assert.doesNotMatch(coatingCost, /warrant(?:y|ies)/i);
```

- [ ] **Step 3: Run the focused tests and confirm the old copy fails**

Run:

```bash
node scripts/test-ceramic-coating-page.mjs
node scripts/test-paid-landing-variants.mjs
```

Expected: both commands fail on the new `$795` or four-package assertions while the source still contains `$550/$700/$900`.

- [ ] **Step 4: Update the general ceramic-coating page**

In `ceramic-coating`, keep the result-led heading and replace the hero copy and price link with:

```html
<p class="coating-hero__copy">Paint preparation, correction, and ceramic protection brought to a suitable home or
    workplace. Packages start at $795.</p>
```

Replace the existing `coating-hero__price-link` element with:

```html
<p class="coating-hero__price-link"><a
        href="/ceramic-coating-cost-paint-correction#packages">Packages from $795. Paint correction is included in
        every package.</a></p>
```

Update the meta description to include `packages from $795` without replacing the existing Orange County/mobile positioning.

- [ ] **Step 5: Replace the cost-page package grid**

Replace the current three `paid-package` cards inside `#packages` with:

```html
<article class="paid-package">
  <div class="paid-package__title"><p class="paid-package__label">Protection on a budget</p><h3>Ceramic Refresh Package</h3></div>
  <div><p>Exterior detail, iron decontamination, clay treatment when needed, and one-step paint correction.</p>
  <p><strong>GYEON CanCoat EVO</strong> · 1.5–2 years</p>
  </div>
  <div class="paid-package__price"><small>Starting range</small>$795–$995</div>
</article>
<article class="paid-package paid-package--featured">
  <div class="paid-package__title"><p class="paid-package__label">Most popular</p><h3>Premium Protection Package</h3></div>
  <div><p>Full exterior detail, decontamination, clay treatment, and one-step or light two-step paint correction.</p>
  <p><strong>GYEON Pure EVO</strong> · 2–3 years</p>
  </div>
  <div class="paid-package__price"><small>Starting range</small>$1,295–$1,695</div>
</article>
<article class="paid-package">
  <div class="paid-package__title"><p class="paid-package__label">Flagship package</p><h3>Signature Correction &amp; Coating</h3></div>
  <div><p>Complete exterior preparation and two-step paint correction.</p>
  <p><strong>GYEON Mohs EVO</strong> · 4 years</p>
  </div>
  <div class="paid-package__price"><small>Starting range</small>$2,495–$2,995</div>
</article>
<article class="paid-package">
  <div class="paid-package__title"><p class="paid-package__label">Exotics, collectors, and enthusiasts</p><h3>Concours Package</h3></div>
  <div><p>Multi-stage paint correction, wheel coating, and glass coating.</p>
  <p><strong>GYEON Syncro EVO</strong></p>
  </div>
  <div class="paid-package__price"><small>Starting at</small>$3,500+</div>
</article>
```

Change all remaining cost-page `$550` claims to `$795`, and replace the old meta description with one that accurately says `four packages from $795`.

- [ ] **Step 6: Add minimal package emphasis styles**

Add to `paid-landing.css` next to `.paid-package`:

```css
.paid-package--featured {
  border-color: var(--paid-coral);
  box-shadow: inset 0 4px 0 var(--paid-coral);
}

.paid-package__label {
  margin: 0 0 0.65rem;
  color: var(--paid-coral);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

- [ ] **Step 7: Run focused and full site tests**

Run:

```bash
node scripts/test-ceramic-coating-page.mjs
node scripts/test-paid-landing-variants.mjs
npm run test:tracking
```

Expected: all commands exit `0`, the qualified website-call config remains present, and no unrelated paid-page contract changes.

- [ ] **Step 8: Commit the page and test changes**

```bash
git add ceramic-coating ceramic-coating-cost-paint-correction paid-landing.css scripts/test-ceramic-coating-page.mjs scripts/test-paid-landing-variants.mjs
git commit -m "feat: publish qualified ceramic coating package pricing"
```

---

### Task 2: Define exact price-led Google Ads resources

**Files:**
- Create: `ops/google-ads/ceramic_price_qualification_config.py`
- Create: `ops/google-ads/tests/test_ceramic_price_qualification_config.py`

**Interfaces:**
- Consumes: exact account/campaign/ad-group identities and approved package floor.
- Produces: immutable `CORE_RSA` and `COST_RSA` dictionaries plus protected resource IDs for the guarded mutation workflow.

- [ ] **Step 1: Write failing immutable-config tests**

Create `ops/google-ads/tests/test_ceramic_price_qualification_config.py` with tests that assert:

```python
import unittest
import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "ceramic_price_qualification_config.py"
SPEC = importlib.util.spec_from_file_location("ceramic_price_qualification_config", MODULE_PATH)
config = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(config)


class CeramicPriceQualificationConfigTests(unittest.TestCase):
    def test_scope_is_exact(self):
        self.assertEqual(config.MANAGER_ACCOUNT_ID, "2189276309")
        self.assertEqual(config.CUSTOMER_ID, "8591070105")
        self.assertEqual(config.CAMPAIGN_ID, "24054610950")
        self.assertEqual(config.CORE_AD_GROUP_ID, "199530647918")
        self.assertEqual(config.COST_AD_GROUP_ID, "199530568558")
        self.assertEqual(config.PROTECTED_AD_GROUP_IDS, {"199530570158", "199530652518"})

    def test_price_is_visible_and_pinned(self):
        for ad in (config.CORE_RSA, config.COST_RSA):
            self.assertEqual(ad["headlines"][0]["pinnedField"], "HEADLINE_1")
            self.assertIn("$795", ad["headlines"][0]["text"])
            self.assertTrue(all(len(item["text"]) <= 30 for item in ad["headlines"]))
            self.assertTrue(all(len(item["text"]) <= 90 for item in ad["descriptions"]))
            self.assertEqual(len(ad["headlines"]), 15)
            self.assertEqual(len(ad["descriptions"]), 4)

    def test_only_approved_cutover_ads_are_named(self):
        self.assertEqual(config.OLD_CORE_AD_IDS, {"818560843375"})
        self.assertEqual(config.OLD_COST_AD_IDS, {"818560843378", "819021913646"})


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the config test and confirm import failure**

```bash
python3 -m unittest ops/google-ads/tests/test_ceramic_price_qualification_config.py -v
```

Expected: FAIL because `ceramic_price_qualification_config.py` does not exist.

- [ ] **Step 3: Create the immutable config**

Create `ops/google-ads/ceramic_price_qualification_config.py` with the exact identities above, both confirmation tokens, old ad IDs, protected ad-group IDs, and these RSA assets:

```python
CORE_HEADLINES = (
    {"text": "Ceramic Coating From $795", "pinnedField": "HEADLINE_1"},
    {"text": "Mobile Ceramic Coating"},
    {"text": "Orange County Ceramic Care"},
    {"text": "Paint Correction Included"},
    {"text": "GYEON Coating Packages"},
    {"text": "1.5–4 Years of Protection"},
    {"text": "Packages for Daily Drivers"},
    {"text": "Protect New Vehicle Paint"},
    {"text": "Premium Prep and Coating"},
    {"text": "Text Photos for a Quote"},
    {"text": "Call Obsidian Autoworks"},
    {"text": "OC Mobile Coating Service"},
    {"text": "Deeper Gloss, Easier Care"},
    {"text": "Four Coating Package Levels"},
    {"text": "Match Protection to Your Car"},
)
CORE_DESCRIPTIONS = (
    {"text": "Mobile Orange County coating packages start at $795 with paint correction included."},
    {"text": "Choose GYEON protection from 1.5 to 4 years based on your car and paint condition."},
    {"text": "Text clear vehicle photos or call Obsidian for the right correction and coating plan."},
    {"text": "Four package levels for newer vehicles, daily drivers, enthusiast cars, and exotics."},
)
COST_HEADLINES = (
    {"text": "Ceramic Coating Cost $795+", "pinnedField": "HEADLINE_1"},
    {"text": "Packages From $795"},
    {"text": "Compare Four Coating Packages"},
    {"text": "Paint Correction Included"},
    {"text": "GYEON Coating Packages"},
    {"text": "Refresh Package $795–$995"},
    {"text": "Premium From $1,295"},
    {"text": "Signature From $2,495"},
    {"text": "Concours From $3,500"},
    {"text": "1.5–4 Years of Protection"},
    {"text": "Orange County Mobile Service"},
    {"text": "Text Photos for Final Scope"},
    {"text": "Match Coating to Your Paint"},
    {"text": "Prep, Correction and Coating"},
    {"text": "Call Obsidian Autoworks"},
)
COST_DESCRIPTIONS = (
    {"text": "Compare four Orange County ceramic coating packages from $795 to $3,500+."},
    {"text": "Every package includes preparation and paint correction matched to your vehicle."},
    {"text": "Choose GYEON CanCoat, Pure, Mohs, or Syncro EVO with 1.5 to 4 year protection."},
    {"text": "Call or text paint photos for package guidance, final scope, and scheduling."},
)
```

Set `CORE_RSA.finalUrls` to `https://www.obsidianautoworksoc.com/ceramic-coating`, `path1` to `ceramic-coating`, and `path2` to `packages-795`. Set `COST_RSA.finalUrls` to `https://www.obsidianautoworksoc.com/ceramic-coating-cost-paint-correction#packages`, `path1` to `coating-cost`, and `path2` to `from-795`.

- [ ] **Step 4: Run the config tests**

```bash
python3 -m unittest ops/google-ads/tests/test_ceramic_price_qualification_config.py -v
```

Expected: PASS with all copy inside Google Ads limits.

- [ ] **Step 5: Commit the immutable ad configuration**

```bash
git add ops/google-ads/ceramic_price_qualification_config.py ops/google-ads/tests/test_ceramic_price_qualification_config.py
git commit -m "feat: define ceramic coating price-led ads"
```

---

### Task 3: Build the guarded Ads create-and-cutover workflow

**Files:**
- Create: `ops/google-ads/apply_ceramic_price_qualification.py`
- Create: `ops/google-ads/tests/test_apply_ceramic_price_qualification.py`
- Reuse: `ops/google-ads/google_ads_rest.py`

**Interfaces:**
- Consumes: `CORE_RSA`, `COST_RSA`, protected IDs, old ad IDs, and exact campaign guards from Task 2.
- Produces: `--validate`, `--apply-create`, and `--cutover` commands plus redacted JSON evidence.

- [ ] **Step 1: Write failing workflow tests**

Create tests using this concrete fake client and import path:

```python
import copy
import importlib.util
import json
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "apply_ceramic_price_qualification.py"
SPEC = importlib.util.spec_from_file_location("apply_ceramic_price_qualification", MODULE_PATH)
workflow = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(workflow)


class FakeClient:
    def __init__(self):
        self.mutations = []

    def mutate(self, service, operations):
        self.mutations.append((service, operations))
        return {"http_status": 200, "request_id": "sensitive-request-id", "results": []}


def valid_snapshot():
    return {
        "customer_id": "8591070105",
        "campaign": {
            "id": "24054610950",
            "name": "Search | OC | Ceramic Coating | Obsidian Build",
            "status": "ENABLED",
            "budget_micros": 71_000_000,
            "bidding": "MANUAL_CPC",
            "search_network": True,
            "search_partners": False,
            "display_network": False,
            "positive_geo_target_type": "PRESENCE",
            "negative_geo_target_type": "PRESENCE",
        },
        "ad_groups": {
            "199530570158": {"name": "Ceramic Coating - Cities", "status": "ENABLED"},
            "199530647918": {"name": "Ceramic Coating - Core", "status": "ENABLED"},
            "199530652518": {"name": "Ceramic Coating - Luxury + EV", "status": "ENABLED"},
            "199530568558": {"name": "Coating Cost + Paint Correction", "status": "ENABLED"},
        },
        "ads": [
            {"ad_group_id": "199530647918", "ad_id": "818560843375", "status": "ENABLED", "headlines": [{"text": "Ceramic Coating Near Me"}]},
            {"ad_group_id": "199530568558", "ad_id": "818560843378", "status": "ENABLED", "headlines": [{"text": "Ceramic Coating Cost"}]},
            {"ad_group_id": "199530568558", "ad_id": "819021913646", "status": "ENABLED", "headlines": [{"text": "Ceramic Coating Cost"}]},
        ],
        "schedule": [{"day": day, "start_hour": 7, "end_hour": 21} for day in ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY")],
        "negative_keywords": [{"text": f"guard-negative-{index}"} for index in range(59)],
        "website_call": {"status": "ENABLED", "call_length_seconds": 60},
        "duplicate": {"customer_id": "8605345590", "campaign_id": "24058475904", "status": "PAUSED"},
        "last_serving_date": "2026-08-05",
    }


class WorkflowTests(unittest.TestCase):
    def test_validate_never_mutates(self):
        client = FakeClient()
        workflow.validate_snapshot(valid_snapshot())
        self.assertEqual(client.mutations, [])

    def test_wrong_budget_blocks_create(self):
        snapshot = valid_snapshot()
        snapshot["campaign"]["budget_micros"] = 72_000_000
        with self.assertRaises(workflow.GuardError):
            workflow.build_create_operations(snapshot)

    def test_manual_cpc_and_search_only_are_required(self):
        for field, value in (("bidding", "MAXIMIZE_CONVERSIONS"), ("search_partners", True), ("display_network", True)):
            snapshot = valid_snapshot()
            snapshot["campaign"][field] = value
            with self.assertRaises(workflow.GuardError):
                workflow.validate_snapshot(snapshot)

    def test_create_builds_two_enabled_operations_without_protected_groups(self):
        operations = workflow.build_create_operations(valid_snapshot())
        payload = json.dumps(operations)
        self.assertEqual(len(operations), 2)
        self.assertNotIn("199530570158", payload)
        self.assertNotIn("199530652518", payload)
        self.assertTrue(all(item["adGroupAdOperation"]["create"]["status"] == "ENABLED" for item in operations))

    def test_create_is_idempotent_when_exact_price_ads_exist(self):
        snapshot = valid_snapshot()
        snapshot["ads"].extend(workflow.expected_price_ad_snapshots())
        self.assertEqual(workflow.build_create_operations(snapshot), [])

    def test_cutover_blocks_pending_replacement(self):
        snapshot = valid_snapshot()
        replacements = workflow.expected_price_ad_snapshots()
        replacements[0]["policy_approval_status"] = "REVIEW_IN_PROGRESS"
        snapshot["ads"].extend(replacements)
        with self.assertRaises(workflow.GuardError):
            workflow.build_cutover_operations(snapshot)

    def test_cutover_pauses_only_three_named_ads(self):
        snapshot = valid_snapshot()
        snapshot["ads"].extend(workflow.expected_price_ad_snapshots())
        operations = workflow.build_cutover_operations(snapshot)
        resources = {
            item["adGroupAdOperation"]["update"]["resourceName"]
            for item in operations
        }
        self.assertEqual(resources, {
            "customers/8591070105/adGroupAds/199530647918~818560843375",
            "customers/8591070105/adGroupAds/199530568558~818560843378",
            "customers/8591070105/adGroupAds/199530568558~819021913646",
        })

    def test_evidence_redacts_request_id(self):
        evidence = workflow.build_evidence("apply-create", valid_snapshot(), [], {"request_id": "sensitive-request-id"})
        self.assertNotIn("sensitive-request-id", json.dumps(evidence))
```

`expected_price_ad_snapshots()` returns two enabled, approved, eligible snapshots using the exact Task 2 assets. The default values are `policy_approval_status="APPROVED"` and `primary_status="ELIGIBLE"`; individual tests may override them as shown.
```

The fake snapshot must contain a $71,000,000 budget, Manual CPC campaign, disabled search partners/display, the four exact ad groups, current enabled historical ads, 59 existing campaign negatives, the current seven-day schedule, and the 60-second website-call conversion.

- [ ] **Step 2: Run the workflow test and confirm import failure**

```bash
python3 -m unittest ops/google-ads/tests/test_apply_ceramic_price_qualification.py -v
```

Expected: FAIL because `apply_ceramic_price_qualification.py` does not exist.

- [ ] **Step 3: Implement read-only snapshot and hard guards**

Implement these public functions with the stated return types:

- `run_snapshot_queries(client) -> dict[str, list[dict]]`
- `validate_snapshot(raw: dict[str, list[dict]]) -> dict[str, object]`
- `expected_price_ad_snapshots() -> list[dict[str, object]]`
- `exact_ad_exists(snapshot: dict[str, object], expected_ad: dict[str, object], ad_group_id: str) -> bool`
- `build_create_operations(snapshot: dict[str, object]) -> list[dict[str, object]]`
- `build_cutover_operations(snapshot: dict[str, object]) -> list[dict[str, object]]`
- `build_evidence(mode: str, snapshot: dict[str, object], operations: list[dict[str, object]], result: dict[str, object] | None) -> dict[str, object]`

`validate_snapshot` must reject any mismatch in customer, campaign ID/name/status, budget, Manual CPC, network settings, location mode, schedule, four ad-group identities, landing URLs, protected ad groups, or paused duplicate readback. It must report the post-August-5 delivery gap without inventing a mutation to fix it.

- [ ] **Step 4: Implement exact create operations**

Each create operation must use:

```python
{
  "adGroupAdOperation": {
    "create": {
      "adGroup": f"customers/{config.CUSTOMER_ID}/adGroups/{ad_group_id}",
      "status": "ENABLED",
      "ad": {
        "finalUrls": ad["finalUrls"],
        "responsiveSearchAd": {
          "headlines": ad["headlines"],
          "descriptions": ad["descriptions"],
          "path1": ad["path1"],
          "path2": ad["path2"],
        },
      },
    }
  }
}
```

Send both operations through one `googleAds:mutate` batch with `partialFailure: false`. If both exact ads already exist, send zero operations and return a readback-only result.

- [ ] **Step 5: Implement approval-gated cutover operations**

Require both new ads to have `policyApprovalStatus == APPROVED`, enabled status, and an eligible primary status. Then build only these updates:

```python
{
  "adGroupAdOperation": {
    "update": {
      "resourceName": f"customers/{config.CUSTOMER_ID}/adGroupAds/{ad_group_id}~{ad_id}",
      "status": "PAUSED",
    },
    "updateMask": "status",
  }
}
```

The permitted pairs are Core `199530647918~818560843375` and Cost `199530568558~818560843378`, `199530568558~819021913646`. Any additional resource must raise `GuardError`.

- [ ] **Step 6: Implement CLI confirmation gates**

Use these exact modes and tokens:

```text
--validate
--apply-create --confirm CREATE_CERAMIC_PRICE_RSAS_2026_08_08
--cutover --confirm PAUSE_UNPRICED_RSAS_AFTER_APPROVAL_2026_08_08
```

Load credentials from an explicit `--env-file`. Build the scoped client with constant customer `8591070105` and manager `2189276309`; do not rewrite the `.env` file, whose default customer belongs to the separate Obsidian account.

- [ ] **Step 7: Run workflow and existing Ads tests**

```bash
python3 -m unittest ops/google-ads/tests/test_apply_ceramic_price_qualification.py -v
python3 -m unittest discover -s ops/google-ads/tests -p 'test_*.py' -v
```

Expected: PASS; validation tests prove no mutate call occurs in `--validate` mode.

- [ ] **Step 8: Commit the guarded workflow**

```bash
git add ops/google-ads/apply_ceramic_price_qualification.py ops/google-ads/tests/test_apply_ceramic_price_qualification.py
git commit -m "feat: guard ceramic coating ad cutover"
```

---

### Task 4: Verify and deploy the landing pages

**Files:**
- Verify: `ceramic-coating`
- Verify: `ceramic-coating-cost-paint-correction`
- Create: `docs/evidence/2026-08-08-ceramic-price-site-verification.md`

**Interfaces:**
- Consumes: passing site contracts from Task 1.
- Produces: one Vercel preview, one verified production deployment, and a secret-free evidence note.

- [ ] **Step 1: Run the full test suite from a clean source tree**

```bash
npm run test:tracking
git diff --check
```

Expected: exit `0`.

- [ ] **Step 2: Link the clean worktree to the existing Vercel project**

Use the existing authenticated Vercel scope and project `vercel-kislev-obsidian`; do not copy `.env.preview.local` into Git.

- [ ] **Step 3: Deploy and verify a preview**

Deploy a preview, then verify both routes at desktop and 390px phone width. Confirm the $795 qualifier is above the fold, four package cards are readable, phone/text links remain correct, and the page loads `AW-18301955625/1asCCLrhh9wcEKnchpdE`.

- [ ] **Step 4: Deploy production and perform HTTP readback**

Verify production responses contain:

```text
Packages from $795
Ceramic Refresh Package
Premium Protection Package
Signature Correction & Coating
Concours Package
AW-18301955625/1asCCLrhh9wcEKnchpdE
```

Verify production responses do not contain `$550`, `$700`, or `$900` package claims.

- [ ] **Step 5: Save the site evidence and commit it**

The evidence note records commit, preview URL, production URL, timestamps, response checks, and test commands without credentials.

```bash
git add docs/evidence/2026-08-08-ceramic-price-site-verification.md
git commit -m "docs: verify ceramic pricing deployment"
```

---

### Task 5: Validate and create the price-led Ads

**Files:**
- Create: `docs/evidence/2026-08-08-ceramic-price-ads-before.json`
- Create: `docs/evidence/2026-08-08-ceramic-price-ads-create.json`
- Verify: `ops/google-ads/apply_ceramic_price_qualification.py`

**Interfaces:**
- Consumes: live production pages and guarded Ads workflow.
- Produces: two enabled price-led RSAs submitted for review with complete live readback.

- [ ] **Step 1: Run read-only validation**

```bash
python3 ops/google-ads/apply_ceramic_price_qualification.py \
  --env-file "/Users/tommybutcher/Documents/New project 10/.env" \
  --validate \
  --evidence docs/evidence/2026-08-08-ceramic-price-ads-before.json
```

Expected: exact target and protected-state guards pass; zero mutations occur.

- [ ] **Step 2: Review the generated operations locally**

Confirm the evidence contains exactly two `adGroupAdOperation.create` entries, no update/delete operations, the two approved final URLs, and no protected ad-group IDs.

- [ ] **Step 3: Create both replacement RSAs**

```bash
python3 ops/google-ads/apply_ceramic_price_qualification.py \
  --env-file "/Users/tommybutcher/Documents/New project 10/.env" \
  --apply-create \
  --confirm CREATE_CERAMIC_PRICE_RSAS_2026_08_08 \
  --evidence docs/evidence/2026-08-08-ceramic-price-ads-create.json
```

Expected: one atomic batch creates exactly two enabled RSAs, or an idempotent readback proves the exact ads already exist.

- [ ] **Step 4: Re-read all protected campaign state**

Confirm $71/day, Manual CPC, schedule, networks, locations, all four ad-group bids/statuses, 59 campaign negatives, paused waste phrase, website-call action, Cities, Luxury + EV, and the paused duplicate are unchanged.

- [ ] **Step 5: Commit redacted create evidence**

```bash
git add docs/evidence/2026-08-08-ceramic-price-ads-before.json docs/evidence/2026-08-08-ceramic-price-ads-create.json
git commit -m "docs: record ceramic price-led ad creation"
```

---

### Task 6: Perform the approval-safe ad cutover

**Files:**
- Create: `docs/evidence/2026-08-08-ceramic-price-ads-cutover.json`

**Interfaces:**
- Consumes: two replacement RSAs from Task 5.
- Produces: approved price-led RSAs serving alone in Core and Cost + Paint Correction, with historical ads paused but retained.

- [ ] **Step 1: Run repeated read-only policy checks**

Use `--validate` to inspect the new ads. Do not call `--cutover` while either replacement is pending, under review, disapproved, limited, or otherwise ineligible.

- [ ] **Step 2: Execute cutover only after both approval guards pass**

```bash
python3 ops/google-ads/apply_ceramic_price_qualification.py \
  --env-file "/Users/tommybutcher/Documents/New project 10/.env" \
  --cutover \
  --confirm PAUSE_UNPRICED_RSAS_AFTER_APPROVAL_2026_08_08 \
  --evidence docs/evidence/2026-08-08-ceramic-price-ads-cutover.json
```

Expected: only the three named historical ads are paused. Nothing is removed.

- [ ] **Step 3: Verify post-cutover serving state**

Confirm one enabled, approved, price-led RSA in Core; one in Cost + Paint Correction; no enabled overlapping unpriced RSA in either; untouched Cities and Luxury + EV ads; and unchanged campaign settings.

- [ ] **Step 4: Commit the redacted cutover evidence**

```bash
git add docs/evidence/2026-08-08-ceramic-price-ads-cutover.json
git commit -m "docs: record ceramic price ad cutover"
```

If Google review is not complete during the implementation session, stop after Task 5 with old ads still serving, report the exact pending status, and retain the guarded Task 6 command for the first approved readback. Do not weaken the approval guard to force completion.

---

### Task 7: Final verification and handoff

**Files:**
- Modify: `docs/evidence/2026-08-08-ceramic-price-site-verification.md`

**Interfaces:**
- Consumes: production pages, Ads create/cutover evidence, and live campaign readback.
- Produces: a concise final record separating completed changes, pending policy review, and still-partial revenue attribution.

- [ ] **Step 1: Run fresh verification**

```bash
npm run test:tracking
python3 -m unittest discover -s ops/google-ads/tests -p 'test_*.py' -v
git diff --check
git status --short
```

Expected: all tests pass and only intentional evidence changes remain.

- [ ] **Step 2: Verify public pages independently**

Fetch both production routes and assert the six required production strings from Task 4, correct phone/text links, and absence of obsolete package claims.

- [ ] **Step 3: Verify live Ads independently**

Run a new GAQL readback rather than relying on mutation responses. Record new ad resource IDs, approval/primary statuses, enabled historical ads, budget, bidding, schedule, networks, locations, conversion configuration, and most recent serving date.

- [ ] **Step 4: Update and commit the handoff record**

Record whether Task 6 completed or remains approval-pending. Retain `PARTIAL` for ROI until a deterministic Ads-to-booking-to-payment join exists.

```bash
git add docs/evidence/2026-08-08-ceramic-price-site-verification.md
git commit -m "docs: complete ceramic qualified-traffic handoff"
```
