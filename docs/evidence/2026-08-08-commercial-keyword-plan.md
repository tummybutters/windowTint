# Commercial Window Film Keyword Plan

- API: `v24` / `KeywordPlanIdeaService.generateKeywordIdeas`
- Operation: `read_only` (no mutation endpoint used)
- Outcome: `keyword_planner_access_unavailable`
- Geography: 19 included cities; 4 exclusions
- Keyword Planner limitation: HTTP `403` / `DEVELOPER_TOKEN_NOT_APPROVED`. Response body, request ID, and error message intentionally omitted.
- Keyword Planner UI export: `United States`; `July 1, 2025 - June 30, 2026`; National Keyword Planner volume is not 19-city demand; it informs only conservative commercial bid planning.
- Live search-term fallback: 460 rows examined; 0 explicit commercial terms; adjacent residential-film CPC range `2850000`–`5510000` micros.
- Public autocomplete: Google autocomplete, captured 2026-08-08; wording-only evidence, not volume/CPC proof.

## Launch decisions

- **Commercial Window Film** — max CPC `5250000` micros; `national_keyword_planner_ui_export_low_range_conservative_cap` / `commercial_bid_evidence_national_scope_not_19_city_demand`. commercial window film (exact), commercial window film (phrase), commercial window tinting (exact), commercial window tinting (phrase), commercial window film installers near me (exact), commercial window film installers near me (phrase), commercial window tinting near me (exact), commercial window film installation (exact), commercial window film installation (phrase), commercial window film near me (exact), commercial window film near me (phrase), architectural window film (exact), building window tinting (exact), building window tinting (phrase), storefront window tinting (exact), storefront window tinting (phrase), office window tinting (exact), office window tinting (phrase)
- **Solar Heat Glare Film** — max CPC `2250000` micros; `national_keyword_planner_ui_export_low_range_conservative_cap` / `commercial_bid_evidence_national_scope_not_19_city_demand`. commercial solar window film (exact), commercial solar window film (phrase), office window film (phrase), office window film installation (exact), office window film installation (phrase), commercial uv window film (exact), commercial uv window film (phrase)
- **Privacy Decorative Film** — max CPC `5250000` micros; `national_keyword_planner_ui_export_low_range_conservative_cap` / `commercial_bid_evidence_national_scope_not_19_city_demand`. office privacy window film (exact), office privacy window film (phrase), commercial decorative window film (phrase), office window frosting (exact), office window frosting (phrase), office glass frosting (exact), office glass frosting (phrase), commercial window privacy film (exact), commercial window privacy film (phrase)
- **Safety Security Film** — max CPC `2500000` micros; `national_keyword_planner_ui_export_low_range_conservative_cap` / `commercial_bid_evidence_national_scope_not_19_city_demand`. commercial security window film (exact), commercial security window film (phrase), commercial safety window film (phrase), security window film installation near me (exact), security window film installation near me (phrase), commercial security film installation (exact), commercial security film installation (phrase), commercial window security film (exact), commercial window security film (phrase)

## CPC limitation

A user-provided United States Keyword Planner export supplies commercial bid evidence, but national volume is not 19-city demand. These $25/day operational Manual CPC caps stay at or below relevant aggregate low-range bids (Solar $2.25 versus $2.33 maximum; Safety $2.50 versus $2.65 observed) until 19-city commercial estimates are available.

## National Keyword Planner aggregates

| Ad group | Keywords | Avg monthly searches | Low bid range micros | High bid range micros |
| --- | ---: | ---: | --- | --- |
| Commercial Window Film | 113 | 16870 | 260000–11000000 | 3690000–76410000 |
| Solar Heat Glare Film | 14 | 2580 | 240000–2330000 | 4290000–34120000 |
| Privacy Decorative Film | 36 | 1340 | 240000–12130000 | 2270000–47290000 |
| Safety Security Film | 6 | 170 | 2650000–2650000 | 21170000–21170000 |

## Keyword Planner ideas

| Keyword | Class | Avg monthly | Competition | Low bid | High bid |
| --- | --- | ---: | --- | ---: | ---: |
| No ideas returned | unavailable | unavailable | unavailable | unavailable | unavailable |

## Scope boundary

This evidence records a read-only KeywordPlanIdeaService request. It does not create, modify, enable, or spend from a Google Ads campaign.
