import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { UsersIcon } from "@heroicons/react/24/outline";
import { UserIcon } from "lucide-react";
import { getSeriesDetailById } from "../api/manApi";
import { useTheme } from "../components/useTheme";
import type { SeriesDetailData } from "../types/types";
import {
  getDisplayVoteCount,
  getDisplayVoteCounts,
} from "../util/displayVoteCounts";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";

type CompareItem = {
  id: number;
  title: string;
  genre?: string;
  type?: string;
  author?: string;
  artist?: string;
  final_score?: number;
  cover_url?: string;
  rank?: number | string;
  vote_count?: number;
  status?: string;
};

type RatingLabel =
  | "Story"
  | "Characters"
  | "World Building"
  | "Art"
  | "Drama / Fighting";

type ComparisonRow = {
  label: string;
  values: string[];
  compareValues?: (string | number | null | undefined)[];
};

const ratingLabels: RatingLabel[] = [
  "Story",
  "Characters",
  "World Building",
  "Art",
  "Drama / Fighting",
];

const labelKeyMap: Record<RatingLabel, string> = {
  Story: "story",
  Characters: "characters",
  "World Building": "worldbuilding",
  Art: "art",
  "Drama / Fighting": "drama_or_fight",
};

const shellCardClass =
  "overflow-hidden rounded-[30px] border border-slate-200 bg-white/95 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] dark-theme-shell";

function statusClass(status?: string) {
  switch ((status || "").toUpperCase()) {
    case "ONGOING":
      return "bg-green-500 text-white";
    case "COMPLETE":
      return "bg-blue-600 text-white";
    case "HIATUS":
      return "bg-amber-500 text-white";
    case "SEASON_END":
      return "bg-purple-600 text-white";
    case "UNKNOWN":
    default:
      return "bg-slate-400 text-white";
  }
}

function compareText(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
) {
  if (a == null && b == null) return "Tie";
  if (a == null) return "Series 2";
  if (b == null) return "Series 1";
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return "Tie";
    return a > b ? "Series 1" : "Series 2";
  }
  const left = String(a).toLowerCase();
  const right = String(b).toLowerCase();
  if (left === right) return "Tie";
  return left < right ? "Series 1" : "Series 2";
}

function formatCategoryScore(detail: SeriesDetailData, label: RatingLabel) {
  const key = labelKeyMap[label];
  const total = detail[`${key}_total` as keyof SeriesDetailData] as number;
  const count = detail[`${key}_count` as keyof SeriesDetailData] as number;
  if (!count) return null;
  return total / count;
}

function formatScore(score?: number | null) {
  if (score == null || Number.isNaN(score)) return "-";
  return Number(score).toFixed(1);
}

function hasAniListMetrics(detail?: SeriesDetailData) {
  return (
    detail?.external_source?.toUpperCase() === "ANILIST" &&
    (detail.external_score != null || detail.external_popularity != null)
  );
}

function ComparisonLoading() {
  return (
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 p-4 dark-theme-card"
        >
          <div className="h-64 rounded-[24px] bg-slate-200 dark:bg-[#2b241f]" />
          <div className="mt-4 h-6 w-3/4 rounded-full bg-slate-200 dark:bg-[#2b241f]" />
          <div className="mt-2 h-4 w-1/2 rounded-full bg-slate-200 dark:bg-[#2b241f]" />
          <div className="mt-5 space-y-2">
            {Array.from({ length: 4 }).map((__, lineIndex) => (
              <div
                key={lineIndex}
                className="h-12 rounded-2xl bg-slate-100 dark:bg-[#241d19]"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <section className={`${shellCardClass} px-6 py-12 text-center sm:px-10`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        Compare
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
        Pick at least two series to compare.
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
        Head back to the rankings, tap Compare on the titles you want, and we
        will line up their scores and category breakdowns here.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark-theme-card-soft dark:text-slate-100 dark:hover:bg-[#241d19]"
      >
        Back to rankings
      </Link>
    </section>
  );
}

function ComparePage() {
  const { theme } = useTheme();
  const location = useLocation();
  const { items = [] } = (location.state || {}) as { items?: CompareItem[] };
  const [details, setDetails] = useState<SeriesDetailData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const fetchDetails = async () => {
      if (!items.length) return;
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(
          items.map((item) => getSeriesDetailById(item.id)),
        );
        if (!ignore) setDetails(results);
      } catch {
        if (!ignore) {
          setError("We could not load the comparison details right now.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      ignore = true;
    };
  }, [items]);

  const comparedCount = items.length;
  const isHeadToHead = comparedCount === 2;
  const visualCompareMinWidth =
    comparedCount <= 2 ? 0 : comparedCount === 3 ? 720 : 920;
  const displayTotalVotes = useMemo(
    () =>
      items.map(
        (item) => getDisplayVoteCount(item.vote_count, item.id) ?? null,
      ),
    [items],
  );

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    if (details.length !== items.length || !items.length) return [];

    const baseRows = [
      {
        label: "Type",
        values: items.map((item) => item.type || "-"),
      },
      {
        label: "Genre",
        values: items.map((item) => item.genre || "-"),
      },
      {
        label: "Author",
        values: details.map(
          (detail, index) => detail.author || items[index]?.author || "-",
        ),
      },
      {
        label: "Artist",
        values: details.map(
          (detail, index) => detail.artist || items[index]?.artist || "-",
        ),
      },
      {
        label: "Overall rating",
        values: items.map((item) => formatScore(item.final_score)),
      },
      {
        label: "Total votes",
        values: displayTotalVotes.map((count) =>
          count != null ? String(count) : "-",
        ),
      },
    ];

    const anilistScores = details.map((detail) =>
      detail.external_source?.toUpperCase() === "ANILIST"
        ? detail.external_score
        : null,
    );
    const anilistPopularity = details.map((detail) =>
      detail.external_source?.toUpperCase() === "ANILIST"
        ? detail.external_popularity
        : null,
    );
    const externalRows: ComparisonRow[] = [];

    if (anilistScores.some((score) => score != null)) {
      externalRows.push({
        label: "AniList score",
        values: anilistScores.map((score) =>
          score != null ? `${score}%` : "-",
        ),
        compareValues: anilistScores,
      });
    }

    if (anilistPopularity.some((popularity) => popularity != null)) {
      externalRows.push({
        label: "AniList popularity",
        values: anilistPopularity.map((popularity) =>
          popularity != null ? popularity.toLocaleString() : "-",
        ),
        compareValues: anilistPopularity,
      });
    }

    const categoryRows = ratingLabels.map((label) => ({
      label,
      values: details.map((detail, index) => {
        const score = formatCategoryScore(detail, label);
        const counts = getDisplayVoteCounts(
          detail.vote_counts || {},
          items[index].id,
        );
        const voteCount = counts[label];
        if (score == null) return "-";
        return `${score.toFixed(1)}/10${voteCount ? `  ${voteCount} votes` : ""}`;
      }),
    }));

    return [...baseRows, ...externalRows, ...categoryRows];
  }, [details, displayTotalVotes, items]);

  const matrixHeaderStyle =
    theme === "dark"
      ? {
          background:
            "linear-gradient(180deg, rgba(38,31,27,0.98), rgba(30,24,21,0.96))",
        }
      : undefined;

  const matrixValueClass = (label: string) =>
    label === "Overall rating" || label.startsWith("AniList")
      ? "text-sm leading-6 font-semibold text-blue-600 dark:text-blue-300"
      : "text-sm leading-6 text-slate-700 dark:text-stone-200";

  return (
    <div className="mx-auto w-full max-w-7xl px-3 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8">
      <NoIndexSeo title={`Compare | ${SITE_NAME}`} />
      <section className={`${shellCardClass} px-4 py-5 sm:px-7 sm:py-7`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              Compare board
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Line up your top picks side by side.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              Compare artwork, overall score, and reader category ratings in one
              place so it is easier to see where each series stands out.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
              {comparedCount} {comparedCount === 1 ? "title" : "titles"}{" "}
              selected
            </span>
            <Link
              to="/"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark-theme-card-soft dark:text-slate-100 dark:hover:bg-[#241d19]"
            >
              Back to rankings
            </Link>
          </div>
        </div>
      </section>

      {!items.length ? (
        <div className="mt-6">
          <EmptyState />
        </div>
      ) : (
        <>
          {error ? (
            <section
              className={`${shellCardClass} mt-6 px-5 py-5 text-sm text-red-700 dark:text-red-300`}
            >
              {error}
            </section>
          ) : null}

          <section className="mt-6">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Selected titles
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Quick visual comparison
              </h2>
            </div>

            {loading && details.length === 0 ? (
              <ComparisonLoading />
            ) : (
              <div className="overflow-x-auto pb-2">
                <div
                  className={
                    comparedCount === 2
                      ? "grid gap-5 sm:grid-cols-2"
                      : "grid gap-5"
                  }
                  style={
                    comparedCount === 2
                      ? undefined
                      : {
                          minWidth: visualCompareMinWidth
                            ? `${visualCompareMinWidth}px`
                            : undefined,
                          gridTemplateColumns: `repeat(${items.length}, minmax(220px, 1fr))`,
                        }
                  }
                >
                  {items.map((item, index) => {
                    const detail = details[index];
                    const showAniListMetrics = hasAniListMetrics(detail);
                    const displayCounts = detail
                      ? getDisplayVoteCounts(detail.vote_counts || {}, item.id)
                      : {};

                    return (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_22px_55px_-40px_rgba(15,23,42,0.45)] dark-theme-card"
                      >
                        <Link
                          to={`/series/${item.id}`}
                          state={{
                            title: item.title,
                            genre: item.genre,
                            type: item.type,
                            author: item.author,
                            artist: item.artist,
                          }}
                          className="group block"
                        >
                          <div className="relative overflow-hidden">
                            {item.cover_url ? (
                              <img
                                src={item.cover_url}
                                alt={item.title}
                                className="h-72 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="flex h-72 w-full items-center justify-center bg-slate-100 text-sm text-slate-400 dark:bg-[#241d19] dark:text-slate-500">
                                No cover
                              </div>
                            )}

                            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-black/75 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/70">
                                {typeof item.rank === "number"
                                  ? `#${item.rank}`
                                  : "#-"}
                              </span>
                              {item.status ? (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] shadow-sm ${statusClass(
                                    item.status,
                                  )}`}
                                >
                                  {item.status.replace("_", " ")}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </Link>

                        <div className="space-y-4 p-4">
                          <div>
                            <Link
                              to={`/series/${item.id}`}
                              state={{
                                title: item.title,
                                genre: item.genre,
                                type: item.type,
                                author: item.author,
                                artist: item.artist,
                              }}
                              className="line-clamp-2 text-xl font-semibold tracking-tight text-slate-950 transition hover:text-blue-600 dark:text-white dark:hover:text-blue-300"
                            >
                              {item.title}
                            </Link>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {item.type ? (
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-[linear-gradient(145deg,_rgba(34,47,83,0.82),_rgba(24,31,55,0.82))] dark:text-blue-200 dark:ring-[#475276]">
                                  {item.type}
                                </span>
                              ) : null}
                              {item.genre ? (
                                <span className="inline-block max-w-full whitespace-normal rounded-[24px] bg-blue-50 px-3.5 py-2 text-xs font-medium leading-5 text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-[linear-gradient(145deg,_rgba(34,47,83,0.82),_rgba(24,31,55,0.82))] dark:text-blue-200 dark:ring-[#475276]">
                                  {item.genre}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark-theme-card-soft">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Overall
                              </p>
                              <p className="mt-1 text-2xl font-semibold tracking-tight text-blue-600 dark:text-blue-300">
                                {formatScore(item.final_score)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark-theme-card-soft">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Votes
                              </p>
                              <div className="mt-1 flex items-center gap-1.5 text-lg font-semibold text-slate-900 dark:text-white">
                                {displayTotalVotes[index] &&
                                displayTotalVotes[index]! > 1 ? (
                                  <UsersIcon className="h-4 w-4 text-blue-400" />
                                ) : (
                                  <UserIcon className="h-4 w-4 text-blue-400" />
                                )}
                                {displayTotalVotes[index] ?? "-"}
                              </div>
                            </div>
                          </div>

                          {showAniListMetrics ? (
                            <div className="rounded-[22px] border border-blue-100 bg-blue-50/80 px-4 py-3.5 shadow-[0_16px_32px_-28px_rgba(37,99,235,0.65)] dark:border-[#30405f] dark:bg-[linear-gradient(145deg,_rgba(24,34,58,0.82),_rgba(18,25,42,0.82))]">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
                                  External context
                                </p>
                                {detail?.external_url ? (
                                  <a
                                    href={detail.external_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-semibold text-blue-700 hover:underline dark:text-blue-300"
                                  >
                                    Source: AniList
                                  </a>
                                ) : (
                                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                                    Source: AniList
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-3">
                                {detail?.external_score != null ? (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                      AniList score
                                    </p>
                                    <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                                      {detail.external_score}%
                                    </p>
                                  </div>
                                ) : null}
                                {detail?.external_popularity != null ? (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                                      Popularity
                                    </p>
                                    <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                                      {detail.external_popularity.toLocaleString()}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}

                          <div className="grid gap-2.5">
                            {ratingLabels.map((label) => {
                              const score = detail
                                ? formatCategoryScore(detail, label)
                                : null;
                              const voteCount = displayCounts[label];
                              return (
                                <div
                                  key={label}
                                  className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm dark-theme-card-soft"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {label}
                                      </p>
                                      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                                        {score == null
                                          ? "-"
                                          : `${score.toFixed(1)}/10`}
                                      </p>
                                    </div>
                                    {voteCount !== undefined ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
                                        {voteCount > 1 ? (
                                          <UsersIcon className="h-3.5 w-3.5 text-blue-400" />
                                        ) : (
                                          <UserIcon className="h-3.5 w-3.5 text-blue-400" />
                                        )}
                                        {voteCount}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {comparisonRows.length > 0 ? (
            <section className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white/95 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] dark-theme-shell">
              <div className="border-b border-slate-200/80 px-5 py-5 dark:border-[#342a23] sm:px-6">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Comparison matrix
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                      Side-by-side breakdown
                    </h2>
                  </div>
                  {isHeadToHead ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Two-series view makes it easier to spot the edge in each
                      category.
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Scroll across on smaller screens to compare every column
                      cleanly.
                    </p>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <div
                  className="grid min-w-[760px] bg-white dark:bg-transparent"
                  style={{
                    gridTemplateColumns: `minmax(180px, 220px) repeat(${items.length}, minmax(220px, 1fr))`,
                  }}
                >
                  <div
                    className="border-b border-r border-slate-200/80 bg-slate-50/90 px-5 py-4 dark:border-[#342a23]"
                    style={matrixHeaderStyle}
                  />
                  {items.map((item) => (
                    <div
                      key={`head-${item.id}`}
                      className="border-b border-slate-200/80 bg-slate-50/90 px-5 py-4 dark:border-[#342a23]"
                      style={matrixHeaderStyle}
                    >
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-stone-100">
                        {item.title}
                      </p>
                    </div>
                  ))}

                  {comparisonRows.map((row) => (
                    <Fragment key={row.label}>
                      <div className="border-b border-r border-slate-200/80 bg-white px-5 py-4 dark:border-[#342a23] dark-theme-card-soft">
                        <p className="text-sm font-semibold text-slate-700 dark:text-stone-200">
                          {row.label}
                        </p>
                        {isHeadToHead ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">
                            {compareText(
                              row.compareValues
                                ? row.compareValues[0]
                                : row.values[0],
                              row.compareValues
                                ? row.compareValues[1]
                                : row.values[1],
                            )}
                          </p>
                        ) : null}
                      </div>
                      {row.values.map((value, index) => (
                        <div
                          key={`${row.label}-${items[index].id}`}
                          className="border-b border-slate-200/80 bg-white px-5 py-4 dark:border-[#342a23] dark-theme-card"
                        >
                          <p className={matrixValueClass(row.label)}>{value}</p>
                        </div>
                      ))}
                    </Fragment>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

export default ComparePage;
