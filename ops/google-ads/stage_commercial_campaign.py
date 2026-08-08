#!/usr/bin/env python3
"""Guarded, paused-first stager for Obsidian commercial window film Search.

The default command is deliberately read-only.  ``--apply`` requires an exact
confirmation token and writes only paused campaign/ad resources; ``--enable``
is a separate, deliberately small action after a human has reviewed readback.
"""

from __future__ import annotations

import argparse
import base64
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[1]
IMAGE_MANIFEST_PATH = REPO_ROOT / "assets/commercial-window-film/image-assets.json"


def _load_local(name: str):
    spec = importlib.util.spec_from_file_location(name, HERE / f"{name}.py")
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {name}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


config = _load_local("commercial_campaign_config")
rest = _load_local("google_ads_rest")

CALLS_FROM_ADS_ACTION = "customers/8605345590/conversionActions/7441005241"
QUALIFIED_WEBSITE_CALL_ACTION = "customers/8605345590/conversionActions/7693228248"
CALL_ASSET = "customers/8605345590/assets/320657161326"
APPLY_CONFIRMATION_TOKEN = "CREATE_PAUSED_COMMERCIAL_CAMPAIGN"
ENABLE_CONFIRMATION_TOKEN = "ENABLE_REVIEWED_COMMERCIAL_CAMPAIGN"

# This compatibility constant is deliberately empty: live
# customer_conversion_goal rows, not an invented static list, define every
# regular category/origin pair the newly created campaign must disable.
REGULAR_GOAL_PAIRS: tuple[tuple[str, str], ...] = ()


class GuardError(RuntimeError):
    """Raised before a potentially unsafe Ads operation is constructed."""


def _short_hash(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def _named(name: str) -> str:
    return f"{config.CAMPAIGN_NAME} | {name}"


def jpeg_dimensions(data: bytes) -> tuple[int, int]:
    """Return JPEG width and height without an optional image dependency."""
    _expect(data[:2] == b"\xff\xd8", "commercial image asset is not a JPEG")
    position = 2
    start_of_frame = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
    while position + 8 < len(data):
        if data[position] != 0xFF:
            position += 1
            continue
        while position < len(data) and data[position] == 0xFF:
            position += 1
        marker = data[position]
        position += 1
        if marker in {0x01, 0xD8, 0xD9}:
            continue
        _expect(position + 2 <= len(data), "commercial JPEG segment is truncated")
        segment_length = int.from_bytes(data[position : position + 2], "big")
        _expect(segment_length >= 2 and position + segment_length <= len(data), "commercial JPEG segment is invalid")
        if marker in start_of_frame:
            height = int.from_bytes(data[position + 3 : position + 5], "big")
            width = int.from_bytes(data[position + 5 : position + 7], "big")
            _expect(width > 0 and height > 0, "commercial JPEG dimensions are invalid")
            return width, height
        position += segment_length
    raise GuardError("commercial JPEG dimensions were not found")


def load_image_asset_manifest() -> list[dict[str, Any]]:
    """Load and byte-verify the exact image package approved for this launch."""
    manifest = json.loads(IMAGE_MANIFEST_PATH.read_text())
    _expect(manifest.get("rights_confirmed") is True, "commercial image rights confirmation is missing")
    _expect(manifest.get("google_ads_specs", {}).get("maximum_bytes") == 5_120_000, "commercial image size guard drift")
    rows = manifest.get("assets", [])
    _expect(len(rows) == 8, "commercial image package must contain exactly eight assets")
    images: list[dict[str, Any]] = []
    for row in rows:
        relative_path = Path("assets/commercial-window-film") / row["path"]
        _expect(not relative_path.is_absolute() and ".." not in relative_path.parts, "commercial image path escapes repository")
        file_path = REPO_ROOT / relative_path
        _expect(file_path.is_file(), f"commercial image asset is missing: {relative_path}")
        payload = file_path.read_bytes()
        width, height = jpeg_dimensions(payload)
        expected_dimensions = tuple(int(value) for value in row["dimensions"].split("x"))
        _expect((width, height) == expected_dimensions, f"commercial image dimensions drift: {relative_path}")
        _expect(len(payload) == row["bytes"] and len(payload) <= 5_120_000, f"commercial image byte size drift: {relative_path}")
        _expect(hashlib.sha256(payload).hexdigest() == row["sha256"], f"commercial image hash drift: {relative_path}")
        field_type = "AD_IMAGE"
        synthetic = row["provenance"].startswith("OpenAI-generated")
        images.append({
            "name": _named(f"Image {Path(row['path']).stem} {row['sha256'][:12]}"),
            "path": relative_path.as_posix(),
            "provenance": row["provenance"],
            "field_type": field_type,
            "format": row["format"],
            "pixel_dimensions": [width, height],
            "bytes": len(payload),
            "sha256": row["sha256"],
            "synthetic": synthetic,
        })
    _expect(sum(item["format"] == "square" for item in images) == 4, "commercial square image count drift")
    _expect(sum(item["format"] == "landscape" for item in images) == 4, "commercial landscape image count drift")
    return images


def _rsa(headlines: list[str], descriptions: list[str]) -> dict[str, Any]:
    return {"status": "PAUSED", "final_urls": [config.FINAL_URL], "headlines": headlines, "descriptions": descriptions}


RSA_COPY = {
    "Commercial Window Film": _rsa(
        ["Commercial Window Film", "Office & Storefront Film", "Request a Site Review", "Window Film For Buildings", "Commercial Glass Film", "Discuss Film Options", "Office Window Film", "Storefront Window Film", "Plan Your Site Review", "Commercial Film Install"],
        ["Commercial film for offices, storefronts and buildings.", "Talk through your site and window-film options.", "Review heat, glare and privacy needs for your glass.", "Request a commercial window-film site review."],
    ),
    "Solar Heat Glare Film": _rsa(
        ["Solar Control Window Film", "Cut Heat & Window Glare", "Film For Offices", "Request a Site Review", "Commercial Solar Film", "Manage Window Glare", "Film For Storefronts", "Building Window Film", "Discuss Your Glass", "Solar Film Options"],
        ["Explore solar-control film for commercial glass.", "Discuss glare, heat and privacy needs for your space.", "Review window-film options for your commercial site.", "Request a site review for your building glass."],
    ),
    "Privacy Decorative Film": _rsa(
        ["Office Privacy Window Film", "Decorative Glass Film", "Frosted Office Film", "Request a Site Review", "Commercial Privacy Film", "Office Glass Film", "Privacy Film Options", "Decorative Window Film", "Discuss Your Finish", "Film For Office Glass"],
        ["Privacy and decorative film options for office glass.", "Review coverage, finish and installation needs.", "Discuss film options for conference rooms and offices.", "Request a site review for commercial glass."],
    ),
    "Safety Security Film": _rsa(
        ["Commercial Security Film", "Safety Window Film", "Security Film Installation", "Request a Site Review", "Commercial Safety Film", "Security Window Film", "Film For Building Glass", "Discuss Your Coverage", "Commercial Glass Film", "Safety Film Options"],
        ["Discuss safety and security window-film options.", "Plan coverage for commercial windows and glass.", "Review commercial film options for your glass.", "Request a site review for your building."],
    ),
}


def _expect(condition: bool, message: str) -> None:
    if not condition:
        raise GuardError(message)


def validate_live_state(state: dict[str, Any]) -> None:
    customer = state.get("customer", {})
    _expect(customer.get("id", "").replace("-", "") == config.CUSTOMER_ID, "customer identity is outside guarded scope")
    _expect(customer.get("currencyCode") == "USD", "customer currency drift")
    _expect(customer.get("timeZone") == "America/Los_Angeles", "customer timezone drift")
    _expect(not customer.get("testAccount", False), "test account is outside launch scope")
    _expect(customer.get("conversionTrackingStatus") == "CONVERSION_TRACKING_MANAGED_BY_SELF", "conversion tracking is not managed by this customer")
    _expect(customer.get("googleAdsConversionCustomer") == f"customers/{config.CUSTOMER_ID}", "conversion customer is outside guarded scope")
    locations = state.get("source_locations", [])
    positive = [x for x in locations if not x.get("negative")]
    negative = [x for x in locations if x.get("negative")]
    expected_positive = set(config.city_geo_target_constants())
    expected_negative = {f"geoTargetConstants/{v}" for v in config.EXCLUDED_CITIES.values()}
    _expect(len(positive) == 19 and len(negative) == 4, "source geography must contain exactly 19 included and 4 excluded cities")
    _expect({x.get("geo_target_constant") for x in positive} == expected_positive, "source positive geography drift")
    _expect({x.get("geo_target_constant") for x in negative} == expected_negative, "source negative geography drift")
    _expect(all(x.get("target_type") == "City" and x.get("source_criterion_resource_name") or x.get("criterion_resource_name") for x in locations), "source city criterion is incomplete")
    actions = {x.get("resourceName"): x for x in state.get("conversion_actions", [])}
    for action_id in (CALLS_FROM_ADS_ACTION, QUALIFIED_WEBSITE_CALL_ACTION):
        action = actions.get(action_id, {})
        _expect(action.get("status") == "ENABLED", "required call conversion is not enabled")
        _expect(str(action.get("phoneCallDurationSeconds")) == "60", "required call conversion must be 60-second")
        _expect(action.get("countingType") == "ONE_PER_CLICK", "required call conversion counting-type drift")
    asset = state.get("call_asset", {})
    _expect(asset.get("resourceName") == CALL_ASSET and asset.get("status") == "ENABLED", "required existing call asset drift")
    _expect(asset.get("type") == "CALL" and asset.get("primaryStatus") == "ELIGIBLE", "existing call asset is not eligible")
    goals = state.get("customer_conversion_goals", [])
    _expect(bool(goals), "customer conversion goals are required for goal isolation")
    _expect(all(goal.get("category") and goal.get("origin") for goal in goals), "customer conversion goal pair is incomplete")


def build_plan(state: dict[str, Any]) -> dict[str, Any]:
    validate_live_state(state)
    locations = []
    for item in state["source_locations"]:
        locations.append({
            "geo_target_constant": item["geo_target_constant"], "negative": item["negative"],
            "status": "ENABLED", "target_type": "City",
            "source_criterion_resource_name": item.get("source_criterion_resource_name", item.get("criterion_resource_name")),
        })
    groups = []
    for name, group in config.AD_GROUPS.items():
        keywords = [dict(item, status="ENABLED") for item in group["launch_keywords"]]
        _expect(all(config.is_valid_launch_keyword(k["text"], k["match_type"]) for k in keywords), "launch keyword guard failed")
        groups.append({"name": name, "status": "ENABLED", "cpc_bid_micros": group["max_cpc_micros"], "keywords": keywords, "rsa": RSA_COPY[name]})
    negative_keywords = [
        {"text": term, "match_type": "PHRASE", "status": "ENABLED"}
        for terms in config.CAMPAIGN_NEGATIVES.values() for term in terms
    ]
    regular_goal_pairs = sorted({(goal["category"], goal["origin"]) for goal in state["customer_conversion_goals"]})
    addressable_regular_goal_pairs = [
        pair for pair in regular_goal_pairs
        if pair[0] not in {"UNKNOWN", "UNSPECIFIED"} and pair[1] not in {"UNKNOWN", "UNSPECIFIED"}
    ]
    plan = {
        "customer_id": config.CUSTOMER_ID,
        "budget": {"name": _named("Budget"), "amount_micros": config.DAILY_BUDGET_MICROS, "delivery_method": "STANDARD", "status": "ENABLED"},
        "campaign": {
            "name": config.CAMPAIGN_NAME, "status": "PAUSED", "advertising_channel_type": "SEARCH", "bidding_strategy": "MANUAL_CPC", "enhanced_cpc_enabled": False,
            "network_settings": {"target_google_search": True, "target_search_network": False, "target_content_network": False, "target_partner_search_network": False},
            "geo_target_type_setting": {"positive_geo_target_type": "PRESENCE", "negative_geo_target_type": "PRESENCE"},
            "language_constants": [config.LANGUAGE_CONSTANT], "devices": ["DESKTOP", "MOBILE", "TABLET"], "device_bid_modifiers": {},
        },
        "locations": sorted(locations, key=lambda x: (x["negative"], x["geo_target_constant"])),
        "ad_groups": groups, "campaign_negative_keywords": negative_keywords,
        "assets": {
            "call": {
                "name": _named("Commercial Call"), "country_code": "US", "phone_number": "+17146007134",
                "call_conversion_reporting_state": "USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION",
                "call_conversion_action": CALLS_FROM_ADS_ACTION,
                "supersedes_existing_asset": CALL_ASSET,
                "rationale": "Existing call asset reports at account level; commercial campaign requires canonical resource-level 60-second Calls from ads attribution.",
            },
            "sitelinks": [
                {"text": "Commercial Solutions", "final_url": config.FINAL_URL + "#solutions"},
                {"text": "Our Process", "final_url": config.FINAL_URL + "#process"},
                {"text": "Privacy & Decorative", "final_url": config.FINAL_URL + "#privacy-decorative"},
                {"text": "Request Site Review", "final_url": config.FINAL_URL + "#site-review"},
            ],
            "callouts": ["Commercial Spaces", "Site Review", "Window Film Options", "Office & Storefront"],
            "structured_snippet": {"header": "Types", "values": ["Solar Control", "Privacy", "Decorative", "Safety", "Security"]},
            "images": load_image_asset_manifest(),
        },
        "conversion": {
            "custom_goal": {"name": _named("Qualified 60s Calls Goal"), "conversion_actions": [CALLS_FROM_ADS_ACTION, QUALIFIED_WEBSITE_CALL_ACTION]},
            "consultation_action": {"logical_resource_name": "$result:consultation_action:0", "name": "Commercial Consultation Request - Obsidian", "category": "SUBMIT_LEAD_FORM", "counting_type": "ONE_PER_CLICK", "primary_for_goal": False, "account_default": False},
            "explicitly_non_biddable": ["proxy calls", "Square purchases", "text leads", "residential leads", "Commercial Consultation Request - Obsidian"],
            "regular_goal_pairs": regular_goal_pairs,
            "addressable_regular_goal_pairs": addressable_regular_goal_pairs,
        },
    }
    plan["fingerprint"] = _short_hash({k: v for k, v in plan.items() if k != "fingerprint"})
    return plan


def reconcile_named_resource(kind: str, expected: dict[str, Any], existing: list[dict[str, Any]], fingerprint_fields: tuple[str, ...]) -> dict[str, Any]:
    name = expected.get("name")
    matches = [row for row in existing if row.get("name") == name]
    if len(matches) > 1:
        raise GuardError(f"duplicate same-name {kind} resources")
    if not matches:
        return {"decision": "create", "expected": expected}
    match = matches[0]
    if any(str(match.get(field)) != str(expected.get(field)) for field in fingerprint_fields):
        raise GuardError(f"same-name drift for {kind}")
    return {"decision": "reuse", "resource_name": match.get("resourceName")}


def reconcile_plan_named_resources(plan: dict[str, Any], named: dict[str, list[dict[str, Any]]]) -> dict[str, dict[str, Any]]:
    """Fail closed on names already used by a mismatched launch resource."""
    expectations = {
        "budget": ({"name": plan["budget"]["name"], "amountMicros": str(plan["budget"]["amount_micros"])}, named.get("budgets", []), ("name", "amountMicros")),
        "campaign": ({"name": plan["campaign"]["name"], "status": "PAUSED", "advertisingChannelType": "SEARCH"}, named.get("campaigns", []), ("name", "status", "advertisingChannelType")),
        "consultation_action": ({"name": plan["conversion"]["consultation_action"]["name"], "primaryForGoal": False}, named.get("conversion_actions", []), ("name", "primaryForGoal")),
        "custom_goal": ({"name": plan["conversion"]["custom_goal"]["name"]}, named.get("custom_goals", []), ("name",)),
    }
    for group in plan["ad_groups"]:
        expectations[f"ad_group:{group['name']}"] = ({"name": group["name"], "status": group["status"], "cpcBidMicros": str(group["cpc_bid_micros"])}, named.get("ad_groups", []), ("name", "status", "cpcBidMicros"))
    for label in ["Commercial Call"] + [x["text"] for x in plan["assets"]["sitelinks"]] + plan["assets"]["callouts"] + ["Types"]:
        expectations[f"asset:{label}"] = ({"name": _named(label)}, named.get("assets", []), ("name",))
    for image in plan["assets"]["images"]:
        expectations[f"asset:{image['name']}"] = ({"name": image["name"]}, named.get("assets", []), ("name",))
    return {kind: reconcile_named_resource(kind, expected, rows, fields) for kind, (expected, rows, fields) in expectations.items()}


def _op(create_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {create_type: {"create": payload}}


def build_initial_operation_phases(plan: dict[str, Any]) -> list[dict[str, Any]]:
    cid = plan["customer_id"]
    budget = {"name": plan["budget"]["name"], "amountMicros": str(plan["budget"]["amount_micros"]), "deliveryMethod": "STANDARD"}
    network = {"targetGoogleSearch": True, "targetSearchNetwork": False, "targetContentNetwork": False, "targetPartnerSearchNetwork": False}
    geo = {"positiveGeoTargetType": "PRESENCE", "negativeGeoTargetType": "PRESENCE"}
    campaign = {"name": plan["campaign"]["name"], "status": "PAUSED", "advertisingChannelType": "SEARCH", "campaignBudget": "$result:budget:0", "manualCpc": {"enhancedCpcEnabled": False}, "networkSettings": network, "geoTargetTypeSetting": geo, "containsEuPoliticalAdvertising": "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING"}
    phases = [
        {"name": "budget", "service": "campaignBudgets", "operations": [{"create": budget}], "result_key": "budget"},
        {"name": "campaign", "service": "campaigns", "operations": [{"create": campaign}], "result_key": "campaign"},
        {"name": "custom_goal", "service": "customConversionGoals", "operations": [{"create": {"name": plan["conversion"]["custom_goal"]["name"], "conversionActions": plan["conversion"]["custom_goal"]["conversion_actions"]}}], "result_key": "custom_goal"},
        {"name": "consultation_action", "service": "conversionActions", "operations": [{"create": {"name": plan["conversion"]["consultation_action"]["name"], "category": "SUBMIT_LEAD_FORM", "type": "WEBPAGE", "countingType": "ONE_PER_CLICK", "primaryForGoal": False}}], "result_key": "consultation_action"},
    ]
    campaign_ref = "$result:campaign:0"
    criteria = [{"create": {"campaign": campaign_ref, "negative": False, "status": "ENABLED", "language": {"languageConstant": config.LANGUAGE_CONSTANT}}}]
    for item in plan["locations"]:
        criteria.append({"create": {"campaign": campaign_ref, "negative": item["negative"], "status": "ENABLED", "location": {"geoTargetConstant": item["geo_target_constant"]}}})
    for item in plan["campaign_negative_keywords"]:
        criteria.append({"create": {"campaign": campaign_ref, "negative": True, "keyword": {"text": item["text"], "matchType": item["match_type"]}}})
    phases.append({"name": "criteria", "service": "campaignCriteria", "operations": criteria, "result_key": "criteria"})
    group_ops = []
    for group in plan["ad_groups"]:
        group_ops.append({"create": {"name": group["name"], "campaign": campaign_ref, "status": "ENABLED", "cpcBidMicros": str(group["cpc_bid_micros"])}})
    phases.append({"name": "ad_groups", "service": "adGroups", "operations": group_ops, "result_key": "ad_groups"})
    keyword_ops = []
    rsa_ops = []
    for index, group in enumerate(plan["ad_groups"]):
        group_ref = f"$result:ad_groups:{index}"
        for keyword in group["keywords"]:
            keyword_ops.append({"create": {"adGroup": group_ref, "status": "ENABLED", "keyword": {"text": keyword["text"], "matchType": keyword["match_type"]}, "cpcBidMicros": str(group["cpc_bid_micros"])}})
        rsa_ops.append({"create": {"adGroup": group_ref, "status": "PAUSED", "ad": {"finalUrls": group["rsa"]["final_urls"], "responsiveSearchAd": {"headlines": [{"text": x} for x in group["rsa"]["headlines"]], "descriptions": [{"text": x} for x in group["rsa"]["descriptions"]]}}}})
    phases.append({"name": "keywords", "service": "adGroupCriteria", "operations": keyword_ops, "result_key": "keywords"})
    phases.append({"name": "paused_rsas", "service": "adGroupAds", "operations": rsa_ops, "result_key": "ads"})
    call = plan["assets"]["call"]
    asset_ops = [{"create": {"name": call["name"], "callAsset": {"countryCode": call["country_code"], "phoneNumber": call["phone_number"], "callConversionReportingState": call["call_conversion_reporting_state"], "callConversionAction": call["call_conversion_action"]}}}]
    for item in plan["assets"]["sitelinks"]:
        asset_ops.append({"create": {"name": _named(item["text"]), "finalUrls": [item["final_url"]], "sitelinkAsset": {"linkText": item["text"]}}})
    for text in plan["assets"]["callouts"]:
        asset_ops.append({"create": {"name": _named(text), "calloutAsset": {"calloutText": text}}})
    snippet = plan["assets"]["structured_snippet"]
    asset_ops.append({"create": {"name": _named("Types"), "structuredSnippetAsset": {"header": snippet["header"], "values": snippet["values"]}}})
    for index, image in enumerate(plan["assets"]["images"]):
        asset_ops.append({"create": {
            "name": image["name"],
            "imageAsset": {"data": f"$image_data:{index}"},
            "syntheticContentInfo": {"advertiserAttestation": {
                "source": "ADVERTISER_ATTESTED",
                "status": "IS_SYNTHETIC" if image["synthetic"] else "NOT_SYNTHETIC",
            }},
        }})
    phases.append({"name": "assets", "service": "assets", "operations": asset_ops, "result_key": "assets"})
    association_ops = [{"create": {"campaign": campaign_ref, "asset": "$result:assets:0", "fieldType": "CALL"}}]
    for index in range(1, 5): association_ops.append({"create": {"campaign": campaign_ref, "asset": f"$result:assets:{index}", "fieldType": "SITELINK"}})
    for index in range(5, 9): association_ops.append({"create": {"campaign": campaign_ref, "asset": f"$result:assets:{index}", "fieldType": "CALLOUT"}})
    association_ops.append({"create": {"campaign": campaign_ref, "asset": "$result:assets:9", "fieldType": "STRUCTURED_SNIPPET"}})
    for index, image in enumerate(plan["assets"]["images"], start=10):
        association_ops.append({"create": {"campaign": campaign_ref, "asset": f"$result:assets:{index}", "fieldType": image["field_type"]}})
    phases.append({"name": "campaign_assets", "service": "campaignAssets", "operations": association_ops, "result_key": "campaign_assets"})
    goal_ops = [{"conversionGoalCampaignConfigOperation": {"update": {"resourceName": f"customers/{cid}/conversionGoalCampaignConfigs/$campaign_id:campaign:0", "customConversionGoal": "$result:custom_goal:0"}, "updateMask": "custom_conversion_goal"}}]
    for category, origin in plan["conversion"]["addressable_regular_goal_pairs"]:
        goal_ops.append({"campaignConversionGoalOperation": {"update": {"resourceName": f"customers/{cid}/campaignConversionGoals/$campaign_id:campaign:0~{category}~{origin}", "biddable": False}, "updateMask": "biddable"}})
    phases.append({"name": "campaign_goal_isolation", "service": "googleAds", "operations": goal_ops, "result_key": "goal_isolation"})
    return phases


def build_atomic_create_batch(plan: dict[str, Any]) -> dict[str, Any]:
    """Build the only create request: one all-or-nothing googleAds:mutate batch.

    Negative resource IDs are official temporary resource names.  The single
    request uses partialFailure=false, so an API error cannot leave a partially
    staged campaign that a retry might accidentally duplicate.
    """
    cid = plan["customer_id"]
    temp = {
        "budget": [f"customers/{cid}/campaignBudgets/-1"],
        "campaign": [f"customers/{cid}/campaigns/-2"],
        "custom_goal": [f"customers/{cid}/customConversionGoals/-3"],
        "consultation_action": [f"customers/{cid}/conversionActions/-4"],
        "ad_groups": [f"customers/{cid}/adGroups/-{10 + i}" for i in range(4)],
        "assets": [f"customers/{cid}/assets/-{20 + i}" for i in range(18)],
    }
    service_operation = {
        "campaignBudgets": "campaignBudgetOperation", "campaigns": "campaignOperation",
        "customConversionGoals": "customConversionGoalOperation", "conversionActions": "conversionActionOperation",
        "campaignCriteria": "campaignCriterionOperation", "adGroups": "adGroupOperation",
        "adGroupCriteria": "adGroupCriterionOperation", "adGroupAds": "adGroupAdOperation",
        "assets": "assetOperation", "campaignAssets": "campaignAssetOperation",
    }
    phases = build_initial_operation_phases(plan)
    operations: list[dict[str, Any]] = []
    for phase in phases:
        phase_operations = copy.deepcopy(phase["operations"])
        result_key = phase.get("result_key", phase["name"])
        temporary_names = temp.get(result_key, [])
        if temporary_names:
            _expect(len(temporary_names) == len(phase_operations), f"temporary resource count drift for {phase['name']}")
            for index, operation in enumerate(phase_operations):
                operation["create"]["resourceName"] = temporary_names[index]
        if phase["name"] == "assets":
            for index, image in enumerate(plan["assets"]["images"], start=10):
                payload = (REPO_ROOT / image["path"]).read_bytes()
                phase_operations[index]["create"]["imageAsset"]["data"] = base64.b64encode(payload).decode("ascii")
        if phase["service"] == "googleAds":
            pass
        else:
            operation_name = service_operation[phase["service"]]
            phase_operations = [{operation_name: item} for item in phase_operations]
        operations.extend(_replace_batch_references(item, temp) for item in phase_operations)
    return {"name": "atomic_paused_create", "service": "googleAds", "operations": operations, "temporary_resources": temp}


def _replace_batch_references(value: Any, temporary: dict[str, list[str]]) -> Any:
    if isinstance(value, dict):
        return {key: _replace_batch_references(item, temporary) for key, item in value.items()}
    if isinstance(value, list):
        return [_replace_batch_references(item, temporary) for item in value]
    if not isinstance(value, str):
        return value
    import re
    def replace(match):
        mode, key, index = match.groups()
        resource = temporary[key][int(index)]
        return resource.rsplit("/", 1)[-1] if mode == "campaign_id" else resource
    return re.sub(r"\$(result|campaign_id):([a-z_]+):(\d+)", replace, value)


def verify_goal_isolation(target: dict[str, Any], expected_goal_pairs: list[tuple[str, str]] | None = None) -> None:
    config_row = target.get("goal_config", {})
    custom = target.get("custom_goal", {})
    _expect(config_row.get("customConversionGoal") == custom.get("resourceName"), "campaign custom goal is not bound")
    _expect(custom.get("status") in {None, "ENABLED"}, "commercial custom goal is not enabled")
    _expect(custom.get("conversionActions") == [CALLS_FROM_ADS_ACTION, QUALIFIED_WEBSITE_CALL_ACTION], "custom goal must contain only qualified 60-second calls")
    goals = target.get("campaign_goals", [])
    if expected_goal_pairs is not None:
        actual_pairs = {(goal.get("category"), goal.get("origin")) for goal in goals}
        _expect(actual_pairs == set(expected_goal_pairs), "regular campaign goal pair set is incomplete")
    _expect(bool(goals), "regular campaign goal readback is empty")
    for goal in goals:
        # Proto JSON omits scalar booleans at their false default.
        _expect(goal.get("biddable", False) is False, "regular campaign goal remains biddable")


def run_read_only_queries(client: Any) -> dict[str, Any]:
    queries = {
        "customer": "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.test_account, customer.conversion_tracking_setting.conversion_tracking_status, customer.conversion_tracking_setting.google_ads_conversion_customer FROM customer LIMIT 1",
        "source_campaign": "SELECT campaign.resource_name, campaign.name FROM campaign WHERE campaign.resource_name = 'customers/8605345590/campaigns/24006593417' LIMIT 1",
        "source_locations": "SELECT campaign_criterion.resource_name, campaign_criterion.negative, campaign_criterion.status, campaign_criterion.location.geo_target_constant FROM campaign_criterion WHERE campaign_criterion.campaign = 'customers/8605345590/campaigns/24006593417' AND campaign_criterion.type = LOCATION",
        "conversion_actions": "SELECT conversion_action.resource_name, conversion_action.name, conversion_action.status, conversion_action.type, conversion_action.category, conversion_action.origin, conversion_action.primary_for_goal, conversion_action.counting_type, conversion_action.phone_call_duration_seconds FROM conversion_action WHERE conversion_action.resource_name IN ('customers/8605345590/conversionActions/7441005241', 'customers/8605345590/conversionActions/7693228248')",
        "call_asset": "SELECT campaign_asset.status, campaign_asset.primary_status, asset.resource_name, asset.type, asset.call_asset.phone_number, asset.call_asset.call_conversion_reporting_state FROM campaign_asset WHERE campaign_asset.campaign = 'customers/8605345590/campaigns/24006593417' AND asset.resource_name = 'customers/8605345590/assets/320657161326'",
        "named_resources": f"SELECT campaign.resource_name, campaign.name, campaign.status, campaign.advertising_channel_type FROM campaign WHERE campaign.name = '{config.CAMPAIGN_NAME}'",
        "named_budgets": f"SELECT campaign_budget.resource_name, campaign_budget.name, campaign_budget.amount_micros, campaign_budget.status FROM campaign_budget WHERE campaign_budget.name = '{_named('Budget')}'",
        "named_ad_groups": "SELECT ad_group.resource_name, ad_group.name, ad_group.status, ad_group.cpc_bid_micros FROM ad_group WHERE campaign.name = " + repr(config.CAMPAIGN_NAME) + " AND ad_group.name IN (" + ", ".join(repr(group) for group in config.AD_GROUPS) + ")",
        "named_assets": f"SELECT asset.resource_name, asset.name FROM asset WHERE asset.name LIKE '{config.CAMPAIGN_NAME} | %'",
        "named_conversions": "SELECT conversion_action.resource_name, conversion_action.name, conversion_action.primary_for_goal FROM conversion_action WHERE conversion_action.name = 'Commercial Consultation Request - Obsidian'",
        "named_custom_goals": f"SELECT custom_conversion_goal.resource_name, custom_conversion_goal.name FROM custom_conversion_goal WHERE custom_conversion_goal.name = '{_named('Qualified 60s Calls Goal')}'",
        "customer_conversion_goals": "SELECT customer_conversion_goal.category, customer_conversion_goal.origin FROM customer_conversion_goal",
    }
    return {name: client.search(query) for name, query in queries.items()}


def _camel(row: dict[str, Any], key: str, default: Any = None) -> Any:
    return row.get(key, row.get(key.replace("_", ""), default))


def state_from_queries(rows: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    # REST GAQL encodes nested objects; retain only the fields this stager trusts.
    customer = (rows.get("customer") or [{}])[0].get("customer", {})
    def loc(row: dict[str, Any]) -> dict[str, Any]:
        c = row.get("campaignCriterion", row.get("campaign_criterion", {})); location = c.get("location", {})
        geo = location.get("geoTargetConstant", location.get("geo_target_constant"))
        city = next((n for n, v in config._INCLUDED_CITY_IDS.items() if geo == f"geoTargetConstants/{v}"), next((n for n, v in config.EXCLUDED_CITIES.items() if geo == f"geoTargetConstants/{v}"), ""))
        return {"criterion_resource_name": c.get("resourceName", c.get("resource_name")), "geo_target_constant": geo, "negative": c.get("negative"), "status": c.get("status"), "city": city, "target_type": "City"}
    tracking = customer.get("conversionTrackingSetting", customer.get("conversion_tracking_setting", {}))
    return {
        "customer": {"id": customer.get("id"), "descriptiveName": customer.get("descriptiveName"), "currencyCode": customer.get("currencyCode"), "timeZone": customer.get("timeZone"), "testAccount": customer.get("testAccount", False), "conversionTrackingStatus": tracking.get("conversionTrackingStatus"), "googleAdsConversionCustomer": tracking.get("googleAdsConversionCustomer")},
        "source_campaign": (rows.get("source_campaign") or [{}])[0].get("campaign", {}),
        "source_locations": [loc(r) for r in rows.get("source_locations", [])],
        "conversion_actions": [r.get("conversionAction", r.get("conversion_action", {})) for r in rows.get("conversion_actions", [])],
        "call_asset": {
            **(rows.get("call_asset") or [{}])[0].get("asset", {}),
            "status": (rows.get("call_asset") or [{}])[0].get("campaignAsset", {}).get("status"),
            "primaryStatus": (rows.get("call_asset") or [{}])[0].get("campaignAsset", {}).get("primaryStatus"),
        },
        "customer_conversion_goals": [r.get("customerConversionGoal", r.get("customer_conversion_goal", {})) for r in rows.get("customer_conversion_goals", [])],
        "named_resources": {
            "campaigns": [r.get("campaign", {}) for r in rows.get("named_resources", [])],
            "budgets": [r.get("campaignBudget", {}) for r in rows.get("named_budgets", [])],
            "ad_groups": [r.get("adGroup", {}) for r in rows.get("named_ad_groups", [])],
            "assets": [r.get("asset", {}) for r in rows.get("named_assets", [])],
            "conversion_actions": [r.get("conversionAction", {}) for r in rows.get("named_conversions", [])],
            "custom_goals": [r.get("customConversionGoal", {}) for r in rows.get("named_custom_goals", [])],
        },
    }


def build_evidence(plan: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    return {"schema_version": 1, "customer_id": plan["customer_id"], "read_only": True, "runtime": "Homebrew Python 3.14 required for live auth", "plan_fingerprint": plan["fingerprint"], "source_fingerprint": _short_hash({"locations": plan["locations"], "conversions": state.get("conversion_actions", []), "call_asset": state.get("call_asset", {})}), "plan": rest.redact_for_evidence(plan)}


def _resolve(value: Any, results: dict[str, list[str]]) -> Any:
    if isinstance(value, dict): return {k: _resolve(v, results) for k, v in value.items()}
    if isinstance(value, list): return [_resolve(v, results) for v in value]
    if isinstance(value, str):
        import re
        def substitute(match):
            mode, key, index = match.groups()
            resource = results[key][int(index)]
            return resource.rsplit("/", 1)[-1] if mode == "campaign_id" else resource
        return re.sub(r"\$(result|campaign_id):([a-z_]+):(\d+)", substitute, value)
    return value


def apply_operation_phases(client: Any, phases: list[dict[str, Any]], manifest_path: Path, after_write=None) -> dict[str, Any]:
    manifest = {"schema_version": 1, "completed_phase_count": 0, "resources": {}}
    resolved: dict[str, list[str]] = {}
    for phase in phases:
        response = client.mutate(phase["service"], _resolve(phase["operations"], resolved))
        resources = [row.get("resourceName") for row in response.get("results", []) if row.get("resourceName")]
        resolved[phase.get("result_key", phase["name"])] = resources
        manifest["completed_phase_count"] += 1
        manifest["resources"][phase["name"]] = resources
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(json.dumps(rest.redact_for_evidence(manifest), indent=2, sort_keys=True) + "\n")
        if after_write: after_write(manifest_path)
    return manifest


def assert_retry_safe(reconciliation: dict[str, dict[str, Any]]) -> str:
    """Allow only wholly-new or wholly-identical launches; mixed state aborts."""
    decisions = {item["decision"] for item in reconciliation.values()}
    if decisions == {"create"}:
        return "create_atomically"
    if decisions == {"reuse"}:
        return "readback_only"
    raise GuardError("mixed same-name launch state; retry is unsafe and must abort")


def verify_apply_readback(client: Any, plan: dict[str, Any]) -> dict[str, Any]:
    """GAQL-only post-write guard; aborts handoff unless created resources stayed paused."""
    state = state_from_queries(run_read_only_queries(client))
    campaigns = state["named_resources"]["campaigns"]
    matching = [row for row in campaigns if row.get("name") == plan["campaign"]["name"]]
    _expect(len(matching) == 1 and matching[0].get("status") == "PAUSED", "post-apply campaign readback is not exactly one paused campaign")
    _expect(len(state["named_resources"]["ad_groups"]) >= 4, "post-apply ad-group readback is incomplete")
    _expect(len(state["named_resources"]["assets"]) >= 18, "post-apply asset readback is incomplete")
    return {"campaign": matching[0].get("resourceName"), "status": "PAUSED", "readback": "GAQL"}


def verify_full_campaign_readback(client: Any, plan: dict[str, Any], campaign_resource: str) -> dict[str, Any]:
    """Compare every staged family by GAQL before any human enable review.

    This routine is intentionally only reached after the atomic request, or for
    an exact pre-existing campaign retry.  It has no mutation capability.
    """
    escaped = campaign_resource
    queries = {
        "campaign": f"SELECT campaign.resource_name, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type, campaign.campaign_budget, campaign.manual_cpc.enhanced_cpc_enabled, campaign.network_settings.target_google_search, campaign.network_settings.target_search_network, campaign.network_settings.target_content_network, campaign.network_settings.target_partner_search_network, campaign.geo_target_type_setting.positive_geo_target_type, campaign.geo_target_type_setting.negative_geo_target_type, campaign.contains_eu_political_advertising, campaign_budget.resource_name, campaign_budget.name, campaign_budget.amount_micros, campaign_budget.delivery_method, campaign_budget.status FROM campaign WHERE campaign.resource_name = '{escaped}'",
        "criteria": f"SELECT campaign_criterion.type, campaign_criterion.negative, campaign_criterion.status, campaign_criterion.location.geo_target_constant, campaign_criterion.language.language_constant, campaign_criterion.device.type, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type FROM campaign_criterion WHERE campaign_criterion.campaign = '{escaped}'",
        "ad_groups": f"SELECT ad_group.resource_name, ad_group.name, ad_group.status, ad_group.cpc_bid_micros FROM ad_group WHERE ad_group.campaign = '{escaped}'",
        "keywords": f"SELECT ad_group_criterion.ad_group, ad_group_criterion.status, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.cpc_bid_micros FROM ad_group_criterion WHERE campaign.resource_name = '{escaped}' AND ad_group_criterion.type = KEYWORD",
        "rsas": f"SELECT ad_group_ad.ad_group, ad_group_ad.status, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions FROM ad_group_ad WHERE campaign.resource_name = '{escaped}' AND ad_group_ad.ad.type = RESPONSIVE_SEARCH_AD",
        "assets": f"SELECT campaign_asset.asset, campaign_asset.field_type, campaign_asset.status, asset.name, asset.type, asset.final_urls, asset.call_asset.country_code, asset.call_asset.phone_number, asset.call_asset.call_conversion_reporting_state, asset.call_asset.call_conversion_action, asset.sitelink_asset.link_text, asset.callout_asset.callout_text, asset.structured_snippet_asset.header, asset.structured_snippet_asset.values, asset.image_asset.file_size, asset.image_asset.mime_type, asset.image_asset.full_size.width_pixels, asset.image_asset.full_size.height_pixels FROM campaign_asset WHERE campaign_asset.campaign = '{escaped}'",
        "goal_config": f"SELECT conversion_goal_campaign_config.resource_name, conversion_goal_campaign_config.custom_conversion_goal FROM conversion_goal_campaign_config WHERE conversion_goal_campaign_config.campaign = '{escaped}'",
        "campaign_goals": f"SELECT campaign_conversion_goal.category, campaign_conversion_goal.origin, campaign_conversion_goal.biddable FROM campaign_conversion_goal WHERE campaign_conversion_goal.campaign = '{escaped}'",
        "consultation": "SELECT conversion_action.resource_name, conversion_action.name, conversion_action.type, conversion_action.primary_for_goal, conversion_action.counting_type, conversion_action.category FROM conversion_action WHERE conversion_action.name = 'Commercial Consultation Request - Obsidian'",
        "custom_goal": f"SELECT custom_conversion_goal.resource_name, custom_conversion_goal.name, custom_conversion_goal.status, custom_conversion_goal.conversion_actions FROM custom_conversion_goal WHERE custom_conversion_goal.name = '{plan['conversion']['custom_goal']['name']}'",
    }
    rows = {key: client.search(query) for key, query in queries.items()}
    rows["synthetic"] = client.search(
        f"SELECT asset.resource_name, asset.name, asset.synthetic_content_info.advertiser_attestation.source, asset.synthetic_content_info.advertiser_attestation.status FROM asset WHERE asset.name LIKE '{config.CAMPAIGN_NAME} | Image %'"
    )
    campaign = (rows["campaign"] or [{}])[0].get("campaign", {})
    budget = (rows["campaign"] or [{}])[0].get("campaignBudget", {})
    _expect(len(rows["campaign"]) == 1, "post-apply campaign readback must return exactly one campaign")
    _expect(campaign.get("name") == plan["campaign"]["name"] and campaign.get("status") == "PAUSED", "campaign name or paused status drift")
    _expect(campaign.get("advertisingChannelType") == "SEARCH", "campaign channel drift")
    _expect(campaign.get("biddingStrategyType") == "MANUAL_CPC", "campaign bidding strategy drift")
    _expect(campaign.get("manualCpc", {}).get("enhancedCpcEnabled", False) is False, "manual CPC drift")
    _expect(campaign.get("networkSettings") == {"targetGoogleSearch": True, "targetSearchNetwork": False, "targetContentNetwork": False, "targetPartnerSearchNetwork": False}, "networkSettings readback drift")
    _expect(campaign.get("geoTargetTypeSetting") == {"positiveGeoTargetType": "PRESENCE", "negativeGeoTargetType": "PRESENCE"}, "geoTargetTypeSetting readback drift")
    _expect(campaign.get("containsEuPoliticalAdvertising") == "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING", "EU political declaration drift")
    _expect(str(budget.get("amountMicros")) == str(plan["budget"]["amount_micros"]), "budget amount drift")
    _expect(budget.get("name") == plan["budget"]["name"] and campaign.get("campaignBudget") == budget.get("resourceName"), "campaign budget binding drift")
    _expect(budget.get("deliveryMethod") == "STANDARD" and budget.get("status") == "ENABLED", "budget delivery/status readback drift")
    locations = [r.get("campaignCriterion", {}) for r in rows["criteria"]]
    actual_geo = {(x.get("location", {}).get("geoTargetConstant"), bool(x.get("negative"))) for x in locations if x.get("location")}
    expected_geo = {(x["geo_target_constant"], x["negative"]) for x in plan["locations"]}
    _expect(actual_geo == expected_geo, "location criteria readback drift")
    _expect(all(x.get("status") == "ENABLED" for x in locations), "criterion status readback drift")
    _expect(not any(x.get("type") == "DEVICE" or x.get("device") for x in locations), "device criterion drift")
    languages = [x.get("language", {}).get("languageConstant") for x in locations if x.get("language")]
    _expect(languages == [config.LANGUAGE_CONSTANT], "language criterion readback drift")
    negative = {(x.get("keyword", {}).get("text"), x.get("keyword", {}).get("matchType")) for x in locations if x.get("negative") and x.get("keyword")}
    expected_negative = {(x["text"], x["match_type"]) for x in plan["campaign_negative_keywords"]}
    _expect(negative == expected_negative and all(x.get("status") == "ENABLED" for x in locations if x.get("keyword")), "campaign negative readback drift")
    groups = [r.get("adGroup", {}) for r in rows["ad_groups"]]
    expected_groups = {(x["name"], "ENABLED", str(x["cpc_bid_micros"])) for x in plan["ad_groups"]}
    _expect({(x.get("name"), x.get("status"), str(x.get("cpcBidMicros"))) for x in groups} == expected_groups and len(groups) == 4, "ad-group readback drift")
    expected_keywords = {(g["name"], "ENABLED", k["text"], k["match_type"], str(g["cpc_bid_micros"])) for g in plan["ad_groups"] for k in g["keywords"]}
    name_by_resource = {x.get("resourceName"): x.get("name") for x in groups}
    actual_keywords = {(name_by_resource.get(x.get("adGroup")), x.get("status"), x.get("keyword", {}).get("text"), x.get("keyword", {}).get("matchType"), str(x.get("cpcBidMicros"))) for r in rows["keywords"] for x in [r.get("adGroupCriterion", {})]}
    _expect(actual_keywords == expected_keywords, "keyword status/CPC readback drift")
    rsas = [r.get("adGroupAd", {}) for r in rows["rsas"]]
    expected_rsas = {(group["name"], tuple(group["rsa"]["headlines"]), tuple(group["rsa"]["descriptions"]), tuple(group["rsa"]["final_urls"])) for group in plan["ad_groups"]}
    actual_rsas = {(name_by_resource.get(item.get("adGroup")), tuple(x.get("text") for x in item.get("ad", {}).get("responsiveSearchAd", {}).get("headlines", [])), tuple(x.get("text") for x in item.get("ad", {}).get("responsiveSearchAd", {}).get("descriptions", [])), tuple(item.get("ad", {}).get("finalUrls", []))) for item in rsas}
    _expect(len(rsas) == 4 and all(x.get("status") == "PAUSED" for x in rsas) and actual_rsas == expected_rsas, "RSA headline/description readback drift")
    associations = [r.get("campaignAsset", {}) for r in rows["assets"]]
    _expect(len(associations) == 18, "campaign asset association readback drift")
    _expect(all(item.get("status") == "ENABLED" for item in associations), "asset association status readback drift")
    call_rows = [row.get("asset", {}) for row in rows["assets"] if row.get("campaignAsset", {}).get("fieldType") == "CALL"]
    expected_call = plan["assets"]["call"]
    _expect(len(call_rows) == 1 and call_rows[0].get("name") == expected_call["name"] and call_rows[0].get("callAsset", {}).get("countryCode") == expected_call["country_code"] and call_rows[0].get("callAsset", {}).get("phoneNumber") == expected_call["phone_number"] and call_rows[0].get("callAsset", {}).get("callConversionReportingState") == "USE_RESOURCE_LEVEL_CALL_CONVERSION_ACTION" and call_rows[0].get("callAsset", {}).get("callConversionAction") == CALLS_FROM_ADS_ACTION, "commercial resource-level call asset readback drift")
    expected_images = {
        (item["name"], item["field_type"], str(item["pixel_dimensions"][0]), str(item["pixel_dimensions"][1]), "IMAGE_JPEG")
        for item in plan["assets"]["images"]
    }
    actual_images = set()
    for row in rows["assets"]:
        campaign_asset = row.get("campaignAsset", {})
        if campaign_asset.get("fieldType") != "AD_IMAGE":
            continue
        asset = row.get("asset", {})
        image = asset.get("imageAsset", {})
        full_size = image.get("fullSize", {})
        actual_images.add((asset.get("name"), campaign_asset.get("fieldType"), str(full_size.get("widthPixels")), str(full_size.get("heightPixels")), image.get("mimeType")))
    _expect(actual_images == expected_images, "commercial image asset readback drift")
    expected_sitelinks = {(_named(item["text"]), item["text"], config.FINAL_URL + "#" + item["final_url"].split("#", 1)[1]) for item in plan["assets"]["sitelinks"]}
    actual_sitelinks = {(row.get("asset", {}).get("name"), row.get("asset", {}).get("sitelinkAsset", {}).get("linkText"), (row.get("asset", {}).get("finalUrls") or [None])[0]) for row in rows["assets"] if row.get("campaignAsset", {}).get("fieldType") == "SITELINK"}
    _expect(actual_sitelinks == expected_sitelinks, "asset association/content readback drift")
    expected_callouts = {(_named(text), text) for text in plan["assets"]["callouts"]}
    actual_callouts = {(row.get("asset", {}).get("name"), row.get("asset", {}).get("calloutAsset", {}).get("calloutText")) for row in rows["assets"] if row.get("campaignAsset", {}).get("fieldType") == "CALLOUT"}
    _expect(actual_callouts == expected_callouts, "asset association/content readback drift")
    snippets = [(row.get("asset", {}).get("name"), row.get("asset", {}).get("structuredSnippetAsset", {})) for row in rows["assets"] if row.get("campaignAsset", {}).get("fieldType") == "STRUCTURED_SNIPPET"]
    _expect(len(snippets) == 1 and snippets[0][0] == _named("Types") and snippets[0][1].get("header") == plan["assets"]["structured_snippet"]["header"] and snippets[0][1].get("values") == plan["assets"]["structured_snippet"]["values"], "asset association/content readback drift")
    expected_synthetic = {item["name"]: ("ADVERTISER_ATTESTED", "IS_SYNTHETIC" if item["synthetic"] else "NOT_SYNTHETIC") for item in plan["assets"]["images"]}
    actual_synthetic = {
        row.get("asset", {}).get("name"): (
            row.get("asset", {}).get("syntheticContentInfo", {}).get("advertiserAttestation", {}).get("source"),
            row.get("asset", {}).get("syntheticContentInfo", {}).get("advertiserAttestation", {}).get("status"),
        )
        for row in rows["synthetic"]
    }
    _expect(actual_synthetic == expected_synthetic, "synthetic attestation readback drift")
    target = {"goal_config": (rows["goal_config"] or [{}])[0].get("conversionGoalCampaignConfig", {}), "custom_goal": (rows["custom_goal"] or [{}])[0].get("customConversionGoal", {}), "campaign_goals": [r.get("campaignConversionGoal", {}) for r in rows["campaign_goals"]]}
    verify_goal_isolation(target, plan["conversion"]["regular_goal_pairs"])
    consultation = [r.get("conversionAction", {}) for r in rows["consultation"]]
    expected_consultation = plan["conversion"]["consultation_action"]
    _expect(len(consultation) == 1 and consultation[0].get("name") == expected_consultation["name"] and consultation[0].get("type") == "WEBPAGE" and consultation[0].get("primaryForGoal", False) is False and consultation[0].get("countingType") == expected_consultation["counting_type"] and consultation[0].get("category") == expected_consultation["category"], "consultation action readback drift")
    return {"campaign": campaign_resource, "readback": "GAQL", "synthetic_attestation": "verified", "checked": sorted(rows)}


def build_enable_operation(campaign_resource_name: str = "$reviewed_paused_campaign") -> dict[str, Any]:
    """Return—not execute—the sole permitted paused-to-enabled operation."""
    return {"name": "enable", "service": "campaigns", "operations": [{"update": {"resourceName": campaign_resource_name, "status": "ENABLED"}, "updateMask": "status"}]}


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument("--evidence", type=Path, default=Path("docs/evidence/commercial-google-ads-plan.json"))
    parser.add_argument("--recovery-manifest", type=Path, default=Path("docs/evidence/commercial-google-ads-recovery.json"))
    parser.add_argument("--validate", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--enable", action="store_true")
    parser.add_argument("--confirm", default="")
    return parser.parse_args(argv)


def command_mode(args) -> str:
    if args.apply and args.enable: raise GuardError("--apply and --enable cannot be combined")
    if args.apply:
        if args.confirm != APPLY_CONFIRMATION_TOKEN: raise GuardError("--apply requires the exact confirmation token")
        return "apply"
    if args.enable:
        if args.confirm != ENABLE_CONFIRMATION_TOKEN: raise GuardError("--enable requires the exact confirmation token")
        return "enable"
    return "validate"


def main(argv=None) -> int:
    args = parse_args(argv); mode = command_mode(args)
    env = rest.load_env(args.env_file)
    client = rest.build_client_from_env(env, customer_id=config.CUSTOMER_ID, allow_mutation=mode != "validate")
    raw = run_read_only_queries(client); state = state_from_queries(raw); plan = build_plan(state)
    plan["reconciliation"] = reconcile_plan_named_resources(plan, state["named_resources"])
    evidence = build_evidence(plan, state); args.evidence.parent.mkdir(parents=True, exist_ok=True); args.evidence.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n")
    if mode == "validate":
        print(json.dumps(evidence, indent=2, sort_keys=True)); return 0
    if mode == "apply":
        retry_action = assert_retry_safe(plan["reconciliation"])
        if retry_action == "readback_only":
            existing_campaign = plan["reconciliation"]["campaign"]["resource_name"]
            verify_full_campaign_readback(client, plan, existing_campaign)
            print("Exact existing paused campaign passed GAQL readback; zero mutations sent."); return 0
        manifest = apply_operation_phases(client, [build_atomic_create_batch(plan)], args.recovery_manifest)
        campaign_resource = next(item for item in manifest["resources"]["atomic_paused_create"] if "/campaigns/" in item)
        verify_full_campaign_readback(client, plan, campaign_resource)
        print("Paused commercial campaign resources staged; no enable operation was sent."); return 0
    # Enable is intentionally a dry, separately reviewable operation.  It is
    # never sent by this program, even with the confirmation token.
    print(json.dumps(build_enable_operation(), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
