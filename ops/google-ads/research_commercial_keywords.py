#!/usr/bin/env python3
"""Read-only Keyword Planner research for the commercial-window-film launch."""

from __future__ import annotations

import argparse
import csv
import importlib.util
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

import requests

try:
    from google.auth.transport.requests import Request as GoogleAuthRequest
    from google.oauth2 import service_account
except ModuleNotFoundError:  # Keep config/test imports usable on system Python.
    GoogleAuthRequest = None
    service_account = None


CONFIG_PATH = Path(__file__).with_name("commercial_campaign_config.py")
REDACTED_MARKERS = ("token", "secret", "authorization", "developer-token")
COMMERCIAL_HISTORY_MARKERS = ("commercial", "office", "building", "storefront", "architectural")
ADJACENT_WINDOW_FILM_MARKERS = ("solar", "heat", "privacy", "frosted", "reflective")
EXPORT_EXCLUDED_MARKERS = (
    "anti graffiti",
    "business start",
    "business plan",
    "car",
    "auto",
    "vehicle",
    "tesla",
    "3m",
    "llumar",
    "xpel",
    "suntek",
    "madico",
    "residential",
    "home",
)


class GoogleAdsApiError(RuntimeError):
    """An API failure whose persisted representation is explicitly whitelisted."""

    def __init__(self, evidence: dict[str, Any]):
        super().__init__("Google Ads read-only request failed")
        self.evidence = evidence


def load_config():
    spec = importlib.util.spec_from_file_location("commercial_campaign_config", CONFIG_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("commercial campaign config is not importable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_env(path: Path) -> dict[str, str]:
    """Read only the explicitly supplied env file; never merge process env."""
    env: dict[str, str] = {}
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def access_token(env: dict[str, str]) -> str:
    key_path = Path(env.get("GOOGLE_APPLICATION_CREDENTIALS", ""))
    if key_path.is_file():
        if service_account is None or GoogleAuthRequest is None:
            raise RuntimeError(
                "Google service-account auth dependencies are unavailable in this Python interpreter"
            )
        credentials = service_account.Credentials.from_service_account_file(
            str(key_path), scopes=["https://www.googleapis.com/auth/adwords"]
        )
        credentials.refresh(GoogleAuthRequest())
        if credentials.token:
            return credentials.token
        raise RuntimeError("Google service-account auth returned no access token")
    response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": env["GOOGLE_OAUTH_CLIENT_ID"],
            "client_secret": env["GOOGLE_OAUTH_CLIENT_SECRET"],
            "refresh_token": env["GOOGLE_ADS_REFRESH_TOKEN"],
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    response.raise_for_status()
    token = response.json().get("access_token", "")
    if not token:
        raise RuntimeError("OAuth token response did not contain an access token")
    return token


def whitelist_google_ads_error(response: Any) -> dict[str, Any]:
    """Keep only deterministic HTTP/error-code fields from an API response."""
    code = "UNKNOWN_GOOGLE_ADS_ERROR"
    try:
        details = response.json().get("error", {}).get("details", [])
        errors = details[0].get("errors", []) if details else []
        error_code = errors[0].get("errorCode", {}) if errors else {}
        if error_code:
            code = str(next(iter(error_code.values())))
    except (AttributeError, IndexError, TypeError, ValueError):
        pass
    return {"http_status": int(response.status_code), "google_ads_error_code": code}


def _planner_int(value: str) -> int:
    return int(value.replace(",", "").strip()) if value.strip() else 0


def _planner_micros(value: str) -> int | None:
    if not value.strip():
        return None
    try:
        return int(Decimal(value.replace(",", "").strip()) * 1_000_000)
    except InvalidOperation as exc:
        raise ValueError("invalid Keyword Planner bid value") from exc


def _export_ad_group(config: Any, keyword: str) -> str | None:
    normalized = " ".join(keyword.casefold().split())
    if config.is_prohibited_term(normalized) or any(marker in normalized for marker in EXPORT_EXCLUDED_MARKERS):
        return None
    if "security" in normalized:
        return "Safety Security Film"
    if any(marker in normalized for marker in ("privacy", "frost", "decorative")):
        return "Privacy Decorative Film"
    if any(marker in normalized for marker in ("solar", "uv", "sun", "heat")):
        return "Solar Heat Glare Film"
    if any(marker in normalized for marker in ("commercial", "office", "building", "storefront", "architectural")):
        return "Commercial Window Film"
    return None


def read_keyword_planner_export_text(path: Path) -> str:
    """Decode a BOM-bearing UTF-16 export or a BOM-less UTF-16LE TSV."""
    payload = path.read_bytes()
    encoding = "utf-16" if payload.startswith((b"\xff\xfe", b"\xfe\xff")) else "utf-16le"
    return payload.decode(encoding)


def parse_keyword_planner_export(path: Path, planner_location: str, config: Any) -> dict[str, Any]:
    """Parse a user-provided UTF-16LE Planner tab export into safe aggregates."""
    location = planner_location.strip()
    if not location:
        raise ValueError("planner location is required")
    rows = list(csv.reader(read_keyword_planner_export_text(path).splitlines(), delimiter="\t"))
    header_index = next((index for index, row in enumerate(rows) if row and row[0] == "Keyword"), None)
    if header_index is None:
        raise ValueError("Keyword Planner export header is missing")
    header = rows[header_index]
    required = {"Keyword", "Avg. monthly searches", "Top of page bid (low range)", "Top of page bid (high range)"}
    if not required.issubset(header):
        raise ValueError("Keyword Planner export has unsupported columns")
    indexes = {name: header.index(name) for name in required}
    grouped: dict[str, list[dict[str, int | None]]] = {name: [] for name in config.AD_GROUPS}
    total_rows = 0
    for row in rows[header_index + 1 :]:
        if not row or not row[0].strip():
            continue
        total_rows += 1
        keyword = row[indexes["Keyword"]]
        group = _export_ad_group(config, keyword)
        if group is None:
            continue
        grouped[group].append(
            {
                "average_monthly_searches": _planner_int(row[indexes["Avg. monthly searches"]]),
                "low_top_of_page_bid_micros": _planner_micros(row[indexes["Top of page bid (low range)"]]),
                "high_top_of_page_bid_micros": _planner_micros(row[indexes["Top of page bid (high range)"]]),
            }
        )
    aggregates: dict[str, dict[str, int | None]] = {}
    for group, values in grouped.items():
        low_bids = [value["low_top_of_page_bid_micros"] for value in values if value["low_top_of_page_bid_micros"] is not None]
        high_bids = [value["high_top_of_page_bid_micros"] for value in values if value["high_top_of_page_bid_micros"] is not None]
        aggregates[group] = {
            "keyword_count": len(values),
            "average_monthly_searches_total": sum(int(value["average_monthly_searches"] or 0) for value in values),
            "low_top_of_page_bid_micros_min": min(low_bids) if low_bids else None,
            "low_top_of_page_bid_micros_max": max(low_bids) if low_bids else None,
            "high_top_of_page_bid_micros_min": min(high_bids) if high_bids else None,
            "high_top_of_page_bid_micros_max": max(high_bids) if high_bids else None,
        }
    date_range = rows[1][0].strip('"') if len(rows) > 1 and rows[1] else "unspecified"
    return {
        "source": "user_provided_google_keyword_planner_ui_export",
        "source_format": "utf-16le-tab-separated",
        "date_range": date_range,
        "scope": {
            "planner_location": location,
            "limitation": "National Keyword Planner volume is not 19-city demand; it informs only conservative commercial bid planning.",
        },
        "total_keyword_rows": total_rows,
        "relevant_keyword_rows": sum(len(values) for values in grouped.values()),
        "aggregates_by_ad_group": aggregates,
    }


def keyword_ideas(config: Any, env: dict[str, str], token: str) -> list[dict[str, Any]]:
    """Call the read-only KeywordPlanIdeaService endpoint once."""
    customer_id = config.CUSTOMER_ID
    if env.get("GOOGLE_ADS_CUSTOMER_ID", "").replace("-", "") != customer_id:
        raise RuntimeError("env customer ID does not match commercial campaign config")
    response = requests.post(
        f"https://googleads.googleapis.com/{config.API_VERSION}/customers/{customer_id}:generateKeywordIdeas",
        headers={
            "Authorization": f"Bearer {token}",
            "developer-token": env["GOOGLE_ADS_DEVELOPER_TOKEN"],
            "login-customer-id": env["GOOGLE_ADS_LOGIN_CUSTOMER_ID"].replace("-", ""),
            "Content-Type": "application/json",
        },
        json={
            "keywordSeed": {"keywords": list(config.SEED_THEMES)},
            "geoTargetConstants": list(config.city_geo_target_constants()),
            "language": config.LANGUAGE_CONSTANT,
            "keywordPlanNetwork": "GOOGLE_SEARCH",
            "includeAdultKeywords": False,
        },
        timeout=120,
    )
    if response.status_code >= 400:
        raise GoogleAdsApiError(whitelist_google_ads_error(response))
    return response.json().get("results", [])


def search_stream(config: Any, env: dict[str, str], token: str, query: str) -> list[dict[str, Any]]:
    """Read account history without changing Google Ads state."""
    response = requests.post(
        f"https://googleads.googleapis.com/{config.API_VERSION}/customers/{config.CUSTOMER_ID}/googleAds:searchStream",
        headers={
            "Authorization": f"Bearer {token}",
            "developer-token": env["GOOGLE_ADS_DEVELOPER_TOKEN"],
            "login-customer-id": env["GOOGLE_ADS_LOGIN_CUSTOMER_ID"].replace("-", ""),
            "Content-Type": "application/json",
        },
        json={"query": query},
        timeout=120,
    )
    if response.status_code >= 400:
        raise GoogleAdsApiError(whitelist_google_ads_error(response))
    return [row for chunk in response.json() for row in chunk.get("results", [])]


def summarize_search_terms(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate adjacent film CPC evidence without serializing raw search terms."""
    explicit_count = 0
    adjacent: list[dict[str, Any]] = []
    for row in rows:
        term = row.get("searchTermView", {}).get("searchTerm", "")
        normalized = " ".join(term.casefold().split())
        if any(marker in normalized for marker in COMMERCIAL_HISTORY_MARKERS):
            explicit_count += 1
        if "window" not in normalized or not any(marker in normalized for marker in ADJACENT_WINDOW_FILM_MARKERS):
            continue
        average_cpc = row.get("metrics", {}).get("averageCpc")
        if average_cpc is None:
            continue
        adjacent.append({"search_term": term, "average_cpc_micros": int(float(average_cpc))})
    adjacent.sort(key=lambda item: (item["average_cpc_micros"], item["search_term"].casefold()))
    return {
        "query_date_range": "2025-08-08 through 2026-08-08",
        "explicit_commercial_term_count": explicit_count,
        "adjacent_window_film_rows": adjacent,
        "adjacent_window_film_cpc_range_micros": (
            {"low": adjacent[0]["average_cpc_micros"], "high": adjacent[-1]["average_cpc_micros"]}
            if adjacent
            else None
        ),
    }


def live_search_term_fallback(config: Any, env: dict[str, str], token: str) -> dict[str, Any]:
    rows = search_stream(
        config,
        env,
        token,
        """
        SELECT search_term_view.search_term, metrics.average_cpc
        FROM search_term_view
        WHERE segments.date BETWEEN '2025-08-08' AND '2026-08-08'
          AND metrics.clicks > 0
        """,
    )
    summary = summarize_search_terms(rows)
    # Search terms can contain customer-entered text, so retain only aggregate
    # counts/ranges in committed evidence.
    summary.pop("adjacent_window_film_rows", None)
    summary["search_term_rows_examined"] = len(rows)
    summary["scope"] = (
        "Account search-term fallback only; zero commercial history is not a demand estimate. "
        "Adjacent residential-film CPC is only a conservative boundary for provisional operational caps."
    )
    return summary


def classify(config: Any, text: str) -> str:
    normalized = " ".join(text.casefold().split())
    if config.is_prohibited_term(normalized):
        return "negative"
    if any(city.casefold() in normalized for city in config.INCLUDED_CITIES):
        return "city-modified"
    launch_terms = {
        keyword["text"]
        for group in config.AD_GROUPS.values()
        for keyword in group["launch_keywords"]
    }
    if normalized in launch_terms:
        return "launch"
    if config.is_valid_launch_keyword(normalized):
        return "research-only"
    return "unsupported"


def normalize_idea(config: Any, item: dict[str, Any]) -> dict[str, Any]:
    metrics = item.get("keywordIdeaMetrics", {})
    return {
        "text": item.get("text", ""),
        "classification": classify(config, item.get("text", "")),
        "average_monthly_searches": metrics.get("avgMonthlySearches"),
        "competition": metrics.get("competition"),
        "low_top_of_page_bid_micros": metrics.get("lowTopOfPageBidMicros"),
        "high_top_of_page_bid_micros": metrics.get("highTopOfPageBidMicros"),
    }


def redact(value: Any) -> Any:
    """Defensive redaction for any serialized strings or mapping keys."""
    if isinstance(value, dict):
        return {
            key: "[REDACTED]" if any(marker in key.casefold() for marker in REDACTED_MARKERS) else redact(child)
            for key, child in value.items()
        }
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, str) and value.startswith("Bearer "):
        return "Bearer [REDACTED]"
    return value


def build_artifact(
    config: Any,
    raw_ideas: list[dict[str, Any]],
    outcome: str,
    planner_error: dict[str, Any] | None = None,
    search_term_fallback: dict[str, Any] | None = None,
    keyword_planner_ui_export: dict[str, Any] | None = None,
) -> dict[str, Any]:
    rows = sorted((normalize_idea(config, item) for item in raw_ideas), key=lambda row: row["text"].casefold())
    launch_decisions = [
        {
            "ad_group": name,
            "max_cpc_micros": group["max_cpc_micros"],
            "bid_basis": group["bid_basis"],
            "cpc_status": group["cpc_status"],
            "keywords": [dict(keyword) for keyword in group["launch_keywords"]],
        }
        for name, group in config.AD_GROUPS.items()
    ]
    return redact(
        {
            "api_version": config.API_VERSION,
            "service": "KeywordPlanIdeaService.generateKeywordIdeas",
            "operation": "read_only",
            "outcome": outcome,
            "keyword_planner_error": planner_error,
            "keyword_planner_ui_export": keyword_planner_ui_export,
            "campaign": {
                "customer_id": config.CUSTOMER_ID,
                "name": config.CAMPAIGN_NAME,
                "final_url": config.FINAL_URL,
                "daily_budget_micros": config.DAILY_BUDGET_MICROS,
            },
            "request": {
                "language": "English",
                "geo_target_constants": list(config.city_geo_target_constants()),
                "included_cities": list(config.INCLUDED_CITIES),
                "excluded_cities": list(config.EXCLUDED_CITIES),
                "seed_themes": list(config.SEED_THEMES),
            },
            "public_autocomplete_evidence": {
                "captured_on": config.PUBLIC_AUTOCOMPLETE_EVIDENCE["captured_on"],
                "source": config.PUBLIC_AUTOCOMPLETE_EVIDENCE["source"],
                "suggestions": list(config.PUBLIC_AUTOCOMPLETE_EVIDENCE["suggestions"]),
                "limitation": "Suggestion wording only; not Keyword Planner volume, competition, or CPC evidence.",
            },
            "ideas": rows,
            "live_search_term_fallback": search_term_fallback,
            "cpc_limitations": config.CPC_LIMITATION,
            "launch_decisions": launch_decisions,
            "campaign_negatives": {key: list(value) for key, value in config.CAMPAIGN_NEGATIVES.items()},
        }
    )


def markdown(artifact: dict[str, Any]) -> str:
    lines = [
        "# Commercial Window Film Keyword Plan",
        "",
        f"- API: `{artifact['api_version']}` / `{artifact['service']}`",
        f"- Operation: `{artifact['operation']}` (no mutation endpoint used)",
        f"- Outcome: `{artifact['outcome']}`",
        f"- Geography: {len(artifact['request']['included_cities'])} included cities; {len(artifact['request']['excluded_cities'])} exclusions",
    ]
    planner_error = artifact.get("keyword_planner_error")
    if planner_error:
        lines.append(
            "- Keyword Planner limitation: HTTP `{http_status}` / `{google_ads_error_code}`. "
            "Response body, request ID, and error message intentionally omitted."
            .format(**planner_error)
        )
    ui_export = artifact.get("keyword_planner_ui_export")
    if ui_export:
        lines.append(
            "- Keyword Planner UI export: `{planner_location}`; `{date_range}`; {limitation}"
            .format(date_range=ui_export["date_range"], **ui_export["scope"])
        )
    fallback = artifact.get("live_search_term_fallback")
    if fallback:
        cpc_range = fallback.get("adjacent_window_film_cpc_range_micros") or {}
        lines.append(
            "- Live search-term fallback: {rows} rows examined; {commercial} explicit commercial terms; "
            "adjacent residential-film CPC range `{low}`–`{high}` micros."
            .format(
                rows=fallback["search_term_rows_examined"],
                commercial=fallback["explicit_commercial_term_count"],
                low=cpc_range.get("low", "unavailable"),
                high=cpc_range.get("high", "unavailable"),
            )
        )
    autocomplete = artifact["public_autocomplete_evidence"]
    lines.append(
        "- Public autocomplete: {source}, captured {captured_on}; wording-only evidence, not volume/CPC proof."
        .format(**autocomplete)
    )
    lines.extend(["", "## Launch decisions", ""])
    for decision in artifact["launch_decisions"]:
        terms = ", ".join(f"{row['text']} ({row['match_type'].lower()})" for row in decision["keywords"])
        lines.append(f"- **{decision['ad_group']}** — max CPC `{decision['max_cpc_micros']}` micros; `{decision['bid_basis']}` / `{decision['cpc_status']}`. {terms}")
    lines.extend(["", "## CPC limitation", "", artifact["cpc_limitations"]])
    if ui_export:
        lines.extend(["", "## National Keyword Planner aggregates", "", "| Ad group | Keywords | Avg monthly searches | Low bid range micros | High bid range micros |", "| --- | ---: | ---: | --- | --- |"])
        for group, aggregate in ui_export["aggregates_by_ad_group"].items():
            lines.append(
                "| {group} | {keyword_count} | {average_monthly_searches_total} | {low_top_of_page_bid_micros_min}–{low_top_of_page_bid_micros_max} | {high_top_of_page_bid_micros_min}–{high_top_of_page_bid_micros_max} |".format(group=group, **aggregate)
            )
    lines.extend(["", "## Keyword Planner ideas", "", "| Keyword | Class | Avg monthly | Competition | Low bid | High bid |", "| --- | --- | ---: | --- | ---: | ---: |"])
    for idea in artifact["ideas"]:
        lines.append("| {text} | {classification} | {average_monthly_searches} | {competition} | {low_top_of_page_bid_micros} | {high_top_of_page_bid_micros} |".format(**idea))
    if not artifact["ideas"]:
        lines.append("| No ideas returned | unavailable | unavailable | unavailable | unavailable | unavailable |")
    lines.extend(["", "## Scope boundary", "", "This evidence records a read-only KeywordPlanIdeaService request. It does not create, modify, enable, or spend from a Google Ads campaign.", ""])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", required=True, type=Path)
    parser.add_argument("--output-json", required=True, type=Path)
    parser.add_argument("--output-markdown", required=True, type=Path)
    parser.add_argument("--keyword-planner-export", type=Path)
    parser.add_argument("--planner-location")
    args = parser.parse_args()
    config = load_config()
    if bool(args.keyword_planner_export) != bool(args.planner_location):
        parser.error("--keyword-planner-export and --planner-location must be supplied together")
    ui_export = (
        parse_keyword_planner_export(args.keyword_planner_export, args.planner_location, config)
        if args.keyword_planner_export
        else None
    )
    env = load_env(args.env_file)
    token: str | None = None
    try:
        token = access_token(env)
        raw_ideas = keyword_ideas(config, env, token)
        artifact = build_artifact(config, raw_ideas, "live_data", keyword_planner_ui_export=ui_export)
    except GoogleAdsApiError as planner_exc:
        fallback = None
        if token:
            try:
                fallback = live_search_term_fallback(config, env, token)
            except GoogleAdsApiError as fallback_exc:
                fallback = {"outcome": "unavailable", "error": fallback_exc.evidence}
            except Exception:
                fallback = {"outcome": "unavailable", "error": {"google_ads_error_code": "READ_ONLY_QUERY_UNAVAILABLE"}}
        else:
            fallback = {"outcome": "unavailable", "error": {"google_ads_error_code": "AUTHENTICATION_UNAVAILABLE"}}
        artifact = build_artifact(
            config,
            [],
            "keyword_planner_access_unavailable",
            planner_error=planner_exc.evidence,
            search_term_fallback=fallback,
            keyword_planner_ui_export=ui_export,
        )
    except Exception:
        artifact = build_artifact(
            config,
            [],
            "keyword_planner_access_unavailable",
            planner_error={"google_ads_error_code": "AUTHENTICATION_UNAVAILABLE"},
            search_term_fallback={"outcome": "unavailable", "error": {"google_ads_error_code": "AUTHENTICATION_UNAVAILABLE"}},
            keyword_planner_ui_export=ui_export,
        )
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_markdown.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(artifact, indent=2, sort_keys=True) + "\n")
    args.output_markdown.write_text(markdown(artifact))
    print(f"Wrote {args.output_json}")
    print(f"Wrote {args.output_markdown}")
    print(f"Keyword Planner outcome: {artifact['outcome']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
