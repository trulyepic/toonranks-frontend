import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchMyFollowing,
  fetchMyBookmarks,
  type ForumThread,
  type ForumPost,
} from "../api/manApi";
import { timeAgo } from "../util/timeAgo";

type PersonalView = "following" | "saved";

/**
 * The personalized forum views ("Following" + "Saved") shown to logged-in
 * users via the tabs on /forum. Reuses the existing follow/bookmark endpoints
 * (GET /forum/me/following, GET /forum/me/bookmarks) — purely a presentation
 * layer, no new backend. Public discovery stays the default forum landing.
 *
 * Client-only (rendered behind an auth gate), so no SSR/loader wiring needed.
 */
export default function ForumPersonalFeed({ view }: { view: PersonalView }) {
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        if (view === "following") {
          const res = await fetchMyFollowing(1, 20);
          if (!cancelled) setThreads(res.items);
        } else {
          const res = await fetchMyBookmarks(1, 20);
          if (!cancelled) setPosts(res.items);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [view]);

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 text-center text-sm text-rose-600 dark:text-rose-300">
        Could not load your{" "}
        {view === "following" ? "followed threads" : "saved posts"}. Please try
        again.
      </div>
    );
  }

  if (view === "following") {
    if (threads.length === 0) {
      return (
        <EmptyState
          title="No followed threads yet"
          body="Follow a thread to see it here. Open any thread and tap Follow to keep up with new replies."
        />
      );
    }

    return (
      <ul className="space-y-3">
        {threads.map((t) => (
          <li key={t.id}>
            <Link
              to={`/forum/${t.id}`}
              className="group block rounded-2xl border border-slate-200/80 bg-white px-4 py-3 transition hover:border-slate-300 hover:shadow-sm dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))]"
            >
              <div className="flex items-center gap-2">
                <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900 transition group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300">
                  {t.title}
                </h3>
                {t.has_unread ? (
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    New
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {t.post_count} {t.post_count === 1 ? "reply" : "replies"}
                </span>
                <span aria-hidden="true">·</span>
                <span suppressHydrationWarning>
                  active {timeAgo(t.last_post_at)}
                </span>
                {t.category_name ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{t.category_name}</span>
                  </>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  // Saved posts
  if (posts.length === 0) {
    return (
      <EmptyState
        title="No saved posts yet"
        body="Bookmark a reply to save it here. Open any post and tap the bookmark icon to keep it for later."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {posts.map((p) => {
        const snippet = p.content_markdown.replace(/\s+/g, " ").trim().slice(0, 160);
        const href = p.thread_id ? `/forum/${p.thread_id}#post-${p.id}` : "/forum";
        return (
          <li key={p.id}>
            <Link
              to={href}
              className="group block rounded-2xl border border-slate-200/80 bg-white px-4 py-3 transition hover:border-slate-300 hover:shadow-sm dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))]"
            >
              <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {p.author_username || "Anonymous"}
                </span>
                <span aria-hidden="true">·</span>
                <span suppressHydrationWarning>{timeAgo(p.created_at)}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
                {snippet || "(no content)"}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center dark:border-[#3a3028] dark:bg-transparent">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {body}
      </p>
    </div>
  );
}
