"""Contracts for the guarded commercial Google Ads campaign stager."""

from __future__ import annotations

import importlib.util
import inspect
import hashlib
import json
import re
import tempfile
import unittest
from pathlib import Path


ADS_DIR = Path(__file__).resolve().parents[1]
STAGER_PATH = ADS_DIR / "stage_commercial_campaign.py"
REST_PATH = ADS_DIR / "google_ads_rest.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"{path.name} is not importable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def source_locations(config):
    rows = []
    for city, item in config.INCLUDED_CITIES.items():
        rows.append(
            {
                "criterion_resource_name": f"customers/8605345590/campaignCriteria/24006593417~{item['geo_target_constant']}",
                "geo_target_constant": f"geoTargetConstants/{item['geo_target_constant']}",
                "negative": False,
                "status": "ENABLED",
                "city": city,
                "target_type": "City",
            }
        )
    for city, geo_id in config.EXCLUDED_CITIES.items():
        rows.append(
            {
                "criterion_resource_name": f"customers/8605345590/campaignCriteria/24006593417~{geo_id}",
                "geo_target_constant": f"geoTargetConstants/{geo_id}",
                "negative": True,
                "status": "ENABLED",
                "city": city,
                "target_type": "City",
            }
        )
    return rows


def valid_live_state(stager):
    return {
        "customer": {
            "id": "8605345590",
            "descriptiveName": "Obsidian Autoworks",
            "currencyCode": "USD",
            "timeZone": "America/Los_Angeles",
            "testAccount": False,
            "conversionTrackingStatus": "CONVERSION_TRACKING_MANAGED_BY_SELF",
            "googleAdsConversionCustomer": "customers/8605345590",
        },
        "source_campaign": {
            "resourceName": "customers/8605345590/campaigns/24006593417",
            "name": "Search | OC | Residential Window Film | Agency Build",
        },
        "source_locations": source_locations(stager.config),
        "conversion_actions": [
            {
                "resourceName": stager.CALLS_FROM_ADS_ACTION,
                "name": "Calls from ads",
                "status": "ENABLED",
                "type": "AD_CALL",
                "category": "PHONE_CALL_LEAD",
                "origin": "CALL_FROM_ADS",
                "primaryForGoal": True,
                "countingType": "ONE_PER_CLICK",
                "phoneCallDurationSeconds": "60",
            },
            {
                "resourceName": stager.QUALIFIED_WEBSITE_CALL_ACTION,
                "name": "Qualified Website Call - Obsidian",
                "status": "ENABLED",
                "type": "WEBSITE_CALL",
                "category": "PHONE_CALL_LEAD",
                "origin": "WEBSITE",
                "primaryForGoal": False,
                "countingType": "ONE_PER_CLICK",
                "phoneCallDurationSeconds": "60",
            },
        ],
        "call_asset": {
            "resourceName": stager.CALL_ASSET,
            "status": "ENABLED",
            "type": "CALL",
            "primaryStatus": "ELIGIBLE",
            "phoneNumber": "(714) 600-7134",
            "callConversionReportingState": "USE_ACCOUNT_LEVEL_CALL_CONVERSION_ACTION",
        },
        "customer_conversion_goals": [
            {"category": "PURCHASE", "origin": "WEBSITE"},
            {"category": "PAGE_VIEW", "origin": "GOOGLE_HOSTED"},
            {"category": "PHONE_CALL_LEAD", "origin": "WEBSITE"},
            {"category": "PHONE_CALL_LEAD", "origin": "CALL_FROM_ADS"},
            {"category": "PHONE_CALL_LEAD", "origin": "UNKNOWN"},
            {"category": "SUBMIT_LEAD_FORM", "origin": "WEBSITE"},
            {"category": "BOOK_APPOINTMENT", "origin": "WEBSITE"},
            {"category": "BOOK_APPOINTMENT", "origin": "CALL_FROM_ADS"},
            {"category": "GET_DIRECTIONS", "origin": "GOOGLE_HOSTED"},
            {"category": "CONTACT", "origin": "WEBSITE"},
            {"category": "CONTACT", "origin": "GOOGLE_HOSTED"},
            {"category": "ENGAGEMENT", "origin": "GOOGLE_HOSTED"},
        ],
        "named_resources": {
            "campaigns": [],
            "budgets": [],
            "ad_groups": [],
            "assets": [],
            "conversion_actions": [],
            "custom_goals": [],
        },
    }


class CommercialPlanTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.stager = load_module("stage_commercial_campaign", STAGER_PATH)
        cls.rest = load_module("google_ads_rest", REST_PATH)

    def setUp(self):
        self.plan = self.stager.build_plan(valid_live_state(self.stager))

    def test_campaign_is_paused_standard_manual_cpc_search_only_presence_only(self):
        self.assertEqual(self.plan["customer_id"], "8605345590")
        self.assertEqual(self.plan["budget"]["amount_micros"], 40_000_000)
        self.assertEqual(self.plan["budget"]["delivery_method"], "STANDARD")
        campaign = self.plan["campaign"]
        self.assertEqual(campaign["status"], "PAUSED")
        self.assertEqual(campaign["advertising_channel_type"], "SEARCH")
        self.assertEqual(campaign["bidding_strategy"], "MANUAL_CPC")
        self.assertFalse(campaign["enhanced_cpc_enabled"])
        self.assertEqual(
            campaign["network_settings"],
            {
                "target_google_search": True,
                "target_search_network": False,
                "target_content_network": False,
                "target_partner_search_network": False,
            },
        )
        self.assertEqual(
            campaign["geo_target_type_setting"],
            {"positive_geo_target_type": "PRESENCE", "negative_geo_target_type": "PRESENCE"},
        )
        self.assertEqual(campaign["language_constants"], ["languageConstants/1000"])
        self.assertEqual(campaign["devices"], ["DESKTOP", "MOBILE", "TABLET"])
        self.assertEqual(campaign["device_bid_modifiers"], {})

    def test_geography_clones_exact_live_19_positive_and_four_negative_city_ids(self):
        locations = self.plan["locations"]
        positives = [item for item in locations if not item["negative"]]
        negatives = [item for item in locations if item["negative"]]
        self.assertEqual(len(positives), 19)
        self.assertEqual(len(negatives), 4)
        self.assertTrue(all(item["target_type"] == "City" for item in locations))
        self.assertEqual(
            {item["geo_target_constant"] for item in positives},
            set(self.stager.config.city_geo_target_constants()),
        )
        self.assertEqual(
            {item["geo_target_constant"] for item in negatives},
            {f"geoTargetConstants/{geo_id}" for geo_id in self.stager.config.EXCLUDED_CITIES.values()},
        )
        self.assertTrue(all(item["source_criterion_resource_name"] for item in locations))

    def test_four_enabled_ad_groups_exact_phrase_keywords_and_paused_rsas(self):
        self.assertEqual(len(self.plan["ad_groups"]), 4)
        for group in self.plan["ad_groups"]:
            self.assertEqual(group["status"], "ENABLED")
            self.assertGreater(group["cpc_bid_micros"], 0)
            self.assertTrue(group["keywords"])
            self.assertTrue(all(item["status"] == "ENABLED" for item in group["keywords"]))
            self.assertTrue(all(item["match_type"] in {"EXACT", "PHRASE"} for item in group["keywords"]))
            self.assertEqual(group["rsa"]["status"], "PAUSED")
            self.assertEqual(group["rsa"]["final_urls"], [self.stager.config.FINAL_URL])
        self.assertTrue(self.plan["campaign_negative_keywords"])
        self.assertTrue(
            all(item["match_type"] in {"EXACT", "PHRASE"} for item in self.plan["campaign_negative_keywords"])
        )

    def test_each_rsa_is_unique_within_google_limits_and_has_policy_safe_copy(self):
        prohibited = ("free", "certified", "certification", "warranty", "guaranteed")
        fingerprints = set()
        for group in self.plan["ad_groups"]:
            rsa = group["rsa"]
            headlines = rsa["headlines"]
            descriptions = rsa["descriptions"]
            self.assertGreaterEqual(len(headlines), 3)
            self.assertLessEqual(len(headlines), 15)
            self.assertGreaterEqual(len(descriptions), 2)
            self.assertLessEqual(len(descriptions), 4)
            self.assertEqual(len(headlines), len(set(headlines)))
            self.assertEqual(len(descriptions), len(set(descriptions)))
            self.assertTrue(all(len(text) <= 30 for text in headlines))
            self.assertTrue(all(len(text) <= 90 for text in descriptions))
            copy = " ".join(headlines + descriptions).casefold()
            self.assertFalse(any(term in copy for term in prohibited))
            fingerprints.add(json.dumps(rsa, sort_keys=True))
        self.assertEqual(len(fingerprints), 4)

    def test_asset_plan_uses_existing_call_and_required_extensions(self):
        assets = self.plan["assets"]
        self.assertEqual(assets["call"]["call_conversion_reporting_state"], "USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION")
        self.assertEqual(assets["call"]["call_conversion_action"], self.stager.CALLS_FROM_ADS_ACTION)
        self.assertEqual(assets["call"]["supersedes_existing_asset"], self.stager.CALL_ASSET)
        self.assertEqual(len(assets["sitelinks"]), 4)
        self.assertEqual(
            {item["final_url"].split("#", 1)[1] for item in assets["sitelinks"]},
            {"solutions", "process", "privacy-decorative", "site-review"},
        )
        self.assertEqual(len(assets["callouts"]), 4)
        self.assertEqual(assets["structured_snippet"]["header"], "Types")
        self.assertEqual(len(assets["structured_snippet"]["values"]), 5)

    def test_image_manifest_is_exact_verified_and_google_ready(self):
        images = self.plan["assets"]["images"]
        self.assertEqual(len(images), 8)
        self.assertEqual({item["field_type"] for item in images}, {"AD_IMAGE"})
        self.assertEqual(sum(item["format"] == "landscape" for item in images), 4)
        self.assertEqual(sum(item["format"] == "square" for item in images), 4)
        self.assertEqual(sum(not item["synthetic"] for item in images), 2)
        self.assertEqual(sum(item["synthetic"] for item in images), 6)
        for item in images:
            path = self.stager.REPO_ROOT / item["path"]
            self.assertTrue(path.is_file(), item["path"])
            data = path.read_bytes()
            self.assertEqual(len(data), item["bytes"])
            self.assertLessEqual(len(data), 5_120_000)
            self.assertEqual(hashlib.sha256(data).hexdigest(), item["sha256"])
            self.assertEqual(self.stager.jpeg_dimensions(data), tuple(item["pixel_dimensions"]))
            self.assertIn(item["sha256"][:12], item["name"])

    def test_goal_contains_only_two_qualified_60_second_call_actions(self):
        conversion = self.plan["conversion"]
        self.assertEqual(
            conversion["custom_goal"]["conversion_actions"],
            [self.stager.CALLS_FROM_ADS_ACTION, self.stager.QUALIFIED_WEBSITE_CALL_ACTION],
        )
        action = conversion["consultation_action"]
        self.assertEqual(action["name"], "Commercial Consultation Request - Obsidian")
        self.assertEqual(action["category"], "SUBMIT_LEAD_FORM")
        self.assertEqual(action["counting_type"], "ONE_PER_CLICK")
        self.assertFalse(action["primary_for_goal"])
        self.assertFalse(action["account_default"])
        self.assertNotIn(action["logical_resource_name"], conversion["custom_goal"]["conversion_actions"])
        excluded = " ".join(conversion["explicitly_non_biddable"]).casefold()
        for token in ("proxy", "square", "text", "residential"):
            self.assertIn(token, excluded)

    def test_plan_build_rejects_source_geo_or_conversion_drift(self):
        state = valid_live_state(self.stager)
        state["source_locations"].pop()
        with self.assertRaisesRegex(self.stager.GuardError, "19 included and 4 excluded"):
            self.stager.build_plan(state)
        state = valid_live_state(self.stager)
        state["conversion_actions"][0]["phoneCallDurationSeconds"] = "30"
        with self.assertRaisesRegex(self.stager.GuardError, "60-second"):
            self.stager.build_plan(state)

    def test_same_name_resource_is_reused_only_when_fingerprint_matches(self):
        expected = {"name": "Commercial budget", "amountMicros": "25000000", "status": "ENABLED"}
        exact = {**expected, "resourceName": "customers/8605345590/campaignBudgets/1"}
        result = self.stager.reconcile_named_resource("budget", expected, [exact], ("name", "amountMicros", "status"))
        self.assertEqual(result["decision"], "reuse")
        drift = {**exact, "amountMicros": "30000000"}
        with self.assertRaisesRegex(self.stager.GuardError, "same-name drift"):
            self.stager.reconcile_named_resource("budget", expected, [drift], ("name", "amountMicros", "status"))
        with self.assertRaisesRegex(self.stager.GuardError, "duplicate"):
            self.stager.reconcile_named_resource("budget", expected, [exact, exact], ("name",))

    def test_initial_operations_never_enable_campaign_or_ads(self):
        phases = self.stager.build_initial_operation_phases(self.plan)
        self.assertTrue(phases)
        serialized = json.dumps(phases, sort_keys=True)
        self.assertNotIn('"validateOnly"', serialized)
        self.assertEqual(self.plan["campaign"]["status"], "PAUSED")
        self.assertTrue(all(group["rsa"]["status"] == "PAUSED" for group in self.plan["ad_groups"]))
        self.assertFalse(any(phase["name"] == "enable" for phase in phases))

    def test_initial_operations_bind_custom_goal_and_disable_every_regular_goal(self):
        phases = self.stager.build_initial_operation_phases(self.plan)
        goal_phase = next(phase for phase in phases if phase["name"] == "campaign_goal_isolation")
        operations = goal_phase["operations"]
        config_updates = [item for item in operations if "conversionGoalCampaignConfigOperation" in item]
        regular_updates = [item for item in operations if "campaignConversionGoalOperation" in item]
        self.assertEqual(len(config_updates), 1)
        self.assertEqual(
            config_updates[0]["conversionGoalCampaignConfigOperation"]["update"]["customConversionGoal"],
            "$result:custom_goal:0",
        )
        self.assertEqual(len(regular_updates), len(self.plan["conversion"]["addressable_regular_goal_pairs"]))
        self.assertTrue(
            all(
                item["campaignConversionGoalOperation"]["update"]["biddable"] is False
                and item["campaignConversionGoalOperation"]["updateMask"] == "biddable"
                for item in regular_updates
            )
        )
        serialized = json.dumps(regular_updates)
        self.assertNotIn("~UNKNOWN", serialized)
        self.assertNotIn("~UNSPECIFIED", serialized)
        self.assertIn(("PHONE_CALL_LEAD", "UNKNOWN"), self.plan["conversion"]["regular_goal_pairs"])

    def test_initial_operations_use_correct_services_language_and_asset_associations(self):
        phases = self.stager.build_initial_operation_phases(self.plan)
        by_name = {phase["name"]: phase for phase in phases}
        self.assertEqual(by_name["keywords"]["service"], "adGroupCriteria")
        self.assertEqual(by_name["paused_rsas"]["service"], "adGroupAds")
        self.assertTrue(any("language" in op["create"] for op in by_name["criteria"]["operations"]))
        self.assertEqual(len(by_name["assets"]["operations"]), 18)
        self.assertEqual(len(by_name["campaign_assets"]["operations"]), 18)
        self.assertEqual(by_name["campaign_assets"]["operations"][0]["create"]["asset"], "$result:assets:0")
        call = by_name["assets"]["operations"][0]["create"]["callAsset"]
        self.assertEqual(call["callConversionReportingState"], "USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION")
        self.assertEqual(call["callConversionAction"], self.stager.CALLS_FROM_ADS_ACTION)
        self.assertNotIn("status", by_name["budget"]["operations"][0]["create"])
        campaign = by_name["campaign"]["operations"][0]["create"]
        self.assertIn("networkSettings", campaign)
        self.assertIn("geoTargetTypeSetting", campaign)
        rsa = by_name["paused_rsas"]["operations"][0]["create"]["ad"]
        self.assertIn("finalUrls", rsa)
        self.assertNotIn("finalUrls", rsa["responsiveSearchAd"])
        sitelink = by_name["assets"]["operations"][1]["create"]
        self.assertIn("finalUrls", sitelink)
        self.assertNotIn("finalUrls", sitelink["sitelinkAsset"])
        goal = by_name["campaign_goal_isolation"]["operations"][0]["conversionGoalCampaignConfigOperation"]["update"]
        self.assertIn("conversionGoalCampaignConfigs", goal["resourceName"])
        self.assertNotIn("campaign", goal)

        image_creates = by_name["assets"]["operations"][10:]
        self.assertEqual(len(image_creates), 8)
        self.assertTrue(all(op["create"]["imageAsset"]["data"].startswith("$image_data:") for op in image_creates))
        image_links = by_name["campaign_assets"]["operations"][10:]
        self.assertEqual(
            [op["create"]["fieldType"] for op in image_links],
            [item["field_type"] for item in self.plan["assets"]["images"]],
        )

    def test_reference_resolver_uses_campaign_id_inside_goal_resource_name(self):
        resolved = self.stager._resolve(
            "customers/8605345590/campaignConversionGoals/$campaign_id:campaign:0~CONTACT~WEBSITE",
            {"campaign": ["customers/8605345590/campaigns/123"]},
        )
        self.assertEqual(resolved, "customers/8605345590/campaignConversionGoals/123~CONTACT~WEBSITE")
        operation = self.stager.build_enable_operation("customers/8605345590/campaigns/123")
        self.assertEqual(operation["operations"][0]["update"]["status"], "ENABLED")

    def test_rsa_prepare_operations_enable_exactly_four_reviewed_ads(self):
        resources = [
            f"customers/8605345590/adGroupAds/{ad_group_id}~{ad_id}"
            for ad_group_id, ad_id in (
                ("196849750257", "820325919497"),
                ("196849750297", "820325919500"),
                ("196849750457", "820325919503"),
                ("196849750497", "820325919506"),
            )
        ]
        operations = self.stager.build_rsa_status_operations(resources, "ENABLED")
        self.assertEqual(len(operations), 4)
        self.assertEqual(
            [item["update"]["resourceName"] for item in operations],
            resources,
        )
        self.assertTrue(all(item["update"]["status"] == "ENABLED" for item in operations))
        self.assertTrue(all(item["updateMask"] == "status" for item in operations))
        with self.assertRaisesRegex(self.stager.GuardError, "exactly four"):
            self.stager.build_rsa_status_operations(resources[:3], "ENABLED")
        with self.assertRaisesRegex(self.stager.GuardError, "unsupported RSA status"):
            self.stager.build_rsa_status_operations(resources, "REMOVED")
        wrong_resources = [*resources[:3], "customers/8605345590/adGroupAds/999~888"]
        with self.assertRaisesRegex(self.stager.GuardError, "reviewed RSA set"):
            self.stager.build_rsa_status_operations(wrong_resources, "ENABLED")

    def test_goal_readback_rejects_any_regular_biddable_proxy(self):
        target = {
            "goal_config": {"customConversionGoal": "customers/8605345590/customConversionGoals/99"},
            "custom_goal": {
                "resourceName": "customers/8605345590/customConversionGoals/99",
                "status": "ENABLED",
                "conversionActions": [
                    self.stager.CALLS_FROM_ADS_ACTION,
                    self.stager.QUALIFIED_WEBSITE_CALL_ACTION,
                ],
            },
            "campaign_goals": [
                {"category": "CONTACT", "origin": "WEBSITE", "biddable": False},
                {"category": "PURCHASE", "origin": "WEBSITE", "biddable": False},
            ],
        }
        expected_pairs = [("CONTACT", "WEBSITE"), ("PURCHASE", "WEBSITE")]
        self.stager.verify_goal_isolation(target, expected_pairs)
        for goal in target["campaign_goals"]:
            goal.pop("biddable")
        self.stager.verify_goal_isolation(target, expected_pairs)
        with self.assertRaisesRegex(self.stager.GuardError, "goal pair set"):
            self.stager.verify_goal_isolation({**target, "campaign_goals": []}, expected_pairs)
        target["campaign_goals"][0]["biddable"] = True
        with self.assertRaisesRegex(self.stager.GuardError, "regular campaign goal"):
            self.stager.verify_goal_isolation(target, expected_pairs)

    def test_cli_defaults_to_read_only_and_apply_enable_are_separate_guarded_modes(self):
        default = self.stager.parse_args([])
        self.assertEqual(self.stager.command_mode(default), "validate")
        explicit_validate = self.stager.parse_args(["--validate"])
        self.assertEqual(self.stager.command_mode(explicit_validate), "validate")
        with self.assertRaisesRegex(self.stager.GuardError, "confirmation token"):
            self.stager.command_mode(self.stager.parse_args(["--apply"]))
        applied = self.stager.parse_args(["--apply", "--confirm", self.stager.APPLY_CONFIRMATION_TOKEN])
        self.assertEqual(self.stager.command_mode(applied), "apply")
        enabled = self.stager.parse_args(["--enable", "--confirm", self.stager.ENABLE_CONFIRMATION_TOKEN])
        self.assertEqual(self.stager.command_mode(enabled), "enable")
        with self.assertRaisesRegex(self.stager.GuardError, "cannot be combined"):
            self.stager.command_mode(
                self.stager.parse_args(
                    ["--apply", "--enable", "--confirm", self.stager.APPLY_CONFIRMATION_TOKEN]
                )
            )

    def test_validation_queries_are_gaql_only_and_do_not_call_mutate(self):
        class ReadOnlyClient:
            def __init__(self):
                self.queries = []

            def search(self, query):
                self.queries.append(query)
                return []

            def mutate(self, *args, **kwargs):
                raise AssertionError("validation must never call a mutate endpoint")

        client = ReadOnlyClient()
        self.stager.run_read_only_queries(client)
        self.assertGreaterEqual(len(client.queries), 6)
        self.assertTrue(all("SELECT" in query.upper() for query in client.queries))
        named_groups = next(query for query in client.queries if "FROM ad_group WHERE" in query)
        self.assertIn("campaign.name", named_groups)
        named_campaign = next(query for query in client.queries if "FROM campaign WHERE campaign.name" in query)
        self.assertIn("campaign.advertising_channel_type", named_campaign)

    def test_evidence_is_deterministic_and_redacts_tokens_errors_and_request_ids(self):
        first = self.stager.build_evidence(self.plan, valid_live_state(self.stager))
        second = self.stager.build_evidence(self.plan, valid_live_state(self.stager))
        self.assertEqual(first, second)
        encoded = json.dumps(first, sort_keys=True)
        self.assertNotIn("access_token", encoded.casefold())
        dirty = {
            "access_token": "secret-token",
            "request_id": "raw-request-id",
            "error": "Bearer abc.def.ghi failed for raw-request-id",
            "safe": "kept",
        }
        redacted = self.rest.redact_for_evidence(dirty)
        self.assertEqual(redacted["safe"], "kept")
        self.assertEqual(redacted["access_token"], "[REDACTED]")
        self.assertEqual(redacted["request_id"], "[REDACTED]")
        self.assertNotIn("abc.def.ghi", redacted["error"])
        self.assertNotIn("raw-request-id", redacted["error"])

    def test_rest_client_refuses_mutation_without_explicit_permission(self):
        client = self.rest.GoogleAdsRestClient(
            customer_id="8605345590",
            developer_token="developer",
            access_token="access",
            login_customer_id="2189276309",
            allow_mutation=False,
        )
        with self.assertRaisesRegex(self.rest.MutationBlocked, "read-only"):
            client.mutate("campaignBudgets", [{"create": {"name": "blocked"}}])

    def test_recovery_manifest_is_saved_after_each_successful_mutation(self):
        phases = [
            {"name": "budget", "service": "campaignBudgets", "operations": [{"create": {"name": "b"}}]},
            {"name": "campaign", "service": "campaigns", "operations": [{"create": {"name": "c"}}]},
        ]

        class Client:
            def __init__(self):
                self.calls = 0

            def mutate(self, service, operations):
                self.calls += 1
                return {
                    "http_status": 200,
                    "request_id": f"request-{self.calls}",
                    "results": [{"resourceName": f"customers/8605345590/{service}/{self.calls}"}],
                }

        with tempfile.TemporaryDirectory() as directory:
            manifest = Path(directory) / "recovery.json"
            snapshots = []

            def observe(path):
                snapshots.append(json.loads(path.read_text()))

            result = self.stager.apply_operation_phases(Client(), phases, manifest, after_write=observe)

        self.assertEqual(len(snapshots), 2)
        self.assertEqual([item["completed_phase_count"] for item in snapshots], [1, 2])
        self.assertEqual(result["completed_phase_count"], 2)
        self.assertNotIn("request-1", json.dumps(result))

    def test_atomic_create_uses_one_google_ads_batch_and_valid_temp_references(self):
        batch = self.stager.build_atomic_create_batch(self.plan)
        self.assertEqual(batch["service"], "googleAds")
        self.assertTrue(batch["operations"])
        encoded = json.dumps(batch, sort_keys=True)
        self.assertIn("containsEuPoliticalAdvertising", encoded)
        self.assertIn("DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING", encoded)
        self.assertNotIn("$result:", encoded)
        self.assertNotIn("$image_data:", encoded)
        self.assertIn("customers/8605345590/campaigns/-2", encoded)
        self.assertTrue(all(len(op) == 1 for op in batch["operations"]))

        declared = []
        for operation in batch["operations"]:
            body = next(iter(operation.values()))
            resource_name = body.get("create", {}).get("resourceName")
            if resource_name:
                declared.append(resource_name)
        expected = [resource for resources in batch["temporary_resources"].values() for resource in resources]
        self.assertCountEqual(declared, expected)
        self.assertEqual(len(declared), len(set(declared)))
        referenced = set(re.findall(r"customers/8605345590/[A-Za-z]+/-\d+", encoded))
        self.assertTrue(set(expected).issubset(referenced))
        self.assertEqual(
            referenced - set(expected),
            {
                "customers/8605345590/conversionGoalCampaignConfigs/-2",
                "customers/8605345590/campaignConversionGoals/-2",
            },
        )

        image_operations = [
            op["assetOperation"]["create"]
            for op in batch["operations"]
            if "assetOperation" in op and "imageAsset" in op["assetOperation"].get("create", {})
        ]
        self.assertEqual(len(image_operations), 8)
        for operation, expected_image in zip(image_operations, self.plan["assets"]["images"]):
            import base64

            data = base64.b64decode(operation["imageAsset"]["data"])
            self.assertEqual(hashlib.sha256(data).hexdigest(), expected_image["sha256"])
            attestation = operation["syntheticContentInfo"]["advertiserAttestation"]
            self.assertEqual(attestation["source"], "ADVERTISER_ATTESTED")
            self.assertEqual(attestation["status"], "IS_SYNTHETIC" if expected_image["synthetic"] else "NOT_SYNTHETIC")

    def test_post_apply_queries_use_campaign_resource_not_invalid_pseudo_fields(self):
        source = STAGER_PATH.read_text()
        self.assertNotIn("ad_group_criterion.campaign =", source)
        self.assertNotIn("ad_group_ad.campaign =", source)
        self.assertIn("campaign.resource_name =", source)

    def test_full_readback_contract_requests_and_compares_every_launch_surface(self):
        source = inspect.getsource(self.stager.verify_full_campaign_readback)
        for field in (
            "campaign.bidding_strategy_type", "campaign_budget.name", "campaign_budget.status",
            "campaign_criterion.type", "campaign_criterion.device.type", "campaign_criterion.bid_modifier", "campaign_asset.status",
            "asset.sitelink_asset.link_text",
            "asset.final_urls",
            "asset.callout_asset.callout_text", "asset.structured_snippet_asset.header",
            "asset.structured_snippet_asset.values",
            "asset.synthetic_content_info.advertiser_attestation.source",
            "asset.synthetic_content_info.advertiser_attestation.status",
            "asset.call_asset.country_code", "conversion_action.type",
            "networkSettings", "geoTargetTypeSetting", "RSA headline/description readback drift",
            "keyword status/CPC readback drift", "asset association/content readback drift",
            'get("enhancedCpcEnabled", False)',
        ):
            self.assertIn(field, source)
        self.assertNotIn("except rest.GoogleAdsRestError", source)
        self.assertIn('{"DESKTOP", "MOBILE", "TABLET"}', source)
        self.assertIn("expected_rsa_status", source)

    def test_enable_operation_requires_a_resolved_campaign_resource(self):
        with self.assertRaises(TypeError):
            self.stager.build_enable_operation()
        source = inspect.getsource(self.stager.build_enable_operation)
        self.assertNotIn("$reviewed_paused_campaign", source)

    def test_google_ads_response_normalizes_direct_operation_results(self):
        class Response:
            status_code = 200
            text = "{}"
            headers = {"request-id": "test"}
            def json(self):
                return {"mutateOperationResponses": [{"campaignResult": {"resourceName": "customers/8605345590/campaigns/7"}}]}
        class Session:
            def post(self, *args, **kwargs): return Response()
        client = self.rest.GoogleAdsRestClient(customer_id="8605345590", developer_token="d", access_token="a", login_customer_id="1", allow_mutation=True, session=Session())
        self.assertEqual(client.mutate("googleAds", [{"campaignOperation": {"create": {}}}])["results"], [{"resourceName": "customers/8605345590/campaigns/7"}])


if __name__ == "__main__":
    unittest.main()
