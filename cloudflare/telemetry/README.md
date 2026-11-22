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
- **AI-mention check (runs on your Mac).** `npm run check` asks Claude,
  ChatGPT, Perplexity and Gemini (each with live web search) eight questions a
  recruiter or conference organizer might ask, prints whether Ara is named and
  whether arafatkatze.com is cited, and saves the answers to the same database
  so they appear on the dashboard. API keys come from 1Password and never go to
  Cloudflare. See `scripts/check-mentions.mjs`.
- **Dashboard.** `https://arafatkatze.com/_stats?key=STATS_KEY` (sets a cookie,
  so later visits need no key). Anyone else gets a 404. Raw data at
  `/_stats/data.json`. The key is in the macOS Keychain:
  `security find-generic-password -s arafatkatze-stats-key -w | pbcopy`.

## Run the AI-mention check

```sh
cd cloudflare/telemetry
npm install
npm run check -- --dry-run      # free: lists the questions and which keys were found
secrets-run --provider anthropic --provider openai-default --provider gemini -- npm run check
```

Add `--questions 2` for a cheap test, `--providers anthropic` for one
provider, or `--no-save` to print without saving. Saving uses Wrangler's
login (`npx wrangler login`).

## Deploy the Worker

Already deployed (free plan). To redeploy after changes:

```sh
cd cloudflare/telemetry
npx wrangler deploy
```

First-time setup was: `wrangler d1 create ara-site-telemetry` (id in
`wrangler.toml`), `npm run db:init`, `wrangler secret put STATS_KEY` and
`HASH_SALT`, and setting the route to **Fail open** in the dashboard.

## Cache purge on deploy

`.github/workflows/deploy.yml` purges the Cloudflare cache after each
deploy when the repository secrets `CLOUDFLARE_API_TOKEN` (permission:
Zone > Cache Purge, zone arafatkatze.com) and `CLOUDFLARE_ZONE_ID` exist.
