# Toon Ranks — Frontend (CLAUDE.md)

AI coding assistant entry point. Read this before touching any code.

> ⚠️ **Read `CONSTRAINTS.md` first.** It defines the non-negotiable workflow rules:
> never commit/push without explicit instruction, always end every task with UI test
> steps + a commit message + a PR description, one branch per task.

---

## What this project is

Toon Ranks is a community ranking and review platform for manga, manhwa, and manhua.
This repo is the **React/TypeScript web frontend** deployed on AWS Amplify.

Key facts:
- SPA built with Vite + React 18 + TypeScript
- Styling: Tailwind CSS (dark mode via `class` strategy)
- Routing: React Router v6 (`BrowserRouter`)
- API: all calls go through `src/api/client.ts` (axios instance)
- Auth: JWT stored in `localStorage`, auto-expiry via JWT decode
- Testing: Vitest (unit) + Playwright (e2e)
- Deployed on **AWS Amplify** — `uat` branch auto-deploys to `uat.toonranks.com`, `main` deploys to `toonranks.com` via a manual GitHub Action

---

## Repo layout

```
src/
  main.tsx          — app entry: wraps in GoogleOAuthProvider, ThemeProvider, UserProvider
  App.tsx           — BrowserRouter + all Routes defined here
  App.css           — global styles

  api/
    client.ts       — axios instance, base URL from VITE_APP_BASE_URL, JWT interceptor, 401 handler
    manApi.ts       — all API call functions (typed, use client.ts)

  pages/            — one file per route/page
  components/       — shared UI components
  login/            — UserContext + UserProvider (auth state)
  config/
    site.ts         — site constants (origin, operator name, emails)
  types/
    types.ts        — shared TypeScript types (User, SeriesDetailData, etc.)
  hooks/            — custom React hooks
  util/             — pure helper functions (auth, avatar, dates, roles, etc.)
  images/           — static assets

e2e/                — Playwright end-to-end tests
src/test/           — Vitest setup
docs/               — Deployment, UAT setup, email aliases
```

---

## How to run locally

```bash
# 1. Install dependencies
npm install

# 2. Create local env file
cp .env.example .env.local     # fill in values — see env vars below

# 3. Start the dev server (hot reload)
npm run dev
# → http://localhost:5173
```

---

## How to run tests

```bash
# Unit tests (watch mode)
npm test

# Unit tests (single run — CI mode)
npm run test:run

# E2E tests (requires dev server running or set PLAYWRIGHT_BASE_URL)
npm run test:e2e

# Lint
npm run lint

# Type-check + production build
npm run build
```

---

## Environment variables

All env vars must start with `VITE_` to be available in the browser bundle.

| Variable | Required | Description |
|---|---|---|
| `VITE_APP_BASE_URL` | **Yes** | Backend API base URL (e.g. `https://www.toonranks.com` or `http://localhost:8000`) |
| `VITE_GOOGLE_CLIENT_ID` | **Yes** | Google OAuth 2.0 web client ID |
| `VITE_RECAPTCHA_SITE_KEY` | **Yes** | reCAPTCHA v2 site key |
| `VITE_APP_ENV` | No | Set to `uat` on the UAT Amplify branch to show the UAT banner (not yet built) |

---

## Critical rules — read before writing any code

> Full workflow constraints are in `CONSTRAINTS.md`. The short version:

1. **Never commit or push without explicit instruction from the owner.** Finishing a task does not mean you commit. Wait to be told.
2. **Always end every task with:** numbered UI test steps, a one-line commit message, and a short GitHub PR description. No exceptions.
3. **Never work directly on `main` or `uat`.** Create a feature branch, merge to `uat` first, then promote to `main` for production. See `docs/DEPLOYMENT.md`.
4. **All API calls go through `src/api/manApi.ts`** — never use raw `fetch` or create a second axios instance. Add new API functions to `manApi.ts`.
5. **Auth state lives in `UserContext`** (`src/login/UserContext.tsx`). Read it with `useContext(UserContext)`. Never read `localStorage` directly for the user object in components.
5. **JWT is in `localStorage`** under key `"token"`. The axios interceptor in `client.ts` attaches it automatically. Don't add auth headers manually.
6. **Role checks use `src/util/roleUtils.ts`** — `isAdminUser(user)`, `canSubmitSeriesUser(user)`. Never compare role strings inline.
7. **Theme is `light` | `dark`**, controlled by `ThemeContext`. Tailwind `dark:` classes respond to the `dark` class on `<html>`. Never hardcode dark/light colours outside Tailwind classes.
8. **TypeScript is strict** — no `any` unless truly unavoidable and commented. Run `npm run build` to confirm type-check passes.
9. **Linter is ESLint** — run `npm run lint` before considering work done.
10. **New routes** must be added to `App.tsx` — the single source of truth for routing.
11. **SEO** — every public page should render a `<Seo>` component with appropriate title/description. See `src/components/Seo.tsx`.
12. **Do not delete commented-out code** unless the user asks — it may be intentional reference.

---

## Key patterns

See `docs/CONVENTIONS.md` for the full reference. Short version:

- **New page** → `src/pages/MyPage.tsx` + route in `App.tsx`
- **New shared component** → `src/components/MyComponent.tsx`
- **New API call** → function in `src/api/manApi.ts` using `api` from `client.ts`
- **New util** → `src/util/myUtil.ts` (pure functions, no React)
- **Auth-gated UI** → read `user` from `UserContext`, redirect to `/login` if null
- **Admin-only UI** → gate with `isAdminUser(user)` from `roleUtils.ts`
- **Loading states** → use shimmer components (`ShimmerBox`, `ShimmerLoader`, `SeriesDetailShimmer`) not spinners
- **Toasts** → `react-hot-toast` (`toast.success(...)`, `toast.error(...)`)
- **Markdown rendering** → `<ReactMarkdown>` with `remark-gfm`, `remark-breaks`, `rehype-raw`, `rehype-sanitize`

---

## Page inventory (routes)

| Path | Page | Auth | Notes |
|---|---|---|---|
| `/` | `Home` | Public | Rankings homepage with filters |
| `/series/:id` | `SeriesDetailPage` | Public | Detail + ratings |
| `/type/:seriesType` | `FilteredSeriesPage` | Public | Filtered rankings (manga/manhwa/manhua) |
| `/compare` | `ComparePage` | Public | Side-by-side series comparison |
| `/forum` | `ForumPage` | Public | Forum thread list |
| `/forum/:id` | `ThreadPage` | Public | Individual thread + posts |
| `/leaderboard` | `LeaderboardPage` | Public | Cred score rankings |
| `/user/:username` | `UserProfilePage` | Public | Public profile |
| `/lists/:token` | `PublicReadingListPage` | Public | Shared reading list |
| `/login` | `LoginPage` | Public | |
| `/signup` | `SignupPage` | Public | |
| `/forgot-password` | `ForgotPasswordPage` | Public | |
| `/reset-password` | `ResetPasswordPage` | Public | |
| `/verify-email` | `VerifyEmailPage` | Public | |
| `/check-your-email` | `CheckYourEmailPage` | Public | |
| `/account` | `AccountPage` | Auth required | Avatar, username, reading lists, favourites |
| `/my-lists` | `MyReadingListsPage` | Auth required | |
| `/my-submissions` | `MySubmissionsPage` | Contributor+ | Series submission management |
| `/pending-titles` | `PendingTitlesPage` | Admin only | Approve/reject submissions |
| `/admin/reports` | `AdminReportsPage` | Admin only | Forum report moderation |
| `/issues` | `IssuesPage` | Admin only | Bug report triage |
| `/how-rankings-work` | `RankingsInfoPage` | Public | |
| `/about` | `AboutPage` | Public | |
| `/contact` | `ContactPage` | Public | |
| `/report-issue` | `ReportIssuePage` | Public | |
| `/terms` | `TermsPage` | Public | |
| `/privacy` | `PrivacyPage` | Public | |

---

## Related repos

| Repo | Purpose | Deployment |
|---|---|---|
| `toonranks-frontend` | **This repo** — Vite/React web app | AWS Amplify |
| `toonranks-backend` | FastAPI REST API | Railway |
| `toon-ranks-mobile` | React Native / Expo mobile app | EAS (Google Play) |

For the full system picture see `docs/ARCHITECTURE.md`.
For the deployment process see `docs/DEPLOYMENT.md`.
