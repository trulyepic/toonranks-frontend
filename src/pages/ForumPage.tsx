import { useEffect, useRef, useState } from "react";
import {
  createForumThread,
  type ForumThread,
  type ForumSeriesRef,
  forumSeriesSearch,
  deleteForumThread,
  getForumThread,
  updateForumThread,
  listForumThreadsPaged,
} from "../api/manApi";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "../login/useUser";
import { Helmet } from "react-helmet";
import {
  DEFAULT_SOCIAL_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
} from "../config/site";
import { stripMdHeading } from "../util/strings";
import { ConfirmModal } from "../components/ConfirmModal";
import { useNotice } from "../hooks/useNotice";
import { NoticeModal } from "../components/NoticeModal";
import UserAvatar from "../components/UserAvatar";
import { inlineUsernameClassName } from "../util/userDisplay";

const MAX_THREADS_PER_USER = 10;
const MAX_SERIES_REFS = 10;
const PATCH_NOTES_TITLE = "Patch Notes & Site Updates";
const normalize = (s: string) => (s || "").trim().toLowerCase();

function promotePatchNotes(list: ForumThread[]) {
  const i = list.findIndex(
    (t) => normalize(t.title) === normalize(PATCH_NOTES_TITLE)
  );
  if (i > 0) {
    const [pinned] = list.splice(i, 1);
    list.unshift(pinned);
  }
  return list;
}

function SeriesRefPill({ s }: { s: ForumThread["series_refs"][number] }) {
  return (
    <Link
      to={`/series/${s.series_id}`}
      className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-2 py-1 text-xs backdrop-blur-sm hover:bg-white/80 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(35,28,23,0.98),_rgba(22,18,15,0.98))] dark:text-stone-100 dark:hover:bg-[#2a211b]"
      title={s.title || `#${s.series_id}`}
    >
      {s.cover_url ? (
        <img
          src={s.cover_url}
          alt={s.title || `Series #${s.series_id}`}
          className="w-6 h-8 object-cover rounded"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-6 h-8 rounded bg-gray-200 dark:bg-[#241d19]" />
      )}
      <span className="max-w-[10rem] truncate">
        {s.title || `#${s.series_id}`}
      </span>
    </Link>
  );
}

function LegacyForumPager({
  page,
  totalPages,
  hasPrev,
  hasNext,
  onGo,
}: {
  page: number;
  totalPages: number;
  hasPrev?: boolean;
  hasNext?: boolean;
  onGo: (p: number) => void;
}) {
  const nums: number[] = [];
  const add = (n: number) => {
    if (n >= 1 && n <= totalPages) nums.push(n);
  };
  add(1);
  add(2);
  for (let n = page - 2; n <= page + 2; n++) add(n);
  add(totalPages - 1);
  add(totalPages);
  const unique = Array.from(new Set(nums)).sort((a, b) => a - b);

  return (
    <nav
      className="flex flex-wrap items-center gap-2 text-sm"
      aria-label="Pagination"
    >
      <button
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))] dark:text-slate-200 dark:hover:bg-[#241d19]"
        onClick={() => onGo(page - 1)}
        disabled={hasPrev === undefined ? page <= 1 : !hasPrev}
        // disabled={page <= 1}
      >
        Prev
      </button>
      {unique.map((n, i) => {
        const prev = unique[i - 1];
        const gap = prev != null && n - prev > 1;
        return (
          <span key={n} className="flex items-center">
            {gap && <span className="px-1">…</span>}
            <button
              className={`rounded-full border px-3 py-1.5 transition ${
                n === page
                  ? "border-slate-900 bg-slate-900 font-semibold text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))] dark:text-slate-200 dark:hover:bg-[#241d19]"
              }`}
              onClick={() => onGo(n)}
              aria-current={n === page ? "page" : undefined}
            >
              {n}
            </button>
          </span>
        );
      })}
      <button
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))] dark:text-slate-200 dark:hover:bg-[#241d19]"
        onClick={() => onGo(page + 1)}
        // disabled={page >= totalPages}
        disabled={hasNext === undefined ? page >= totalPages : !hasNext}
      >
        Next
      </button>
    </nav>
  );
}

void LegacyForumPager;

export default function ForumPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editingThread, setEditingThread] = useState<ForumThread | null>(null);
  const [editingBody, setEditingBody] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [myThreadCount, setMyThreadCount] = useState(0);
  const [confirmThread, setConfirmThread] = useState<ForumThread | null>(null);
  const { user } = useUser();
  const notice = useNotice();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(15); // tweak if you like
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const myName = user?.username || "";
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const siteUrl = SITE_ORIGIN;
  const isSearching = !!q.trim();
  const canonical = `${siteUrl}/forum`;
  const queryLabel = q.trim();
  const pageTitleSafe = isSearching
    ? `Forum search "${queryLabel}" - ${SITE_NAME}`
    : `Forum - ${SITE_NAME}`;
  const pageDescription = isSearching
    ? `Search results for "${queryLabel}" in the Toon Ranks forum.`
    : "Community forum on Toon Ranks.";
  const resultsLabel = isSearching ? `results for "${queryLabel}"` : "threads";

  // keep URL as the source of truth for the current page
  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
  }, [searchParams]);

  // const load = async () => {
  //   const data = await listForumThreads(q);
  //   setThreads(promotePatchNotes(data.slice()));

  //   if (user) {
  //     const all = await listForumThreads("", 1, 1000);
  //     setMyThreadCount(all.filter((t) => t.author_username === myName).length);
  //   } else {
  //     setMyThreadCount(0);
  //   }
  // };

  const load = async () => {
    const r = await listForumThreadsPaged(q, page, pageSize);
    // Only promote pinned/patch notes on page 1 to avoid duplicates
    const items =
      page === 1 ? promotePatchNotes(r.items.slice()) : r.items.slice();

    setThreads(items);
    setTotal(r.total);
    setTotalPages(r.total_pages);
    setHasPrev(r.has_prev);
    setHasNext(r.has_next);

    // Optional: get "my threads" count fast without fetching 1000 rows
    if (user?.id) {
      try {
        const mine = await listForumThreadsPaged("", 1, 1, {
          author_id: user.id,
        });
        setMyThreadCount(mine.total ?? 0); // stays a number
      } catch {
        setMyThreadCount(0);
      }
    } else {
      setMyThreadCount(0);
    }
  };

  // useEffect(() => {
  //   load();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [q, user?.username]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, user?.id]);

  const onClickNewThread = () => {
    if (!user) {
      notice.show({
        title: "Sign in required",
        message: "You need to be logged in to create a thread.",
        variant: "warning",
      });
      return;
    }
    if (myThreadCount >= MAX_THREADS_PER_USER) {
      notice.show({
        title: "Thread limit reached",
        message: `You've reached the limit of ${MAX_THREADS_PER_USER} threads. Delete one of your existing threads to create a new one.`,
        variant: "warning",
      });
      return;
    }
    setShowNew(true);
  };

  const onDeleteThread = async (t: ForumThread) => {
    const isOwner = t.author_username === myName;
    if (!(isAdmin || isOwner) || deletingId) return;
    setConfirmThread(t);
  };

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    const qp: Record<string, string> = {};
    if (q.trim()) qp.q = q.trim();
    qp.page = String(next);
    setSearchParams(qp);
    // `useEffect` above will react to this and call load()
  };

  return (
    <div className="relative mx-auto max-w-5xl bg-[radial-gradient(900px_260px_at_50%_-100px,rgba(99,102,241,0.10),transparent)] px-3 py-6 dark:bg-[radial-gradient(1100px_320px_at_50%_-120px,rgba(76,175,149,0.12),transparent)] sm:px-6 sm:py-8">
      <Helmet>
        <title>{pageTitleSafe}</title>
        <link rel="canonical" href={canonical} />
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitleSafe} />
        <meta property="og:description" content="Join community discussions." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta
          property="og:image"
          content={DEFAULT_SOCIAL_IMAGE}
        />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="mb-4 rounded-[2rem] border border-slate-200/80 bg-white/80 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-[#3a3028] dark:bg-[linear-gradient(135deg,rgba(31,25,21,0.98),rgba(22,18,15,0.97)_58%,rgba(18,33,28,0.72))] dark:shadow-[0_20px_55px_rgba(0,0,0,0.6)] sm:mb-6 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-emerald-200/75">
              Community
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Forum
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-stone-300 sm:text-[15px]">
                Follow updates, start discussions, and keep series talk in one
                place.
              </p>
            </div>
          </div>
          <button
            onClick={onClickNewThread}
            className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 sm:w-auto"
          >
            New Thread
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-4 rounded-[1.75rem] border border-slate-200/80 bg-white/80 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-[#3a3028] dark:bg-[linear-gradient(140deg,rgba(27,22,19,0.98),rgba(18,15,13,0.97)_62%,rgba(20,33,28,0.66))] dark:shadow-[0_18px_50px_rgba(0,0,0,0.6)] sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-stone-300">
          Showing <strong>{threads.length}</strong> of <strong>{total}</strong>
          <span>{resultsLabel}</span>
          {totalPages > 1 && (
            <>
              {" "}
              - page {page} of {totalPages}
            </>
          )}
          {/* summary badge */}
          {user && myThreadCount > 0 && (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-200">
              Your threads <strong>{myThreadCount}</strong>
            </span>
          )}
        </div>
        {totalPages > 1 && (
          // <Pager page={page} totalPages={totalPages} onGo={goToPage} />
          <div className="overflow-x-auto pb-1">
            <Pager
              page={page}
              totalPages={totalPages}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onGo={goToPage}
            />
          </div>
        )}

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search threads..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.98),_rgba(18,15,12,0.98))] dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-[#5a4a3f] dark:focus:ring-[#2c241d]"
        />
      </div>


      <ul className="space-y-3">
        {threads.map((t) => {
          const isOwner = t.author_username === myName;
          const canDelete = isAdmin || isOwner;
          const isPatchNotes =
            normalize(t.title) === normalize(PATCH_NOTES_TITLE);

          return (
            <li
              key={t.id}
              role="link"
              tabIndex={0}
              aria-label={`Open forum thread: ${stripMdHeading(t.title)}`}
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("a,button,input,textarea,select,summary")) {
                  return;
                }
                navigate(`/forum/${t.id}`);
              }}
              onKeyDown={(event) => {
                if (event.currentTarget !== event.target) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/forum/${t.id}`);
                }
              }}
              className="cursor-pointer rounded-[1.75rem] border border-white/70 bg-white/40 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur-md transition hover:bg-white/60 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-200 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,rgba(29,24,20,0.98),rgba(21,17,14,0.98))] dark:ring-[rgba(255,255,255,0.03)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.4)] dark:hover:bg-[linear-gradient(145deg,rgba(35,28,23,0.98),rgba(24,20,16,0.98))] dark:focus:ring-blue-950/50"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <Link
                    to={`/forum/${t.id}`}
                    className="text-base font-semibold leading-6 text-slate-900 hover:underline dark:text-stone-50 sm:text-lg"
                  >
                    {stripMdHeading(t.title)}
                  </Link>

                  {canDelete && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        title="Edit thread"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingThread(t);
                          setEditingBody("");
                          (async () => {
                            try {
                              const data = await getForumThread(t.id);
                              setEditingBody(
                                data.posts?.[0]?.content_markdown ?? ""
                              );
                            } catch {
                              // silent; keep empty body if fetch fails
                            }
                          })();
                        }}
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-[#3a3028] dark:text-stone-200 dark:hover:bg-[linear-gradient(145deg,_rgba(34,47,83,0.8),_rgba(24,31,55,0.8))] dark:hover:text-blue-200"
                      >
                        Edit
                      </button>

                      {!t.locked && (
                        <button
                          type="button"
                          title="Delete thread"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteThread(t);
                          }}
                          disabled={deletingId === t.id}
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            deletingId === t.id
                              ? "cursor-not-allowed border-slate-200 text-slate-400 dark:border-[#3a3028] dark:text-slate-500"
                              : "border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-[#3a3028] dark:text-stone-200 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                          }`}
                        >
                          {deletingId === t.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-stone-400">
                    <span>
                      {t.post_count} posts - updated{" "}
                      {new Date(t.updated_at).toLocaleString()}
                    </span>
                    {t.author_username ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span>- by</span>
                        <Link
                          to={`/user/${t.author_username}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          <UserAvatar
                            username={t.author_username}
                            avatarUrl={t.author_avatar_url}
                            avatarPreset={t.author_avatar_preset}
                            size="sm"
                            className="h-6 w-6 text-[10px]"
                          />
                          <span
                            className={`font-medium ${inlineUsernameClassName(
                              t.author_role
                            )}`}
                          >
                            {t.author_username}
                          </span>
                        </Link>
                      </span>
                    ) : null}
                  </div>

                  {isPatchNotes && (
                    <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:bg-violet-950/35 dark:text-violet-200">
                      Pinned
                    </span>
                  )}

                  {t.locked && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:bg-amber-950/35 dark:text-amber-200">
                      Locked
                    </span>
                  )}
                </div>

                {t.series_refs?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {t.series_refs.map((s) => (
                      <SeriesRefPill key={s.series_id} s={s} />
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {/* BOTTOM controls (pager) */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pager page={page} totalPages={totalPages} onGo={goToPage} />
        </div>
      )}

      {/* CREATE */}
      {showNew && (
        <NewThreadModal
          mode="create"
          onClose={() => setShowNew(false)}
          onCreated={(thread) => {
            setShowNew(false);
            setThreads((prev) => [thread, ...prev]);
            setMyThreadCount((c) => c + 1);
            notice.show({
              title: "Thread created",
              message: "Your thread is live.",
              variant: "success",
            });
          }}
          myThreadCount={myThreadCount}
          maxThreads={MAX_THREADS_PER_USER}
        />
      )}

      {/* EDIT */}
      {editingThread && (
        <NewThreadModal
          mode="edit"
          threadId={editingThread.id}
          initialTitle={editingThread.title}
          initialMd={editingBody}
          onClose={() => setEditingThread(null)}
          onSaved={async () => {
            await load();
            setEditingThread(null);
            notice.show({
              title: "Thread updated",
              message: "Changes have been saved.",
              variant: "success",
            });
          }}
          myThreadCount={myThreadCount}
          maxThreads={MAX_THREADS_PER_USER}
        />
      )}

      {confirmThread && (
        <ConfirmModal
          open={!!confirmThread}
          title="Delete thread?"
          message={
            <div>
              <div className="mb-2">
                This will remove the original post and all replies.
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.96),_rgba(18,15,12,0.96))] dark:text-stone-300">
                "{stripMdHeading(confirmThread.title)}"
              </div>
            </div>
          }
          confirmText="Delete"
          cancelText="Cancel"
          destructive
          busy={deletingId === confirmThread.id}
          onCancel={() => setConfirmThread(null)}
          onConfirm={async () => {
            if (!confirmThread) return;
            try {
              setDeletingId(confirmThread.id);
              await deleteForumThread(confirmThread.id);
              setThreads((prev) =>
                prev.filter((x) => x.id !== confirmThread.id)
              );
              if (confirmThread.author_username === myName) {
                setMyThreadCount((c) => Math.max(0, c - 1));
              }
              setConfirmThread(null);
              notice.show({
                title: "Thread deleted",
                message: "The thread and all replies were removed.",
                variant: "success",
              });
            } catch (err: unknown) {
              const e = err as {
                response?: { data?: { detail?: string } };
                message?: string;
              };
              const msg =
                e?.response?.data?.detail ||
                e?.message ||
                "Failed to delete thread.";
              notice.show({
                title: "Delete failed",
                message: msg,
                variant: "error",
              });
            } finally {
              setDeletingId(null);
            }
          }}
        />
      )}

      <NoticeModal
        open={notice.open}
        title={notice.title}
        message={notice.message}
        variant={notice.variant}
        onClose={notice.hide}
      />
    </div>
  );
}

function Pager({
  page,
  totalPages,
  hasPrev,
  hasNext,
  onGo,
}: {
  page: number;
  totalPages: number;
  hasPrev?: boolean;
  hasNext?: boolean;
  onGo: (p: number) => void;
}) {
  const nums: number[] = [];
  const add = (n: number) => {
    if (n >= 1 && n <= totalPages) nums.push(n);
  };
  add(1);
  add(2);
  for (let n = page - 2; n <= page + 2; n++) add(n);
  add(totalPages - 1);
  add(totalPages);
  const unique = Array.from(new Set(nums)).sort((a, b) => a - b);

  return (
    <nav
      className="flex flex-wrap items-center gap-2 text-sm"
      aria-label="Pagination"
    >
      <button
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))] dark:text-stone-200 dark:hover:bg-[#241d19]"
        onClick={() => onGo(page - 1)}
        disabled={hasPrev === undefined ? page <= 1 : !hasPrev}
      >
        Prev
      </button>
      {unique.map((n, i) => {
        const prev = unique[i - 1];
        const gap = prev != null && n - prev > 1;
        return (
          <span key={n} className="flex items-center">
            {gap && <span className="px-1 text-slate-400 dark:text-stone-500">...</span>}
            <button
              className={`rounded-full border px-3 py-1.5 transition ${
                n === page
                  ? "border-slate-900 bg-slate-900 font-semibold text-white dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))] dark:text-stone-200 dark:hover:bg-[#241d19]"
              }`}
              onClick={() => onGo(n)}
              aria-current={n === page ? "page" : undefined}
            >
              {n}
            </button>
          </span>
        );
      })}
      <button
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))] dark:text-stone-200 dark:hover:bg-[#241d19]"
        onClick={() => onGo(page + 1)}
        disabled={hasNext === undefined ? page >= totalPages : !hasNext}
      >
        Next
      </button>
    </nav>
  );
}

/**
 * NewThreadModal now supports mode: "create" | "edit"
 */
function NewThreadModal({
  onClose,
  onCreated,
  onSaved,
  myThreadCount,
  maxThreads,
  mode = "create",
  initialTitle = "",
  initialMd = "",
  threadId,
}: {
  onClose: () => void;
  onCreated?: (t: ForumThread) => void;
  onSaved?: () => void;
  myThreadCount: number;
  maxThreads: number;
  mode?: "create" | "edit";
  initialTitle?: string;
  initialMd?: string;
  threadId?: number;
}) {
  const { user } = useUser();
  const notice = useNotice();

  const [title, setTitle] = useState(initialTitle);
  const [md, setMd] = useState(initialMd);

  // existing series picker state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ForumSeriesRef[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const remaining = Math.max(0, maxThreads - myThreadCount);

  // --- @mention support (body) ---
  const mdRef = useRef<HTMLTextAreaElement | null>(null);
  const mdMenuRef = useRef<HTMLDivElement | null>(null);
  const [mdMenuOpen, setMdMenuOpen] = useState(false);
  const [mdResults, setMdResults] = useState<ForumSeriesRef[]>([]);
  const [mdHighlight, setMdHighlight] = useState(0);
  const [mdMentionStart, setMdMentionStart] = useState<number | null>(null);
  const [mdMentionCount, setMdMentionCount] = useState(0);
  const [mdCapShown, setMdCapShown] = useState(false);

  const MAX_MENTIONS = MAX_SERIES_REFS;

  const extractIds = (text: string) =>
    Array.from(text.matchAll(/\(series:(\d+)\)/g)).map((m) => Number(m[1]));

  function detectAtToken(nextValue: string, caret: number) {
    if (caret < 0 || caret > nextValue.length) return null;
    const before = nextValue.slice(0, caret);
    const lastBoundary = Math.max(
      before.lastIndexOf(" "),
      before.lastIndexOf("\n"),
      before.lastIndexOf("\t"),
      before.lastIndexOf("("),
      before.lastIndexOf("[")
    );
    const tokenStart = lastBoundary + 1;
    const token = nextValue.slice(tokenStart, caret);
    if (!token.startsWith("@")) return null;
    const after = nextValue.slice(caret);
    const m = after.match(/^[^\s.,!?)]*/);
    const tokenEnd = caret + (m ? m[0].length : 0);
    const wholeToken = nextValue.slice(tokenStart, tokenEnd);
    const query = wholeToken.slice(1);
    return { tokenStart, tokenEnd, query };
  }

  async function runMdMentionSearch(q: string) {
    try {
      const r = await forumSeriesSearch(q);
      setMdResults(r);
      setMdHighlight(0);
      setMdMenuOpen(r.length > 0);
    } catch {
      setMdResults([]);
      setMdMenuOpen(false);
    }
  }

  function insertMdMention(
    chosen: ForumSeriesRef,
    tokenStart: number,
    tokenEnd: number
  ) {
    const uniqueIds = Array.from(new Set(extractIds(md)));
    if (
      !uniqueIds.includes(chosen.series_id) &&
      uniqueIds.length >= MAX_MENTIONS
    ) {
      notice.show({
        title: "Limit reached",
        message: `You can mention up to ${MAX_MENTIONS} series.`,
        variant: "warning",
      });
      setMdMenuOpen(false);
      return;
    }

    const before = md.slice(0, tokenStart);
    const after = md.slice(tokenEnd);
    const inserted = `[${chosen.title || `#${chosen.series_id}`}](series:${
      chosen.series_id
    })`;
    const next = `${before}${inserted}${after}`;
    setMd(next);

    setMdMenuOpen(false);
    setMdResults([]);
    setMdMentionStart(null);

    queueMicrotask(() => {
      mdRef.current?.focus();
      const newPos = before.length + inserted.length;
      mdRef.current?.setSelectionRange(newPos, newPos);
    });
  }

  const onMdChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setMd(next);

    const caret = e.target.selectionStart ?? next.length;
    const hit = detectAtToken(next, caret);

    const currentCount = new Set(extractIds(next)).size;
    setMdMentionCount(currentCount);

    if (currentCount >= MAX_MENTIONS && !mdCapShown) {
      setMdCapShown(true);
      notice.show({
        title: "Mentions cap",
        message: `You've reached the limit of ${MAX_MENTIONS} series mentions in the post body.`,
        variant: "warning",
      });
    }
    if (currentCount < MAX_MENTIONS && mdCapShown) {
      setMdCapShown(false);
    }

    if (hit && hit.query.length >= 1 && currentCount < MAX_MENTIONS) {
      setMdMentionStart(hit.tokenStart);
      runMdMentionSearch(hit.query);
    } else {
      setMdMentionStart(null);
      setMdMenuOpen(false);
      setMdResults([]);
    }
  };

  const onMdKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mdMenuOpen || mdResults.length === 0 || mdMentionStart === null)
      return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMdHighlight((h) => (h + 1) % mdResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMdHighlight((h) => (h - 1 + mdResults.length) % mdResults.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const caret = mdRef.current?.selectionStart ?? md.length;
      const hit = detectAtToken(md, caret);
      const start = hit ? hit.tokenStart : mdMentionStart;
      const end = hit ? hit.tokenEnd : caret;
      insertMdMention(mdResults[mdHighlight], start, end);
    } else if (e.key === "Escape") {
      setMdMenuOpen(false);
      setMdResults([]);
      setMdMentionStart(null);
    }
  };

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const t = ev.target as Node;
      const clickedTextarea =
        mdRef.current === t || !!mdRef.current?.contains(t);
      const clickedMenu = !!mdMenuRef.current?.contains(t);
      if (!clickedTextarea && !clickedMenu) setMdMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // separate "Reference series" search
  useEffect(() => {
    let active = true;
    (async () => {
      if (!query) {
        setResults([]);
        return;
      }
      try {
        const r = await forumSeriesSearch(query);
        if (active) setResults(r);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [query]);

  const togglePick = (id: number) => {
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id);
      if (p.length >= MAX_SERIES_REFS) {
        notice.show({
          title: "Limit reached",
          message: `You can reference up to ${MAX_SERIES_REFS} series only.`,
          variant: "warning",
        });
        return p;
      }
      return [...p, id];
    });
  };

  const create = async () => {
    if (!user) {
      notice.show({
        title: "Sign in required",
        message: "You need to be logged in to create a thread.",
        variant: "warning",
      });
      return;
    }
    if (myThreadCount >= maxThreads) {
      notice.show({
        title: "Thread limit reached",
        message: `You've reached the limit of ${maxThreads} threads. Delete one of your existing threads to create a new one.`,
        variant: "warning",
      });
      return;
    }
    if (!title.trim() || !md.trim()) {
      notice.show({
        title: "Missing info",
        message: "Title and content are required.",
        variant: "warning",
      });
      return;
    }

    const idsFromMentions = extractIds(md);
    const merged = Array.from(new Set([...picked, ...idsFromMentions]));
    const series_ids =
      merged.length > MAX_SERIES_REFS
        ? merged.slice(0, MAX_SERIES_REFS)
        : merged;

    const cleanTitle = stripMdHeading(title);
    try {
      const t = await createForumThread({
        title: cleanTitle,
        first_post_markdown: md,
        series_ids,
      });
      onCreated?.(t);
    } catch (e: unknown) {
      let msg = "Failed to create thread.";
      if (typeof e === "string") msg = e;
      else if (e instanceof Error) msg = e.message;
      else if (typeof e === "object" && e !== null) {
        const maybe = e as {
          message?: string;
          response?: { data?: { detail?: string | { message?: string } } };
        };
        msg =
          maybe.response?.data?.detail &&
          typeof maybe.response.data.detail === "string"
            ? maybe.response.data.detail
            : typeof maybe.response?.data?.detail === "object"
            ? maybe.response.data.detail?.message || msg
            : maybe.message || msg;
      }
      notice.show({ title: "Create failed", message: msg, variant: "error" });
    }
  };

  const save = async () => {
    if (mode !== "edit" || !threadId) {
      onClose();
      return;
    }
    if (!user) {
      notice.show({
        title: "Sign in required",
        message: "You need to be logged in to edit a thread.",
        variant: "warning",
      });
      return;
    }

    const cleanTitle = stripMdHeading(title);
    const body = md.trim();
    if (!cleanTitle || !body) {
      notice.show({
        title: "Missing info",
        message: "Title and content are required.",
        variant: "warning",
      });
      return;
    }

    const idsFromMentions = extractIds(body);
    const merged = Array.from(new Set([...picked, ...idsFromMentions]));
    const series_ids =
      merged.length > MAX_SERIES_REFS
        ? merged.slice(0, MAX_SERIES_REFS)
        : merged;

    try {
      await updateForumThread(threadId, {
        title: cleanTitle,
        first_post_markdown: body,
        ...(series_ids.length > 0 ? { series_ids } : {}),
      });
      onSaved?.();
      onClose();
    } catch (e) {
      const msg =
        typeof e === "string"
          ? e
          : e instanceof Error
          ? e.message
          : "Failed to save changes";
      notice.show({ title: "Save failed", message: msg, variant: "error" });
    }
  };

  useEffect(() => setTitle(initialTitle), [initialTitle]);
  useEffect(() => setMd(initialMd), [initialMd]);

  const headerText = mode === "edit" ? "Update Thread" : "New Thread";
  const primaryText = mode === "edit" ? "Save" : "Create";
  const primaryOnClick = mode === "edit" ? save : create;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-4 shadow-xl dark:border dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(30,24,20,0.98),_rgba(21,17,14,0.98))] dark:text-stone-100 sm:max-h-[calc(100vh-2rem)] sm:max-w-2xl sm:rounded-xl sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-stone-50">{headerText}</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-stone-400">
            x
          </button>
        </div>

        {mode === "create" ? (
          <div className="mb-2 text-xs text-gray-500 dark:text-stone-400">
            {user
              ? `You can create ${remaining} more ${
                  remaining === 1 ? "thread" : "threads"
                } (max ${maxThreads}).`
              : "You must be logged in to create threads."}
          </div>
        ) : (
          <div className="mb-2 text-xs text-gray-500 dark:text-stone-400">
            Editing thread details.
          </div>
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thread title"
          className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 dark:border-[#3a3028] dark:bg-[#18120f] dark:text-stone-100 dark:placeholder:text-stone-500"
        />

        {/* body with @-mention support */}
        <div className="relative">
          <textarea
            ref={mdRef}
            value={md}
            onChange={onMdChange}
            onKeyDown={onMdKeyDown}
            placeholder="Say something (Markdown supported)... Tip: type @ to mention a series"
            className="h-36 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 dark:border-[#3a3028] dark:bg-[#18120f] dark:text-stone-100 dark:placeholder:text-stone-500 sm:h-40"
          />

          {mdMenuOpen && mdResults.length > 0 && (
            <div
              ref={mdMenuRef}
              className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-auto rounded border bg-white shadow dark:border-[#3a3028] dark:bg-[#18120f]"
            >
              {mdResults.map((r, i) => (
                <button
                  key={r.series_id}
                  type="button"
                  onClick={() => {
                    const caret = mdRef.current?.selectionStart ?? md.length;
                    const hit = detectAtToken(md, caret);
                    const start = hit
                      ? hit.tokenStart
                      : mdMentionStart ?? caret;
                    const end = hit ? hit.tokenEnd : caret;
                    insertMdMention(r, start, end);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                    i === mdHighlight ? "bg-gray-100 dark:bg-[#241d19]" : "hover:bg-gray-50 dark:hover:bg-[#201915]"
                  }`}
                  title={r.title || `#${r.series_id}`}
                >
                  {r.cover_url ? (
                    <img
                      src={r.cover_url}
                      alt={r.title || `Series #${r.series_id}`}
                      className="w-6 h-8 object-cover rounded"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-6 h-8 rounded bg-gray-200" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-900 dark:text-stone-100">{r.title}</div>
                    <div className="text-[11px] text-gray-500 dark:text-stone-400">
                      #{r.series_id}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-1 text-[11px] text-gray-500 dark:text-stone-400">
          Mentions: {mdMentionCount}/{MAX_MENTIONS}
          {mdMentionCount >= MAX_MENTIONS && (
            <span className="ml-1 text-amber-700">Limit reached</span>
          )}
        </div>

        {/* "Reference series" section */}
        <div className="mt-3">
          <label className="text-sm font-medium text-slate-900 dark:text-stone-100">Reference series</label>
          <div className="mb-1 text-xs text-gray-500 dark:text-stone-400">
            You can add up to {MAX_SERIES_REFS} series.
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search series..."
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 dark:border-[#3a3028] dark:bg-[#18120f] dark:text-stone-100 dark:placeholder:text-stone-500"
          />
          {results.length > 0 && (
            <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded border p-2 dark:border-[#3a3028] dark:bg-[#18120f]">
              {results.map((r) => (
                <button
                  key={r.series_id}
                  onClick={() => togglePick(r.series_id)}
                  className={`w-full text-left px-2 py-1 rounded ${
                    picked.includes(r.series_id)
                      ? "bg-blue-100 dark:bg-blue-950/35"
                      : "hover:bg-gray-100 dark:hover:bg-[#201915]"
                  }`}
                >
                  {r.title}{" "}
                  <span className="text-xs text-gray-500 dark:text-stone-400">#{r.series_id}</span>
                </button>
              ))}
            </div>
          )}
          {picked.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {picked.map((id) => (
                <span
                  key={id}
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950/35 dark:text-blue-200"
                >
                  #{id}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-[#3a3028] dark:text-stone-200 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={primaryOnClick}
            className="w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white sm:w-auto"
          >
            {primaryText}
          </button>
        </div>
      </div>

      {/* local notice host in modal context */}
      <NoticeModal
        open={notice.open}
        title={notice.title}
        message={notice.message}
        variant={notice.variant}
        onClose={notice.hide}
      />
    </div>
  );
}
