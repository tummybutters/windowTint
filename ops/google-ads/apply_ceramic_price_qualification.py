#!/usr/bin/env python3
"""Guarded create-and-cutover workflow for the ceramic-coating $795 RSAs.

The default and ``--validate`` modes are read-only. ``--apply-create`` creates
only the two exact price-led RSAs. ``--cutover`` can pause only three named
historical ads, and only after both replacements are approved and eligible.
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


config = _load_local("ceramic_price_qualification_config")
rest = _load_local("google_ads_rest")


class GuardError(RuntimeError):
    """Raised before an unsafe or out-of-scope Ads operation is constructed."""


def _expect(condition: bool, message: str) -> None:
    if not condition:
        raise GuardError(message)


def _integer(value: Any) -> int:
    return int(value or 0)


def _asset_tuple(items: Any) -> tuple[dict[str, str], ...]:
    return tuple(
        {
            key: str(value)
            for key, value in item.items()
            if key in {"text", "pinnedField"} and value not in {None, "UNSPECIFIED", "UNKNOWN"}
        }
        for item in (items or [])
    )


def _plain_ad(ad: Any) -> dict[str, Any]:
    return {
        "finalUrls": list(ad["finalUrls"]),
        "path1": ad["path1"],
        "path2": ad["path2"],
        "headlines": [dict(item) for item in ad["headlines"]],
        "descriptions": [dict(item) for item in ad["descriptions"]],
    }


def expected_price_ad_snapshots() -> list[dict[str, Any]]:
    """Return normalized approved examples for tests and exact-match guards."""
    rows = []
    for ad_group_id, ad_id, source in (
        (config.CORE_AD_GROUP_ID, "expected-core-price-led", config.CORE_RSA),
        (config.COST_AD_GROUP_ID, "expected-cost-price-led", config.COST_RSA),
    ):
        plain = _plain_ad(source)
        rows.append(
            {
                "ad_group_id": ad_group_id,
                "ad_id": ad_id,
                "resource_name": f"customers/{config.CUSTOMER_ID}/adGroupAds/{ad_group_id}~{ad_id}",
                "status": "ENABLED",
                "primary_status": "ELIGIBLE",
                "policy_approval_status": "APPROVED",
                "final_urls": tuple(plain["finalUrls"]),
                "path1": plain["path1"],
                "path2": plain["path2"],
                "headlines": tuple(plain["headlines"]),
                "descriptions": tuple(plain["descriptions"]),
            }
        )
    return rows


def run_snapshot_queries(client, duplicate_client) -> dict[str, list[dict[str, Any]]]:
    campaign_filter = f"campaign.id = {config.CAMPAIGN_ID}"
    return {
        "campaign": client.search(
            "SELECT customer.id, campaign.resource_name, campaign.id, campaign.name, campaign.status, "
            "campaign.serving_status, campaign.primary_status, campaign.advertising_channel_type, "
            "campaign.bidding_strategy_type, campaign.manual_cpc.enhanced_cpc_enabled, "
            "campaign.network_settings.target_google_search, campaign.network_settings.target_search_network, "
            "campaign.network_settings.target_content_network, "
            "campaign.geo_target_type_setting.positive_geo_target_type, "
            "campaign.geo_target_type_setting.negative_geo_target_type, "
            "campaign_budget.amount_micros, campaign_budget.delivery_method "
            f"FROM campaign WHERE {campaign_filter}"
        ),
        "ad_groups": client.search(
            "SELECT ad_group.resource_name, ad_group.id, ad_group.name, ad_group.status, ad_group.cpc_bid_micros "
            f"FROM ad_group WHERE {campaign_filter}"
        ),
        "ads": client.search(
            "SELECT ad_group.id, ad_group_ad.resource_name, ad_group_ad.status, ad_group_ad.primary_status, "
            "ad_group_ad.policy_summary.approval_status, ad_group_ad.ad.id, ad_group_ad.ad.final_urls, "
            "ad_group_ad.ad.responsive_search_ad.path1, ad_group_ad.ad.responsive_search_ad.path2, "
            "ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions "
            f"FROM ad_group_ad WHERE {campaign_filter} AND ad_group_ad.ad.type = RESPONSIVE_SEARCH_AD "
            "AND ad_group_ad.status != REMOVED"
        ),
        "schedule": client.search(
            "SELECT campaign_criterion.ad_schedule.day_of_week, campaign_criterion.ad_schedule.start_hour, "
            "campaign_criterion.ad_schedule.start_minute, campaign_criterion.ad_schedule.end_hour, "
            "campaign_criterion.ad_schedule.end_minute, campaign_criterion.status "
            f"FROM campaign_criterion WHERE {campaign_filter} AND campaign_criterion.type = AD_SCHEDULE "
            "AND campaign_criterion.status != REMOVED"
        ),
        "locations": client.search(
            "SELECT campaign_criterion.criterion_id, campaign_criterion.status, campaign_criterion.negative, "
            "campaign_criterion.location.geo_target_constant "
            f"FROM campaign_criterion WHERE {campaign_filter} AND campaign_criterion.type = LOCATION "
            "AND campaign_criterion.status != REMOVED"
        ),
        "negative_keywords": client.search(
            "SELECT campaign_criterion.criterion_id, campaign_criterion.status, campaign_criterion.negative, "
            "campaign_criterion.keyword.text, campaign_criterion.keyword.match_type "
            f"FROM campaign_criterion WHERE {campaign_filter} AND campaign_criterion.type = KEYWORD "
            "AND campaign_criterion.negative = TRUE AND campaign_criterion.status != REMOVED"
        ),
        "paused_waste_phrase": client.search(
            "SELECT ad_group.id, ad_group_criterion.criterion_id, ad_group_criterion.status, "
            "ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type "
            "FROM keyword_view WHERE ad_group_criterion.criterion_id = "
            f"{config.PAUSED_WASTE_PHRASE_CRITERION_ID}"
        ),
        "website_calls": client.search(
            "SELECT conversion_action.resource_name, conversion_action.name, conversion_action.status, "
            "conversion_action.type, conversion_action.phone_call_duration_seconds "
            "FROM conversion_action WHERE conversion_action.type = WEBSITE_CALL "
            "AND conversion_action.status != REMOVED"
        ),
        "daily": client.search(
            "SELECT segments.date, metrics.impressions, metrics.clicks "
            f"FROM campaign WHERE {campaign_filter} AND segments.date DURING LAST_30_DAYS"
        ),
        "duplicate": duplicate_client.search(
            "SELECT customer.id, campaign.id, campaign.name, campaign.status, campaign.serving_status "
            f"FROM campaign WHERE campaign.id = {config.DUPLICATE_CAMPAIGN_ID}"
        ),
    }


def normalize_snapshot(raw: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    _expect(len(raw.get("campaign", [])) == 1, "target campaign readback must return exactly one row")
    campaign_row = raw["campaign"][0]
    campaign = campaign_row.get("campaign", {})
    budget = campaign_row.get("campaignBudget", {})
    network = campaign.get("networkSettings", {})
    geo = campaign.get("geoTargetTypeSetting", {})
    manual_cpc = campaign.get("manualCpc", {})

    ad_groups = {}
    for row in raw.get("ad_groups", []):
        item = row.get("adGroup", {})
        ad_groups[str(item.get("id"))] = {
            "name": item.get("name"),
            "status": item.get("status"),
            "cpc_bid_micros": _integer(item.get("cpcBidMicros")),
        }

    ads = []
    for row in raw.get("ads", []):
        ad_group = row.get("adGroup", {})
        group_ad = row.get("adGroupAd", {})
        ad = group_ad.get("ad", {})
        rsa = ad.get("responsiveSearchAd", {})
        ads.append(
            {
                "ad_group_id": str(ad_group.get("id")),
                "ad_id": str(ad.get("id")),
                "resource_name": group_ad.get("resourceName"),
                "status": group_ad.get("status"),
                "primary_status": group_ad.get("primaryStatus"),
                "policy_approval_status": group_ad.get("policySummary", {}).get("approvalStatus"),
                "final_urls": tuple(ad.get("finalUrls", [])),
                "path1": rsa.get("path1", ""),
                "path2": rsa.get("path2", ""),
                "headlines": _asset_tuple(rsa.get("headlines", [])),
                "descriptions": _asset_tuple(rsa.get("descriptions", [])),
            }
        )

    schedule = []
    for row in raw.get("schedule", []):
        criterion = row.get("campaignCriterion", {})
        if criterion.get("status") != "REMOVED":
            item = criterion.get("adSchedule", {})
            schedule.append(
                {
                    "day": item.get("dayOfWeek"),
                    "start_hour": _integer(item.get("startHour")),
                    "start_minute": item.get("startMinute"),
                    "end_hour": _integer(item.get("endHour")),
                    "end_minute": item.get("endMinute"),
                }
            )

    location_ids = set()
    for row in raw.get("locations", []):
        criterion = row.get("campaignCriterion", {})
        if criterion.get("status") == "ENABLED" and criterion.get("negative") is not True:
            location_ids.add(str(criterion.get("criterionId")))

    negative_keywords = tuple(
        row.get("campaignCriterion", {}).get("keyword", {}).get("text", "")
        for row in raw.get("negative_keywords", [])
        if row.get("campaignCriterion", {}).get("status") == "ENABLED"
    )

    paused_rows = raw.get("paused_waste_phrase", [])
    _expect(len(paused_rows) == 1, "paused waste phrase readback must return exactly one row")
    paused = paused_rows[0].get("adGroupCriterion", {})

    call_rows = [
        row.get("conversionAction", {})
        for row in raw.get("website_calls", [])
        if row.get("conversionAction", {}).get("name") == "Qualified Website Call - Obsidian Coating"
    ]
    _expect(len(call_rows) == 1, "qualified coating website-call action must return exactly one row")
    call = call_rows[0]

    serving_dates = [
        row.get("segments", {}).get("date")
        for row in raw.get("daily", [])
        if _integer(row.get("metrics", {}).get("impressions")) > 0
        or _integer(row.get("metrics", {}).get("clicks")) > 0
    ]

    duplicate_rows = raw.get("duplicate", [])
    _expect(len(duplicate_rows) == 1, "paused duplicate readback must return exactly one row")
    duplicate_row = duplicate_rows[0]
    duplicate = duplicate_row.get("campaign", {})

    return {
        "customer_id": str(campaign_row.get("customer", {}).get("id")),
        "campaign": {
            "id": str(campaign.get("id")),
            "name": campaign.get("name"),
            "status": campaign.get("status"),
            "serving_status": campaign.get("servingStatus"),
            "primary_status": campaign.get("primaryStatus"),
            "budget_micros": _integer(budget.get("amountMicros")),
            "budget_delivery_method": budget.get("deliveryMethod"),
            "bidding": campaign.get("biddingStrategyType"),
            "enhanced_cpc_enabled": manual_cpc.get("enhancedCpcEnabled", False),
            "search_network": network.get("targetGoogleSearch"),
            "search_partners": network.get("targetSearchNetwork"),
            "display_network": network.get("targetContentNetwork"),
            "positive_geo_target_type": geo.get("positiveGeoTargetType"),
            "negative_geo_target_type": geo.get("negativeGeoTargetType"),
        },
        "ad_groups": ad_groups,
        "ads": ads,
        "schedule": tuple(schedule),
        "location_ids": location_ids,
        "negative_keywords": negative_keywords,
        "paused_waste_phrase": {
            "criterion_id": str(paused.get("criterionId")),
            "text": paused.get("keyword", {}).get("text"),
            "match_type": paused.get("keyword", {}).get("matchType"),
            "status": paused.get("status"),
        },
        "website_call": {
            "name": call.get("name"),
            "status": call.get("status"),
            "type": call.get("type"),
            "phone_call_duration_seconds": _integer(call.get("phoneCallDurationSeconds")),
        },
        "duplicate": {
            "customer_id": str(duplicate_row.get("customer", {}).get("id")),
            "campaign_id": str(duplicate.get("id")),
            "status": duplicate.get("status"),
        },
        "last_serving_date": max(serving_dates) if serving_dates else None,
    }


def validate_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    _expect(snapshot.get("customer_id") == config.CUSTOMER_ID, "target customer drift")
    campaign = snapshot.get("campaign", {})
    _expect(campaign.get("id") == config.CAMPAIGN_ID, "target campaign ID drift")
    _expect(campaign.get("name") == config.CAMPAIGN_NAME, "target campaign name drift")
    _expect(campaign.get("status") == "ENABLED", "target campaign is not enabled")
    _expect(campaign.get("serving_status") == "SERVING", "target campaign is not serving")
    _expect(campaign.get("budget_micros") == config.DAILY_BUDGET_MICROS, "target budget drift")
    _expect(campaign.get("budget_delivery_method") == "STANDARD", "budget delivery drift")
    _expect(campaign.get("bidding") == "MANUAL_CPC", "bidding strategy drift")
    _expect(campaign.get("enhanced_cpc_enabled") is False, "enhanced CPC must remain disabled")
    _expect(campaign.get("search_network") is True, "Google Search must remain enabled")
    _expect(campaign.get("search_partners") is False, "search partners must remain disabled")
    _expect(campaign.get("display_network") is False, "display network must remain disabled")
    _expect(campaign.get("positive_geo_target_type") == "PRESENCE", "positive location mode drift")
    _expect(campaign.get("negative_geo_target_type") == "PRESENCE", "negative location mode drift")

    ad_groups = snapshot.get("ad_groups", {})
    _expect(set(ad_groups) == set(config.EXPECTED_AD_GROUPS), "ad-group identity drift")
    for ad_group_id, expected in config.EXPECTED_AD_GROUPS.items():
        actual = ad_groups[ad_group_id]
        for field in ("name", "status", "cpc_bid_micros"):
            _expect(actual.get(field) == expected[field], f"ad-group drift: {ad_group_id} {field}")

    actual_schedule = {
        (item["day"], item["start_hour"], item["start_minute"], item["end_hour"], item["end_minute"])
        for item in snapshot.get("schedule", ())
    }
    expected_schedule = {
        (item["day"], item["start_hour"], item["start_minute"], item["end_hour"], item["end_minute"])
        for item in config.EXPECTED_SCHEDULE
    }
    _expect(actual_schedule == expected_schedule, "ad schedule drift")
    _expect(set(snapshot.get("location_ids", set())) == set(config.EXPECTED_LOCATION_IDS), "location target drift")
    _expect(
        len(snapshot.get("negative_keywords", ())) == config.EXPECTED_CAMPAIGN_NEGATIVE_COUNT,
        "campaign negative count drift",
    )

    paused = snapshot.get("paused_waste_phrase", {})
    _expect(paused.get("criterion_id") == config.PAUSED_WASTE_PHRASE_CRITERION_ID, "waste phrase ID drift")
    _expect(paused.get("text") == "paint correction and ceramic coating", "waste phrase text drift")
    _expect(paused.get("match_type") == "PHRASE", "waste phrase match type drift")
    _expect(paused.get("status") == "PAUSED", "waste phrase must remain paused")

    call = snapshot.get("website_call", {})
    _expect(call.get("status") == "ENABLED", "qualified website-call action is not enabled")
    _expect(call.get("type") == "WEBSITE_CALL", "qualified website-call type drift")
    _expect(call.get("phone_call_duration_seconds") == 60, "qualified website-call threshold drift")

    duplicate = snapshot.get("duplicate", {})
    _expect(duplicate.get("customer_id") == config.DUPLICATE_CUSTOMER_ID, "duplicate customer drift")
    _expect(duplicate.get("campaign_id") == config.DUPLICATE_CAMPAIGN_ID, "duplicate campaign ID drift")
    _expect(duplicate.get("status") == "PAUSED", "duplicate ceramic campaign must remain paused")

    named_old_ads = {
        (item.get("ad_group_id"), item.get("ad_id")): item for item in snapshot.get("ads", [])
    }
    required_old = {
        (config.CORE_AD_GROUP_ID, ad_id) for ad_id in config.OLD_CORE_AD_IDS
    } | {
        (config.COST_AD_GROUP_ID, ad_id) for ad_id in config.OLD_COST_AD_IDS
    }
    _expect(required_old.issubset(named_old_ads), "historical cutover ad identity drift")
    for key in required_old:
        _expect(named_old_ads[key].get("status") in {"ENABLED", "PAUSED"}, "historical ad was removed")

    last = snapshot.get("last_serving_date")
    return {
        "delivery_diagnostic": f"no metric row after {last}" if last else "no serving metric row in last 30 days",
        "last_serving_date": last,
    }


def exact_ad_exists(snapshot: dict[str, Any], expected_ad: dict[str, Any], ad_group_id: str) -> bool:
    for item in snapshot.get("ads", []):
        if item.get("ad_group_id") != ad_group_id or item.get("status") == "REMOVED":
            continue
        if (
            tuple(item.get("final_urls", ())) == tuple(expected_ad["finalUrls"])
            and item.get("path1", "") == expected_ad["path1"]
            and item.get("path2", "") == expected_ad["path2"]
            and tuple(item.get("headlines", ())) == tuple(expected_ad["headlines"])
            and tuple(item.get("descriptions", ())) == tuple(expected_ad["descriptions"])
        ):
            return True
    return False


def build_create_operations(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    validate_snapshot(snapshot)
    operations = []
    for ad_group_id, source in (
        (config.CORE_AD_GROUP_ID, config.CORE_RSA),
        (config.COST_AD_GROUP_ID, config.COST_RSA),
    ):
        ad = _plain_ad(source)
        if exact_ad_exists(snapshot, ad, ad_group_id):
            continue
        operations.append(
            {
                "adGroupAdOperation": {
                    "create": {
                        "adGroup": f"customers/{config.CUSTOMER_ID}/adGroups/{ad_group_id}",
                        "status": "ENABLED",
                        "ad": {
                            "finalUrls": ad["finalUrls"],
                            "responsiveSearchAd": {
                                "headlines": ad["headlines"],
                                "descriptions": ad["descriptions"],
                                "path1": ad["path1"],
                                "path2": ad["path2"],
                            },
                        },
                    }
                }
            }
        )
    _expect(len(operations) <= 2, "create operation count escaped guarded scope")
    return operations


def _exact_live_ad(snapshot: dict[str, Any], source: Any, ad_group_id: str) -> dict[str, Any] | None:
    expected = _plain_ad(source)
    for item in snapshot.get("ads", []):
        if item.get("ad_group_id") != ad_group_id:
            continue
        if exact_ad_exists({"ads": [item]}, expected, ad_group_id):
            return item
    return None


def build_cutover_operations(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    validate_snapshot(snapshot)
    for ad_group_id, source in (
        (config.CORE_AD_GROUP_ID, config.CORE_RSA),
        (config.COST_AD_GROUP_ID, config.COST_RSA),
    ):
        item = _exact_live_ad(snapshot, source, ad_group_id)
        _expect(item is not None, f"price-led replacement is missing in ad group {ad_group_id}")
        _expect(item.get("status") == "ENABLED", f"price-led replacement is not enabled in {ad_group_id}")
        _expect(
            item.get("policy_approval_status") == "APPROVED",
            f"price-led replacement is not approved in {ad_group_id}",
        )
        _expect(item.get("primary_status") == "ELIGIBLE", f"price-led replacement is not eligible in {ad_group_id}")

    old_by_key = {
        (item.get("ad_group_id"), item.get("ad_id")): item for item in snapshot.get("ads", [])
    }
    permitted = {
        (config.CORE_AD_GROUP_ID, ad_id) for ad_id in config.OLD_CORE_AD_IDS
    } | {
        (config.COST_AD_GROUP_ID, ad_id) for ad_id in config.OLD_COST_AD_IDS
    }
    operations = []
    for ad_group_id, ad_id in sorted(permitted):
        item = old_by_key[(ad_group_id, ad_id)]
        if item.get("status") == "PAUSED":
            continue
        resource_name = f"customers/{config.CUSTOMER_ID}/adGroupAds/{ad_group_id}~{ad_id}"
        _expect(item.get("resource_name") == resource_name, "historical ad resource drift")
        operations.append(
            {
                "adGroupAdOperation": {
                    "update": {"resourceName": resource_name, "status": "PAUSED"},
                    "updateMask": "status",
                }
            }
        )
    _expect(len(operations) <= 3, "cutover operation count escaped guarded scope")
    return operations


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        items = [_json_safe(item) for item in value]
        return sorted(items, key=lambda item: json.dumps(item, sort_keys=True)) if isinstance(value, (set, frozenset)) else items
    return value


def build_evidence(
    mode: str,
    snapshot: dict[str, Any],
    operations: list[dict[str, Any]],
    result: dict[str, Any] | None,
) -> dict[str, Any]:
    cleaned_result = dict(result or {})
    request_id = str(cleaned_result.pop("request_id", "") or "")
    evidence = {
        "schema_version": 1,
        "created_at": datetime.now(UTC).isoformat(),
        "mode": mode,
        "customer_id": config.CUSTOMER_ID,
        "campaign_id": config.CAMPAIGN_ID,
        "validation": validate_snapshot(snapshot),
        "snapshot": _json_safe(snapshot),
        "operations": _json_safe(operations),
        "result": cleaned_result,
        "request_id_sha256": hashlib.sha256(request_id.encode()).hexdigest() if request_id else None,
    }
    return rest.redact_for_evidence(evidence)


def validate_landing_pages(session=requests) -> dict[str, int]:
    checks = {
        "https://www.obsidianautoworksoc.com/ceramic-coating": (
            "Packages from $795",
            config.WEBSITE_CALL_CONFIG_ID,
        ),
        "https://www.obsidianautoworksoc.com/ceramic-coating-cost-paint-correction": (
            "Ceramic Refresh Package",
            "Premium Protection Package",
            "Signature Correction &amp; Coating",
            "Concours Package",
            config.WEBSITE_CALL_CONFIG_ID,
        ),
    }
    statuses = {}
    for url, required in checks.items():
        response = session.get(url, timeout=30)
        _expect(response.status_code == 200, f"landing page is not live: {url} ({response.status_code})")
        for value in required:
            _expect(value in response.text, f"landing page contract missing {value}: {url}")
        statuses[url] = response.status_code
    return statuses


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument(
        "--evidence",
        type=Path,
        default=Path("docs/evidence/2026-08-08-ceramic-price-ads-validation.json"),
    )
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--validate", action="store_true")
    modes.add_argument("--apply-create", action="store_true")
    modes.add_argument("--cutover", action="store_true")
    parser.add_argument("--confirm", default="")
    return parser.parse_args(argv)


def command_mode(args) -> str:
    if args.apply_create:
        _expect(args.confirm == config.CREATE_CONFIRMATION_TOKEN, "--apply-create requires the exact confirmation token")
        return "apply-create"
    if args.cutover:
        _expect(args.confirm == config.CUTOVER_CONFIRMATION_TOKEN, "--cutover requires the exact confirmation token")
        return "cutover"
    return "validate"


def _clients(env: dict[str, str], allow_mutation: bool):
    _expect(
        env.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID", "").replace("-", "") == config.MANAGER_ACCOUNT_ID,
        "manager account scope drift",
    )
    developer_token = env.get("GOOGLE_ADS_DEVELOPER_TOKEN", "")
    _expect(bool(developer_token), "Google Ads developer token is missing")
    token = rest.access_token(env)
    target = rest.GoogleAdsRestClient(
        customer_id=config.CUSTOMER_ID,
        developer_token=developer_token,
        access_token=token,
        login_customer_id=config.MANAGER_ACCOUNT_ID,
        allow_mutation=allow_mutation,
    )
    duplicate = rest.GoogleAdsRestClient(
        customer_id=config.DUPLICATE_CUSTOMER_ID,
        developer_token=developer_token,
        access_token=token,
        login_customer_id=config.MANAGER_ACCOUNT_ID,
        allow_mutation=False,
    )
    return target, duplicate


def main(argv=None) -> int:
    args = parse_args(argv)
    mode = command_mode(args)
    env = rest.load_env(args.env_file)
    target, duplicate = _clients(env, allow_mutation=mode != "validate")
    raw = run_snapshot_queries(target, duplicate)
    snapshot = normalize_snapshot(raw)
    operations = (
        build_cutover_operations(snapshot) if mode == "cutover" else build_create_operations(snapshot)
    )
    landing_pages = validate_landing_pages()
    result = None
    if mode != "validate" and operations:
        result = target.mutate("googleAds", operations)
    evidence = build_evidence(mode, snapshot, operations, result)
    evidence["landing_pages"] = landing_pages
    args.evidence.parent.mkdir(parents=True, exist_ok=True)
    args.evidence.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "mode": mode,
        "operation_count": len(operations),
        "evidence": str(args.evidence),
        "result": evidence.get("result"),
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
