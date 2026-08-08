# Commercial Window Film Production Verification

- Verification: **PASS**
- Verified at: `2026-08-08T18:45:27Z`
- Production commit: `1cb3ce8e46d5fff121c0f7665ee93e6fdcde7994`
- Deployment provider: Vercel
- Deployment status: `success`
- Deployment completed: `2026-08-08T18:41:46Z`

## Live routes

| Route | HTTP | Robots | Canonical |
| --- | ---: | --- | --- |
| `https://www.obsidianautoworksoc.com/commercial-window-film` | 200 | `index,follow` | `https://www.obsidianautoworksoc.com/commercial-window-film` |
| `https://www.obsidianautoworksoc.com/commercial-window-film-socal` | 200 | `noindex,follow` | `https://www.obsidianautoworksoc.com/commercial-window-film` |

The organic route is present in `sitemap.xml`; the paid-only route is intentionally absent. The production CSS, qualifier controller, and qualifier model all returned HTTP 200.

## Tracking boundary

- Google Ads tag: `AW-18301955625`
- Qualified website-call config: `AW-18301955625/1asCCLrhh9wcEKnchpdE`
- Mobile-tint Ads account `AW-17846304809`: absent from both commercial pages
- Phone-click and text-click proxy labels: not configured for the commercial pages

## Browser verification

Playwright loaded the live paid route and completed the four-step qualifier using:

1. Office
2. Heat / glare
3. One area / storefront
4. As soon as possible

The result displayed `Project brief ready` and composed the expected SMS link. No call or SMS link was activated and no message was sent.

## Non-conversion event

The explicitly non-conversion event `commercial_launch_verification` with ID `commercial_launch_verify_20260808T184520Z` was posted to the production `/api/lead-events` endpoint. Vercel returned HTTP 202 with `{"ok":true,"duplicate":false}`. The event contained no click ID and was marked `conversion: false` and `message_sent: false`.
