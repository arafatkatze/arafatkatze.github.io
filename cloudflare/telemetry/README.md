# Site telemetry and AI-mention monitor

A Cloudflare Worker that sits in front of arafatkatze.com.

- **Telemetry.** Every request passes straight through (the edge cache still
  applies). After the response is sent, the Worker logs it to a D1 database:
  path, status, cache status, which bot or browser it was, country, network,
  and whether a person arrived from an AI answer (ChatGPT, Perplexity, Claude,
  Gemini...). Humans are logged for pages only, never assets. IPs are never
  stored; a daily salted hash counts unique visitors.
- **Bot types.** `ai_assistant` (an AI fetching a page live for a person, the
  best signal), `ai_search`, `ai_training`, `search`, `social`, `other_bot`,
  `suspect` (a "browser" coming from a cloud network or with ancient Chrome),
  `human`. See `src/classify.js`.
- **Daily monitor.** At 14:00 UTC it asks Claude, ChatGPT, Perplexity and
  Gemini (each with live web search) eight questions a recruiter or
  conference organizer might ask, and records whether Ara is named and whether
  arafatkatze.com is cited. See `src/monitor.js`. Providers without a key are
  skipped.
- **Dashboard.** `https://arafatkatze.com/_stats?key=STATS_KEY` (sets a cookie,
  so later visits need no key). Anyone else gets a 404. Raw data at
  `/_stats/data.json`. Run the monitor now with
  `curl -X POST "https://arafatkatze.com/_stats/run-monitor?key=STATS_KEY"`.

## Deploy

Needs Workers Paid ($5/month): the monitor runs well past the free plan's
10 ms CPU limit, and Paid also lifts the 100k requests/day cap.

```sh
cd cloudflare/telemetry
npm install
npx wrangler login
npx wrangler d1 create ara-site-telemetry   # paste the id into wrangler.toml
npm run db:init
npx wrangler secret put STATS_KEY
npx wrangler secret put HASH_SALT
npx wrangler secret put ANTHROPIC_API_KEY   # and the other provider keys you want
npm run deploy
```

Then in the Cloudflare dashboard, Workers Routes, set the route's failure mode
to **Fail open** so the site keeps working if the Worker hits a limit.

## Cache purge on deploy

`.github/workflows/deploy.yml` purges the Cloudflare cache after each
deploy when the repository secrets `CLOUDFLARE_API_TOKEN` (permission:
Zone > Cache Purge, zone arafatkatze.com) and `CLOUDFLARE_ZONE_ID` exist.
