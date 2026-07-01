import { useEffect, useRef, useState } from "react";
import {
  createForumThread,
  type ForumThread,
  type ForumSeriesRef,
  type ForumCategory,
  forumSeriesSearch,
  deleteForumThread,
  getForumThread,
  updateForumThread,
  listForumThreadsPaged,
  setThreadPin,
  fetchForumCategories,
  createForumCategory,
  updateForumCategory,
  deleteForumCategory,
  fetchMyFollowing,
  fetchMyBookmarks,
} from "../api/manApi";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLoaderData,
} from "react-router-dom";
import { useUser } from "../login/useUser";
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
import { RankerBadge } from "../components/RankerBadge";
import { inlineUsernameClassName } from "../util/userDisplay";
import { getTopRankMap } from "../util/rankMap";
import { timeAgo, fullTimestamp } from "../util/timeAgo";
import MarkdownToolbar from "../components/MarkdownToolbar";
import ForumPersonalFeed from "../components/ForumPersonalFeed";

type ForumView = "discover" | "following" | "saved";

const MAX_THREADS_PER_USER = 10;
const MAX_SERIES_REFS = 10;

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

type ForumLoaderData = {
  threads: ForumThread[];
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

const FORUM_PAGE_SIZE = 15;

// SSR loader: fetch the first page of forum threads (default sort) on the server
// so the thread list is in the initial HTML. The client revalidates/paginates.
export async function loader(): Promise<ForumLoaderData> {
  const r = await listForumThreadsPaged("", 1, FORUM_PAGE_SIZE, {
    sort: "activity",
  }).catch(() => null);
  return {
    threads: r?.items ?? [],
    total: r?.total ?? 0,
    totalPages: r?.total_pages ?? 1,
    hasPrev: r?.has_prev ?? false,
    hasNext: r?.has_next ?? false,
  };
}

export function meta() {
  return [
    { title: `Forum - ${SITE_NAME}` },
    { tagName: "link", rel: "canonical", href: `${SITE_ORIGIN}/forum` },
    { name: "description", content: "Community forum on Toon Ranks." },
    { property: "og:title", content: `Forum - ${SITE_NAME}` },
    { property: "og:description", content: "Join community discussions." },
    { property: "og:type", content: "website" },
    { property: "og:url", content: `${SITE_ORIGIN}/forum` },
    { property: "og:image", content: DEFAULT_SOCIAL_IMAGE },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export default function ForumPage() {
  const navigate = useNavigate();
  const forumData = useLoaderData() as ForumLoaderData | null;
  const [threads, setThreads] = useState<ForumThread[]>(
    forumData?.threads ?? []
  );
  const [showNew, setShowNew] = useState(false);
  const [editingThread, setEditingThread] = useState<ForumThread | null>(null);
  const [editingBody, setEditingBody] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [myThreadCount, setMyThreadCount] = useState(0);
  const [confirmThread, setConfirmThread] = useState<ForumThread | null>(null);
  const { user } = useUser();
  const [view, setView] = useState<ForumView>("discover");
  const [personalCounts, setPersonalCounts] = useState<{
    following?: number;
    saved?: number;
    loading: boolean;
  }>({ loading: false });
  const notice = useNotice();
  const [rankMap, setRankMap] = useState<Record<string, number>>({});

  const [pageSize] = useState(FORUM_PAGE_SIZE); // tweak if you like
  const [total, setTotal] = useState(forumData?.total ?? 0);
  const [totalPages, setTotalPages] = useState(forumData?.totalPages ?? 1);
  const [hasPrev, setHasPrev] = useState(forumData?.hasPrev ?? false);
  const [hasNext, setHasNext] = useState(forumData?.hasNext ?? false);
  const [searchParams, setSearchParams] = useSearchParams();

  type SortOption = "activity" | "newest" | "replies";
  const SORT_KEY = "forum_sort";
  const SORT_OPTIONS: SortOption[] = ["activity", "newest", "replies"];

  // URL is the source of truth for q / sort / category / page so the view is
  // shareable and survives refresh/back. sessionStorage only provides the
  // default sort when the URL has none.
  const q = searchParams.get("q") ?? "";
  const rawPage = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const urlSort = searchParams.get("sort") as SortOption | null;
  const storedSort =
    typeof window !== "undefined"
      ? (sessionStorage.getItem(SORT_KEY) as SortOption | null)
      : null;
  const sortBy: SortOption =
    urlSort && SORT_OPTIONS.includes(urlSort)
      ? urlSort
      : storedSort && SORT_OPTIONS.includes(storedSort)
      ? storedSort
      : "activity";
  const activeCategorySlug = searchParams.get("category");

  // Local input state, debounced into the URL (and thus into the fetch).
  const [qInput, setQInput] = useState(q);

  const writeParams = (patch: {
    q?: string;
    sort?: SortOption;
    category?: string | null;
    page?: number;
  }) => {
    const nq = (patch.q !== undefined ? patch.q : q).trim();
    const nsort = patch.sort ?? sortBy;
    const ncat = patch.category !== undefined ? patch.category : activeCategorySlug;
    const npage = patch.page ?? page;
    const next: Record<string, string> = {};
    if (nq) next.q = nq;
    if (nsort !== "activity") next.sort = nsort;
    if (ncat) next.category = ncat;
    if (npage > 1) next.page = String(npage);
    setSearchParams(next);
  };

  // Debounce search keystrokes → URL (300 ms) instead of fetching per key.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (qInput.trim() !== q) writeParams({ q: qInput, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  // Sync the input when the URL changes underneath us (back button, shared link).
  useEffect(() => {
    setQInput(q);
  }, [q]);

  // Skip the first client load when the server already seeded the default thread
  // list (so we don't refetch/flash on hydration). Only when on the server's
  // defaults — a non-default URL/sort still triggers a refetch.
  const skipInitialLoad = useRef(
    Boolean(forumData?.threads?.length) &&
      q === "" &&
      !activeCategorySlug &&
      sortBy === "activity" &&
      page === 1
  );

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const activeCategory = categories.find((c) => c.slug === activeCategorySlug) ?? null;
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const reloadCategories = () =>
    fetchForumCategories().then(setCategories).catch(() => {});

  useEffect(() => {
    reloadCategories();
  }, []);

  const myName = user?.username || "";
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const isSearching = !!q.trim();
  const queryLabel = q.trim();
  const resultsLabel = isSearching ? `results for "${queryLabel}"` : "threads";

  // Fetch top-10 rank map once for byline badges
  useEffect(() => {
    getTopRankMap().then(setRankMap).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setPersonalCounts({ loading: false });
      return;
    }

    let cancelled = false;
    setPersonalCounts((prev) => ({ ...prev, loading: true }));

    Promise.all([fetchMyFollowing(1, 1), fetchMyBookmarks(1, 1)])
      .then(([following, saved]) => {
        if (!cancelled) {
          setPersonalCounts({
            following: following.total,
            saved: saved.total,
            loading: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPersonalCounts((prev) => ({ ...prev, loading: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
    const r = await listForumThreadsPaged(q, page, pageSize, {
      sort: sortBy,
      ...(activeCategorySlug ? { category_slug: activeCategorySlug } : {}),
    });
    const items = r.items.slice();

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
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, sortBy, activeCategorySlug, user?.id]);

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
    writeParams({ page: next });
    // `useEffect` above will react to this and call load()
  };

  return (
    <div className="relative mx-auto max-w-5xl bg-[radial-gradient(900px_260px_at_50%_-100px,rgba(99,102,241,0.10),transparent)] px-3 py-6 dark:bg-[radial-gradient(1100px_320px_at_50%_-120px,rgba(76,175,149,0.12),transparent)] sm:px-6 sm:py-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Forum
          </h1>
          <p className="text-sm text-slate-600 dark:text-stone-300">
            Follow updates, start discussions, and keep series talk in one place.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {isAdmin && (
            <button
              onClick={() => setShowCategoryManager(true)}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-[#3a3028] dark:bg-transparent dark:text-stone-200 dark:hover:bg-[#241d19] sm:flex-none"
            >
              ⚙ Categories
            </button>
          )}
          <button
            onClick={onClickNewThread}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 sm:flex-none"
          >
            New Thread
          </button>
        </div>
      </div>

      {user && (
        <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { key: "discover", label: "Discover" },
              {
                key: "following",
                label: "Following",
                count: personalCounts.following,
              },
              {
                key: "saved",
                label: "Bookmarked",
                count: personalCounts.saved,
              },
            ] as { key: ForumView; label: string; count?: number }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                view === tab.key
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#3a3028] dark:bg-transparent dark:text-stone-300 dark:hover:bg-[#241d19]"
              }`}
            >
              {tab.label}
              {tab.key !== "discover" ? (
                <span
                  className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                    view === tab.key
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-100"
                      : "bg-slate-100 text-slate-500 dark:bg-[#241d19] dark:text-stone-400"
                  }`}
                >
                  {personalCounts.loading && tab.count === undefined
                    ? "..."
                    : tab.count ?? 0}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {view !== "discover" && user ? (
        <ForumPersonalFeed view={view} />
      ) : null}

      {view === "discover" && (
        <>
      {/* Toolbar: search + sort + categories + result count in one card */}
      <div className="mb-4 flex flex-col gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/80 px-4 py-4 shadow-sm backdrop-blur-sm dark:border-[#3a3028] dark:bg-[linear-gradient(140deg,rgba(27,22,19,0.98),rgba(18,15,13,0.97)_62%,rgba(20,33,28,0.66))] sm:px-5">
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Search threads..."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.98),_rgba(18,15,12,0.98))] dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-[#5a4a3f] dark:focus:ring-[#2c241d]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sort:</span>
          {(
            [
              { value: "activity", label: "Active" },
              { value: "newest",   label: "Newest" },
              { value: "replies",  label: "Most replies" },
            ] as { value: SortOption; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                if (sortBy === value) return;
                sessionStorage.setItem(SORT_KEY, value);
                writeParams({ sort: value, page: 1 });
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                sortBy === value
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#3a3028] dark:bg-transparent dark:text-stone-300 dark:hover:bg-[#241d19]"
              }`}
            >
              {label}
            </button>
          ))}

          {categories.length > 0 && (
            <>
              <span
                aria-hidden
                className="mx-1 hidden h-4 w-px bg-slate-200 dark:bg-[#3a3028] sm:inline-block"
              />
              <button
                onClick={() => writeParams({ category: null, page: 1 })}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  activeCategorySlug === null
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#3a3028] dark:bg-transparent dark:text-stone-300 dark:hover:bg-[#241d19]"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => writeParams({ category: cat.slug, page: 1 })}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    activeCategorySlug === cat.slug
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#3a3028] dark:bg-transparent dark:text-stone-300 dark:hover:bg-[#241d19]"
                  }`}
                >
                  {cat.name}
                  <span className="ml-1 opacity-50">({cat.thread_count})</span>
                </button>
              ))}
            </>
          )}
        </div>

        {activeCategory?.description && (
          <p className="text-xs text-slate-400 dark:text-slate-500">{activeCategory.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-stone-400">
          <span>
            <strong>{total}</strong> {resultsLabel}
            {totalPages > 1 && <> · page {page} of {totalPages}</>}
          </span>
          {user && myThreadCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-200">
              Your threads <strong>{myThreadCount}</strong>
            </span>
          )}
        </div>
      </div>

      {/* TOP pager */}
      {totalPages > 1 && (
        <div className="mb-4 overflow-x-auto pb-1">
          <Pager
            page={page}
            totalPages={totalPages}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onGo={goToPage}
          />
        </div>
      )}

      {/* Flat feed: one container, divided rows (Reddit-style density) */}
      <ul className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-sm dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,rgba(27,22,19,0.98),rgba(20,16,13,0.98))]">
        {threads.map((t) => {
          const isOwner = t.author_username === myName;
          const canManage = isAdmin || isOwner;
          const isPinned = !!t.is_pinned;
          const replyCount = Math.max(0, (t.post_count ?? 1) - 1);
          const MAX_ROW_PILLS = 3;

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
              className={`cursor-pointer border-b border-slate-100 px-4 py-3 transition last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300 dark:border-[#2b231d] ${
                isPinned
                  ? "border-l-[3px] border-l-amber-400 bg-amber-50/50 hover:bg-amber-50/80 dark:border-l-amber-600 dark:bg-amber-950/15 dark:hover:bg-amber-950/25"
                  : "hover:bg-slate-50/80 dark:hover:bg-[#241d19]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {/* Meta line: author · time-ago, then status chips */}
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500 dark:text-stone-400">
                    {t.author_username ? (
                      <>
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
                            className="h-5 w-5 text-[9px]"
                          />
                          <span
                            className={`font-medium ${inlineUsernameClassName(
                              t.author_role
                            )}`}
                          >
                            {t.author_username}
                          </span>
                        </Link>
                        <RankerBadge rank={rankMap[t.author_username]} />
                      </>
                    ) : (
                      <span>Anonymous</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span
                      suppressHydrationWarning
                      title={fullTimestamp(t.updated_at)}
                    >
                      {timeAgo(t.updated_at)}
                    </span>

                    {isPinned && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/35 dark:text-amber-200">
                        Pinned
                      </span>
                    )}
                    {t.locked && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/35 dark:text-amber-200">
                        Locked
                      </span>
                    )}
                    {!activeCategorySlug && t.category_name && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-[#241d19] dark:text-slate-300">
                        {t.category_name}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/forum/${t.id}`}
                      className={`text-base leading-6 hover:underline dark:text-stone-50 ${
                        user && t.has_unread
                          ? "font-bold text-slate-950 dark:text-white"
                          : "font-semibold text-slate-900 dark:text-stone-50"
                      }`}
                    >
                      {stripMdHeading(t.title)}
                    </Link>
                    {user && t.has_unread && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {t.unread_count ? `${t.unread_count} new` : "New"}
                      </span>
                    )}
                  </div>

                  {/* Series refs, capped */}
                  {t.series_refs?.length ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {t.series_refs.slice(0, MAX_ROW_PILLS).map((s) => (
                        <SeriesRefPill key={s.series_id} s={s} />
                      ))}
                      {t.series_refs.length > MAX_ROW_PILLS && (
                        <span className="text-xs text-slate-400 dark:text-stone-500">
                          +{t.series_refs.length - MAX_ROW_PILLS} more
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Right rail: reply count + actions */}
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-[#241d19] dark:text-stone-300"
                    title={`${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
                  >
                    💬 {replyCount}
                  </span>
                  {canManage && (
                    <ThreadRowMenu
                      canEdit={canManage}
                      isAdmin={isAdmin}
                      isPinned={isPinned}
                      locked={!!t.locked}
                      deleting={deletingId === t.id}
                      onEdit={() => {
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
                      onTogglePin={async () => {
                        // Optimistic update
                        setThreads((prev) =>
                          prev.map((th) =>
                            th.id === t.id
                              ? { ...th, is_pinned: !isPinned }
                              : th
                          )
                        );
                        try {
                          await setThreadPin(t.id, !isPinned);
                        } catch {
                          // Revert on error
                          setThreads((prev) =>
                            prev.map((th) =>
                              th.id === t.id
                                ? { ...th, is_pinned: isPinned }
                                : th
                            )
                          );
                          notice.show({
                            title: "Action failed",
                            message: "Could not update pin status.",
                            variant: "error",
                          });
                        }
                      }}
                      onDelete={() => onDeleteThread(t)}
                    />
                  )}
                </div>
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
        </>
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
          categories={categories}
          defaultCategorySlug={activeCategorySlug ?? undefined}
        />
      )}

      {/* EDIT */}
      {editingThread && (
        <NewThreadModal
          mode="edit"
          threadId={editingThread.id}
          initialTitle={editingThread.title}
          initialMd={editingBody}
          initialCategoryId={editingThread.category_id ?? null}
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
          categories={categories}
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

      {showCategoryManager && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCategoryManager(false)}
          onChanged={reloadCategories}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Per-row "⋯" overflow menu for owner/admin thread actions
// ─────────────────────────────────────────────
function ThreadRowMenu({
  canEdit,
  isAdmin,
  isPinned,
  locked,
  deleting,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  canEdit: boolean;
  isAdmin: boolean;
  isPinned: boolean;
  locked: boolean;
  deleting: boolean;
  onEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "block w-full px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:text-stone-200 dark:hover:bg-[#241d19]";

  return (
    <div
      ref={rootRef}
      className="relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Thread actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-stone-500 dark:hover:bg-[#241d19] dark:hover:text-stone-300"
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,rgba(30,24,20,0.99),rgba(21,17,14,0.99))]"
        >
          {canEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className={itemClass}
            >
              Edit
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onTogglePin();
              }}
              className={itemClass}
            >
              {isPinned ? "Unpin" : "Pin"}
            </button>
          )}
          {canEdit && !locked && (
            <button
              type="button"
              role="menuitem"
              disabled={deleting}
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className={`${itemClass} text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30 ${
                deleting ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Category Manager Modal (admin only)
// ─────────────────────────────────────────────
function CategoryManagerModal({
  categories,
  onClose,
  onChanged,
}: {
  categories: ForumCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const notice = useNotice();

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPos, setEditPos] = useState(0);
  const [editBusy, setEditBusy] = useState(false);

  // Add state
  const [addName, setAddName] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addPos, setAddPos] = useState(categories.length);
  const [addBusy, setAddBusy] = useState(false);

  // Auto-generate slug from name
  const toSlug = (s: string) =>
    s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const startEdit = (cat: ForumCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditDesc(cat.description ?? "");
    setEditPos(cat.position);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditBusy(true);
    try {
      await updateForumCategory(editingId, {
        name: editName.trim(),
        slug: editSlug.trim(),
        description: editDesc.trim() || undefined,
        position: editPos,
      });
      onChanged();
      setEditingId(null);
    } catch {
      notice.show({ title: "Save failed", message: "Could not update category.", variant: "error" });
    } finally {
      setEditBusy(false);
    }
  };

  const handleDelete = async (cat: ForumCategory) => {
    if (!window.confirm(`Delete "${cat.name}"? This only works if no threads are assigned to it.`)) return;
    try {
      await deleteForumCategory(cat.id);
      onChanged();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        notice.show({ title: "Cannot delete", message: "Re-assign all threads in this category first.", variant: "warning" });
      } else {
        notice.show({ title: "Delete failed", message: "Could not delete category.", variant: "error" });
      }
    }
  };

  const handleAdd = async () => {
    if (!addName.trim() || !addSlug.trim()) {
      notice.show({ title: "Required", message: "Name and slug are required.", variant: "warning" });
      return;
    }
    setAddBusy(true);
    try {
      await createForumCategory({
        name: addName.trim(),
        slug: addSlug.trim(),
        description: addDesc.trim() || undefined,
        position: addPos,
      });
      onChanged();
      setAddName("");
      setAddSlug("");
      setAddDesc("");
      setAddPos(categories.length + 1);
    } catch {
      notice.show({ title: "Create failed", message: "A category with that name or slug may already exist.", variant: "error" });
    } finally {
      setAddBusy(false);
    }
  };

  const fieldClass = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-[#3a3028] dark:bg-[#18120f] dark:text-stone-100 placeholder:text-slate-400 dark:placeholder:text-stone-500";
  const labelClass = "block mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 shadow-xl dark:border dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,rgba(30,24,20,0.98),rgba(21,17,14,0.98))] sm:max-h-[calc(100vh-2rem)] sm:max-w-2xl sm:rounded-2xl">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Manage Categories</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>

        {/* Existing categories */}
        <div className="mb-6 space-y-2">
          {categories.map((cat) =>
            editingId === cat.id ? (
              <div key={cat.id} className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Slug</label>
                    <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className={fieldClass} />
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_80px] gap-3">
                  <div>
                    <label className={labelClass}>Description</label>
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Optional" className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Order</label>
                    <input type="number" value={editPos} onChange={(e) => setEditPos(Number(e.target.value))} className={fieldClass} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={editBusy} className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-blue-700">
                    {editBusy ? "Saving…" : "Save"}
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:border-[#3a3028] dark:text-stone-300">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={cat.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-[#342b24] dark:bg-[#181310]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-stone-100">{cat.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">/{cat.slug}</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-[#241d19] dark:text-slate-400">
                      {cat.thread_count} threads
                    </span>
                  </div>
                  {cat.description && (
                    <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{cat.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => startEdit(cat)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-[#342b24] dark:text-stone-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-[#342b24] dark:text-stone-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* Add new category */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-[#342b24] dark:bg-[#181310]">
          <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-stone-100">Add category</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <input
                value={addName}
                onChange={(e) => {
                  setAddName(e.target.value);
                  if (!addSlug || addSlug === toSlug(addName)) setAddSlug(toSlug(e.target.value));
                }}
                placeholder="e.g. Recommendations"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Slug</label>
              <input
                value={addSlug}
                onChange={(e) => setAddSlug(e.target.value)}
                placeholder="e.g. recommendations"
                className={fieldClass}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label className={labelClass}>Description</label>
              <input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="Optional" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Order</label>
              <input type="number" value={addPos} onChange={(e) => setAddPos(Number(e.target.value))} className={fieldClass} />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={addBusy}
            className="mt-3 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-emerald-700"
          >
            {addBusy ? "Adding…" : "Add Category"}
          </button>
        </div>

      </div>
      <NoticeModal open={notice.open} title={notice.title} message={notice.message} variant={notice.variant} onClose={notice.hide} />
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
  categories = [],
  defaultCategorySlug,
  initialCategoryId,
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
  categories?: ForumCategory[];
  defaultCategorySlug?: string;
  initialCategoryId?: number | null;
}) {
  const { user } = useUser();
  const notice = useNotice();

  const defaultCategoryId =
    initialCategoryId !== undefined
      ? initialCategoryId
      : (categories.find((c) => c.slug === defaultCategorySlug)?.id ?? null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(defaultCategoryId);

  const THREAD_DRAFT_KEY = "forum_draft_new_thread";

  const [title, setTitle] = useState(() => {
    if (mode === "create") {
      return localStorage.getItem(THREAD_DRAFT_KEY)
        ? (JSON.parse(localStorage.getItem(THREAD_DRAFT_KEY)!) as { title?: string }).title ?? initialTitle
        : initialTitle;
    }
    return initialTitle;
  });
  const [md, setMd] = useState(() => {
    if (mode === "create") {
      return localStorage.getItem(THREAD_DRAFT_KEY)
        ? (JSON.parse(localStorage.getItem(THREAD_DRAFT_KEY)!) as { md?: string }).md ?? initialMd
        : initialMd;
    }
    return initialMd;
  });

  // Save draft (debounced 1 s) — create mode only
  useEffect(() => {
    if (mode !== "create") return;
    const timer = setTimeout(() => {
      if (title.trim() || md.trim()) {
        localStorage.setItem(THREAD_DRAFT_KEY, JSON.stringify({ title, md }));
      } else {
        localStorage.removeItem(THREAD_DRAFT_KEY);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, md, mode]);

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
        ...(selectedCategoryId ? { category_id: selectedCategoryId } : {}),
      });
      localStorage.removeItem(THREAD_DRAFT_KEY);
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
        category_id: selectedCategoryId ?? 0,  // 0 = unset on backend
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

        {categories.length > 0 && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id === selectedCategoryId ? null : cat.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    selectedCategoryId === cat.id
                      ? "border-slate-900 bg-slate-900 text-white dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-[#3a3028] dark:text-stone-300 dark:hover:bg-[#241d19]"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thread title"
          className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 dark:border-[#3a3028] dark:bg-[#18120f] dark:text-stone-100 dark:placeholder:text-stone-500"
        />

        {/* body with @-mention support */}
        <div className="mb-1">
          <MarkdownToolbar
            textareaRef={mdRef}
            value={md}
            onChange={setMd}
          />
        </div>
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
