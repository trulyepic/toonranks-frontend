# Rankings & Discovery Filters — TODO

Goal: turn the homepage's heavy-but-flat filter chrome into a complete, labeled,
industry-standard discovery filter system. Filters stay **prominent and visible**
(correct for a discovery + ranking + community site) — the work is about
completeness, clarity, and density, not hiding them.

Reference patterns: AniList advanced search, MangaUpdates, Steam store filters —
labeled filter dimensions, all visible, with removable active-filter chips.

---

## Current state (baseline)

The homepage (`src/pages/Home.tsx`) and category page (`src/pages/FilteredSeriesPage.tsx`)
both render, stacked:

1. Header row — "Rankings" chip, "X loaded", active-filter chips (display-only),
   action buttons (Create Reading List / Add Title)
2. `StatusStrip` — All Status / Ongoing / Complete / Hiatus / Season End (pills + dots)
3. `GenreStrip` — All / Action / Romance / … (horizontally scrolling pills)

Backend `/series/rankings` already accepts `type`, `genre`, `status`.
`fetchRankedSeriesPaginated` already forwards all three. **The homepage only sends
`genre` + `status`** — `type` is siloed on the separate `/type/:seriesType` route.

---

## Gaps identified

1. **Type is not a homepage filter.** Users can't compose "Manhwa + Ongoing + Action"
   in one place — they must leave to `/type/MANHWA` and lose the other filters.
   Backend + API already support `type`; the homepage just doesn't expose it.
2. **Filter dimensions are unlabeled.** Two near-identical pill strips with no
   `Type` / `Status` / `Genre` labels — the power isn't legible.
3. **Active-filter chips are display-only.** No ✕ to remove, no "Clear all".
4. **No sort control.** Rankings are always score-descending. A discovery/ranking
   site normally offers Score / Most-voted / Newest / A–Z. (Needs a small backend
   `sort` param — see Phase 2.)

---

## Phase 1 — frontend only (high value, no backend change)

Branch: `frontend-rankings-filters` (separate from this discovery branch)

- [ ] Add a **Type** filter row to `Home.tsx` (All / Manga / Manhwa / Manhua),
      wired to `fetchRankedSeriesPaginated`'s existing `type` option + the search path.
- [ ] Add small dimension **labels** (`Type` / `Status` / `Genre`) to the filter bar
      on both `Home.tsx` and `FilteredSeriesPage.tsx`.
- [ ] Make active-filter chips **removable** (✕ clears that one dimension) and add a
      **"Clear all"** action. Replace the current display-only chips.
- [ ] De-duplicate the "ALL" vs "ALL STATUS" confusion now that dimensions are labeled.
- [ ] Consider extracting the shared filter bar (Home + FilteredSeriesPage duplicate it)
      into a single `RankingsFilterBar` component to avoid drift.
- [ ] Verify the `/type/:seriesType` page and the new Home Type filter stay in sync
      (selecting a Type on Home should match what `/type/` shows).

## Phase 2 — sort (small backend + frontend)

Backend branch: `backend-rankings-sort` · Frontend follows on a filters branch

- [ ] Backend: add `sort` query param to `/series/rankings`
      (`score` default | `votes` | `newest` | `title`). Mirror the existing forum
      pattern (`sort=activity|newest|replies` on the forum list endpoint).
- [ ] Frontend: add a **Sort** dropdown to the filter bar; thread `sort` through
      `fetchRankedSeriesPaginated`.
- [ ] Decide newest ordering source (series `id` desc is a cheap proxy if there's no
      created_at on `series`).

## Phase 3 — polish (optional)

- [ ] Persist the active filter set in the URL query string (`?type=&status=&genre=&sort=`)
      so filtered views are shareable and survive refresh/back.
- [ ] Result count clarity: "X loaded" vs total — consider showing total when known.

---

## Out of scope

- Hiding filters behind a toggle (that's a mobile-space pattern; on web, keep them visible).
- Changing which titles a text search returns (search matching logic stays as-is).
