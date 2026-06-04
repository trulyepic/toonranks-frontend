# Toon Ranks Frontend — Agent Instructions

Universal AI agent entry point (Cursor, GitHub Copilot, Windsurf, Gemini, etc.).
If you are Claude Code, also read `CLAUDE.md` for the full reference.

---

## Project summary

React 18 + TypeScript SPA for Toon Ranks — a manga/manhwa/manhua community ranking platform.
- Build tool: Vite
- Styling: Tailwind CSS (dark mode via `class` strategy)
- Routing: React Router v6
- API: axios via `src/api/client.ts` + all API functions in `src/api/manApi.ts`
- Auth: JWT in localStorage, managed by `UserContext`
- Testing: Vitest (unit) + Playwright (e2e)
- Deployed: AWS Amplify — `uat` branch → `uat.toonranks.com` (auto), `main` → `toonranks.com` (manual)

## File map

```
src/main.tsx          app entry, providers
src/App.tsx           router + all routes
src/api/client.ts     axios instance (JWT interceptor, 401 handler)
src/api/manApi.ts     all API call functions
src/pages/            one file per route
src/components/       shared UI components
src/login/            UserContext + UserProvider
src/types/types.ts    shared TypeScript types
src/util/             pure helper functions
src/config/site.ts    site constants
e2e/                  Playwright tests
```

## Non-negotiable rules

> See `CONSTRAINTS.md` for the full workflow. Key points repeated here:

- **Never commit or push without explicit instruction** — wait to be told; finishing a task does not mean commit
- **Always end every task with** numbered UI test steps + one-line commit message + short PR description
- **Never work on `main` or `uat` directly** — feature branches only, merge to `uat` first
- **All API calls go through `src/api/manApi.ts`** — never raw fetch, never a second axios instance
- **Auth state from `UserContext`** — never read localStorage for user in components
- **Role checks use `src/util/roleUtils.ts`** — never inline role string comparisons
- **No `any` types** without a comment explaining why — TypeScript is strict
- **Run `npm run lint` and `npm run build`** before finishing any task

## Key domain concepts

- **Series types:** `MANGA`, `MANHWA`, `MANHUA`
- **Series statuses:** `ONGOING`, `COMPLETE`, `HIATUS`, `UNKNOWN`, `SEASON_END`
- **User roles:** `GENERAL` (default), `CONTRIBUTOR` (can submit series), `ADMIN` (full access)
- **Scoring:** 5 categories rated 1–10; `final_score = avg(story, characters, worldbuilding, art, drama_or_fight)`
- **Theme:** `light` | `dark` — use Tailwind `dark:` classes, controlled by `ThemeContext`

## Where to find things

| Need | Look here |
|---|---|
| Full architecture | `docs/ARCHITECTURE.md` |
| Component/page conventions | `docs/CONVENTIONS.md` |
| Deployment flow | `docs/DEPLOYMENT.md` |
| How to run and test | `CONTRIBUTING.md` (or `CLAUDE.md`) |

## What NOT to do

- Don't add routes anywhere except `App.tsx`
- Don't hardcode the API base URL — always use `import.meta.env.VITE_APP_BASE_URL`
- Don't store sensitive data in localStorage beyond `token` and `user`
- Don't use raw `fetch` for API calls
- Don't write inline styles — use Tailwind classes
- Don't commit directly to `main` or `uat`
