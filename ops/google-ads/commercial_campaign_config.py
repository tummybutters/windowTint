"""Immutable, mutation-free launch configuration for commercial window film."""

from __future__ import annotations

from types import MappingProxyType


API_VERSION = "v24"
CUSTOMER_ID = "8605345590"
CAMPAIGN_NAME = "Search | OC | Commercial Window Film | Obsidian Build"
FINAL_URL = "https://www.obsidianautoworksoc.com/commercial-window-film-socal"
DAILY_BUDGET_MICROS = 40_000_000
LANGUAGE_CONSTANT = "languageConstants/1000"  # English
CPC_BID_BASIS = "national_keyword_planner_ui_export_low_range_conservative_cap"
CPC_STATUS = "commercial_bid_evidence_national_scope_not_19_city_demand"
CPC_LIMITATION = (
    "A user-provided United States Keyword Planner export supplies commercial bid evidence, but national volume is not "
    "19-city demand. The live campaign's approved $40/day budget remains unchanged; Manual CPC caps stay at or below relevant aggregate low-range bids "
    "(Solar $2.25 versus $2.33 maximum; Safety $2.50 versus $2.65 observed) until 19-city commercial estimates are available."
)


_INCLUDED_CITY_IDS = {
    "Aliso Viejo": "1013532",
    "Costa Mesa": "1013705",
    "Dana Point": "1013719",
    "Irvine": "1013883",
    "Ladera Ranch": "1013918",
    "Laguna Beach": "1013920",
    "Laguna Hills": "1013921",
    "Laguna Niguel": "1013922",
    "Laguna Woods": "9052259",
    "Lake Forest": "1013925",
    "Mission Viejo": "1014017",
    "Newport Beach": "1014058",
    "Rancho Mission Viejo": "9191962",
    "Rancho Santa Margarita": "1014171",
    "San Clemente": "1014217",
    "San Juan Capistrano": "1014228",
    "Tustin": "1014352",
    "Villa Park": "1014372",
    "Yorba Linda": "1014420",
}
INCLUDED_CITIES = MappingProxyType(
    {
        city: MappingProxyType({"geo_target_constant": city_id})
        for city, city_id in _INCLUDED_CITY_IDS.items()
    }
)
EXCLUDED_CITIES = MappingProxyType(
    {
        "Garden Grove": "1013812",
        "Santa Ana": "1014247",
        "Stanton": "1014302",
        "Westminster": "1014394",
    }
)

# Seed coverage is deliberately broader than launch keywords so Keyword Planner can
# expose adjacent demand without widening the future campaign's match types.
SEED_THEMES = (
    "commercial window film",
    "commercial window tinting",
    "office window film",
    "office window tinting",
    "building window film",
    "storefront window film",
    "architectural window film",
    "commercial solar control window film",
    "commercial privacy window film",
    "commercial decorative window film",
    "commercial safety window film",
    "commercial security window film",
)

# Current Google autocomplete suggestions captured 2026-08-08. They indicate
# wording only and are explicitly not search-volume or CPC evidence.
PUBLIC_AUTOCOMPLETE_EVIDENCE = MappingProxyType(
    {
        "captured_on": "2026-08-08",
        "source": "Google autocomplete",
        "suggestions": (
            "commercial window film installers near me",
            "commercial window film near me",
            "commercial window film installation",
            "commercial window film companies",
            "commercial window tinting near me",
            "commercial window tinting for buildings",
            "commercial window tinting cost",
            "office window film installation",
            "office window film near me",
            "office privacy window film",
            "office frosted window film",
            "office glass film",
            "commercial security window film",
            "security window film installation near me",
            "window security film installation cost",
            "commercial UV window film",
            "commercial solar control window film",
        ),
    }
)

CAMPAIGN_NEGATIVES = MappingProxyType(
    {
        "residential": ("residential", "home", "house"),
        "automotive": ("car", "auto", "vehicle", "truck", "windshield", "tesla"),
        "diy_retail": ("diy", "kit", "roll", "amazon", "walmart", "wholesale", "home depot", "supplier", "for sale"),
        "employment_training": ("job", "jobs", "career", "salary", "training", "school"),
        "research_intent": ("definition", "how to install", "reviews", "movie", "camera", "phone screen", "blinds", "curtains", "window replacement", "glass repair"),
    }
)

AD_GROUPS = MappingProxyType(
    {
        "Commercial Window Film": MappingProxyType(
            {
                # Conservative cap informed by national commercial Planner low-range bids;
                # it is not a 19-city demand or CPC estimate.
                "max_cpc_micros": 5_250_000,
                "bid_basis": CPC_BID_BASIS,
                "cpc_status": CPC_STATUS,
                "launch_keywords": (
                    MappingProxyType({"text": "commercial window film", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial window film", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial window tinting", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial window tinting", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial window film installers near me", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial window film installers near me", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial window tinting near me", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial window film installation", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial window film installation", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial window film near me", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial window film near me", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "architectural window film", "match_type": "EXACT"}),
                    MappingProxyType({"text": "building window tinting", "match_type": "EXACT"}),
                    MappingProxyType({"text": "building window tinting", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "storefront window tinting", "match_type": "EXACT"}),
                    MappingProxyType({"text": "storefront window tinting", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "office window tinting", "match_type": "EXACT"}),
                    MappingProxyType({"text": "office window tinting", "match_type": "PHRASE"}),
                ),
            }
        ),
        "Solar Heat Glare Film": MappingProxyType(
            {
                "max_cpc_micros": 2_250_000,
                "bid_basis": CPC_BID_BASIS,
                "cpc_status": CPC_STATUS,
                "launch_keywords": (
                    MappingProxyType({"text": "commercial solar window film", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial solar window film", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "office window film", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "office window film installation", "match_type": "EXACT"}),
                    MappingProxyType({"text": "office window film installation", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial uv window film", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial uv window film", "match_type": "PHRASE"}),
                ),
            }
        ),
        "Privacy Decorative Film": MappingProxyType(
            {
                "max_cpc_micros": 5_250_000,
                "bid_basis": CPC_BID_BASIS,
                "cpc_status": CPC_STATUS,
                "launch_keywords": (
                    MappingProxyType({"text": "office privacy window film", "match_type": "EXACT"}),
                    MappingProxyType({"text": "office privacy window film", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial decorative window film", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "office window frosting", "match_type": "EXACT"}),
                    MappingProxyType({"text": "office window frosting", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "office glass frosting", "match_type": "EXACT"}),
                    MappingProxyType({"text": "office glass frosting", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial window privacy film", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial window privacy film", "match_type": "PHRASE"}),
                ),
            }
        ),
        "Safety Security Film": MappingProxyType(
            {
                "max_cpc_micros": 2_500_000,
                "bid_basis": CPC_BID_BASIS,
                "cpc_status": CPC_STATUS,
                "launch_keywords": (
                    MappingProxyType({"text": "commercial security window film", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial security window film", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial safety window film", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "security window film installation near me", "match_type": "EXACT"}),
                    MappingProxyType({"text": "security window film installation near me", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial security film installation", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial security film installation", "match_type": "PHRASE"}),
                    MappingProxyType({"text": "commercial window security film", "match_type": "EXACT"}),
                    MappingProxyType({"text": "commercial window security film", "match_type": "PHRASE"}),
                ),
            }
        ),
    }
)


def is_prohibited_term(text: str) -> bool:
    """Return whether text contains a campaign-negative phrase."""
    normalized = " ".join(text.casefold().split())
    return any(
        term in normalized
        for terms in CAMPAIGN_NEGATIVES.values()
        for term in terms
    )


def is_valid_launch_keyword(text: str, match_type: str | None = None) -> bool:
    """Allow only commercial terms and exact/phrase matching at launch."""
    if match_type is not None and match_type not in {"EXACT", "PHRASE"}:
        return False
    normalized = " ".join(text.casefold().split())
    return bool(normalized) and not is_prohibited_term(normalized) and (
        "commercial" in normalized
        or "office" in normalized
        or "architectural window film" in normalized
        or "security window film" in normalized
        or "building window" in normalized
        or "storefront window" in normalized
    )


def city_geo_target_constants() -> tuple[str, ...]:
    """Return the complete included-city set as API resource names."""
    return tuple(
        f"geoTargetConstants/{city['geo_target_constant']}"
        for city in INCLUDED_CITIES.values()
    )
