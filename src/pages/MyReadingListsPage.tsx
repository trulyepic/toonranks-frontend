import { useEffect, useState, type ChangeEvent } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Link } from "react-router-dom";
import {
  getMyReadingListsPaged,
  getReadingListItemsPaged,
  deleteReadingList,
  removeSeriesFromReadingList,
  updateReadingListItem,
  getSeriesSummary,
  shareReadingList,
  unshareReadingList,
  type RankedSeries,
  type ReadingList,
  type ReadingListItem,
  type ReadingListPreview,
} from "../api/manApi";
import {
  ItemRowsShimmerBlock,
  ListHeaderShimmer,
} from "../components/ReadingListShimmers";
import ShimmerBox from "../components/ShimmerBox";
import { getDisplayVoteCount } from "../util/displayVoteCounts";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";

const PAGE_SIZE_LISTS = 10;
const PAGE_SIZE_ITEMS = 25;

function statusClass(status?: string): string {
  switch ((status || "").toUpperCase()) {
    case "ONGOING":
      return "bg-green-500 text-white";
    case "COMPLETE":
      return "bg-blue-600 text-white";
    case "HIATUS":
      return "bg-amber-500 text-white";
    case "UNKNOWN":
      return "bg-gray-400 text-white";
    case "SEASON_END":
      return "bg-purple-600 text-white";
    default:
      return "bg-gray-400 text-white";
  }
}

function statChipClass(tone: "neutral" | "accent" | "muted" = "neutral"): string {
  if (tone === "accent") {
    return "inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900";
  }
  if (tone === "muted") {
    return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300";
  }
  return "inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300";
}

/** Child that loads/paginates items only when mounted (list expanded). */
function ListItems({
  listId,
  initialCount,
  onRemove,
}: {
  listId: number;
  initialCount: number;
  onRemove: (seriesId: number) => void;
}) {
  const [items, setItems] = useState<ReadingListItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialCount > 0);
  const [loading, setLoading] = useState(false);
  const [savingSeriesId, setSavingSeriesId] = useState<number | null>(null);
  const [chapterDrafts, setChapterDrafts] = useState<Record<number, string>>({});
  const [editingSeriesId, setEditingSeriesId] = useState<number | null>(null);

  // summaries cache only for items we fetched
  const [summaries, setSummaries] = useState<Record<number, RankedSeries>>({});
  const [summariesLoading, setSummariesLoading] = useState(false);

  // 🔽 NEW: filter state
  const [filterType, setFilterType] = useState<
    "" | "MANHWA" | "MANGA" | "MANHUA"
  >("");
  // const [rankMin, setRankMin] = useState<string>(""); // string to allow empty
  // const [rankMax, setRankMax] = useState<string>("");
  const [minStars, setMinStars] = useState<string>(""); // e.g. 7.5

  type SortKey =
    | "DEFAULT"
    | "RANK_ASC"
    | "RANK_DESC"
    | "STARS_DESC"
    | "STARS_ASC"
    | "VOTES_DESC"
    | "VOTES_ASC"
    | "TITLE_ASC"
    | "TITLE_DESC";
  type StatusKey =
    | ""
    | "ONGOING"
    | "COMPLETE"
    | "HIATUS"
    | "SEASON_END"
    | "UNKNOWN";
  const [sortBy, setSortBy] = useState<SortKey>("DEFAULT");
  const [filterStatus, setFilterStatus] = useState<StatusKey>("");
  const toSortable = (it: ReadingListItem) => summaries[it.series_id];
  const normalizeChapter = (value?: string | null) => value?.trim() ?? "";
  const starsFilterActive = minStars.trim() !== "";

  const matchesStarFilter = (score: number | null | undefined, rawInput: string) => {
    if (score == null) return false;

    const trimmed = rawInput.trim();
    if (!trimmed) return true;

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return true;

    if (!trimmed.includes(".")) {
      return score >= parsed && score < parsed + 1;
    }

    const decimals = trimmed.split(".")[1]?.length ?? 0;
    const step = 10 ** -decimals;
    return score >= parsed && score < parsed + step;
  };

  const isChapterDirty = (item: ReadingListItem) =>
    normalizeChapter(chapterDrafts[item.series_id] ?? item.left_off_chapter) !==
    normalizeChapter(item.left_off_chapter);

  // load first page on mount
  useEffect(() => {
    if (initialCount <= 0) return;

    let ignore = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await getReadingListItemsPaged(listId, 1, PAGE_SIZE_ITEMS);
        if (ignore) return;
        setItems(res.items);
        setPage(res.page + 1);
        setHasMore(!!res.has_more);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [initialCount, listId]);

  // summaries for the currently fetched items
  useEffect(() => {
    const ids = Array.from(new Set(items.map((i) => i.series_id)));
    if (ids.length === 0) return;

    let cancelled = false;
    (async () => {
      setSummariesLoading(true);
      try {
        const results = await Promise.allSettled(
          ids.map((id) => getSeriesSummary(id))
        );
        if (cancelled) return;
        const next: Record<number, RankedSeries> = { ...summaries };
        results.forEach((r) => {
          if (r.status === "fulfilled") next[r.value.id] = r.value;
        });
        setSummaries(next);
      } finally {
        if (!cancelled) setSummariesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const loadMore = async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const res = await getReadingListItemsPaged(listId, page, PAGE_SIZE_ITEMS);
      // de-dupe by series_id
      const existing = new Set(items.map((i) => i.series_id));
      const incoming = res.items.filter((i) => !existing.has(i.series_id));
      setItems((prev) => [...prev, ...incoming]);
      setPage(res.page + 1);
      setHasMore(!!res.has_more);
    } finally {
      setLoading(false);
    }
  };

  const handleChapterSave = async (
    seriesId: number,
    leftOffChapter: string | null
  ) => {
    try {
      setSavingSeriesId(seriesId);
      const updatedList = await updateReadingListItem(
        listId,
        seriesId,
        leftOffChapter
      );
      const nextItem = updatedList.items.find((item) => item.series_id === seriesId);
      setItems((prev) =>
        prev.map((item) =>
          item.series_id === seriesId
            ? {
                ...item,
                left_off_chapter: nextItem?.left_off_chapter ?? null,
              }
            : item
        )
      );
      setChapterDrafts((prev) => ({
        ...prev,
        [seriesId]: nextItem?.left_off_chapter ?? "",
      }));
      setEditingSeriesId(null);
    } catch (e) {
      alert((e as Error).message || "Failed to save chapter");
    } finally {
      setSavingSeriesId(null);
    }
  };

  // 🔽 NEW: filter predicate
  const passesFilter = (s?: RankedSeries) => {
    // If summary not loaded yet, show it for now (it will re-evaluate once loaded)
    if (!s) return true;

    // Type
    if (filterType && s.type !== filterType) return false;

    // Status (case-insensitive)
    if (filterStatus) {
      const st = (s.status || "").toString().toUpperCase();
      if (st !== filterStatus) return false;
    }

    // Stars (final_score)
    if (starsFilterActive) {
      if (!matchesStarFilter(Number(s.final_score), minStars)) return false;
    }

    return true;
  };

  // const visibleItems = items.filter((it) =>
  //   passesFilter(summaries[it.series_id])
  // );

  const compareNullable = <T,>(
    aVal: T | null | undefined,
    bVal: T | null | undefined,
    cmp: (a: T, b: T) => number
  ) => {
    const aN = aVal == null;
    const bN = bVal == null;
    if (aN && bN) return 0;
    if (aN) return 1; // nulls last
    if (bN) return -1;
    return cmp(aVal as T, bVal as T);
  };

  const byTitle = (a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: "base" });

  const sortedItems = (() => {
    // base: filtered items in current order
    const base = items.filter((it) => passesFilter(toSortable(it)));
    if (sortBy === "DEFAULT") return base;

    const withIndex = base.map((it, i) => ({ it, i }));
    withIndex.sort((A, B) => {
      const a = toSortable(A.it);
      const b = toSortable(B.it);
      switch (sortBy) {
        case "RANK_ASC":
          return (
            compareNullable(a?.rank, b?.rank, (x, y) => x - y) || A.i - B.i
          );
        case "RANK_DESC":
          return (
            compareNullable(a?.rank, b?.rank, (x, y) => y - x) || A.i - B.i
          );
        case "STARS_DESC":
          return (
            compareNullable(
              a?.final_score != null ? Number(a.final_score) : null,
              b?.final_score != null ? Number(b.final_score) : null,
              (x, y) => y - x
            ) || A.i - B.i
          );
        case "STARS_ASC":
          return (
            compareNullable(
              a?.final_score != null ? Number(a.final_score) : null,
              b?.final_score != null ? Number(b.final_score) : null,
              (x, y) => x - y
            ) || A.i - B.i
          );
        case "VOTES_DESC":
          return (
            compareNullable(a?.vote_count, b?.vote_count, (x, y) => y - x) ||
            A.i - B.i
          );
        case "VOTES_ASC":
          return (
            compareNullable(a?.vote_count, b?.vote_count, (x, y) => x - y) ||
            A.i - B.i
          );
        case "TITLE_ASC":
          return compareNullable(a?.title, b?.title, byTitle) || A.i - B.i;
        case "TITLE_DESC":
          return (
            compareNullable(a?.title, b?.title, (x, y) => byTitle(y, x)) ||
            A.i - B.i
          );
        default:
          return A.i - B.i;
      }
    });

    return withIndex.map((x) => x.it);
  })();
  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value as "" | "MANHWA" | "MANGA" | "MANHUA");
  };

  const isFiltering =
    !!filterType ||
    !!filterStatus || starsFilterActive || sortBy !== "DEFAULT";

  const effectiveHasMore = hasMore && !isFiltering;

  return initialCount === 0 ? (
    <div className="px-4 py-6 text-sm text-gray-500 dark:text-slate-400">No items yet.</div>
  ) : (
    <>
      {/* 🔽 NEW: Filter bar */}
      <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 backdrop-blur-sm dark:border-[#342a23] dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.08),_transparent_28%),linear-gradient(180deg,_rgba(38,31,27,0.94),_rgba(30,24,21,0.92))] sm:px-5">
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <div className="flex min-w-0 flex-col gap-1 sm:min-w-[110px]">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Type
            </label>
            <select
              value={filterType}
              onChange={handleTypeChange}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark-theme-field dark:focus:ring-[#2a221c] dark:bg-[#17130f] dark:text-[#f4efe8] dark:[color-scheme:dark]"
            >
              <option value="">All</option>
              <option value="MANHWA">Manhwa</option>
              <option value="MANGA">Manga</option>
              <option value="MANHUA">Manhua</option>
            </select>
          </div>

          <div className="flex min-w-0 flex-col gap-1 sm:min-w-[130px]">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusKey)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark-theme-field dark:focus:ring-[#2a221c] dark:bg-[#17130f] dark:text-[#f4efe8] dark:[color-scheme:dark]"
            >
              <option value="">All</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETE">Complete</option>
              <option value="HIATUS">Hiatus</option>
              <option value="SEASON_END">Season End</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          {/* Sort (from previous step) */}
          <div className="flex min-w-0 flex-col gap-1 sm:min-w-[180px]">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Sort
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark-theme-field dark:focus:ring-[#2a221c] dark:bg-[#17130f] dark:text-[#f4efe8] dark:[color-scheme:dark]"
            >
              <option value="DEFAULT">Default (list order)</option>
              <option value="RANK_ASC">Rank ↑</option>
              <option value="RANK_DESC">Rank ↓</option>
              <option value="STARS_DESC">Stars ↑ (high→low)</option>
              <option value="STARS_ASC">Stars ↓ (low→high)</option>
              <option value="VOTES_DESC">Votes ↑ (high→low)</option>
              <option value="VOTES_ASC">Votes ↓ (low→high)</option>
              <option value="TITLE_ASC">Title A–Z</option>
              <option value="TITLE_DESC">Title Z–A</option>
            </select>
          </div>

          {/* Minimum stars */}
          <div className="grid grid-cols-1 gap-2 sm:flex sm:items-end">
            <div className="flex min-w-0 flex-col">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Stars
              </label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={minStars}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setMinStars(nextValue);
                  if (nextValue.trim() !== "") {
                    setSortBy("STARS_DESC");
                  } else if (sortBy === "STARS_DESC") {
                    setSortBy("DEFAULT");
                  }
                }}
                placeholder="e.g. 7.5+"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 sm:w-28 dark-theme-field dark:bg-[#17130f] dark:text-[#f4efe8]"
              />
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              setFilterType("");
              setFilterStatus("");
              setMinStars("");
              setSortBy("DEFAULT");
            }}
            className="rounded-md bg-gray-100 px-3 py-2 text-xs text-slate-700 hover:bg-gray-200 dark:bg-[linear-gradient(145deg,_rgba(30,24,20,0.92),_rgba(22,18,15,0.92))] dark:text-slate-200 dark:hover:bg-[#241d19] sm:ml-auto sm:py-1"
            title="Clear filters"
          >
            Reset
          </button>
        </div>
      </div>

      <InfiniteScroll
        key={`list-${listId}-${filterType}-${filterStatus}-${minStars}-${sortBy}`}
        dataLength={sortedItems.length}
        next={loadMore}
        hasMore={effectiveHasMore}
        loader={
          loading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-4 border-gray-400 border-t-transparent rounded-full animate-spin dark:border-[#8d7b6d]" />
              </div>
          ) : null
        }
        endMessage={
          sortedItems.length > 0 ? (
            <p className="text-center py-3 text-gray-300 dark:text-slate-600">End of this list.</p>
          ) : null
        }
      >
        {items.length === 0 && (loading || summariesLoading) ? (
          <ItemRowsShimmerBlock
            count={Math.min(Math.max(initialCount, 4), 8)}
          />
        ) : sortedItems.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-500 dark:text-slate-400">
            No items match your filters.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/80 dark:divide-[#342a23]">
            {sortedItems.map((it) => {
              const s = summaries[it.series_id];
              const stx = s?.status?.toUpperCase();
              const isThumbLoading = summariesLoading && !s;
              const displayVoteCount = getDisplayVoteCount(
                s?.vote_count,
                it.series_id
              );

              return (
                <li key={it.series_id} className="px-4 py-4 sm:px-5">
                  <div className="grid gap-4 rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] transition hover:border-slate-300/80 hover:shadow-[0_24px_48px_-30px_rgba(15,23,42,0.62)] dark-theme-card dark:hover:border-[#4a3d33] sm:p-5 lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:gap-5">
                    <Link
                      to={`/series/${it.series_id}`}
                      className="relative block overflow-hidden rounded-[26px] bg-slate-100 transition hover:scale-[1.01]"
                      title={s?.title || `Series #${it.series_id}`}
                    >
                      {isThumbLoading ? (
                        <ShimmerBox className="h-48 w-full rounded-[26px] sm:h-56" />
                      ) : s?.cover_url ? (
                        <img
                          src={s.cover_url}
                          alt={s?.title || `Series ${it.series_id}`}
                          className="h-48 w-full rounded-[26px] bg-slate-100 object-cover object-[center_18%] dark:bg-[#241d19] sm:h-56 sm:object-center lg:h-full lg:min-h-[17rem]"
                          loading="lazy"
                          decoding="async"
                          width={176}
                          height={272}
                        />
                      ) : (
                        <div
                          className="flex h-48 w-full items-center justify-center rounded-[26px] bg-slate-100 text-[10px] text-slate-400 dark:bg-[#241d19] dark:text-slate-500 sm:h-56 lg:h-full lg:min-h-[17rem]"
                          aria-label={
                            s?.title
                              ? `${s.title} (no cover)`
                              : `Series ${it.series_id} (no cover)`
                          }
                        >
                          —
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

                      {s?.rank ? (
                        <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold text-white ring-1 ring-white/80 backdrop-blur-sm">
                          #{s.rank}
                        </span>
                      ) : null}

                      {stx ? (
                        <span
                          className={
                            "absolute bottom-3 left-3 inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] shadow-sm ring-1 ring-white/80 " +
                            statusClass(stx)
                          }
                          title={stx}
                          aria-label={`Status: ${stx}`}
                        >
                          {stx}
                        </span>
                      ) : null}
                    </Link>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            {summariesLoading && !s ? (
                              <ShimmerBox className="h-5 w-48 rounded" />
                            ) : (
                              <Link
                                to={`/series/${it.series_id}`}
                              className="block text-xl font-semibold tracking-tight text-slate-950 transition hover:text-slate-700 hover:underline dark:text-white dark:hover:text-slate-200 sm:text-2xl"
                                title={s?.title || `Series #${it.series_id}`}
                              >
                                {s?.title || `Series #${it.series_id}`}
                              </Link>
                            )}

                          <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                              {summariesLoading && !s ? (
                                <>
                                  <ShimmerBox className="h-7 w-20 rounded-full" />
                                  <ShimmerBox className="h-7 w-20 rounded-full" />
                                  <ShimmerBox className="h-7 w-24 rounded-full" />
                                </>
                              ) : (
                                <>
                                  <span className={statChipClass("muted")}>
                                    {s?.type || "—"}
                                  </span>
                                  <span
                                    className={`${statChipClass("accent")} ${
                                      (s?.final_score ?? 0) >= 8
                                        ? "text-emerald-700 bg-emerald-50 ring-emerald-100"
                                        : (s?.final_score ?? 0) >= 7.5
                                        ? "text-blue-700 bg-blue-50 ring-blue-100"
                                        : (s?.final_score ?? 0) >= 5
                                        ? "text-amber-700 bg-amber-50 ring-amber-100"
                                        : "text-slate-500 bg-slate-100 ring-slate-200"
                                    }`}
                                  >
                                    {s?.final_score != null
                                      ? `★ ${Number(s.final_score).toFixed(3)}`
                                      : "★ —"}
                                  </span>
                                  <span className={statChipClass()}>
                                    {displayVoteCount
                                      ? `${displayVoteCount} votes`
                                      : "No votes"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start justify-end">
                            {summariesLoading && !s ? (
                              <ShimmerBox className="h-10 w-24 rounded-xl" />
                            ) : (
                              <button
                                onClick={() => {
                                  onRemove(it.series_id);
                                  setItems((prev) =>
                                    prev.filter((x) => x.series_id !== it.series_id)
                                  );
                                }}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:w-auto"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                          <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.7)] dark-theme-card-soft dark:shadow-[0_16px_34px_-32px_rgba(0,0,0,0.8)]">
                          {(() => {
                            const draftValue =
                              chapterDrafts[it.series_id] ?? it.left_off_chapter ?? "";
                            const normalizedDraft = normalizeChapter(draftValue);
                            const hasSavedChapter =
                              normalizeChapter(it.left_off_chapter) !== "";
                            const isDirty = isChapterDirty(it);
                            const isSaving = savingSeriesId === it.series_id;
                            const isEditing = editingSeriesId === it.series_id;

                            return (
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                                      Reading progress
                                    </span>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                      Track the chapter you last reached for this title.
                                    </p>
                                  </div>
                                  {!isEditing && hasSavedChapter ? (
                                    <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-200">
                                      Ch. {it.left_off_chapter}
                                    </span>
                                  ) : null}
                                </div>
                                {isEditing ? (
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <input
                                      id={`chapter-${listId}-${it.series_id}`}
                                      type="text"
                                      value={draftValue}
                                      onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setChapterDrafts((prev) => ({
                                          ...prev,
                                          [it.series_id]: nextValue,
                                        }));
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !isSaving && isDirty) {
                                          e.preventDefault();
                                          handleChapterSave(
                                            it.series_id,
                                            normalizedDraft || null
                                          );
                                        }
                                        if (e.key === "Escape" && !isSaving) {
                                          setChapterDrafts((prev) => ({
                                            ...prev,
                                            [it.series_id]:
                                              it.left_off_chapter ?? "",
                                          }));
                                          setEditingSeriesId(null);
                                        }
                                      }}
                                      placeholder="Optional"
                                      maxLength={50}
                                      autoFocus
                                      className={`w-40 rounded-xl border px-3 py-2 text-xs shadow-sm outline-none transition ${
                                        isDirty
                                          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
                                          : "border-slate-200 bg-white dark-theme-field"
                                      }`}
                                    />
                                    <button
                                      onClick={() =>
                                        handleChapterSave(
                                          it.series_id,
                                          normalizedDraft || null
                                        )
                                      }
                                      disabled={isSaving || !isDirty}
                                      className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {isSaving ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setChapterDrafts((prev) => ({
                                          ...prev,
                                          [it.series_id]:
                                            it.left_off_chapter ?? "",
                                        }));
                                        setEditingSeriesId(null);
                                      }}
                                      disabled={isSaving}
                                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark-theme-card-soft dark:text-slate-200 dark:hover:bg-[#241d19]"
                                    >
                                      Cancel
                                    </button>
                                    {hasSavedChapter && (
                                      <button
                                        onClick={() =>
                                          handleChapterSave(it.series_id, null)
                                        }
                                        disabled={isSaving}
                                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <button
                                      onClick={() => {
                                        setChapterDrafts((prev) => ({
                                          ...prev,
                                          [it.series_id]:
                                            it.left_off_chapter ?? "",
                                        }));
                                        setEditingSeriesId(it.series_id);
                                      }}
                                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                        hasSavedChapter
                                          ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark-theme-card-soft dark:text-slate-200 dark:hover:bg-[#241d19]"
                                          : "border border-dashed border-slate-300 bg-transparent text-slate-500 hover:bg-white dark:border-[#3a3028] dark:text-slate-400 dark:hover:bg-[#1e1815]"
                                      }`}
                                    >
                                      {hasSavedChapter
                                        ? "Edit chapter"
                                        : "Add chapter"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </InfiniteScroll>
    </>
  );
}

export default function MyReadingListsPage() {
  // lists pagination
  const [lists, setLists] = useState<ReadingListPreview[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // which list sections are expanded (only expanded lists mount ListItems)
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const [busyId, setBusyId] = useState<number | null>(null);
  const [copyId, setCopyId] = useState<number | null>(null);

  const loadLists = async (next: number) => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getMyReadingListsPaged(next, PAGE_SIZE_LISTS);

      // Merge lists (de-dupe) just like before
      setLists((prev) => {
        const map = new Map<number, ReadingListPreview>();
        [...prev, ...res.items].forEach((l) => map.set(l.id, l));
        return Array.from(map.values()).sort((a, b) => b.id - a.id);
      });

      // ✅ NEW: expand all newly fetched lists by default
      setOpen((prev) => {
        const nextOpen: Record<number, boolean> = { ...prev };
        for (const l of res.items) {
          // only set true if the user hasn't explicitly toggled this one before
          if (prev[l.id] === undefined) nextOpen[l.id] = true;
        }
        return nextOpen;
      });

      setHasMore(!!res.has_more);
      setPage(res.page + 1);
    } catch (e) {
      setError((e as Error).message || "Failed to load lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLists(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteList = async (id: number) => {
    if (!confirm("Delete this list?")) return;
    try {
      await deleteReadingList(id);
      setLists((prev) => prev.filter((x) => x.id !== id));
      setOpen((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleRemoveItem = async (listId: number, seriesId: number) => {
    try {
      await removeSeriesFromReadingList(listId, seriesId);
      // optimistically decrement the count shown on header
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? { ...l, item_count: Math.max(0, l.item_count - 1) }
            : l
        )
      );
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const toggleShare = async (l: ReadingListPreview) => {
    try {
      setBusyId(l.id);
      const next: ReadingList = l.is_public
        ? await unshareReadingList(l.id)
        : await shareReadingList(l.id);

      setLists((prev) =>
        prev.map((x) =>
          x.id === l.id
            ? { ...x, is_public: next.is_public, share_token: next.share_token }
            : x
        )
      );
    } catch (e) {
      alert((e as Error).message || "Failed to update share state.");
    } finally {
      setBusyId(null);
    }
  };

  const copyPublicUrl = async (l: ReadingListPreview) => {
    if (!l.is_public || !l.share_token) return;
    try {
      setCopyId(l.id);
      const url = `${window.location.origin}/lists/${l.share_token}`;
      await navigator.clipboard.writeText(url);
      alert("Public URL copied!");
    } finally {
      setCopyId(null);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <NoIndexSeo title={`My Reading Lists | ${SITE_NAME}`} />
        <div className="text-red-600 dark:text-red-300 mb-3">{error}</div>
        <button
          className="px-3 py-1 rounded-md border border-slate-200 hover:bg-gray-50 dark:border-[#3a3028] dark:text-slate-200 dark:hover:bg-[#241d19]"
          onClick={() => loadLists(1)}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <NoIndexSeo title={`My Reading Lists | ${SITE_NAME}`} />
      <section className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_34%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.95))] px-4 py-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] dark:border-[#322922] dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.14),_transparent_26%),linear-gradient(135deg,_rgba(29,22,18,0.98),_rgba(24,19,16,0.96))] dark:shadow-[0_24px_60px_-42px_rgba(0,0,0,0.85)] sm:mb-8 sm:px-8 sm:py-7">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Library dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Your reading lists, organized and ready.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Review your collections, manage sharing, and jump back into each title.
          </p>
        </div>
      </section>

      {lists.length === 0 && loading ? (
        <div className="space-y-6">
          <ListHeaderShimmer />
          <ListHeaderShimmer />
        </div>
      ) : (
        <InfiniteScroll
          dataLength={lists.length}
          next={() => loadLists(page)}
          hasMore={hasMore}
          loader={
            lists.length > 0 ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null
          }
          endMessage={
            lists.length > 0 ? (
              <p className="text-center py-6 text-gray-400">
                You’ve reached the end of your lists.
              </p>
            ) : null
          }
        >
          {lists.length === 0 && !loading ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center text-slate-600 shadow-sm dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(26,21,18,0.95),_rgba(19,16,13,0.95))] dark:text-slate-300">
              No lists yet. Use “+ Create Reading List” on the homepage.
            </div>
          ) : (
            <div className="space-y-6">
              {lists.map((l) => {
                const isOpen = !!open[l.id];
                return (
                  <section
                    key={l.id}
                    id={`list-${l.id}`}
                    className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm dark-theme-shell"
                  >
                    <header className="flex flex-col gap-4 border-b border-slate-200/80 bg-[linear-gradient(180deg,_rgba(248,250,252,0.96),_rgba(255,255,255,0.98))] px-4 py-4 sm:px-5 sm:py-5 dark:border-[#342a23] dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.1),_transparent_26%),linear-gradient(180deg,_rgba(35,28,24,0.98),_rgba(24,19,16,0.96))] lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <button
                          className="text-left"
                          onClick={() =>
                            setOpen((prev) => ({
                              ...prev,
                              [l.id]: !prev[l.id],
                            }))
                          }
                          title={isOpen ? "Collapse" : "Expand"}
                        >
                          <h2 className="flex items-center gap-2 truncate text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                            {isOpen ? "▾ " : "▸ "} {l.name}
                          </h2>
                        </button>
                        <div className="mt-3 flex flex-wrap items-center gap-2.5">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              l.is_public
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100"
                                : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
                            }`}
                            title={
                              l.is_public
                                ? "This list is public"
                                : "This list is private"
                            }
                          >
                            {l.is_public ? "Public" : "Private"}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
                            {l.item_count} {l.item_count === 1 ? "title" : "titles"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:justify-end">
                        <button
                          onClick={() => toggleShare(l)}
                          disabled={busyId === l.id}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark-theme-card-soft dark:text-slate-200 dark:hover:bg-[#241d19] lg:w-auto"
                          title={
                            l.is_public ? "Make private" : "Share publicly"
                          }
                        >
                          {busyId === l.id
                            ? "…"
                            : l.is_public
                            ? "Unshare"
                            : "Share"}
                        </button>

                        {l.is_public && (
                          <button
                            onClick={() => copyPublicUrl(l)}
                            disabled={copyId === l.id}
                            className="w-full rounded-xl bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100 transition hover:bg-emerald-100 lg:w-auto"
                            title="Copy public URL"
                          >
                            {copyId === l.id ? "Copying…" : "Copy Public URL"}
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteList(l.id)}
                          className="w-full rounded-xl bg-red-50 px-3.5 py-2 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-100 transition hover:bg-red-100 lg:w-auto"
                        >
                          Delete List
                        </button>
                      </div>
                    </header>

                    {isOpen ? (
                      <ListItems
                        listId={l.id}
                        initialCount={l.item_count}
                        onRemove={(seriesId) =>
                          handleRemoveItem(l.id, seriesId)
                        }
                      />
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </InfiniteScroll>
      )}
    </div>
  );
}
