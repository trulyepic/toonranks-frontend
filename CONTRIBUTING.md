# Contributing (Frontend – React/TypeScript)

## Branch naming

Create a branch before doing any work — **never commit directly to `main` or `uat`**.

Preferred pattern: `frontend-<short-desc>`
Examples:
- `frontend-status-filter`
- `frontend-forum-bookmarks`
- `frontend-fix-dark-mode-flash`

If you use Jira: `TR-###-<dev>-<short-desc>` (e.g. `TR-12-kin-status-filter`)

---

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file
cp .env.example .env.local   # fill in values — see required vars below

# 3. Start the dev server
npm run dev
# → http://localhost:5173
```

### Required environment variables

| Variable | Description |
|---|---|
| `VITE_APP_BASE_URL` | Backend API base URL (e.g. `http://localhost:8000` or `https://www.toonranks.com`) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 web client ID |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA v2 site key |

---

## Running tests

```bash
# Unit tests (watch mode)
npm test

# Unit tests (single run — CI mode)
npm run test:run

# E2E tests
npm run test:e2e

# Lint
npm run lint

# Type-check + production build
npm run build
```

---

## Deployment flow

Feature branches merge to **`uat`** first (auto-deploys to `uat.toonranks.com`).
After testing on UAT, `uat` is merged to `main` and the "Deploy to Production" GitHub Action
is triggered manually.

See `docs/DEPLOYMENT.md` for the full process.

---

## Before opening a PR

- [ ] Branch is off `main`, not committed to `main` or `uat` directly
- [ ] `npm run lint` passes with no errors
- [ ] `npm run build` succeeds (confirms TypeScript types pass)
- [ ] `npm run test:run` passes
- [ ] New page has a route entry in `src/App.tsx`
- [ ] New API call is in `src/api/manApi.ts` (not inline in a component)
- [ ] Dark mode tested (toggle theme and verify)
- [ ] No hardcoded API URLs — using `import.meta.env.VITE_APP_BASE_URL`

---

## Key reference docs

| Doc | What it covers |
|---|---|
| `CLAUDE.md` | AI assistant entry point — project overview, rules, patterns, page inventory |
| `AGENTS.md` | Universal agent instructions (Cursor, Copilot, Windsurf) |
| `docs/ARCHITECTURE.md` | System overview, state management, API layer, auth flow, theming |
| `docs/CONVENTIONS.md` | Coding patterns — pages, components, API calls, auth, theming, markdown |
| `docs/DEPLOYMENT.md` | Release process — UAT, production, GitHub Actions |
