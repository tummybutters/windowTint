"""Contract tests for the commercial-window-film campaign plan."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


CONFIG_PATH = Path(__file__).resolve().parents[1] / "commercial_campaign_config.py"
RESEARCH_PATH = Path(__file__).resolve().parents[1] / "research_commercial_keywords.py"


def load_config():
    spec = importlib.util.spec_from_file_location("commercial_campaign_config", CONFIG_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("commercial campaign config is not importable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_research():
    spec = importlib.util.spec_from_file_location("research_commercial_keywords", RESEARCH_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("commercial keyword research is not importable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CommercialCampaignConfigTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = load_config()

    def test_campaign_identity_and_budget_are_locked(self):
        self.assertEqual(self.config.CUSTOMER_ID, "8605345590")
        self.assertEqual(
            self.config.CAMPAIGN_NAME,
            "Search | OC | Commercial Window Film | Obsidian Build",
        )
        self.assertEqual(
            self.config.FINAL_URL,
            "https://www.obsidianautoworksoc.com/commercial-window-film-socal",
        )
        self.assertEqual(self.config.DAILY_BUDGET_MICROS, 25_000_000)

    def test_four_ad_groups_have_positive_manual_cpc_caps(self):
        self.assertEqual(
            set(self.config.AD_GROUPS),
            {
                "Commercial Window Film",
                "Solar Heat Glare Film",
                "Privacy Decorative Film",
                "Safety Security Film",
            },
        )
        for group in self.config.AD_GROUPS.values():
            self.assertIsInstance(group["max_cpc_micros"], int)
            self.assertGreater(group["max_cpc_micros"], 0)

    def test_launch_keywords_are_exact_or_phrase_only(self):
        keywords = [
            keyword
            for group in self.config.AD_GROUPS.values()
            for keyword in group["launch_keywords"]
        ]
        self.assertGreater(len(keywords), 0)
        self.assertTrue(all(keyword["match_type"] in {"EXACT", "PHRASE"} for keyword in keywords))
        self.assertFalse(any(keyword["match_type"] == "BROAD" for keyword in keywords))
        self.assertTrue(all(self.config.is_valid_launch_keyword(keyword["text"]) for keyword in keywords))

    def test_campaign_negatives_cover_excluded_intent_without_blocking_commercial_themes(self):
        negatives = self.config.CAMPAIGN_NEGATIVES
        for category in (
            "residential",
            "automotive",
            "diy_retail",
            "employment_training",
            "research_intent",
        ):
            self.assertIn(category, negatives)
            self.assertGreater(len(negatives[category]), 0)
        self.assertTrue(self.config.is_valid_launch_keyword("commercial window film"))
        self.assertTrue(self.config.is_valid_launch_keyword("office window tinting"))
        for terms in negatives.values():
            for term in terms:
                self.assertTrue(self.config.is_prohibited_term(term))

    def test_geography_matches_live_residential_set(self):
        self.assertEqual(len(self.config.INCLUDED_CITIES), 19)
        self.assertEqual(len(self.config.EXCLUDED_CITIES), 4)
        self.assertEqual(
            set(self.config.EXCLUDED_CITIES),
            {"Garden Grove", "Santa Ana", "Stanton", "Westminster"},
        )
        self.assertIn("Irvine", self.config.INCLUDED_CITIES)
        self.assertIn("San Clemente", self.config.INCLUDED_CITIES)
        self.assertTrue(all(city["geo_target_constant"].isdigit() for city in self.config.INCLUDED_CITIES.values()))

    def test_keyword_research_prefers_service_account_from_supplied_env_file(self):
        research = load_research()

        class Credentials:
            token = "service-account-access-token"
            refreshed = False

            def refresh(self, request):
                self.refreshed = True

        credentials = Credentials()

        class FakeServiceAccount:
            class Credentials:
                @staticmethod
                def from_service_account_file(path, scopes):
                    self.assertEqual(scopes, ["https://www.googleapis.com/auth/adwords"])
                    return credentials

        with tempfile.NamedTemporaryFile() as key_file:
            with patch.object(research, "service_account", FakeServiceAccount, create=True), patch.object(
                research, "GoogleAuthRequest", lambda: "request", create=True
            ):
                token = research.access_token({"GOOGLE_APPLICATION_CREDENTIALS": key_file.name})

        self.assertTrue(credentials.refreshed)
        self.assertEqual(token, "service-account-access-token")

    def test_cpcs_use_national_keyword_planner_low_range_evidence_with_scope_limit(self):
        expected = {
            "Commercial Window Film": 5_250_000,
            "Solar Heat Glare Film": 2_250_000,
            "Privacy Decorative Film": 5_250_000,
            "Safety Security Film": 2_500_000,
        }
        self.assertEqual(
            {name: group["max_cpc_micros"] for name, group in self.config.AD_GROUPS.items()},
            expected,
        )
        self.assertTrue(
            all(
                group["bid_basis"] == "national_keyword_planner_ui_export_low_range_conservative_cap"
                for group in self.config.AD_GROUPS.values()
            )
        )
        self.assertTrue(
            all(
                group["cpc_status"] == "commercial_bid_evidence_national_scope_not_19_city_demand"
                for group in self.config.AD_GROUPS.values()
            )
        )

    def test_utf16_keyword_planner_export_is_national_aggregate_evidence(self):
        research = load_research()
        export = "\n".join(
            [
                "Keyword Stats 2026-08-08 at 10_16_10",
                '"July 1, 2025 - June 30, 2026"',
                "Keyword\tCurrency\tAvg. monthly searches\tCompetition\tTop of page bid (low range)\tTop of page bid (high range)",
                "commercial window tinting\tUSD\t4,400\tHigh\t3.55\t23.51",
                "commercial solar window film\tUSD\t10\tHigh\t2.33\t11.00",
                "office window frosting\tUSD\t110\tHigh\t5.03\t25.77",
                "commercial security film installation\tUSD\t10\tUnknown\t\t",
                "commercial window tint roll\tUSD\t50\tHigh\t0.81\t5.94",
                "car window tinting\tUSD\t1,000\tHigh\t2.00\t10.00",
                "anti graffiti window film\tUSD\t40\tHigh\t1.00\t4.00",
                "commercial xpel window film\tUSD\t40\tHigh\t1.00\t4.00",
            ]
        )
        with tempfile.NamedTemporaryFile(suffix=".csv") as source:
            Path(source.name).write_text(export, encoding="utf-16")
            summary = research.parse_keyword_planner_export(
                Path(source.name), "United States", self.config
            )

        self.assertEqual(summary["source_format"], "utf-16le-tab-separated")
        self.assertEqual(summary["scope"]["planner_location"], "United States")
        self.assertIn("not 19-city demand", summary["scope"]["limitation"])
        self.assertEqual(summary["total_keyword_rows"], 8)
        self.assertEqual(summary["relevant_keyword_rows"], 4)
        self.assertEqual(summary["aggregates_by_ad_group"]["Commercial Window Film"]["keyword_count"], 1)
        self.assertEqual(summary["aggregates_by_ad_group"]["Commercial Window Film"]["average_monthly_searches_total"], 4400)
        self.assertEqual(summary["aggregates_by_ad_group"]["Solar Heat Glare Film"]["low_top_of_page_bid_micros_min"], 2_330_000)

        artifact = research.build_artifact(
            self.config,
            [],
            "keyword_planner_access_unavailable",
            keyword_planner_ui_export=summary,
        )
        self.assertEqual(artifact["keyword_planner_ui_export"]["scope"]["planner_location"], "United States")

    def test_national_export_requires_explicit_location(self):
        research = load_research()
        with self.assertRaisesRegex(ValueError, "planner location"):
            research.parse_keyword_planner_export(Path("unused.csv"), "", self.config)

    def test_keyword_planner_export_accepts_bomless_utf16le(self):
        research = load_research()
        export = "\n".join(
            [
                "Keyword Stats",
                '"July 1, 2025 - June 30, 2026"',
                "Keyword\tCurrency\tAvg. monthly searches\tTop of page bid (low range)\tTop of page bid (high range)",
                "commercial solar window film\tUSD\t10\t2.33\t11.00",
            ]
        )
        with tempfile.NamedTemporaryFile(suffix=".csv") as source:
            Path(source.name).write_bytes(export.encode("utf-16le"))
            summary = research.parse_keyword_planner_export(
                Path(source.name), "United States", self.config
            )
        self.assertEqual(summary["source_format"], "utf-16le-tab-separated")
        self.assertEqual(summary["relevant_keyword_rows"], 1)

    def test_error_evidence_is_whitelisted_secret_free_and_deterministic(self):
        research = load_research()

        class Response:
            status_code = 403

            @staticmethod
            def json():
                return {
                    "error": {
                        "status": "PERMISSION_DENIED",
                        "message": "Bearer super-secret must never be serialized",
                        "details": [
                            {
                                "requestId": "variable-request-id",
                                "errors": [
                                    {"errorCode": {"authorizationError": "DEVELOPER_TOKEN_NOT_APPROVED"}}
                                ],
                            }
                        ],
                    }
                }

        planner_error = research.whitelist_google_ads_error(Response())
        self.assertEqual(
            planner_error,
            {"http_status": 403, "google_ads_error_code": "DEVELOPER_TOKEN_NOT_APPROVED"},
        )
        artifact_one = research.build_artifact(
            self.config,
            [],
            "keyword_planner_access_unavailable",
            planner_error=planner_error,
        )
        artifact_two = research.build_artifact(
            self.config,
            [],
            "keyword_planner_access_unavailable",
            planner_error=planner_error,
        )
        serialized = json.dumps(artifact_one, sort_keys=True)
        self.assertEqual(serialized, json.dumps(artifact_two, sort_keys=True))
        self.assertNotIn("super-secret", serialized)
        self.assertNotIn("variable-request-id", serialized)
        self.assertNotIn("PERMISSION_DENIED", serialized)
        self.assertTrue(
            all(
                decision["cpc_status"] == "commercial_bid_evidence_national_scope_not_19_city_demand"
                for decision in artifact_one["launch_decisions"]
            )
        )

    def test_search_term_summary_separates_missing_commercial_history_from_adjacent_cpc(self):
        research = load_research()
        summary = research.summarize_search_terms(
            [
                {"searchTermView": {"searchTerm": "commercial window film"}, "metrics": {"averageCpc": "0"}},
                {"searchTermView": {"searchTerm": "home solar window film"}, "metrics": {"averageCpc": "3590000"}},
                {"searchTermView": {"searchTerm": "car warehouse tint"}, "metrics": {"averageCpc": "8500000"}},
            ]
        )
        self.assertEqual(summary["explicit_commercial_term_count"], 1)
        self.assertEqual(summary["adjacent_window_film_rows"][0]["average_cpc_micros"], 3_590_000)
        self.assertNotIn("car warehouse tint", [row["search_term"] for row in summary["adjacent_window_film_rows"]])

    def test_autocomplete_evidence_adds_high_intent_terms_and_blocks_supplier_intent(self):
        launch_terms = {
            keyword["text"]
            for group in self.config.AD_GROUPS.values()
            for keyword in group["launch_keywords"]
        }
        self.assertTrue(
            {
                "commercial window film installers near me",
                "commercial window film installation",
                "commercial window tinting near me",
                "building window tinting",
                "storefront window tinting",
                "commercial uv window film",
                "office window frosting",
                "commercial window privacy film",
                "commercial security film installation",
                "office window film installation",
                "security window film installation near me",
            }.issubset(launch_terms)
        )
        self.assertIn("supplier", self.config.CAMPAIGN_NEGATIVES["diy_retail"])
        self.assertIn("for sale", self.config.CAMPAIGN_NEGATIVES["diy_retail"])
        self.assertIn("tesla", self.config.CAMPAIGN_NEGATIVES["automotive"])
        self.assertIn("amazon", self.config.CAMPAIGN_NEGATIVES["diy_retail"])
        self.assertIn("career", self.config.CAMPAIGN_NEGATIVES["employment_training"])
        self.assertIn("window replacement", self.config.CAMPAIGN_NEGATIVES["research_intent"])


if __name__ == "__main__":
    unittest.main()
