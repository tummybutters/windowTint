import importlib.util
import unittest
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
        self.assertEqual(config.CAMPAIGN_NAME, "Search | OC | Ceramic Coating | Obsidian Build")
        self.assertEqual(config.DAILY_BUDGET_MICROS, 71_000_000)
        self.assertEqual(config.CORE_AD_GROUP_ID, "199530647918")
        self.assertEqual(config.COST_AD_GROUP_ID, "199530568558")
        self.assertEqual(config.PROTECTED_AD_GROUP_IDS, {"199530570158", "199530652518"})
        self.assertEqual(config.DUPLICATE_CUSTOMER_ID, "8605345590")
        self.assertEqual(config.DUPLICATE_CAMPAIGN_ID, "24058475904")

    def test_price_is_visible_and_pinned(self):
        for ad in (config.CORE_RSA, config.COST_RSA):
            self.assertEqual(ad["headlines"][0]["pinnedField"], "HEADLINE_1")
            self.assertIn("$795", ad["headlines"][0]["text"])
            self.assertEqual(
                sum(item.get("pinnedField") == "HEADLINE_1" for item in ad["headlines"]),
                1,
            )
            self.assertTrue(all(len(item["text"]) <= 30 for item in ad["headlines"]))
            self.assertTrue(all(len(item["text"]) <= 90 for item in ad["descriptions"]))
            self.assertEqual(len(ad["headlines"]), 15)
            self.assertEqual(len({item["text"].casefold() for item in ad["headlines"]}), 15)
            self.assertEqual(len(ad["descriptions"]), 4)
            self.assertLessEqual(len(ad["path1"]), 15)
            self.assertLessEqual(len(ad["path2"]), 15)

    def test_only_approved_cutover_ads_are_named(self):
        self.assertEqual(config.OLD_CORE_AD_IDS, {"818560843375"})
        self.assertEqual(config.OLD_COST_AD_IDS, {"818560843378", "819021913646"})

    def test_copy_and_urls_match_the_approved_offer(self):
        self.assertEqual(
            config.CORE_RSA["finalUrls"],
            ("https://www.obsidianautoworksoc.com/ceramic-coating",),
        )
        self.assertEqual(
            config.COST_RSA["finalUrls"],
            ("https://www.obsidianautoworksoc.com/ceramic-coating-cost-paint-correction#packages",),
        )
        rendered = repr((config.CORE_RSA, config.COST_RSA)).casefold()
        self.assertNotIn("warranty", rendered)
        self.assertNotIn("pure mobile detailing", rendered)
        self.assertIn("gyeon", rendered)
        self.assertIn("paint correction included", rendered)


if __name__ == "__main__":
    unittest.main()
