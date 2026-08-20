import importlib.util
import unittest
from pathlib import Path


HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("optimize_commercial_campaign", HERE.parent / "optimize_commercial_campaign.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def snapshot():
    return {
        "campaign": {"budget_micros": mod.DAILY_BUDGET_MICROS},
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
        "ads": [],
    }


class CommercialOptimizationTest(unittest.TestCase):
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

    def test_exact_batch_is_two_bids_one_negative_four_paused_rsas(self):
        operations = mod.build_operations(snapshot())
        self.assertEqual(sum("adGroupCriterionOperation" in item for item in operations), 2)
        self.assertEqual(sum("campaignCriterionOperation" in item for item in operations), 1)
        self.assertEqual(sum("adGroupAdOperation" in item for item in operations), 4)
        for item in operations:
            if "adGroupAdOperation" in item:
                self.assertEqual(item["adGroupAdOperation"]["create"]["status"], "PAUSED")

    def test_readback_at_target_is_idempotent(self):
        state = snapshot()
        for criterion_id, target in mod.TARGET_BIDS.items():
            state["keywords"][criterion_id]["cpc_bid_micros"] = target["target_micros"]
        state["negative_keywords"] = [("fresno", "PHRASE")]
        state["ads"] = [
            {
                "ad_group_id": group_id,
                "status": "PAUSED",
                "final_urls": tuple(ad["final_urls"]),
                "headlines": tuple(ad["headlines"]),
                "descriptions": tuple(ad["descriptions"]),
            }
            for group_id, ad in mod.RSA_VARIANTS.items()
        ]
        self.assertEqual(mod.build_operations(state), [])

    def test_enabled_matching_ad_does_not_satisfy_paused_replacement(self):
        state = snapshot()
        for criterion_id, target in mod.TARGET_BIDS.items():
            state["keywords"][criterion_id]["cpc_bid_micros"] = target["target_micros"]
        state["negative_keywords"] = [("fresno", "PHRASE")]
        group_id, ad = next(iter(mod.RSA_VARIANTS.items()))
        state["ads"] = [{
            "ad_group_id": group_id,
            "status": "ENABLED",
            "final_urls": tuple(ad["final_urls"]),
            "headlines": tuple(ad["headlines"]),
            "descriptions": tuple(ad["descriptions"]),
        }]
        operations = mod.build_operations(state)
        self.assertEqual(sum("adGroupAdOperation" in item for item in operations), 4)

    def test_copy_and_destination_contract(self):
        mod.verify_copy_contract()
        self.assertEqual(set(mod.RSA_VARIANTS), set(mod.AD_GROUPS))


if __name__ == "__main__":
    unittest.main()
