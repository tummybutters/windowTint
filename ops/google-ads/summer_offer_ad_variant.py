#!/usr/bin/env python3
"""Build a reviewable, paused-only RSA plan for the Summer Heat Defense offer."""

import json

CUSTOMER_ID = "8605345590"
CAMPAIGN_ID = "23899221542"
FINAL_URL = "https://www.obsidianautoworksoc.com/mobile-window-tinting-summer-offer"
ALLOWED_AD_GROUPS = {
    "customers/8605345590/adGroups/199780569089",
    "customers/8605345590/adGroups/197811327980",
    "customers/8605345590/adGroups/200107587827",
}


def build_plan():
    return {
        "customer_id": CUSTOMER_ID,
        "campaign_id": CAMPAIGN_ID,
        "variant": "summer_heat_defense_v1",
        "status": "PAUSED",
        "final_url": FINAL_URL,
        "headlines": [
            "$100 Toward Eligible Upgrades", "Summer Heat Defense", "15 Vehicles Only",
            "Book Ceramic Tint Today", "Mobile Tint In Orange County",
            "Deposit Secures Your Offer", "Premium Ceramic Window Tint",
            "Obsidian Autoworks", "Eligible Tint Upgrade Credit", "Ceramic Tint At Your Door",
        ],
        "descriptions": [
            "Book qualifying $500+ ceramic tint and get $100 toward eligible upgrades.",
            "Limited to 15 new bookings. A paid deposit secures the offer through August 31.",
            "Text HEAT15 with your vehicle to confirm the package, upgrade, and mobile location.",
            "Premium mobile ceramic tint installed at a suitable Orange County location.",
        ],
    }


def build_paused_ad_operations(plan):
    responsive = {
        "headlines": [{"text": text} for text in plan["headlines"]],
        "descriptions": [{"text": text} for text in plan["descriptions"]],
    }
    return [{"adGroupAdOperation": {"create": {
        "adGroup": ad_group,
        "status": "PAUSED",
        "ad": {
            "name": f"Summer Heat Defense | {plan['variant']}",
            "finalUrls": [plan["final_url"]],
            "responsiveSearchAd": responsive,
        },
    }}} for ad_group in sorted(ALLOWED_AD_GROUPS)]


if __name__ == "__main__":
    plan = build_plan()
    print(json.dumps({"plan": plan, "paused_operations": build_paused_ad_operations(plan)}, indent=2))
