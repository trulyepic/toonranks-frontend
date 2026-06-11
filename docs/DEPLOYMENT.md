# Deployment (Frontend)

How the Toon Ranks frontend ships. Hosting is **Railway** (a Node server running
the React Router v7 SSR build), with DNS via **Cloudflare**.

> History: this used to be an AWS Amplify static SPA (branch-per-environment, manual
> prod release GitHub Action). That was retired in 2026 when the app moved to real
> SSR — Amplify static hosting can't run a server. The old Amplify workflows,
> `amplify.yml`, and the AWS deploy action have been removed.

## How it's hosted

- **Railway service `toonranks-frontend`** (in the `amiable-embrace` project, next to
  the backend `man-review-backend`).
- Build: Railpack/Nixpacks runs `npm ci` (`.npmrc` sets `legacy-peer-deps=true`) →
  `npm run build` (`react-router build`, `ssr: true`) → starts with
  `npm run start` (`react-router-serve ./build/server/index.js`). Railway injects
  `PORT`; the server listens on it.
- Build-time env vars on the service: `VITE_APP_BASE_URL=https://api.toonranks.com`,
  `VITE_GOOGLE_CLIENT_ID`, `VITE_RECAPTCHA_SITE_KEY` (baked into the client bundle).
- **Auto-deploys on push** to the service's configured branch.

## Domains

Both custom domains point at the **same Railway service** (so they currently serve the
same deploy — there is no separate UAT build right now):

| URL | Cloudflare record | Notes |
| --- | --- | --- |
| `www.toonranks.com` | CNAME → Railway target, **DNS only (grey)** | production |
| `uat.toonranks.com` | CNAME → Railway target, **DNS only (grey)** | staging/testing |
| `toonranks.com` (bare) | Cloudflare 301 → `www` | redirect rule |

Sitemap/robots and the backend (`api.toonranks.com`) are unchanged. The frontend
serves `/sitemap.xml`, `/sitemap-static.xml`, `/sitemaps/*` by proxying them to the
backend (resource routes in `src/sitemap/` — these replaced the old Amplify rewrites).

> **Cloudflare proxy:** records are currently "DNS only" (grey cloud) so Railway issues
> its TLS cert directly. To put Cloudflare's proxy (orange) back in front for
> DDoS/WAF: flip to orange **and** set Cloudflare SSL/TLS to **Full (strict)**, **and**
> add a cache rule that does NOT cache HTML (the app is server-rendered — caching HTML
> would serve stale pages).

## Release flow

```
feature branch ──PR/merge──► <deploy branch> ──(Railway auto-build)──► www + uat
```

1. **Develop** on a feature branch; open a PR (CI runs lint, unit tests, browser smoke
   tests, build — see `.github/workflows/frontend-ci.yml`).
2. **Merge** to the branch Railway is configured to deploy from. Railway auto-builds and
   redeploys; both `www.toonranks.com` and `uat.toonranks.com` update together.
3. **Verify** the live site (and Railway's deploy logs).

Rollback: in Railway, redeploy a previous successful deployment; or, for a DNS-level
rollback, point the Cloudflare `www` record back at the old host.

## Backend note

The backend (FastAPI) deploys separately on **Railway** (auto-deploys on merge to the
backend repo's `main`). It's shared by both frontend domains. CORS for extra origins is
controlled by the `EXTRA_CORS_ORIGINS` env var on the backend Railway service
(comma-separated; includes `uat.toonranks.com`).
