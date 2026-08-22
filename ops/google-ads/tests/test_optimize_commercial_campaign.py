import importlib.util
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("optimize_commercial_campaign", HERE.parent / "optimize_commercial_campaign.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def snapshot():
    return {
        "campaign": {
            "budget_resource": mod.BUDGET_RESOURCE,
            "budget_micros": mod.CURRENT_DAILY_BUDGET_MICROS,
        },
        "ad_groups": {},
        "keywords": {
            criterion_id: {
                "resource": target["resource"],
                "ad_group_id": target["ad_group_id"],
                "status": "ENABLED",
                "text": target["text"],
                "match_type": target["match_type"],
                "cpc_bid_micros": target["target_micros"] - 1_000_000,
            }
            for criterion_id, target in mod.TARGET_BIDS.items()
        },
        "negative_keywords": [],
        "ads": [{
            "ad_group_id": legacy["ad_group_id"],
            "resource": resource,
            "status": "PAUSED",
            "primary_status": "PAUSED",
            "approval_status": "APPROVED",
            "final_urls": tuple(legacy["final_urls"]),
            "headlines": (),
            "descriptions": (),
        } for resource, legacy in mod.LEGACY_GENERIC_ADS.items()],
    }


class CommercialOptimizationTest(unittest.TestCase):
    def test_operation_summary_separates_creates_from_pauses(self):
        operations = [
            {"campaignBudgetOperation": {"update": {}}},
            {"adGroupCriterionOperation": {"update": {}}},
            {"adGroupAdOperation": {"create": {}}},
            {"adGroupAdOperation": {"update": {"status": "PAUSED"}}},
        ]
        self.assertEqual(mod.summarize_operations(operations), {
            "operation_count": 4,
            "budget_updates": 1,
            "bid_updates": 1,
            "negative_creates": 0,
            "rsa_creates": 1,
            "ad_pauses": 1,
        })

    def test_apply_always_validates_the_exact_batch_first(self):
        class Client:
            def __init__(self):
                self.calls = []

            def mutate(self, service, operations, *, validate_only=False):
                self.calls.append((service, operations, validate_only))
                return {"validate_only": validate_only}

        client = Client()
        operations = [{"campaignCriterionOperation": {"create": {"negative": True}}}]
        result = mod.execute_operations(client, "apply", operations)
        self.assertEqual(client.calls, [
            ("googleAds", operations, True),
            ("googleAds", operations, False),
        ])
        self.assertTrue(result["validation"]["validate_only"])
        self.assertFalse(result["apply"]["validate_only"])

    def test_initial_batch_has_budget_forty_two_bids_one_negative_and_four_enabled_rsas(self):
        operations = mod.build_operations(snapshot())
        self.assertEqual(sum("campaignBudgetOperation" in item for item in operations), 1)
        self.assertEqual(sum("adGroupCriterionOperation" in item for item in operations), 42)
        self.assertEqual(sum("campaignCriterionOperation" in item for item in operations), 1)
        self.assertEqual(sum("adGroupAdOperation" in item for item in operations), 4)
        for item in operations:
            if "adGroupAdOperation" in item:
                self.assertEqual(item["adGroupAdOperation"]["create"]["status"], "ENABLED")

    def test_each_ad_group_uses_its_tailored_landing_page(self):
        expected = {
            "196849750257": "https://www.obsidianautoworksoc.com/commercial-window-tinting-orange-county",
            "196849750297": "https://www.obsidianautoworksoc.com/commercial-heat-glare-window-film",
            "196849750457": "https://www.obsidianautoworksoc.com/office-privacy-window-film",
            "196849750497": "https://www.obsidianautoworksoc.com/storefront-security-window-film",
        }
        self.assertEqual(
            {group_id: ad["final_urls"][0] for group_id, ad in mod.RSA_VARIANTS.items()},
            expected,
        )

    def test_readback_at_target_is_idempotent(self):
        state = snapshot()
        state["campaign"]["budget_micros"] = mod.TARGET_DAILY_BUDGET_MICROS
        for criterion_id, target in mod.TARGET_BIDS.items():
            state["keywords"][criterion_id]["cpc_bid_micros"] = target["target_micros"]
        state["negative_keywords"] = [("fresno", "PHRASE")]
        state["ads"] = [
            {
                "ad_group_id": group_id,
                "resource": f"customers/{mod.CUSTOMER_ID}/adGroupAds/{group_id}~tailored",
                "status": "ENABLED",
                "primary_status": "ELIGIBLE",
                "approval_status": "APPROVED",
                "final_urls": tuple(ad["final_urls"]),
                "headlines": tuple(ad["headlines"]),
                "descriptions": tuple(ad["descriptions"]),
            }
            for group_id, ad in mod.RSA_VARIANTS.items()
        ]
        state["ads"].extend({
            "ad_group_id": legacy["ad_group_id"],
            "resource": resource,
            "status": "PAUSED",
            "primary_status": "PAUSED",
            "approval_status": "APPROVED",
            "final_urls": tuple(legacy["final_urls"]),
            "headlines": (),
            "descriptions": (),
        } for resource, legacy in mod.LEGACY_GENERIC_ADS.items())
        self.assertEqual(mod.build_operations(state), [])

    def test_live_scale_batch_pauses_only_four_legacy_ads(self):
        state = snapshot()
        state["negative_keywords"] = [("fresno", "PHRASE")]
        state["ads"] = [
            {
                "ad_group_id": group_id,
                "resource": f"customers/{mod.CUSTOMER_ID}/adGroupAds/{group_id}~tailored",
                "status": "ENABLED",
                "primary_status": "ELIGIBLE",
                "approval_status": "APPROVED",
                "final_urls": tuple(ad["final_urls"]),
                "headlines": tuple(ad["headlines"]),
                "descriptions": tuple(ad["descriptions"]),
            }
            for group_id, ad in mod.RSA_VARIANTS.items()
        ]
        state["ads"].extend({
            "ad_group_id": legacy["ad_group_id"],
            "resource": resource,
            "status": "ENABLED",
            "primary_status": "ELIGIBLE",
            "approval_status": "APPROVED",
            "final_urls": tuple(legacy["final_urls"]),
            "headlines": (),
            "descriptions": (),
        } for resource, legacy in mod.LEGACY_GENERIC_ADS.items())
        operations = mod.build_operations(state)
        pauses = [item["adGroupAdOperation"] for item in operations
                  if "adGroupAdOperation" in item and "update" in item["adGroupAdOperation"]]
        self.assertEqual(len(pauses), 4)
        self.assertEqual({item["update"]["resourceName"] for item in pauses}, set(mod.LEGACY_GENERIC_ADS))
        self.assertTrue(all(item["update"]["status"] == "PAUSED" for item in pauses))
        self.assertTrue(all(item["updateMask"] == "status" for item in pauses))

    def test_legacy_pause_requires_approved_eligible_tailored_replacement(self):
        state = snapshot()
        group_id, tailored = next(iter(mod.RSA_VARIANTS.items()))
        legacy_resource, legacy = next(iter(mod.LEGACY_GENERIC_ADS.items()))
        state["ads"] = [{
            "ad_group_id": group_id,
            "resource": f"customers/{mod.CUSTOMER_ID}/adGroupAds/{group_id}~tailored",
            "status": "ENABLED",
            "primary_status": "PENDING",
            "approval_status": "UNKNOWN",
            "final_urls": tuple(tailored["final_urls"]),
            "headlines": tuple(tailored["headlines"]),
            "descriptions": tuple(tailored["descriptions"]),
        }, {
            "ad_group_id": legacy["ad_group_id"],
            "resource": legacy_resource,
            "status": "ENABLED",
            "primary_status": "ELIGIBLE",
            "approval_status": "APPROVED",
            "final_urls": tuple(legacy["final_urls"]),
            "headlines": (),
            "descriptions": (),
        }]
        with self.assertRaisesRegex(mod.GuardError, "approved and eligible"):
            mod.build_operations(state)

    def test_paused_matching_ad_does_not_satisfy_enabled_replacement(self):
        state = snapshot()
        state["campaign"]["budget_micros"] = mod.TARGET_DAILY_BUDGET_MICROS
        for criterion_id, target in mod.TARGET_BIDS.items():
            state["keywords"][criterion_id]["cpc_bid_micros"] = target["target_micros"]
        state["negative_keywords"] = [("fresno", "PHRASE")]
        group_id, ad = next(iter(mod.RSA_VARIANTS.items()))
        state["ads"] = [{
            "ad_group_id": group_id,
            "resource": f"customers/{mod.CUSTOMER_ID}/adGroupAds/{group_id}~paused-tailored",
            "status": "PAUSED",
            "primary_status": "PAUSED",
            "approval_status": "APPROVED",
            "final_urls": tuple(ad["final_urls"]),
            "headlines": tuple(ad["headlines"]),
            "descriptions": tuple(ad["descriptions"]),
        }]
        state["ads"].extend({
            "ad_group_id": legacy["ad_group_id"],
            "resource": resource,
            "status": "PAUSED",
            "primary_status": "PAUSED",
            "approval_status": "APPROVED",
            "final_urls": tuple(legacy["final_urls"]),
            "headlines": (),
            "descriptions": (),
        } for resource, legacy in mod.LEGACY_GENERIC_ADS.items())
        operations = mod.build_operations(state)
        self.assertEqual(sum("adGroupAdOperation" in item for item in operations), 4)

    def test_copy_and_destination_contract(self):
        mod.verify_copy_contract()
        self.assertEqual(set(mod.RSA_VARIANTS), set(mod.AD_GROUPS))


if __name__ == "__main__":
    unittest.main()
