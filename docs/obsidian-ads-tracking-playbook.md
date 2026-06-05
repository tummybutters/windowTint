# Obsidian Ads Tracking Playbook

## What Is Live On The Website

`/lead-tracking.js` stores the ad click/session details in the visitor browser and keeps a local event log for the paid-search flow.

Captured from the landing URL:

- `gclid`, `gbraid`, `wbraid`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `campaignid`, `adgroupid`, `creative`, `keyword`, `matchtype`, `device`, `network`
- `loc_physical_ms`, `loc_interest_ms`, `placement`, `targetid`, `extensionid`

Created by the site and sent to `/api/lead-events`:

- `session_id`
- first landing page
- first referrer
- first seen / last seen timestamps
- quiz answers
- recommended service
- Square booking click
- text click
- phone click

Browser console helper while testing:

```js
window.obsidianLeadTracking.getLead()
window.obsidianLeadTracking.getEventLog()
window.obsidianLeadTracking.exportEventLog()
```

## Google Ads Campaign Tracking Template

Use this at the campaign level for `Search | OC | Mobile Ceramic Tint | Agency Build`:

```text
{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_term={keyword}&utm_content={creative}&campaignid={campaignid}&adgroupid={adgroupid}&creative={creative}&keyword={keyword}&matchtype={matchtype}&device={device}&network={network}&loc_physical_ms={loc_physical_ms}&loc_interest_ms={loc_interest_ms}&extensionid={extensionid}
```

Keep auto-tagging on. The template gives us readable fields; auto-tagging gives us the Google click IDs needed for offline conversion matching.

## Daily Manual Lead Log

Ask Kislev for this at the end of every day while tracking is still being hardened:

```text
Ad lead log - YYYY-MM-DD

1. Call/message time:
Customer name or phone if available:
Service asked for:
Quoted amount:
Booked? yes/no:
Booked amount:
Completed/paid? yes/no:
Final collected amount:
Obvious source if not ads:
Notes:

2. Call/message time:
Customer name or phone if available:
Service asked for:
Quoted amount:
Booked? yes/no:
Booked amount:
Completed/paid? yes/no:
Final collected amount:
Obvious source if not ads:
Notes:
```

## Week-One Attribution Rule

For now, count new tint calls while the campaign is active as ad-influenced unless Kislev knows they came from referral, repeat customer, Instagram, or an existing conversation.

Booked-job truth for budget decisions:

```text
Ad revenue = booked amount from new ad-influenced calls
Ad profit proxy = ad revenue - ad spend
Scale only when calls are real and at least one booked job closes.
```

## Next Server Step

The current website stores events in-browser and posts them to:

```text
POST /api/lead-events
```

The endpoint logs records in Vercel under:

```text
[obsidian-lead-event]
```

Optional next hardening: set `LEAD_EVENT_WEBHOOK_URL` in Vercel to forward the same records into an agent/webhook/database.

Until Square webhooks are connected, the browser/server event log is useful for path debugging, while Kislev's daily lead log is the business source of truth.
