import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  getLeaderboard,
  type LeaderboardUser,
  type LeaderboardPageOut,
} from "../api/manApi";
import UserAvatar from "../components/UserAvatar";
import { inlineUsernameClassName } from "../util/userDisplay";
import { SITE_NAME } from "../config/site";

const PAGE_SIZE = 50;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCP(n: number): string {
  return n.toLocaleString();
}

// ── Top 3 card ────────────────────────────────────────────────────────────────

function RankerSpotlightCard({
  user,
  position,
}: {
  user: LeaderboardUser;
  position: 1 | 2 | 3;
}) {
  const isFirst = position === 1;

  const wrapperCls = [
    "relative flex flex-col items-center gap-3 rounded-[2rem] border text-center transition-all",
    isFirst
      ? "px-5 pb-5 pt-10 border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-[0_0_48px_rgba(251,191,36,0.10)] ring-1 ring-amber-200 sm:scale-[1.05] dark:border-amber-400/50 dark:from-amber-950/20 dark:to-[#1b1612] dark:shadow-[0_0_48px_rgba(251,191,36,0.12)] dark:ring-amber-400/25"
      : position === 2
      ? "p-5 border-slate-200 bg-white ring-1 ring-slate-200/80 dark:border-[#342b24] dark:bg-[#1b1612] dark:ring-slate-400/15"
      : "p-5 border-amber-100 bg-white ring-1 ring-amber-100 dark:border-[#342b24] dark:bg-[#1b1612] dark:ring-amber-900/15",
  ].join(" ");

  const rankCls = [
    "absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-black tracking-wide",
    isFirst
      ? "bg-amber-400 text-amber-950"
      : position === 2
      ? "bg-slate-300 text-slate-800"
      : "bg-amber-800 text-amber-100",
  ].join(" ");

  const cpCls = isFirst
    ? "text-amber-500 dark:text-amber-400"
    : "text-amber-600 dark:text-amber-600/70";

  const avatarRingCls = isFirst
    ? "ring-amber-400/60"
    : position === 2
    ? "ring-slate-400/40"
    : "ring-amber-800/40";

  return (
    <Link to={`/user/${user.username}`} className={wrapperCls}>
      <span className={rankCls}>#{position}</span>

      <UserAvatar
        username={user.username}
        avatarUrl={user.avatar_url}
        avatarPreset={user.avatar_preset}
        size="xl"
        className={`h-16 w-16 shrink-0 text-2xl ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1b1612] ${avatarRingCls}`}
      />

      <div className="min-w-0 w-full">
        <p
          className={`truncate text-sm font-black sm:text-base ${inlineUsernameClassName(user.role)}`}
        >
          {user.username}
        </p>
        <p className={`mt-1 text-lg font-black sm:text-xl ${cpCls}`}>
          ◆ {formatCP(user.cred_score)}{" "}
          <span className="text-xs font-semibold opacity-75">CP</span>
        </p>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
          {user.post_count.toLocaleString()} {user.post_count === 1 ? "post" : "posts"}
          {user.series_rated > 0 && (
            <> · {user.series_rated.toLocaleString()} rated</>
          )}
        </p>
      </div>
    </Link>
  );
}

// ── Ranking list row ──────────────────────────────────────────────────────────

function RankerRow({ user }: { user: LeaderboardUser }) {
  return (
    <Link
      to={`/user/${user.username}`}
      className="flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-[#1e1712]"
    >
      {/* Rank number */}
      <span className="w-8 shrink-0 text-right text-sm font-bold text-slate-400 dark:text-slate-600">
        #{user.rank}
      </span>

      {/* Avatar */}
      <UserAvatar
        username={user.username}
        avatarUrl={user.avatar_url}
        avatarPreset={user.avatar_preset}
        size="sm"
        className="h-8 w-8 shrink-0 text-sm"
      />

      {/* Username */}
      <span
        className={`min-w-0 flex-1 truncate text-sm font-semibold ${inlineUsernameClassName(user.role)}`}
      >
        {user.username}
      </span>

      {/* Cred Points */}
      <span className="shrink-0 text-sm font-bold text-amber-500 dark:text-amber-400">
        ◆ {formatCP(user.cred_score)}{" "}
        <span className="text-xs font-semibold opacity-70">CP</span>
      </span>

      {/* Series rated */}
      <span className="hidden w-20 shrink-0 text-right text-xs text-slate-400 dark:text-slate-600 sm:block">
        {user.series_rated.toLocaleString()} rated
      </span>

      {/* Post count */}
      <span className="hidden w-20 shrink-0 text-right text-xs text-slate-400 dark:text-slate-600 sm:block">
        {user.post_count.toLocaleString()} {user.post_count === 1 ? "post" : "posts"}
      </span>
    </Link>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Top 3 skeleton */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[2, 1, 3].map((pos) => (
          <div
            key={pos}
            className={`flex flex-col items-center gap-3 rounded-[2rem] border border-slate-200 p-5 dark:border-[#342b24] ${
              pos === 1 ? "sm:scale-[1.05]" : ""
            }`}
          >
            <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-[#2e2520]" />
            <div className="h-4 w-24 rounded bg-slate-200 dark:bg-[#2e2520]" />
            <div className="h-5 w-16 rounded bg-slate-200 dark:bg-[#2e2520]" />
          </div>
        ))}
      </div>
      {/* List skeleton */}
      <div className="rounded-[2rem] border border-slate-200 dark:border-[#342b24]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 last:border-0 dark:border-[#2a221c]"
          >
            <div className="h-4 w-8 rounded bg-slate-200 dark:bg-[#2e2520]" />
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-[#2e2520]" />
            <div className="h-4 flex-1 rounded bg-slate-200 dark:bg-[#2e2520]" />
            <div className="h-4 w-20 rounded bg-slate-200 dark:bg-[#2e2520]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [result, setResult] = useState<LeaderboardPageOut | null>(null);
  const [topThree, setTopThree] = useState<LeaderboardUser[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(page, PAGE_SIZE)
      .then((data) => {
        setResult(data);
        if (page === 1) setTopThree(data.items.slice(0, 3));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  // On page 1 the list starts at rank #4; other pages show everything
  const listItems = result
    ? page === 1
      ? result.items.slice(3)
      : result.items
    : [];

  const totalPages = result?.total_pages ?? 1;
  const total = result?.total ?? 0;

  // Top 3 arranged as: [#2] [#1] [#3] so #1 is centred
  const orderedSpotlight: { user: LeaderboardUser; position: 1 | 2 | 3 }[] =
    topThree.length >= 3
      ? [
          { user: topThree[1], position: 2 },
          { user: topThree[0], position: 1 },
          { user: topThree[2], position: 3 },
        ]
      : topThree.map((u, i) => ({
          user: u,
          position: (i + 1) as 1 | 2 | 3,
        }));

  const pageTitle = `Rankers — ${SITE_NAME}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content={`See the top community contributors on ${SITE_NAME}, ranked by Cred Points earned through forum upvotes and series ratings.`}
        />
      </Helmet>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          Rankers
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Ranked by Cred Points — earned through community upvotes and series
          ratings
        </p>
        {!loading && total > 0 && (
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-600">
            {total.toLocaleString()} ranked {total === 1 ? "member" : "members"}
          </p>
        )}
      </div>

      {loading ? (
        <LeaderboardSkeleton />
      ) : total === 0 ? (
        /* ── Empty state ────────────────────────────────────────────────── */
        <div className="rounded-[2rem] border border-dashed border-slate-200 px-8 py-16 text-center dark:border-[#342b24]">
          <p className="text-4xl">◆</p>
          <p className="mt-4 text-base font-semibold text-slate-700 dark:text-slate-300">
            No Rankers yet
          </p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            Start posting and earning Cred Points.
          </p>
        </div>
      ) : (
        <>
          {/* ── Top 3 Spotlight ─────────────────────────────────────────── */}
          {page === 1 && topThree.length > 0 && (
            <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white px-6 py-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-[#342b24] dark:bg-[linear-gradient(145deg,rgba(27,22,18,0.98),rgba(20,16,13,0.97))] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)] sm:px-8 sm:py-10">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600">
                Top Rankers
              </p>
              <div className="grid grid-cols-3 items-end gap-3 sm:gap-5">
                {orderedSpotlight.map(({ user, position }) => (
                  <RankerSpotlightCard
                    key={user.username}
                    user={user}
                    position={position}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Rankings list ────────────────────────────────────────────── */}
          {listItems.length > 0 && (
            <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-[#342b24] dark:bg-[linear-gradient(145deg,rgba(27,22,18,0.98),rgba(20,16,13,0.97))] dark:shadow-[0_18px_50px_rgba(0,0,0,0.5)]">
              {/* List header */}
              <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-3 dark:border-[#2a221c]">
                <span className="w-8 shrink-0" />
                <span className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600">
                  Ranker
                </span>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600">
                  Cred Points
                </span>
                <span className="hidden w-20 shrink-0 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600 sm:block">
                  Rated
                </span>
                <span className="hidden w-20 shrink-0 text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-600 sm:block">
                  Posts
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#2a221c]">
                {listItems.map((user) => (
                  <RankerRow key={user.username} user={user} />
                ))}
              </div>
            </div>
          )}

          {/* ── Pagination ──────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#342b24] dark:text-slate-400 dark:hover:bg-[#1e1712]"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#342b24] dark:text-slate-400 dark:hover:bg-[#1e1712]"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
