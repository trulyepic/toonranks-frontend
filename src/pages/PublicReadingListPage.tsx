import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import InfiniteScroll from "react-infinite-scroll-component";
import {
  getPublicReadingList,
  getSeriesSummary,
  type PublicReadingList,
  type RankedSeries,
} from "../api/manApi";
import { ItemRowsShimmerBlock } from "../components/ReadingListShimmers";
import ShimmerBox from "../components/ShimmerBox";
import { getDisplayVoteCount } from "../util/displayVoteCounts";

const PAGE_SIZE_ITEMS = 25;

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

function statusClass(status?: string) {
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

function statChipClass(tone: "neutral" | "accent" | "muted" = "neutral") {
  if (tone === "accent") {
    return "inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900";
  }
  if (tone === "muted") {
    return "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300";
  }
  return "inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300";
}

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
const byTitle = (a?: string, b?: string) =>
  compareNullable(a, b, (x, y) =>
    x.localeCompare(y, undefined, { sensitivity: "base" })
  );

export default function PublicReadingListPage() {
  const { token } = useParams<{ token: string }>();

  const [list, setList] = useState<PublicReadingList | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // seriesId -> RankedSeries
  const [summaries, setSummaries] = useState<Record<number, RankedSeries>>({});
  const [summariesLoading, setSummariesLoading] = useState(false);

  // pagination + sort (client-side)
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("DEFAULT");

  // ---- load the public list by token ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      setError(null);
      setSummaries({});
      setPage(1);
      try {
        if (!token) throw new Error("Missing list token.");
        const data = await getPublicReadingList(token);
        if (!cancelled) setList(data);
      } catch (e: unknown) {
        const msg =
          (e as { message?: string })?.message ||
          "This list is private, missing, or temporarily unavailable.";
        if (!cancelled) {
          setError(msg);
          setList(null);
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ---- sorted ids (across the whole list) ----
  const sortedItems = useMemo(() => {
    if (!list) return [];
    const base = list.items.slice(); // clone
    if (sortBy === "DEFAULT") return base;

    const withIndex = base.map((it, i) => ({ it, i }));
    withIndex.sort((A, B) => {
      const a = summaries[A.it.series_id];
      const b = summaries[B.it.series_id];
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
          return byTitle(a?.title, b?.title) || A.i - B.i;
        case "TITLE_DESC":
          return byTitle(b?.title, a?.title) || A.i - B.i;
        default:
          return A.i - B.i;
      }
    });
    return withIndex.map((x) => x.it);
  }, [list, sortBy, summaries]);

  const totalCount = list?.items.length ?? 0;
  const visibleItems = useMemo(
    () => sortedItems.slice(0, page * PAGE_SIZE_ITEMS),
    [sortedItems, page]
  );
  const hasMore = visibleItems.length < (list?.items.length ?? 0);

  // ---- fetch summaries for just the currently visible page slice ----
  useEffect(() => {
    if (!list || visibleItems.length === 0) return;

    const missingIds = visibleItems
      .map((i) => i.series_id)
      .filter((id) => !summaries[id]);

    if (missingIds.length === 0) return;

    let cancelled = false;
    (async () => {
      setSummariesLoading(true);
      try {
        const results = await Promise.allSettled(
          missingIds.map((id) => getSeriesSummary(id))
        );
        if (cancelled) return;
        const next = { ...summaries };
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
  }, [list, page, sortedItems]);

  const loadMore = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  const pageTitle = list
    ? `${list.name} - Shared Reading List`
    : "Shared Reading List";

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortKey);
    // keep current page but the memoized sortedItems will change; visibleItems recalcs
    // Optionally reset to page 1 if you prefer:
    // setPage(1);
  };

  if (loadingList) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <ItemRowsShimmerBlock count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </div>
      </div>
    );
  }

  if (!list) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={`Shared list: ${list.name}`} />
        <meta name="robots" content="noindex,follow" />
      </Helmet>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-5 overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_30%),linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.95))] px-6 py-7 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] dark-theme-shell sm:px-8">
        <div className="min-w-0 max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
            Shared reading list
          </p>
          <h1 className="mt-3 truncate text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {list.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-inset ring-emerald-100"
            title="This list is public"
          >
            Public
          </span>
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
            {totalCount} {totalCount === 1 ? "title" : "titles"}
          </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Browse this shared collection with the same ranking and score context
            as the detail pages.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[180px] flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sort
            </label>
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark-theme-field dark:focus:ring-[#2a221c]"
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

          <button
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              alert("Link copied!");
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark-theme-card-soft dark:text-slate-200 dark:hover:bg-[#241d19]"
          >
            Copy Link
          </button>
        </div>
      </header>

      {list.items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center text-slate-600 shadow-sm dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(26,21,18,0.95),_rgba(19,16,13,0.95))] dark:text-slate-300">
          This list is empty.
        </div>
      ) : summariesLoading && Object.keys(summaries).length === 0 ? (
        <ItemRowsShimmerBlock count={Math.min(list.items.length, 8)} />
      ) : (
        <InfiniteScroll
          dataLength={visibleItems.length}
          next={loadMore}
          hasMore={hasMore}
          loader={
            // Only show the spinner while *actually* loading the next page or summaries for it
            summariesLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-4 border-gray-400 border-t-transparent rounded-full animate-spin dark:border-[#8d7b6d]" />
              </div>
            ) : null
          }
          endMessage={
            visibleItems.length > 0 ? (
              <p className="text-center py-3 text-gray-300 dark:text-slate-600">
                End of this list.
              </p>
            ) : null
          }
        >
          {visibleItems.length === 0 && summariesLoading ? (
            <ItemRowsShimmerBlock count={6} />
          ) : (
            <ul className="divide-y divide-slate-200/80 overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:divide-[#342a23] dark-theme-shell">
              {visibleItems.map((it) => {
                const s = summaries[it.series_id];
                const st = s?.status?.toUpperCase();
                const isLoading = summariesLoading && !s;
                const displayVoteCount = getDisplayVoteCount(
                  s?.vote_count,
                  it.series_id
                );

                return (
                <li key={it.series_id} className="px-4 py-4 sm:px-5">
                  <div className="grid gap-4 rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] transition hover:border-slate-300/80 hover:shadow-[0_24px_48px_-30px_rgba(15,23,42,0.62)] dark-theme-card dark:hover:border-[#4a3d33] sm:p-5 lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] lg:gap-5">
                    <Link
                      to={`/series/${it.series_id}`}
                      className="relative block overflow-hidden rounded-[26px] bg-slate-100 transition hover:scale-[1.01] dark:bg-[#241d19]"
                      title={s?.title || `Series #${it.series_id}`}
                    >
                      {isLoading ? (
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

                      {st ? (
                        <span
                          className={
                            "absolute bottom-3 left-3 inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] shadow-sm ring-1 ring-white/80 " +
                            statusClass(st)
                          }
                          title={st}
                          aria-label={`Status: ${st}`}
                        >
                          {st}
                        </span>
                      ) : null}
                    </Link>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-4">
                        <div className="min-w-0">
                          {isLoading ? (
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
                            {isLoading ? (
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
                                  className={`${statChipClass("accent")} ${(s?.final_score ?? 0) >= 8 ? "text-emerald-700 bg-emerald-50 ring-emerald-100" : (s?.final_score ?? 0) >= 7.5 ? "text-blue-700 bg-blue-50 ring-blue-100" : (s?.final_score ?? 0) >= 5 ? "text-amber-700 bg-amber-50 ring-amber-100" : "text-slate-500 bg-slate-100 ring-slate-200"}`}
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

                        {it.left_off_chapter ? (
                          <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_16px_34px_-32px_rgba(15,23,42,0.7)] dark-theme-card-soft dark:shadow-[0_16px_34px_-32px_rgba(0,0,0,0.8)]">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                                  Reading progress
                                </p>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                  Shared reading position for this title.
                                </p>
                              </div>
                              <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-200">
                                Ch. {it.left_off_chapter}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </InfiniteScroll>
      )}
    </div>
  );
}
