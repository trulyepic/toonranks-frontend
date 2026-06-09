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

## Design decision (revised)

**Type is NOT a filter on the page.** The global header already owns Type via its
category dropdown (`ALL / Manga / Manhwa / Manhua → /type/<TYPE>`). Adding a Type row
to the page only duplicates it and makes the top busier. Type = primary navigation
(header); Status / Genre / Sort = secondary refinement within the chosen type (page).

So the redesign **consolidates the two stacked full-width strips (Status + Genre) into
one compact toolbar row** of labeled dropdowns, and adds Sort:

```
Rankings · 48 loaded                              + List   + Add
[Genre ▾]  [Status ▾]  [Sort ▾]   | ✕ Action  ✕ Ongoing   Clear all
```

## Phase 1 + 2 (built together)

Frontend branch: `frontend-rankings-toolbar` · Backend branch: `backend-rankings-sort`

- [x] `FilterSelect` — generic compact labeled dropdown (outside-click + Esc close).
- [x] `RankingsToolbar` — shared toolbar (Genre ▾ / Status ▾ / Sort ▾) + removable
      active chips + "Clear all" + page-specific `rightSlot`. Used by both `Home.tsx`
      and `FilteredSeriesPage.tsx` (no duplicated filter chrome).
- [x] Two stacked strips collapsed into one row → less vertical chrome, covers rise up.
- [x] **Sort** dropdown: Score (default) / Most Voted / Newest / A–Z.
- [x] Backend: `sort` param on `/series/rankings` (`score` | `votes` | `newest` |
      `title`). Display order only — each item keeps its score-based `rank`.
- [x] Removed the scrapped Type-strip approach (header owns Type).
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
