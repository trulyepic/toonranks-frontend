# Conventions — Toon Ranks Frontend

Patterns used throughout this codebase. Follow these when adding or editing code.

---

## Adding a new page

1. Create `src/pages/MyNewPage.tsx`
2. Add the route in `src/App.tsx`:
   ```tsx
   import MyNewPage from "./pages/MyNewPage";
   // inside <Routes>:
   <Route path="/my-path" element={<MyNewPage />} />
   ```
3. If the page is public-facing, add a `<Seo>` component at the top of the render
4. If auth-gated, redirect to `/login` when `user` is null (see auth pattern below)

---

## Adding a new API call

All API functions live in `src/api/manApi.ts`. Add yours there:

```ts
// src/api/manApi.ts
export async function getMyThing(id: number): Promise<MyThingType> {
  const res = await api.get<MyThingType>(`/my-thing/${id}`);
  return res.data;
}

export async function createMyThing(payload: MyThingCreate): Promise<MyThingType> {
  const res = await api.post<MyThingType>("/my-thing/", payload);
  return res.data;
}
```

Never call `api` directly inside a component or `import axios from 'axios'` in a page.

---

## Auth-gated pages

Read the user from `UserContext` and redirect if null:

```tsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../login/UserContext";

export default function MyProtectedPage() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  if (!user) return null;
  // render page ...
}
```

---

## Role checks

Always use the helpers from `src/util/roleUtils.ts`:

```ts
import { isAdminUser, canSubmitSeriesUser } from "../util/roleUtils";

// In JSX:
{isAdminUser(user) && <AdminPanel />}
{canSubmitSeriesUser(user) && <SubmitButton />}
```

Never write `user?.role === "ADMIN"` inline — use the helpers.

---

## Data fetching pattern

Use `useEffect` + local state. Cancel on unmount using `AbortController`:

```tsx
const [data, setData] = useState<MyType | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const controller = new AbortController();

  (async () => {
    try {
      setLoading(true);
      const result = await getMyThing(id);
      if (!controller.signal.aborted) setData(result);
    } catch (err) {
      if (!isRequestCanceled(err)) setError("Failed to load data");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  })();

  return () => controller.abort();
}, [id]);
```

Import `isRequestCanceled` from `src/api/client.ts` to safely ignore abort errors.

---

## Loading states

Use shimmer components, not spinners:

```tsx
import ShimmerBox from "../components/ShimmerBox";
import ShimmerLoader from "../components/ShimmerLoader";
import SeriesDetailShimmer from "../components/SeriesDetailShimmer";
import ReadingListShimmers from "../components/ReadingListShimmers";

if (loading) return <ShimmerLoader />;
```

---

## Toast notifications

```tsx
import toast from "react-hot-toast";

toast.success("Saved!");
toast.error("Something went wrong.");
```

`react-hot-toast` is globally mounted — no provider needed per-page.

---

## Theming

Always use Tailwind `dark:` variants. Never hardcode dark/light colours:

```tsx
// ✅ Correct
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">

// ❌ Wrong — breaks dark mode
<div style={{ backgroundColor: "#ffffff" }}>
```

Access theme programmatically:
```tsx
import { useTheme } from "../components/useTheme";
const { theme, toggleTheme } = useTheme();
```

---

## SEO / meta tags

Every public page should include a `<Seo>` component:

```tsx
import Seo from "../components/Seo";

// in render:
<Seo
  title="Page Title | Toon Ranks"
  description="Short description for search engines."
/>
```

`Seo` uses `react-helmet` internally.

---

## Markdown rendering

For user-generated content (forum posts, thread content):

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkBreaks]}
  rehypePlugins={[rehypeRaw, rehypeSanitize]}
>
  {content}
</ReactMarkdown>
```

Always include `rehype-sanitize` for user content to prevent XSS.

---

## User avatar

Use the `<UserAvatar>` component — never render avatar URLs directly:

```tsx
import UserAvatar from "../components/UserAvatar";

<UserAvatar
  avatarUrl={user.avatar_url}
  avatarPreset={user.avatar_preset}
  username={user.username}
  size={40}
/>
```

---

## Utility functions

| Function | File | Purpose |
|---|---|---|
| `isAdminUser(user)` | `util/roleUtils.ts` | Role check |
| `canSubmitSeriesUser(user)` | `util/roleUtils.ts` | Role check |
| `formatScore(score)` | `util/formatScore.ts` | Format numeric rating |
| `getAvatarDisplay(user)` | `util/avatar.ts` | Resolve avatar URL or preset |
| `formatDate(dt)` | `util/dateUtils.ts` | Human-readable date |
| `scheduleLogoutAtJwtExp(setUser, token)` | `util/authUtils.ts` | JWT expiry timer |
| `forceLogout(setUser)` | `util/authUtils.ts` | Clear session + redirect |
| `getDominantColor(imgEl)` | `util/getDominantColor.ts` | ColorThief wrapper |

---

## TypeScript

Key types are in `src/types/types.ts`:

```ts
User            — id, username, role, avatar_url, avatar_preset
UserRole        — "ADMIN" | "GENERAL" | "CONTRIBUTOR"
AvatarPreset    — "blue" | "emerald" | "amber"
SeriesDetailData — full series detail shape from the backend
```

Avoid `any`. When a third-party type is missing, write a local declaration file in `src/types/`.

---

## Environment variables

Access via `import.meta.env.VITE_*` — never `process.env`:

```ts
const baseUrl = import.meta.env.VITE_APP_BASE_URL;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
```

Never hardcode URLs. Never commit `.env` files.

---

## New shared component checklist

1. Create `src/components/MyComponent.tsx`
2. Export as a named export (`export function MyComponent(...)`) or default
3. Props interface named `MyComponentProps` defined in the same file
4. Use Tailwind classes — no inline styles
5. Support dark mode via `dark:` classes
6. If it uses context, import from the appropriate context file

---

## Linting and type checking

```bash
npm run lint        # ESLint
npm run build       # tsc -b + vite build (catches type errors)
```

Both must pass before a PR is ready. The CI pipeline runs both.

---

## Testing

- **Unit tests:** Vitest + Testing Library. File pattern: `*.test.tsx` or `*.test.ts` alongside the source file.
- **E2E tests:** Playwright, in `e2e/`.
- Tests must not call the real backend — mock API responses.
- Run unit tests: `npm run test:run`
- Run E2E: `npm run test:e2e`
