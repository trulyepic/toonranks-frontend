# Architecture — Toon Ranks Frontend

## System overview

```
User's browser
  │
  ▼
Cloudflare (DNS + cache proxy)
  │
  ▼
AWS CloudFront (via Amplify)
  │
  ├── Static assets (JS bundle, CSS, images) — served from CDN edge
  │
  └── API calls (XHR/fetch via axios)
        │
        ▼
      FastAPI backend (Railway)
        │
        ▼
      PostgreSQL (man_review schema)
      AWS S3 (images)
      SendGrid (email)
      Google OAuth (id_token verify)
```

## Environments

| Environment | Branch | URL | How it deploys |
|---|---|---|---|
| UAT | `uat` | `https://uat.toonranks.com` | Auto on every push/merge to `uat` |
| Production | `main` | `https://toonranks.com` | Manual — "Deploy to Production" GitHub Action |

Both environments share the **same backend and database**. UAT is frontend-only staging.
See `docs/DEPLOYMENT.md` for the full release process.

## Application bootstrap

```
index.html
  └── src/main.tsx
        ├── GoogleOAuthProvider   — wraps app with Google OAuth context
        ├── ThemeProvider         — reads/writes theme from localStorage, sets dark class on <html>
        ├── UserProvider          — reads JWT + user from localStorage on mount, schedules auto-logout
        └── <App />
              └── SearchProvider
                    └── BrowserRouter
                          ├── Header
                          ├── <Routes> (all page components)
                          └── Footer
```

## State management

There is no Redux or Zustand. State is managed with:

| Concern | Mechanism |
|---|---|
| Auth (user + token) | `UserContext` — React Context, backed by `localStorage` |
| Theme (light/dark) | `ThemeContext` — React Context, backed by `localStorage` |
| Search input | `SearchContext` — React Context (header search bar shared across pages) |
| Server data | Local component state + `useEffect` data fetching |
| Notifications | Polled per-page (no WebSocket) |
| Toasts | `react-hot-toast` (imperative API) |

## API layer

All backend communication goes through two files:

### `src/api/client.ts`
- Creates a single axios instance with `baseURL: import.meta.env.VITE_APP_BASE_URL`
- **Request interceptor:** attaches `Authorization: Bearer <token>` from localStorage (skipped on public auth routes)
- **Response interceptor:** on 401 from non-auth routes → clears localStorage + hard-redirects to `/login`; on auth routes → lets the error propagate so the login page can show "Invalid credentials"
- Exports `isRequestCanceled()` for AbortController cleanup

### `src/api/manApi.ts`
- Typed functions for every backend endpoint
- All functions use the `api` instance from `client.ts`
- This is the **only** place where API URLs are written — never call `api` directly from components

## Auth flow

```
Login / Google OAuth
  │
  ▼
Backend returns { access_token, user }
  │
  ▼
localStorage.setItem("token", access_token)
localStorage.setItem("user", JSON.stringify(user))
UserContext.setUser(user)
scheduleLogoutAtJwtExp(setUser, token)  ← decodes JWT exp, sets a setTimeout
  │
  ▼
Every request → axios interceptor attaches token automatically
  │
  ▼
On 401 (non-auth route) → hardLogout() → clears storage → redirect /login
On JWT expiry → scheduleLogoutAtJwtExp fires → forceLogout(setUser) → clears storage
On other tab logout → storage event listener → forceLogout(setUser)
```

## Routing

All routes are defined in `src/App.tsx`. React Router v6 `<Routes>` with `<Route>` elements.
No lazy loading currently — all pages are eagerly bundled.

Route guarding is done at the component level — pages redirect to `/login` if `user` is null,
or render nothing / redirect if the role is insufficient.

## Theming

- Tailwind `darkMode: "class"` — the `dark` class on `<html>` activates dark styles
- `ThemeProvider` reads the stored preference from `localStorage` on mount
- Falls back to `prefers-color-scheme` if no preference is stored
- `useTheme()` hook exposes `{ theme, setTheme, toggleTheme }`
- Theme toggle is in the `Header` component

## Markdown rendering

Forum posts and thread content are stored and transmitted as raw markdown.
Rendering uses the `react-markdown` pipeline:

```
content_markdown (raw string)
  │
  ▼
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkBreaks]}
  rehypePlugins={[rehypeRaw, rehypeRawSanitize]}
>
```

`rehype-sanitize` prevents XSS from `<img>` tags and raw HTML injected by users.

## Image handling

- Series covers and detail banners: S3 URLs stored in the backend, rendered as `<img>` tags
- User avatars: S3 URL or colour preset (`blue` | `emerald` | `amber`), rendered by `<UserAvatar>`
- Dominant colour extraction for series cards: `colorthief` library (`src/util/getDominantColor.ts`)
- Forum media: uploaded via `POST /forum/media/upload`, stored on S3, referenced by URL in markdown

## Build output

```bash
npm run build   # tsc -b && vite build
```

Output goes to `dist/`. Amplify picks up `dist/` and serves it from CloudFront.
The `amplify.yml` in the repo root configures the build command and artifact path.
