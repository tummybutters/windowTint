import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / "summer_offer_ad_variant.py"


def load_module():
    spec = importlib.util.spec_from_file_location("summer_offer_ad_variant", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SummerOfferAdVariantTests(unittest.TestCase):
    def test_plan_is_paused_scoped_and_policy_safe(self):
        variant = load_module()
        plan = variant.build_plan()

        self.assertEqual(plan["customer_id"], "8605345590")
        self.assertEqual(plan["campaign_id"], "23899221542")
        self.assertEqual(plan["status"], "PAUSED")
        self.assertEqual(plan["final_url"], "https://www.obsidianautoworksoc.com/mobile-window-tinting-summer-offer")
        self.assertEqual(plan["variant"], "summer_heat_defense_v1")
        self.assertGreaterEqual(len(plan["headlines"]), 8)
        self.assertGreaterEqual(len(plan["descriptions"]), 3)
        self.assertTrue(all(len(text) <= 30 for text in plan["headlines"]))
        self.assertTrue(all(len(text) <= 90 for text in plan["descriptions"]))
        joined = " ".join(plan["headlines"] + plan["descriptions"])
        self.assertIn("$100 toward eligible upgrades", joined)
        self.assertIn("15", joined)
        self.assertIn("$500+", joined)
        self.assertIn("deposit", joined.casefold())
        self.assertIn("through August 31", joined)
        self.assertNotIn("before August 31", joined)
        self.assertNotIn("Claim $100 In Upgrades", joined)
        for asset in plan["headlines"] + plan["descriptions"]:
            if "$100" in asset:
                self.assertIn("eligible", asset.casefold())

    def test_mutation_targets_only_selected_auto_ad_groups(self):
        variant = load_module()
        operations = variant.build_paused_ad_operations(variant.build_plan())

        self.assertEqual(len(operations), 3)
        for operation in operations:
            create = operation["adGroupAdOperation"]["create"]
            self.assertEqual(create["status"], "PAUSED")
            self.assertIn(create["adGroup"], variant.ALLOWED_AD_GROUPS)
            self.assertEqual(create["ad"]["finalUrls"], [variant.build_plan()["final_url"]])


if __name__ == "__main__":
    unittest.main()
