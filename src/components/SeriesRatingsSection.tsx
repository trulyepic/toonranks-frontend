import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MySeriesVote, Paginated } from "../api/manApi";
import { getMySeriesVotes } from "../api/manApi";

const PAGE_SIZE = 10;

// Shorten long category names so they fit neatly in a pill
const SHORT_LABEL: Record<string, string> = {
  "World Building": "World",
  "Drama / Fighting": "Drama",
};

function scoreColor(score: number): string {
  if (score >= 8) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (score >= 6) return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
}

function MiniPager({
  page,
  totalPages,
  hasPrev,
  hasNext,
  onGo,
}: {
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onGo: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={() => onGo(page - 1)}
        disabled={!hasPrev}
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#342b24] dark:text-slate-400 dark:hover:bg-[#241d19]"
      >
        Prev
      </button>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onGo(page + 1)}
        disabled={!hasNext}
        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#342b24] dark:text-slate-400 dark:hover:bg-[#241d19]"
      >
        Next
      </button>
    </div>
  );
}

export function SeriesRatingsSection() {
  const [data, setData] = useState<Paginated<MySeriesVote> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMySeriesVotes(1, PAGE_SIZE)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Could not load ratings. Try again in a moment."); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Pagination
  useEffect(() => {
    if (page === 1) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMySeriesVotes(page, PAGE_SIZE)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError("Could not load ratings. Try again in a moment."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [page]);

  return (
    <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark-theme-card">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">
          Series ratings
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Every title you've rated, with the scores you gave each category.
        </p>
      </div>

      {loading && (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Loading…
        </p>
      )}

      {!loading && error && (
        <p className="py-8 text-center text-sm text-red-500 dark:text-red-400">
          {error}
        </p>
      )}

      {!loading && !error && data?.total === 0 && (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          You haven't rated any series yet.
        </p>
      )}

      {!loading && !error && data && data.total > 0 && (
        <div className="space-y-3">
          {data.items.map((item) => (
            <div
              key={item.series_id}
              className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-[#342b24] dark:bg-[#181310]"
            >
              {/* Cover thumbnail */}
              {item.cover_url ? (
                <Link to={`/series/${item.series_id}`} className="shrink-0">
                  <img
                    src={item.cover_url}
                    alt={item.title ?? "Series cover"}
                    className="h-16 w-11 rounded-lg object-cover"
                  />
                </Link>
              ) : (
                <div className="h-16 w-11 shrink-0 rounded-lg bg-slate-200 dark:bg-[#2e2419]" />
              )}

              {/* Title + scores */}
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <Link
                    to={`/series/${item.series_id}`}
                    className="block text-sm font-semibold text-slate-900 hover:underline dark:text-stone-100"
                  >
                    {item.title ?? `Series #${item.series_id}`}
                  </Link>
                  {item.type && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.type}
                      {item.status ? ` · ${item.status}` : ""}
                    </span>
                  )}
                </div>

                {/* Category score pills */}
                <div className="flex flex-wrap gap-1.5">
                  {item.votes.map((v) => (
                    <span
                      key={v.category}
                      className={[
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        scoreColor(v.score),
                      ].join(" ")}
                    >
                      {SHORT_LABEL[v.category] ?? v.category} {v.score}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <MiniPager
            page={data.page}
            totalPages={data.total_pages}
            hasPrev={data.has_prev}
            hasNext={data.has_next}
            onGo={setPage}
          />
        </div>
      )}
    </div>
  );
}
