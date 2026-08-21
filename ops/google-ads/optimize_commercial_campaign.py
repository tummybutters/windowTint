#!/usr/bin/env python3
"""Guarded commercial Search optimization for campaign 24117892229.

The default mode is read-only. ``--validate-only`` sends the exact operation
batch to Google Ads with validateOnly=true. ``--apply`` requires the fixed
confirmation token, applies that same all-or-nothing batch, then rereads it.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests


HERE = Path(__file__).resolve().parent


def _load_local(name: str):
    spec = importlib.util.spec_from_file_location(name, HERE / f"{name}.py")
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


rest = _load_local("google_ads_rest")

CUSTOMER_ID = "8605345590"
MANAGER_ID = "2189276309"
CAMPAIGN_ID = "24117892229"
CAMPAIGN_NAME = "Search | OC | Commercial Window Film | Obsidian Build"
CAMPAIGN_RESOURCE = f"customers/{CUSTOMER_ID}/campaigns/{CAMPAIGN_ID}"
DAILY_BUDGET_MICROS = 40_000_000
FINAL_ROOT = "https://www.obsidianautoworksoc.com"
CONFIRMATION_TOKEN = "APPLY_COMMERCIAL_OPTIMIZATION_20260820"

TARGET_BIDS = {
    "246327397": {
        "resource": f"customers/{CUSTOMER_ID}/adGroupCriteria/196849750257~246327397",
        "ad_group_id": "196849750257",
        "text": "commercial window tinting",
        "match_type": "PHRASE",
        "target_micros": 12_000_000,
    },
    "310494715": {
        "resource": f"customers/{CUSTOMER_ID}/adGroupCriteria/196849750257~310494715",
        "ad_group_id": "196849750257",
        "text": "commercial window tinting",
        "match_type": "EXACT",
        "target_micros": 15_000_000,
    },
}

AD_GROUPS = {
    "196849750257": "Commercial Window Film",
    "196849750297": "Solar Heat Glare Film",
    "196849750457": "Privacy Decorative Film",
    "196849750497": "Safety Security Film",
}


def _rsa(group_id: str, path: str, headlines: list[str], descriptions: list[str]) -> dict[str, Any]:
    return {
        "ad_group": f"customers/{CUSTOMER_ID}/adGroups/{group_id}",
        "status": "ENABLED",
        "final_urls": [f"{FINAL_ROOT}{path}"],
        "headlines": headlines,
        "descriptions": descriptions,
    }


RSA_VARIANTS = {
    "196849750257": _rsa(
        "196849750257", "/commercial-window-tinting-orange-county",
        ["Commercial Window Film", "Office & Storefront Film", "Window Film Site Review", "Film For Commercial Glass", "Plan Your Glass Project", "Building Window Film", "Office Window Film", "Storefront Window Film", "Discuss Film Options", "Orange County Site Review"],
        ["Commercial window film for offices, storefronts, and shared spaces.", "Discuss the glass, access, and project goal before choosing a film direction.", "Request a site review for solar, privacy, decorative, or safety needs.", "Call or text property details, photos, and rough measurements to start."],
    ),
    "196849750297": _rsa(
        "196849750297", "/commercial-heat-glare-window-film",
        ["Solar Control Window Film", "Commercial Heat & Glare Film", "Office Solar Film Options", "Manage Window Glare", "Film For Sun-Facing Glass", "Commercial Glass Site Review", "Discuss Solar Control", "Office Window Film", "Building Window Film", "Plan Your Site Review"],
        ["Review commercial film options for sun-exposed glass, heat, and glare.", "Discuss the space, glazing, and access before choosing a solar-control direction.", "Site-specific planning for office, storefront, and building glass.", "Call or text photos and rough measurements for a commercial site review."],
    ),
    "196849750457": _rsa(
        "196849750457", "/office-privacy-window-film",
        ["Office Privacy Window Film", "Commercial Privacy Film", "Frosted Office Glass Film", "Decorative Glass Film", "Privacy For Conference Rooms", "Shape Glass Sightlines", "Privacy Film Site Review", "Office Glass Film Options", "Plan Your Privacy Finish", "Discuss Decorative Film"],
        ["Privacy and decorative film options for offices, partitions, and storefront glass.", "Review sightlines, light, finish, and access before selecting a film direction.", "Discuss conference-room, entry, and customer-facing glass with Obsidian.", "Request a site review with property details, photos, and rough measurements."],
    ),
    "196849750497": _rsa(
        "196849750497", "/storefront-security-window-film",
        ["Commercial Security Film", "Safety Window Film Options", "Security Film Site Review", "Film For Building Glass", "Commercial Glass Protection", "Discuss Glass Retention", "Safety Film Installation", "Plan Your Coverage", "Security Window Film", "Site-Specific Film Review"],
        ["Discuss safety and security film options for commercial building glass.", "Review glass, attachment approach, access, and project intent before selection.", "Plan coverage for offices, storefronts, and shared commercial spaces.", "Call or text property details, photos, and rough measurements to begin."],
    ),
}


class GuardError(RuntimeError):
    pass


def _expect(condition: bool, message: str) -> None:
    if not condition:
        raise GuardError(message)


def _text_assets(items: Any) -> tuple[str, ...]:
    return tuple(str(item.get("text", "")) for item in (items or []))


def run_snapshot(client) -> dict[str, list[dict[str, Any]]]:
    campaign_filter = f"campaign.id = {CAMPAIGN_ID}"
    return {
        "campaign": client.search(
            "SELECT customer.id, campaign.resource_name, campaign.id, campaign.name, campaign.status, "
            "campaign.serving_status, campaign.primary_status, campaign.bidding_strategy_type, "
            "campaign.manual_cpc.enhanced_cpc_enabled, campaign_budget.amount_micros "
            f"FROM campaign WHERE {campaign_filter}"
        ),
        "ad_groups": client.search(
            "SELECT ad_group.resource_name, ad_group.id, ad_group.name, ad_group.status, ad_group.cpc_bid_micros "
            f"FROM ad_group WHERE {campaign_filter} AND ad_group.status != REMOVED"
        ),
        "keywords": client.search(
            "SELECT ad_group.id, ad_group_criterion.resource_name, ad_group_criterion.criterion_id, "
            "ad_group_criterion.status, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, "
            "ad_group_criterion.cpc_bid_micros FROM keyword_view "
            f"WHERE {campaign_filter} AND ad_group_criterion.status != REMOVED"
        ),
        "negative_keywords": client.search(
            "SELECT campaign_criterion.resource_name, campaign_criterion.status, campaign_criterion.negative, "
            "campaign_criterion.keyword.text, campaign_criterion.keyword.match_type "
            f"FROM campaign_criterion WHERE {campaign_filter} AND campaign_criterion.type = KEYWORD "
            "AND campaign_criterion.negative = TRUE AND campaign_criterion.status != REMOVED"
        ),
        "ads": client.search(
            "SELECT ad_group.id, ad_group_ad.resource_name, ad_group_ad.status, ad_group_ad.primary_status, "
            "ad_group_ad.policy_summary.approval_status, ad_group_ad.ad.id, ad_group_ad.ad.final_urls, "
            "ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions "
            f"FROM ad_group_ad WHERE {campaign_filter} AND ad_group_ad.ad.type = RESPONSIVE_SEARCH_AD "
            "AND ad_group_ad.status != REMOVED"
        ),
    }


def normalize_snapshot(raw: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    _expect(len(raw.get("campaign", [])) == 1, "target campaign readback must return exactly one row")
    campaign_row = raw["campaign"][0]
    customer = campaign_row.get("customer", {})
    campaign = campaign_row.get("campaign", {})
    budget = campaign_row.get("campaignBudget", {})
    _expect(str(customer.get("id")) == CUSTOMER_ID, "customer identity drift")
    _expect(str(campaign.get("id")) == CAMPAIGN_ID, "campaign id drift")
    _expect(campaign.get("resourceName") == CAMPAIGN_RESOURCE, "campaign resource drift")
    _expect(campaign.get("name") == CAMPAIGN_NAME, "campaign name drift")
    _expect(campaign.get("status") == "ENABLED", "commercial campaign must remain enabled")
    _expect(campaign.get("biddingStrategyType") == "MANUAL_CPC", "commercial bidding strategy drift")
    _expect(campaign.get("manualCpc", {}).get("enhancedCpcEnabled") is False, "enhanced CPC must remain off")
    _expect(int(budget.get("amountMicros", 0)) == DAILY_BUDGET_MICROS, "commercial budget drift")

    groups = {}
    for row in raw.get("ad_groups", []):
        item = row.get("adGroup", {})
        groups[str(item.get("id"))] = {
            "resource": item.get("resourceName"),
            "name": item.get("name"),
            "status": item.get("status"),
            "cpc_bid_micros": int(item.get("cpcBidMicros", 0)),
        }
    for group_id, name in AD_GROUPS.items():
        _expect(group_id in groups and groups[group_id]["name"] == name, f"ad group identity drift: {group_id}")
        _expect(groups[group_id]["status"] == "ENABLED", f"ad group must remain enabled: {group_id}")

    keywords = {}
    for row in raw.get("keywords", []):
        group = row.get("adGroup", {})
        item = row.get("adGroupCriterion", {})
        criterion_id = str(item.get("criterionId"))
        keywords[criterion_id] = {
            "resource": item.get("resourceName"),
            "ad_group_id": str(group.get("id")),
            "status": item.get("status"),
            "text": item.get("keyword", {}).get("text"),
            "match_type": item.get("keyword", {}).get("matchType"),
            "cpc_bid_micros": int(item.get("cpcBidMicros", 0)),
        }
    for criterion_id, target in TARGET_BIDS.items():
        current = keywords.get(criterion_id)
        _expect(current is not None, f"target keyword missing: {criterion_id}")
        for key in ("resource", "ad_group_id", "text", "match_type"):
            _expect(current[key] == target[key], f"target keyword {key} drift: {criterion_id}")
        _expect(current["status"] == "ENABLED", f"target keyword must remain enabled: {criterion_id}")
        _expect(current["cpc_bid_micros"] <= target["target_micros"], f"target keyword exceeds approved ceiling: {criterion_id}")

    negatives = {
        (row.get("campaignCriterion", {}).get("keyword", {}).get("text", "").casefold(),
         row.get("campaignCriterion", {}).get("keyword", {}).get("matchType", ""))
        for row in raw.get("negative_keywords", [])
        if row.get("campaignCriterion", {}).get("status") == "ENABLED"
    }

    ads = []
    for row in raw.get("ads", []):
        group = row.get("adGroup", {})
        item = row.get("adGroupAd", {})
        ad = item.get("ad", {})
        rsa = ad.get("responsiveSearchAd", {})
        ads.append({
            "ad_group_id": str(group.get("id")),
            "resource": item.get("resourceName"),
            "status": item.get("status"),
            "primary_status": item.get("primaryStatus"),
            "approval_status": item.get("policySummary", {}).get("approvalStatus"),
            "final_urls": tuple(ad.get("finalUrls", [])),
            "headlines": _text_assets(rsa.get("headlines")),
            "descriptions": _text_assets(rsa.get("descriptions")),
        })

    return {
        "campaign": {
            "id": CAMPAIGN_ID,
            "name": CAMPAIGN_NAME,
            "status": campaign.get("status"),
            "serving_status": campaign.get("servingStatus"),
            "primary_status": campaign.get("primaryStatus"),
            "budget_micros": DAILY_BUDGET_MICROS,
        },
        "ad_groups": groups,
        "keywords": keywords,
        "negative_keywords": sorted(negatives),
        "ads": ads,
    }


def _same_rsa(ad: dict[str, Any], expected: dict[str, Any]) -> bool:
    return (
        ad["ad_group_id"] == expected["ad_group"].rsplit("/", 1)[-1]
        and ad.get("status") == expected["status"]
        and ad["final_urls"] == tuple(expected["final_urls"])
        and set(ad["headlines"]) == set(expected["headlines"])
        and set(ad["descriptions"]) == set(expected["descriptions"])
    )


def build_operations(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    operations: list[dict[str, Any]] = []
    for criterion_id, target in TARGET_BIDS.items():
        current = snapshot["keywords"][criterion_id]
        if current["cpc_bid_micros"] < target["target_micros"]:
            operations.append({"adGroupCriterionOperation": {"update": {
                "resourceName": target["resource"],
                "cpcBidMicros": str(target["target_micros"]),
            }, "updateMask": "cpc_bid_micros"}})

    if ("fresno", "PHRASE") not in snapshot["negative_keywords"]:
        operations.append({"campaignCriterionOperation": {"create": {
            "campaign": CAMPAIGN_RESOURCE,
            "negative": True,
            "keyword": {"text": "fresno", "matchType": "PHRASE"},
        }}})

    for group_id, expected in RSA_VARIANTS.items():
        if any(_same_rsa(ad, expected) for ad in snapshot["ads"]):
            continue
        operations.append({"adGroupAdOperation": {"create": {
            "adGroup": expected["ad_group"],
            "status": expected["status"],
            "ad": {
                "finalUrls": expected["final_urls"],
                "responsiveSearchAd": {
                    "headlines": [{"text": text} for text in expected["headlines"]],
                    "descriptions": [{"text": text} for text in expected["descriptions"]],
                },
            },
        }}})
    return operations


def verify_copy_contract() -> None:
    for group_id, ad in RSA_VARIANTS.items():
        _expect(len(ad["headlines"]) >= 3 and len(ad["descriptions"]) >= 2, f"RSA asset count invalid: {group_id}")
        _expect(all(len(text) <= 30 for text in ad["headlines"]), f"RSA headline too long: {group_id}")
        _expect(all(len(text) <= 90 for text in ad["descriptions"]), f"RSA description too long: {group_id}")
        _expect(ad["final_urls"][0].startswith(FINAL_ROOT + "/"), f"RSA destination drift: {group_id}")


def validate_landing_page(session=requests) -> int:
    for ad in RSA_VARIANTS.values():
        url = ad["final_urls"][0]
        response = session.get(url, timeout=30)
        _expect(response.status_code == 200, f"commercial landing page is not live: {url} ({response.status_code})")
        for marker in ("commercial-paid-hero__content--centered", "commercial-installation-visualization.webp"):
            _expect(marker in response.text, f"commercial landing page contract missing: {url} / {marker}")
    return 200


def execute_operations(client, mode: str, operations: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Validate the exact batch first; apply only after validation succeeds."""
    if mode == "plan" or not operations:
        return None
    validation_result = client.mutate("googleAds", operations, validate_only=True)
    result = {"validation": validation_result}
    if mode == "apply":
        result["apply"] = client.mutate("googleAds", operations, validate_only=False)
    return result


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument("--evidence", type=Path, default=Path("docs/evidence/2026-08-20-commercial-optimization.json"))
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--validate-only", action="store_true")
    modes.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm", default="")
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    mode = "apply" if args.apply else "validate-only" if args.validate_only else "plan"
    if mode == "apply":
        _expect(args.confirm == CONFIRMATION_TOKEN, "--apply requires the exact confirmation token")
    verify_copy_contract()
    env = rest.load_env(args.env_file)
    _expect(env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "").replace("-", "") == MANAGER_ID, "manager account scope drift")
    client = rest.build_client_from_env(env, customer_id=CUSTOMER_ID, allow_mutation=mode != "plan")
    before = normalize_snapshot(run_snapshot(client))
    operations = build_operations(before)
    landing_status = validate_landing_page() if mode != "plan" else None
    result = execute_operations(client, mode, operations)
    after = normalize_snapshot(run_snapshot(client)) if mode == "apply" else before
    if mode == "apply":
        _expect(not build_operations(after), "post-apply readback still has unapplied operations")
        _expect(after["campaign"]["budget_micros"] == DAILY_BUDGET_MICROS, "budget changed during optimization")
    request_ids = [
        str(item.get("request_id") or "")
        for item in (result or {}).values()
        if isinstance(item, dict)
    ]
    clean_result = dict(result or {})
    for item in clean_result.values():
        if isinstance(item, dict):
            item.pop("request_id", None)
    evidence = rest.redact_for_evidence({
        "schema_version": 1,
        "created_at": datetime.now(UTC).isoformat(),
        "mode": mode,
        "customer_id": CUSTOMER_ID,
        "campaign_id": CAMPAIGN_ID,
        "landing_status": landing_status,
        "operation_count": len(operations),
        "operations": operations,
        "before": before,
        "after": after,
        "result": clean_result,
        "request_id_sha256": [hashlib.sha256(item.encode()).hexdigest() for item in request_ids if item],
    })
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "mode": mode,
        "operation_count": len(operations),
        "bid_updates": sum("adGroupCriterionOperation" in item for item in operations),
        "negative_creates": sum("campaignCriterionOperation" in item for item in operations),
        "paused_rsa_creates": sum("adGroupAdOperation" in item for item in operations),
        "evidence": str(args.evidence),
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
