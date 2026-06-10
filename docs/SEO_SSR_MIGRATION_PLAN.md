# SEO / SSR Migration Plan

Status: **PLANNING — not started.** This document is for review before any code.
Goal: get the (already rich) page content into the **initial HTML** so crawlers
(Googlebot) and the AdSense reviewer see full content, fixing both the indexing
problem (9 indexed / 165 "not found") and the AdSense rejection.

---

## Problem statement

The site is a **client-rendered Vite SPA**. `index.html` ships as
`<div id="root"></div>` + a script. All real content — series synopsis, ratings,
author/artist, per-page `<title>`/meta, JSON-LD — is rendered **after** JS executes
and **after** the `api.toonranks.com` fetch resolves.

Consequences:

- Crawlers/AdSense fetch the **empty shell** first. They attempt JS rendering, but
  it's slower, rate-limited, and fragile. If the fetch is slow or the route was
  404ing (the May incident), they see **nothing** → "insufficient content / under
  construction."
- Explains **9 indexed vs 165 "not found"**: content rarely made it into the index
  from empty shells, compounded by the May 404 serving window.

**The content is NOT the problem** — `SeriesDetailPage` already renders synopsis,
author/artist, rating breakdown, community voting, plus full meta + JSON-LD. The
problem is purely that none of it is in the server's initial HTML.

---

## Current stack (confirmed)

- React **19.1**, react-dom 19.1
- **react-router-dom 7.6** ← this is the merged Remix framework; supports SSR/SSG natively
- Vite 6.3
- react-helmet (client-side meta injection)
- Tailwind, axios, JWT in `localStorage`
- Hosting: **AWS Amplify (static)** → **Cloudflare** (proxy/cache) → custom domain
- Backend: FastAPI on Railway at `api.toonranks.com` (CORS allows the site origins)

---

## Recommended approach

**Adopt React Router v7 "framework mode" (the official Vite plugin) and prerender
the public content routes (SSG).** Rationale:

- We're **already on RR v7** — this keeps our router, Vite, Tailwind, and most
  components. It is far lower risk than a Next.js/Remix rewrite.
- **Prerender (SSG)** builds static HTML for known routes at build time → keeps
  **Amplify static hosting + Cloudflare + the existing deploy pipeline** intact
  (no Node server to run). Content lands in the initial HTML = crawlers/AdSense see
  it.
- SSR (runtime Node server) is the heavier variant; we only need it if real-time
  freshness becomes a requirement (it isn't for SEO — see "freshness" below).

### Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **RR v7 framework + prerender (SSG)** | Keeps stack + static hosting; content in HTML; low risk | New series need a rebuild | **Recommended** |
| RR v7 framework + SSR (Node server) | Always fresh | Needs a Node host (hosting change); more infra | Future option if needed |
| Migrate to Next.js | Industry standard SSR | Full router/data/rewrite; new hosting; high risk | Rejected (overkill) |
| Prerender.io / Cloudflare bot-prerender | No app change | Bandaid; per-render cost; not "long-term"; cloaking-adjacent | Rejected (owner wants long-term) |

### Freshness (the one real tradeoff of SSG)

Static pages are as fresh as the last build. Series are added **periodically**, not
constantly, so this is acceptable. Mitigations:
- Trigger a frontend rebuild when a series is approved/edited (webhook → Amplify), and/or
- A scheduled nightly rebuild.
- Note: rankings/votes still update live client-side after hydration — only the
  **initial HTML snapshot** is build-time. Users always see live data.

---

## Migration phases (incremental, reversible)

Each phase is its own branch, merged to `uat`, tested, then promoted. Nothing is a
big-bang switch.

### Phase 0 — Spike / proof of concept (no prod impact)
- [ ] On a throwaway branch, add the RR v7 Vite framework plugin and get the app
      building in framework mode locally. Confirm the existing routes still render.
- [ ] Prerender **one** public route (e.g. `/about`) and verify the content is in
      the built HTML (`view-source`).
- [ ] Decision gate: confirm the approach works before committing.

### Phase 1 — Framework mode, still client-only (parity)
- [ ] Convert the app to RR v7 framework mode but keep all rendering client-side
      (ssr: false equivalent) so behavior is identical to today. Ship to UAT, verify
      full parity (auth, all pages, search, filters, dark mode).
- [ ] This de-risks the structural change separately from prerendering.

### Phase 2 — Prerender public content routes (the actual SEO fix)
- [ ] Enable prerendering for the public, indexable routes:
      `/`, `/series/:id`, `/type/:seriesType`, `/forum`, `/forum/:id`, `/leaderboard`,
      `/user/:username`, `/how-rankings-work`, `/about`, `/contact`, `/terms`, `/privacy`.
- [ ] For dynamic routes, generate the path list at build time from the backend
      (reuse the same source as the sitemap: approved series, public threads).
- [ ] Move per-page meta from `react-helmet` to RR v7's native `meta`/`links` exports
      so titles/descriptions/OG/JSON-LD are in the **server HTML** (not injected later).
- [ ] Keep private/utility routes client-only + `noindex` (login, account, compare, etc.).

### Phase 3 — Data loading for prerender
- [ ] Add route `loader`s that fetch series/thread data at build (server-side) so the
      HTML contains real content. Client still hydrates + revalidates for live data.
- [ ] Decide build-time API base (use `api.toonranks.com`; ensure build env can reach it).

### Phase 4 — Hosting + pipeline validation
- [ ] Confirm the prerendered output is still a static bundle Amplify can serve
      (it should be — SSG = static files). Keep the existing `deploy-production.yml`
      + the new Cloudflare auto-purge.
- [ ] Update `amplify.yml` build output path if it changes.
- [ ] Re-verify the Cloudflare rewrites (the catch-all → index.html) still make sense,
      or adjust now that real HTML files exist per route.

### Phase 5 — Freshness automation
- [ ] Add a rebuild trigger when series are approved/edited (backend → Amplify build
      webhook) and/or a nightly scheduled build.

### Phase 6 — Re-validate SEO + resubmit AdSense
- [ ] Confirm `view-source` on `/series/:id` shows synopsis + meta + JSON-LD.
- [ ] GSC: re-submit sitemap, Validate Fix on the 404s, request indexing on key pages.
- [ ] Once pages are indexing with real content, **resubmit AdSense**.

---

## Risk register (what could break — and mitigation)

| Risk | Impact | Mitigation |
|---|---|---|
| **Auth in `localStorage`** | SSR has no `localStorage`; code that reads it at module/render time crashes the server build | Guard all `window`/`localStorage` access with `typeof window !== "undefined"`; read auth only in effects/client components. Audit `UserContext`, `client.ts`, `authUtils.ts`. |
| **`react-helmet` vs framework meta** | Double meta / meta not in SSR HTML | Migrate to RR v7 `meta()` exports; remove react-helmet per-route. |
| **Browser-only libs** (colorthief, etc.) | Break SSR/prerender | Lazy-load client-side or guard with window checks. |
| **Hosting model change** | Could break the Amplify deploy + Cloudflare + domain | Stay on **SSG/static** so Amplify static hosting is unchanged; validate in Phase 4 before prod. |
| **Cloudflare catch-all rewrite** | Per-route HTML files may conflict with the SPA `/* → index.html` rewrite | Review/adjust rewrites in Phase 4; real HTML files should be served directly. |
| **Build reaches the API** | Prerender needs `api.toonranks.com` at build time | Confirm Amplify build env network + CORS; fall back to client hydration if a page's data fails at build. |
| **Build time / page count** | Hundreds of pages slow the build | Acceptable; parallelize; cap if needed. Monitor. |
| **Stale content (SSG)** | New series not in HTML until rebuild | Phase 5 rebuild triggers; live data still hydrates client-side. |
| **Deploy pipeline + cache purge** | Must keep working | Reuse existing `deploy-production.yml` + the Cloudflare auto-purge already added. |
| **SEO regression during transition** | Temporary ranking dip | Phase 1 keeps parity; only Phase 2+ changes output; validate on UAT first. |

---

## Testing & rollback

- Every phase ships to **UAT first**; verify with `view-source` + GSC URL Inspection
  (Test Live URL) on UAT before promoting.
- Each phase is a separate branch; rollback = revert that branch. Phase 1 (parity)
  and Phase 2 (prerender) are independently revertible.
- Keep the current SPA build path working until Phase 4 sign-off.

---

## Near-term wins (independent of this migration — do these now)

These help indexing/AdSense without waiting for SSR:

- [x] **Cloudflare auto-purge on deploy** — done (`deploy-production.yml`).
- [ ] **Purge Cloudflare now + GSC "Validate Fix"** on the 404s + re-submit sitemap.
- [ ] **Graceful deleted-item handling**: `SeriesDetailPage`/`ThreadPage` should detect
      an API 404 and render a real not-found state with `noindex` (small change; stops
      soft-404 noise).

---

## Open decisions needed from owner

1. **SSG vs SSR** target — recommend **SSG (prerender)** to keep static hosting. Confirm.
2. **Freshness mechanism** — rebuild-on-approve webhook vs nightly rebuild vs both.
3. **Timing** — do the near-term wins (purge + Validate Fix + noindex) first for quick
   relief, then start the phased migration. Agree?
