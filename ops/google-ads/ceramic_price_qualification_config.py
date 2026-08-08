"""Immutable scope and copy for the ceramic-coating $795 qualification rollout."""

from __future__ import annotations

from types import MappingProxyType


MANAGER_ACCOUNT_ID = "2189276309"
CUSTOMER_ID = "8591070105"
CAMPAIGN_ID = "24054610950"
CAMPAIGN_NAME = "Search | OC | Ceramic Coating | Obsidian Build"
DAILY_BUDGET_MICROS = 71_000_000

CORE_AD_GROUP_ID = "199530647918"
COST_AD_GROUP_ID = "199530568558"
PROTECTED_AD_GROUP_IDS = frozenset({"199530570158", "199530652518"})

DUPLICATE_CUSTOMER_ID = "8605345590"
DUPLICATE_CAMPAIGN_ID = "24058475904"

OLD_CORE_AD_IDS = frozenset({"818560843375"})
OLD_COST_AD_IDS = frozenset({"818560843378", "819021913646"})

CREATE_CONFIRMATION_TOKEN = "CREATE_CERAMIC_PRICE_RSAS_2026_08_08"
CUTOVER_CONFIRMATION_TOKEN = "PAUSE_UNPRICED_RSAS_AFTER_APPROVAL_2026_08_08"
WEBSITE_CALL_CONFIG_ID = "AW-18301955625/1asCCLrhh9wcEKnchpdE"

EXPECTED_AD_GROUPS = MappingProxyType(
    {
        "199530570158": MappingProxyType(
            {"name": "Ceramic Coating - Cities", "status": "ENABLED", "cpc_bid_micros": 8_000_000}
        ),
        CORE_AD_GROUP_ID: MappingProxyType(
            {"name": "Ceramic Coating - Core", "status": "ENABLED", "cpc_bid_micros": 9_500_000}
        ),
        "199530652518": MappingProxyType(
            {"name": "Ceramic Coating - Luxury + EV", "status": "ENABLED", "cpc_bid_micros": 6_000_000}
        ),
        COST_AD_GROUP_ID: MappingProxyType(
            {"name": "Coating Cost + Paint Correction", "status": "ENABLED", "cpc_bid_micros": 7_000_000}
        ),
    }
)

EXPECTED_SCHEDULE = tuple(
    MappingProxyType({"day": day, "start_hour": 7, "start_minute": "ZERO", "end_hour": 21, "end_minute": "ZERO"})
    for day in (
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
    )
)


def _assets(items: tuple[dict[str, str], ...]) -> tuple[MappingProxyType, ...]:
    return tuple(MappingProxyType(item) for item in items)


CORE_HEADLINES = _assets(
    (
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
)
CORE_DESCRIPTIONS = _assets(
    (
        {"text": "Mobile Orange County coating packages start at $795 with paint correction included."},
        {"text": "Choose GYEON protection from 1.5 to 4 years based on your car and paint condition."},
        {"text": "Text clear vehicle photos or call Obsidian for the right correction and coating plan."},
        {"text": "Four package levels for newer vehicles, daily drivers, enthusiast cars, and exotics."},
    )
)
COST_HEADLINES = _assets(
    (
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
)
COST_DESCRIPTIONS = _assets(
    (
        {"text": "Compare four Orange County ceramic coating packages from $795 to $3,500+."},
        {"text": "Every package includes preparation and paint correction matched to your vehicle."},
        {"text": "Choose GYEON CanCoat, Pure, Mohs, or Syncro EVO with 1.5 to 4 year protection."},
        {"text": "Call or text paint photos for package guidance, final scope, and scheduling."},
    )
)

CORE_RSA = MappingProxyType(
    {
        "finalUrls": ("https://www.obsidianautoworksoc.com/ceramic-coating",),
        "path1": "ceramic-coating",
        "path2": "packages-795",
        "headlines": CORE_HEADLINES,
        "descriptions": CORE_DESCRIPTIONS,
    }
)
COST_RSA = MappingProxyType(
    {
        "finalUrls": (
            "https://www.obsidianautoworksoc.com/ceramic-coating-cost-paint-correction#packages",
        ),
        "path1": "coating-cost",
        "path2": "from-795",
        "headlines": COST_HEADLINES,
        "descriptions": COST_DESCRIPTIONS,
    }
)
