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
import {
  filterItemsByType,
  typeFilterOptions,
  type TypeFilter,
} from "../util/readingListFilters";

const PAGE_SIZE_ITEMS = 25;

type SortKey =
  | "DEFAULT"
  | "RANK_ASC"
  | "RANK_DESC"
  | "TITLE_ASC"
  | "TITLE_DESC";


type ShareLayout = "cards" | "poster" | "compact";

const layoutOptions: { value: ShareLayout; label: string; title: string }[] = [
  { value: "cards", label: "Cards", title: "Balanced share cards" },
  { value: "poster", label: "Poster wall", title: "Image-first screenshot grid" },
  { value: "compact", label: "Compact", title: "Dense title rows" },
];

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

  // pagination + sort + filter (client-side)
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("DEFAULT");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [layout, setLayout] = useState<ShareLayout>("cards");

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
        if (!cancelled) {
          setList(data);
          setTypeFilter("ALL");
        }
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

  // A type filter can only be applied to items whose summary (and therefore
  // `type`) we already hold, so a filtered view needs summaries for the whole
  // list rather than just the visible slice.
  const isFiltered = typeFilter !== "ALL";
  const typesResolved = useMemo(() => {
    if (!list) return false;
    return list.items.every((it) => summaries[it.series_id]);
  }, [list, summaries]);

  const filteredItems = useMemo(
    () => filterItemsByType(sortedItems, summaries, typeFilter),
    [sortedItems, summaries, typeFilter]
  );

  const totalCount = list?.items.length ?? 0;
  const matchCount = filteredItems.length;
  const visibleItems = useMemo(
    () => filteredItems.slice(0, page * PAGE_SIZE_ITEMS),
    [filteredItems, page]
  );
  const hasMore = visibleItems.length < filteredItems.length;

  // ---- fetch summaries: visible slice normally, whole list when filtering ----
  useEffect(() => {
    if (!list) return;

    const scope = isFiltered ? list.items : visibleItems;
    const missingIds = scope
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
        setSummaries((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            if (r.status === "fulfilled") next[r.value.id] = r.value;
          });
          return next;
        });
      } finally {
        if (!cancelled) setSummariesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, page, sortedItems, isFiltered]);

  const loadMore = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  const pageTitle = list
    ? `${list.name} - Shared Reading List`
    : "Shared Reading List";

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortKey);
    setPage(1);
  };

  const handleLayoutChange = (nextLayout: ShareLayout) => {
    setLayout(nextLayout);
    setPage(1);
  };

  const handleTypeFilterChange = (nextFilter: TypeFilter) => {
    setTypeFilter(nextFilter);
    setPage(1);
  };

  const layoutGridClass =
    layout === "poster"
      ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
      : layout === "compact"
        ? "grid grid-cols-1 gap-3"
        : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

  const renderSharedItem = (
    it: PublicReadingList["items"][number],
    s: RankedSeries | undefined,
    isLoading: boolean
  ) => {
    const title = s?.title || `Series #${it.series_id}`;
    const status = s?.status?.toUpperCase();
    const type = s?.type || "Title";

    if (layout === "compact") {
      return (
        <Link
          key={it.series_id}
          to={`/series/${it.series_id}`}
          className="group grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-4 rounded-[22px] border border-slate-200 bg-white/90 p-3 shadow-[0_14px_32px_-28px_rgba(15,23,42,0.55)] transition hover:border-slate-300 hover:bg-white dark:border-[#342a23] dark:bg-[#15110f]/90 dark:hover:border-[#4a3d33]"
        >
          <div className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-[#241d19]">
            {isLoading ? (
              <ShimmerBox className="h-24 w-full rounded-2xl" />
            ) : s?.cover_url ? (
              <img
                src={s.cover_url}
                alt={title}
                className="h-24 w-full object-cover object-[center_18%]"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-24 items-center justify-center text-xs text-slate-400">
                -
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {s?.rank ? (
                <span className="rounded-full bg-slate-950/85 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-white/10">
                  #{s.rank}
                </span>
              ) : null}
              <span className={statChipClass("muted")}>{type}</span>
              {status ? (
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] " +
                    statusClass(status)
                  }
                >
                  {status}
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 truncate text-base font-semibold text-slate-950 transition group-hover:text-slate-700 dark:text-white dark:group-hover:text-slate-200">
              {isLoading ? "Loading title..." : title}
            </h2>
          </div>
        </Link>
      );
    }

    if (layout === "poster") {
      return (
        <Link
          key={it.series_id}
          to={`/series/${it.series_id}`}
          className="group relative block overflow-hidden rounded-[26px] bg-slate-100 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.65)] ring-1 ring-slate-200 transition hover:scale-[1.01] hover:ring-slate-300 dark:bg-[#241d19] dark:ring-[#342a23] dark:hover:ring-[#4a3d33]"
        >
          {isLoading ? (
            <ShimmerBox className="aspect-[2/3] w-full rounded-[26px]" />
          ) : s?.cover_url ? (
            <img
              src={s.cover_url}
              alt={title}
              className="aspect-[2/3] w-full object-cover object-[center_18%]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center text-xs text-slate-400">
              No cover
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-transparent p-3 pt-16">
            <h2 className="line-clamp-2 text-sm font-semibold leading-tight text-white">
              {isLoading ? "Loading title..." : title}
            </h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">
              {type}
            </p>
          </div>
          {s?.rank ? (
            <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold text-white ring-1 ring-white/40 backdrop-blur-sm">
              #{s.rank}
            </span>
          ) : null}
          {status ? (
            <span
              className={
                "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ring-1 ring-white/50 " +
                statusClass(status)
              }
            >
              {status}
            </span>
          ) : null}
        </Link>
      );
    }

    return (
      <Link
        key={it.series_id}
        to={`/series/${it.series_id}`}
        className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.55)] transition hover:border-slate-300 hover:bg-white dark:border-[#342a23] dark:bg-[#15110f]/90 dark:hover:border-[#4a3d33]"
      >
        <div className="relative overflow-hidden bg-slate-100 dark:bg-[#241d19]">
          {isLoading ? (
            <ShimmerBox className="aspect-[2/3] w-full" />
          ) : s?.cover_url ? (
            <img
              src={s.cover_url}
              alt={title}
              className="aspect-[2/3] w-full object-cover object-[center_18%]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center text-xs text-slate-400">
              No cover
            </div>
          )}
          {s?.rank ? (
            <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold text-white ring-1 ring-white/50 backdrop-blur-sm">
              #{s.rank}
            </span>
          ) : null}
          {status ? (
            <span
              className={
                "absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ring-1 ring-white/70 " +
                statusClass(status)
              }
            >
              {status}
            </span>
          ) : null}
        </div>
        <div className="p-4">
          <h2 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-950 transition group-hover:text-slate-700 dark:text-white dark:group-hover:text-slate-200">
            {isLoading ? "Loading title..." : title}
          </h2>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
            {type}
          </p>
        </div>
      </Link>
    );
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
              {isFiltered && typesResolved
                ? `${matchCount} of ${totalCount} ${
                    totalCount === 1 ? "title" : "titles"
                  }`
                : `${totalCount} ${totalCount === 1 ? "title" : "titles"}`}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            A clean, shareable view of this collection. Switch layouts when you
            want a screenshot-ready version for other platforms.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[180px] flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Sort
            </label>
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-[#3a3028] dark:bg-[#15110f] dark:text-slate-100 dark:[color-scheme:dark] dark:focus:border-[#4a3d33] dark:focus:ring-[#2a221c]"
            >
              <option value="DEFAULT">Default list order</option>
              <option value="RANK_ASC">Rank: highest first</option>
              <option value="RANK_DESC">Rank: lowest first</option>
              <option value="TITLE_ASC">Title A-Z</option>
              <option value="TITLE_DESC">Title Z-A</option>
            </select>
          </div>

          <div className="flex min-w-[250px] flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Type
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-[#3a3028] dark:bg-[#15110f]">
              {typeFilterOptions.map((option) => {
                const active = typeFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleTypeFilterChange(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-slate-950 text-white shadow-sm dark:bg-blue-600"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-[#241d19] dark:hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-[250px] flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Layout
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-[#3a3028] dark:bg-[#15110f]">
              {layoutOptions.map((option) => {
                const active = layout === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.title}
                    aria-pressed={active}
                    onClick={() => handleLayoutChange(option.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-slate-950 text-white shadow-sm dark:bg-blue-600"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-[#241d19] dark:hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
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
      ) : isFiltered && !typesResolved ? (
        // Still loading the types we need before we can filter the full list.
        <ItemRowsShimmerBlock count={Math.min(list.items.length, 8)} />
      ) : isFiltered && matchCount === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center text-slate-600 shadow-sm dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(26,21,18,0.95),_rgba(19,16,13,0.95))] dark:text-slate-300">
          No{" "}
          {typeFilterOptions.find((o) => o.value === typeFilter)?.label ??
            "matching"}{" "}
          titles in this list.
        </div>
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
            <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white/70 p-4 pb-10 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-[#342a23] dark:bg-[#100d0b]/80 sm:p-5 sm:pb-11">
              <div className={layoutGridClass}>
                {visibleItems.map((it) => {
                  const s = summaries[it.series_id];
                  const isLoading = summariesLoading && !s;
                  return renderSharedItem(it, s, isLoading);
                })}
              </div>
              <span className="pointer-events-none absolute bottom-3 right-4 select-none text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400/60 dark:text-slate-500/45">
                toonranks.com
              </span>
            </section>
          )}
        </InfiniteScroll>
      )}
    </div>
  );
}
