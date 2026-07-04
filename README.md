# Polymarket Event Explorer + Builder Dashboard

Static site on [Vercel](https://polymarket-inky.vercel.app) with serverless API routes for YeNo builder stats.

## Builder dashboard

On refresh, the **Builder dashboard** tab loads:

- Builder code + fee rates (`/api/builder-fees`)
- All matched builder-attributed trades (`/api/builder-trades?all=1`)
- Volume + builder fee totals

Credentials stay on the server — never in the browser.

## Deploy (Vercel)

1. Push to GitHub (`nikhilvitc/polymarket`)
2. In Vercel project → **Settings → Environment Variables**, add:

   - `POLYMARKET_BUILDER_API_KEY`
   - `POLYMARKET_BUILDER_API_SECRET`
   - `POLYMARKET_BUILDER_API_PASSPHRASE`
   - `POLYMARKET_BUILDER_CODE`
   - `BUILDER_DASHBOARD_PASSWORD` — e.g. `YeNo&PoLy`

   Copy from Polymarket → Settings → Builder (or YeNo prod SSM `/yeno/api/polymarket-builder-*`).

3. Redeploy.

## Local dev

```bash
cp .env.example .env.local
# fill in builder creds
vercel dev
```

Open http://localhost:3000 — builder tab auto-loads on refresh.

## Note on open orders

Polymarket's builder API exposes **matched trades** only (`GET /builder/trades`). Resting limit orders do not appear until filled.
