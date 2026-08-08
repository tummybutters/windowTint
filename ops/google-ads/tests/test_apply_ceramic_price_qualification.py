from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path


ADS_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = ADS_DIR / "apply_ceramic_price_qualification.py"
SPEC = importlib.util.spec_from_file_location("apply_ceramic_price_qualification", MODULE_PATH)
workflow = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(workflow)


class FakeClient:
    def __init__(self):
        self.mutations = []

    def mutate(self, service, operations):
        self.mutations.append((service, operations))
        return {
            "http_status": 200,
            "request_id": "sensitive-request-id",
            "results": [{"resourceName": "customers/8591070105/adGroupAds/new"}],
        }


def valid_snapshot():
    return {
        "customer_id": "8591070105",
        "campaign": {
            "id": "24054610950",
            "name": "Search | OC | Ceramic Coating | Obsidian Build",
            "status": "ENABLED",
            "serving_status": "SERVING",
            "primary_status": "LIMITED",
            "budget_micros": 71_000_000,
            "budget_delivery_method": "STANDARD",
            "bidding": "MANUAL_CPC",
            "enhanced_cpc_enabled": False,
            "search_network": True,
            "search_partners": False,
            "display_network": False,
            "positive_geo_target_type": "PRESENCE",
            "negative_geo_target_type": "PRESENCE",
        },
        "ad_groups": {
            "199530570158": {
                "name": "Ceramic Coating - Cities",
                "status": "ENABLED",
                "cpc_bid_micros": 8_000_000,
            },
            "199530647918": {
                "name": "Ceramic Coating - Core",
                "status": "ENABLED",
                "cpc_bid_micros": 9_500_000,
            },
            "199530652518": {
                "name": "Ceramic Coating - Luxury + EV",
                "status": "ENABLED",
                "cpc_bid_micros": 6_000_000,
            },
            "199530568558": {
                "name": "Coating Cost + Paint Correction",
                "status": "ENABLED",
                "cpc_bid_micros": 7_000_000,
            },
        },
        "ads": [
            {
                "ad_group_id": "199530647918",
                "ad_id": "818560843375",
                "resource_name": "customers/8591070105/adGroupAds/199530647918~818560843375",
                "status": "ENABLED",
                "primary_status": "ELIGIBLE",
                "policy_approval_status": "APPROVED",
                "final_urls": ("https://www.obsidianautoworksoc.com/ceramic-coating",),
                "path1": "ceramic-coating",
                "path2": "call-now",
                "headlines": ({"text": "Ceramic Coating Near Me"},),
                "descriptions": ({"text": "Existing unpriced Core ad."},),
            },
            {
                "ad_group_id": "199530568558",
                "ad_id": "818560843378",
                "resource_name": "customers/8591070105/adGroupAds/199530568558~818560843378",
                "status": "ENABLED",
                "primary_status": "ELIGIBLE",
                "policy_approval_status": "APPROVED",
                "final_urls": ("https://www.obsidianautoworksoc.com/ceramic-coating",),
                "path1": "ceramic-coating",
                "path2": "cost",
                "headlines": ({"text": "Ceramic Coating Cost"},),
                "descriptions": ({"text": "Existing general Cost ad."},),
            },
            {
                "ad_group_id": "199530568558",
                "ad_id": "819021913646",
                "resource_name": "customers/8591070105/adGroupAds/199530568558~819021913646",
                "status": "ENABLED",
                "primary_status": "ELIGIBLE",
                "policy_approval_status": "APPROVED",
                "final_urls": (
                    "https://www.obsidianautoworksoc.com/ceramic-coating-cost-paint-correction",
                ),
                "path1": "coating-cost",
                "path2": "paint-correction",
                "headlines": ({"text": "Ceramic Coating Cost"},),
                "descriptions": ({"text": "Existing dedicated Cost ad."},),
            },
        ],
        "schedule": tuple(
            {
                "day": day,
                "start_hour": 7,
                "start_minute": "ZERO",
                "end_hour": 21,
                "end_minute": "ZERO",
            }
            for day in (
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
                "SUNDAY",
            )
        ),
        "location_ids": {
            "1013532", "1013705", "1013883", "1013921", "1013925",
            "1014017", "1014058", "1014171", "1014352", "9051776",
        },
        "negative_keywords": tuple(f"guard-negative-{index}" for index in range(59)),
        "paused_waste_phrase": {
            "criterion_id": "341345628706",
            "text": "paint correction and ceramic coating",
            "match_type": "PHRASE",
            "status": "PAUSED",
        },
        "website_call": {
            "name": "Qualified Website Call - Obsidian Coating",
            "status": "ENABLED",
            "type": "WEBSITE_CALL",
            "phone_call_duration_seconds": 60,
        },
        "duplicate": {
            "customer_id": "8605345590",
            "campaign_id": "24058475904",
            "status": "PAUSED",
        },
        "last_serving_date": "2026-08-05",
    }


class WorkflowTests(unittest.TestCase):
    def test_validate_returns_delivery_diagnostic_without_mutation(self):
        client = FakeClient()
        validated = workflow.validate_snapshot(valid_snapshot())
        self.assertEqual(validated["delivery_diagnostic"], "no metric row after 2026-08-05")
        self.assertEqual(client.mutations, [])

    def test_wrong_campaign_budget_or_network_blocks_create(self):
        changes = (
            ("id", "other"),
            ("budget_micros", 72_000_000),
            ("bidding", "MAXIMIZE_CONVERSIONS"),
            ("search_partners", True),
            ("display_network", True),
        )
        for field, value in changes:
            with self.subTest(field=field):
                snapshot = valid_snapshot()
                snapshot["campaign"][field] = value
                with self.assertRaises(workflow.GuardError):
                    workflow.build_create_operations(snapshot)

    def test_location_schedule_negative_and_keyword_drift_block_create(self):
        snapshots = []
        missing_location = valid_snapshot()
        missing_location["location_ids"].remove("1013883")
        snapshots.append(missing_location)
        short_schedule = valid_snapshot()
        short_schedule["schedule"] = short_schedule["schedule"][:-1]
        snapshots.append(short_schedule)
        missing_negative = valid_snapshot()
        missing_negative["negative_keywords"] = missing_negative["negative_keywords"][:-1]
        snapshots.append(missing_negative)
        enabled_waste = valid_snapshot()
        enabled_waste["paused_waste_phrase"]["status"] = "ENABLED"
        snapshots.append(enabled_waste)
        for snapshot in snapshots:
            with self.assertRaises(workflow.GuardError):
                workflow.build_create_operations(snapshot)

    def test_protected_ad_group_drift_blocks_create(self):
        snapshot = valid_snapshot()
        snapshot["ad_groups"]["199530570158"]["cpc_bid_micros"] = 8_500_000
        with self.assertRaises(workflow.GuardError):
            workflow.build_create_operations(snapshot)

    def test_create_builds_two_enabled_operations_without_protected_groups(self):
        operations = workflow.build_create_operations(valid_snapshot())
        payload = json.dumps(operations)
        self.assertEqual(len(operations), 2)
        self.assertNotIn("199530570158", payload)
        self.assertNotIn("199530652518", payload)
        self.assertTrue(
            all(item["adGroupAdOperation"]["create"]["status"] == "ENABLED" for item in operations)
        )
        for operation in operations:
            rsa = operation["adGroupAdOperation"]["create"]["ad"]["responsiveSearchAd"]
            self.assertIn("$795", rsa["headlines"][0]["text"])
            self.assertEqual(rsa["headlines"][0]["pinnedField"], "HEADLINE_1")
            self.assertIn("path1", rsa)
            self.assertIn("path2", rsa)

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
            item["adGroupAdOperation"]["update"]["resourceName"] for item in operations
        }
        self.assertEqual(
            resources,
            {
                "customers/8591070105/adGroupAds/199530647918~818560843375",
                "customers/8591070105/adGroupAds/199530568558~818560843378",
                "customers/8591070105/adGroupAds/199530568558~819021913646",
            },
        )
        self.assertTrue(
            all(item["adGroupAdOperation"]["update"]["status"] == "PAUSED" for item in operations)
        )

    def test_evidence_redacts_request_id_and_operations_are_serializable(self):
        operations = workflow.build_create_operations(valid_snapshot())
        evidence = workflow.build_evidence(
            "apply-create",
            valid_snapshot(),
            operations,
            {"request_id": "sensitive-request-id", "http_status": 200},
        )
        rendered = json.dumps(evidence)
        self.assertNotIn("sensitive-request-id", rendered)
        self.assertIn("request_id_sha256", rendered)
        self.assertIn("$795", rendered)

    def test_command_modes_require_exact_confirmation_tokens(self):
        self.assertEqual(workflow.command_mode(workflow.parse_args(["--validate"])), "validate")
        with self.assertRaises(workflow.GuardError):
            workflow.command_mode(workflow.parse_args(["--apply-create"]))
        with self.assertRaises(workflow.GuardError):
            workflow.command_mode(workflow.parse_args(["--cutover", "--confirm", "wrong"]))
        self.assertEqual(
            workflow.command_mode(
                workflow.parse_args([
                    "--apply-create",
                    "--confirm",
                    "CREATE_CERAMIC_PRICE_RSAS_2026_08_08",
                ])
            ),
            "apply-create",
        )


if __name__ == "__main__":
    unittest.main()
