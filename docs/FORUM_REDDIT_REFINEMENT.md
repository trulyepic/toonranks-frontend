# Forum Reddit-Style Refinement

Branch: `forum-reddit-refinement`
Scope: forum front page (`src/pages/ForumPage.tsx`). The thread page
(`src/pages/ThreadPage.tsx`) already got its pass (referenced-series cards moved
into the header).

This document records **what was found, what was changed, and why**, so the same
refinement can be replayed in `toon-ranks-mobile` (React Native / Expo) with the
same product decisions but mobile-native building blocks.

---

## 1. Review findings (before)

The forum front page had good bones (SSR-seeded list, unread badges, pinned
styling, category chips, whole-row click targets) but did not scan like a
Reddit-style feed:

| # | Finding | Severity |
|---|---------|----------|
| F1 | Three stacked chrome blocks (hero card, "Showing X of Y" stats card w/ search, sort + category rows) pushed the first thread near the fold | High (UX) |
| F2 | Each thread was a heavy rounded "glass" card (~140px tall) with shadow/ring/blur, not a flat feed row | High (UX) |
| F3 | Meta line read `4 posts - updated 6/30/2026, 8:52:16 PM - by author`: full `toLocaleString()` timestamp (noisy **and** an SSR hydration mismatch risk — server/client locale can differ), `post_count` includes the OP so an unanswered thread says "1 posts", counts buried mid-sentence | High (UX + correctness) |
| F4 | Edit / Pin / Delete rendered as three always-visible pill buttons on every owned row (every row for admins), competing with titles | Medium (UX) |
| F5 | Search fetched on **every keystroke** (no debounce) and `setSearchParams({ page: "1" })` erased other params; `q` never survived refresh/share | Medium (bug) |
| F6 | Sort lived only in `sessionStorage`, category only in component state — a shared/refreshed URL lost both | Medium (bug) |
| F8 | Series-ref pills were uncapped — many refs blew up row height | Low |
| F9 | Pinned threads triple-signalled: amber card bg + 📌 emoji in title + "PINNED" chip | Low |

(F7 — body snippet under the title like Reddit — was **deferred**: it needs the
backend threads-list API to return an OP excerpt. Revisit as a follow-up.)

## 2. What changed (this branch)

All in `src/pages/ForumPage.tsx` unless noted.

### F2 — Flat feed rows
- The `<ul className="space-y-3">` of standalone cards became **one container**
  (`rounded-[1.75rem] border … overflow-hidden`) with `divide-y` rows.
- Rows are `px-4 py-3`, `hover:bg-*`, no per-row shadow/ring/blur. Roughly 2×
  thread density per screen.
- Pinned rows keep a **single** treatment: 3px amber left-accent
  (`border-l-[3px] border-l-amber-400`) + subtle amber bg tint + small "Pinned"
  chip. The 📌 title emoji and uppercase "PINNED" chip were removed (F9).

### F3 — Meta line, Reddit order
- Order is now `avatar author · time-ago`, with a **right-aligned reply chip**
  (`💬 N`) where `N = max(0, post_count - 1)` (OP excluded).
- Timestamp uses `timeAgo()` + `title={fullTimestamp(...)}` +
  `suppressHydrationWarning` (same pattern as ThreadPage) — fixes the SSR
  hydration risk of `toLocaleString()`.

### F4 — Kebab menu for owner/admin actions
- New `ThreadRowMenu` component: a per-row "⋯" button that opens a small
  dropdown with Edit / Pin-Unpin (admin) / Delete. Closes on outside click and
  Escape. Only rendered when the viewer can act on the thread.

### F1 — One toolbar, smaller hero
- Hero collapsed to a single compact row: title + one-line subtitle on the
  left, Categories (admin) + New Thread buttons on the right. Big radial-glow
  card padding reduced.
- The "Showing X of Y threads / stats" card was **removed**. Search, sort
  chips, and category chips now live in **one toolbar card** directly above the
  feed. Result count ("N threads · page X of Y" + "Your threads" badge) is a
  single muted line inside the toolbar.
- Top pager only renders when `totalPages > 1` (unchanged), now under the
  toolbar.

### F5/F6 — URL is the source of truth
- `q`, `sort`, `category`, `page` are all read from and written to
  `useSearchParams`:
  - `/forum?q=mercenary&sort=newest&category=series-talk&page=2` is fully
    shareable and survives refresh/back.
- Search input keeps a local `qInput` state, **debounced 300 ms** into the URL
  (and thus into the fetch). No more fetch-per-keystroke.
- Any change to q/sort/category resets `page` to 1. `sessionStorage` sort is
  kept only as a fallback default when the URL has no `sort` param.
- The SSR skip-first-load guard now only skips when the URL matches the
  server-rendered defaults (no q/category, sort=activity, page 1).

### F8 — Series pill cap
- Rows show at most **3** series-ref pills + a muted `+N more` chip (the thread
  page shows the full list).

## 3. Design decisions to carry into mobile

These are the product decisions; re-implement them with RN primitives
(FlatList rows, Pressable, action-sheet instead of dropdown):

1. **Feed, not cards.** One list surface, hairline dividers, tight vertical
   rhythm. Target ≥2 threads per screen-height more than before.
2. **Meta order:** `avatar author · relative time` left, reply-count chip
   right. Reply count = `post_count - 1`, label it replies/comments, never
   "posts".
3. **Relative time everywhere** in lists (`2h ago`), absolute time only in
   tooltips / long-press.
4. **Owner/admin actions hidden** behind an overflow affordance — on mobile use
   a long-press or "⋯" → native action sheet (Edit / Pin / Delete with
   destructive styling).
5. **One toolbar** above the feed: search + sort chips + category chips.
   No stats banner. On mobile: search bar, then a single horizontally
   scrollable chip row (sort chips, separator, category chips).
6. **State in the navigation layer**: on web that's the URL; on mobile persist
   sort/category in the navigation params or async storage so back/return
   restores the view. Debounce search ~300 ms.
7. **Pinned = one signal**: left accent + small "Pinned" chip. No emoji, no
   shouting.
8. **Cap series pills at 3** + "+N more".
9. **Deferred (F7):** OP excerpt under titles — needs backend API change
   (threads list to return `first_post_excerpt`). Do once, both clients
   benefit.

## 4. Verification done on this branch

- `npm run lint` and `npm run build` clean (pre-existing fast-refresh warnings
  only).
- Verified against the built SSR server (`npm run start`) in the browser:
  feed density, meta line, kebab menu, toolbar, URL round-trip
  (`?q=…&sort=…&category=…&page=…`), debounced search.
