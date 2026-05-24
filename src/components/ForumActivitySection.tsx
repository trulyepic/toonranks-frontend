import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ForumThread, ForumPost, Paginated } from "../api/manApi";
import { getMyForumThreads, getMyForumPosts, getMyForumVotes } from "../api/manApi";
import { mdToPlainText } from "../util/strings";

type Tab = "threads" | "posts" | "votes";

const PAGE_SIZE = 10;

function truncate(text: string, max = 140): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

function TabShell({
  loading,
  error,
  empty,
  emptyMessage,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyMessage: string;
  children?: React.ReactNode;
}) {
  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        Loading…
      </p>
    );
  }
  if (error) {
    return (
      <p className="py-8 text-center text-sm text-red-500 dark:text-red-400">
        {error}
      </p>
    );
  }
  if (empty) {
    return (
      <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        {emptyMessage}
      </p>
    );
  }
  return <div className="space-y-3">{children}</div>;
}

export function ForumActivitySection() {
  const [tab, setTab] = useState<Tab>("threads");

  // Threads
  const [threadsData, setThreadsData] = useState<Paginated<ForumThread> | null>(null);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [threadsPage, setThreadsPage] = useState(1);

  // Posts (replies)
  const [postsData, setPostsData] = useState<Paginated<ForumPost> | null>(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postsPage, setPostsPage] = useState(1);

  // Votes
  const [votesData, setVotesData] = useState<Paginated<ForumPost> | null>(null);
  const [votesLoading, setVotesLoading] = useState(true);
  const [votesError, setVotesError] = useState<string | null>(null);
  const [votesPage, setVotesPage] = useState(1);

  // Fetch all three on mount so counts are always visible in every tab pill.
  // Re-fetch the relevant tab when its page changes (page > 1 guard avoids
  // a duplicate fetch since mount already loaded page 1).
  useEffect(() => {
    let cancelled = false;
    setThreadsLoading(true);
    setPostsLoading(true);
    setVotesLoading(true);
    getMyForumThreads(1, PAGE_SIZE)
      .then((d) => { if (!cancelled) { setThreadsData(d); setThreadsLoading(false); } })
      .catch(() => { if (!cancelled) { setThreadsError("Could not load threads. Try again in a moment."); setThreadsLoading(false); } });
    getMyForumPosts(1, PAGE_SIZE)
      .then((d) => { if (!cancelled) { setPostsData(d); setPostsLoading(false); } })
      .catch(() => { if (!cancelled) { setPostsError("Could not load replies. Try again in a moment."); setPostsLoading(false); } });
    getMyForumVotes(1, PAGE_SIZE)
      .then((d) => { if (!cancelled) { setVotesData(d); setVotesLoading(false); } })
      .catch(() => { if (!cancelled) { setVotesError("Could not load votes. Try again in a moment."); setVotesLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (threadsPage === 1) return; // already loaded by mount effect
    let cancelled = false;
    setThreadsLoading(true);
    setThreadsError(null);
    getMyForumThreads(threadsPage, PAGE_SIZE)
      .then((data) => { if (!cancelled) { setThreadsData(data); setThreadsLoading(false); } })
      .catch(() => { if (!cancelled) { setThreadsError("Could not load threads. Try again in a moment."); setThreadsLoading(false); } });
    return () => { cancelled = true; };
  }, [threadsPage]);

  useEffect(() => {
    if (postsPage === 1) return;
    let cancelled = false;
    setPostsLoading(true);
    setPostsError(null);
    getMyForumPosts(postsPage, PAGE_SIZE)
      .then((data) => { if (!cancelled) { setPostsData(data); setPostsLoading(false); } })
      .catch(() => { if (!cancelled) { setPostsError("Could not load replies. Try again in a moment."); setPostsLoading(false); } });
    return () => { cancelled = true; };
  }, [postsPage]);

  useEffect(() => {
    if (votesPage === 1) return;
    let cancelled = false;
    setVotesLoading(true);
    setVotesError(null);
    getMyForumVotes(votesPage, PAGE_SIZE)
      .then((data) => { if (!cancelled) { setVotesData(data); setVotesLoading(false); } })
      .catch(() => { if (!cancelled) { setVotesError("Could not load votes. Try again in a moment."); setVotesLoading(false); } });
    return () => { cancelled = true; };
  }, [votesPage]);

  const tabConfig: { key: Tab; label: string; count: number | undefined; loading: boolean }[] = [
    { key: "threads", label: "Threads", count: threadsData?.total, loading: threadsLoading && threadsData === null },
    { key: "posts", label: "Replies", count: postsData?.total, loading: postsLoading && postsData === null },
    { key: "votes", label: "Votes", count: votesData?.total, loading: votesLoading && votesData === null },
  ];

  return (
    <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark-theme-card">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">
          Forum activity
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Your threads, replies, and votes across the community.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabConfig.map(({ key, label, count, loading }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
              tab === key
                ? "border-slate-900 bg-slate-900 text-white dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#342b24] dark:text-slate-400 dark:hover:bg-[#241d19]",
            ].join(" ")}
          >
            {label}
            {loading ? " (…)" : count !== undefined ? ` (${count})` : ""}
          </button>
        ))}
      </div>

      {/* Threads tab */}
      {tab === "threads" && (
        <TabShell
          loading={threadsLoading}
          error={threadsError}
          empty={threadsData !== null && threadsData.total === 0}
          emptyMessage="You haven't created any threads yet."
        >
          {threadsData?.items.map((t) => (
            <div
              key={t.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-[#342b24] dark:bg-[#181310]"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  to={`/forum/${t.id}`}
                  className="block text-sm font-semibold text-slate-900 hover:underline dark:text-stone-100"
                >
                  {t.title}
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.post_count} {t.post_count === 1 ? "post" : "posts"} · updated{" "}
                  {shortDate(t.updated_at)}
                </p>
              </div>
              {t.locked ? (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-950/35 dark:text-amber-300">
                  Locked
                </span>
              ) : null}
            </div>
          ))}
          {threadsData && (
            <MiniPager
              page={threadsData.page}
              totalPages={threadsData.total_pages}
              hasPrev={threadsData.has_prev}
              hasNext={threadsData.has_next}
              onGo={setThreadsPage}
            />
          )}
        </TabShell>
      )}

      {/* Posts tab */}
      {tab === "posts" && (
        <TabShell
          loading={postsLoading}
          error={postsError}
          empty={postsData !== null && postsData.total === 0}
          emptyMessage="You haven't written any replies yet."
        >
          {postsData?.items.map((p) => (
            <div
              key={p.id}
              className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-[#342b24] dark:bg-[#181310]"
            >
              <p className="text-sm leading-relaxed text-slate-700 dark:text-stone-200">
                {truncate(mdToPlainText(p.content_markdown))}
              </p>
              {p.series_refs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {p.series_refs.map((s) => (
                    <Link
                      key={s.series_id}
                      to={`/series/${s.series_id}`}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 dark:bg-[#241d19] dark:text-slate-400 dark:hover:bg-[#2e2419]"
                    >
                      {s.title ?? `#${s.series_id}`}
                    </Link>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {shortDate(p.created_at)}
                </p>
                {p.thread_id ? (
                  <Link
                    to={`/forum/${p.thread_id}#post-${p.id}`}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    View thread →
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
          {postsData && (
            <MiniPager
              page={postsData.page}
              totalPages={postsData.total_pages}
              hasPrev={postsData.has_prev}
              hasNext={postsData.has_next}
              onGo={setPostsPage}
            />
          )}
        </TabShell>
      )}

      {/* Votes tab */}
      {tab === "votes" && (
        <TabShell
          loading={votesLoading}
          error={votesError}
          empty={votesData !== null && votesData.total === 0}
          emptyMessage="You haven't voted on any posts yet."
        >
          {votesData?.items.map((p) => (
            <div
              key={p.id}
              className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-[#342b24] dark:bg-[#181310]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="flex-1 text-sm leading-relaxed text-slate-700 dark:text-stone-200">
                  {truncate(mdToPlainText(p.content_markdown))}
                </p>
                {p.viewer_vote ? (
                  <span
                    className={[
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      p.viewer_vote === "UPVOTE"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
                    ].join(" ")}
                  >
                    {p.viewer_vote === "UPVOTE" ? "↑ Up" : "↓ Down"}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {shortDate(p.created_at)}
                </p>
                {p.thread_id ? (
                  <Link
                    to={`/forum/${p.thread_id}#post-${p.id}`}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    View thread →
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
          {votesData && (
            <MiniPager
              page={votesData.page}
              totalPages={votesData.total_pages}
              hasPrev={votesData.has_prev}
              hasNext={votesData.has_next}
              onGo={setVotesPage}
            />
          )}
        </TabShell>
      )}
    </div>
  );
}
