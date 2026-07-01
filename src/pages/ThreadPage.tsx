import { useEffect, useRef, useState } from "react";
import {
  useParams,
  Link,
  useLocation,
  useSearchParams,
  useLoaderData,
} from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router";
import {
  createForumPost,
  deleteForumPost,
  type ForumPost,
  deleteMyForumPost,
  type ForumSeriesRef,
  type ForumThread,
  lockForumThread,
  updateForumThreadSettings,
  getPublicReadingList,
  editForumPost,
  setForumPostVote,
  getForumThreadPaged,
  reportPost,
  togglePostBookmark,
  toggleThreadFollow,
  markThreadRead,
} from "../api/manApi";
import { useUser } from "../login/useUser";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { stripMdHeading } from "../util/strings";
import RichReplyEditor from "../components/RichReplyEditor";

import rehypeRaw from "rehype-raw"; // Re-enable rehype-raw
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"; // Re-enable rehype-sanitize
import { ConfirmModal } from "../components/ConfirmModal";
import { useNotice } from "../hooks/useNotice";
import { NoticeModal } from "../components/NoticeModal";
import { PostVoteControl, type ForumVote } from "../components/PostVoteControl";
import UserAvatar from "../components/UserAvatar";
import { RankerBadge } from "../components/RankerBadge";
import { inlineUsernameClassName } from "../util/userDisplay";
import { timeAgo, fullTimestamp } from "../util/timeAgo";
import { getTopRankMap } from "../util/rankMap";
import { wasEdited } from "../util/dateUtils";
import {
  DEFAULT_SOCIAL_IMAGE,
  SITE_NAME,
  SITE_ORIGIN,
} from "../config/site";

// ⬇️ NEW: extend sanitize schema to allow <img> safely
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "img"],
  attributes: {
    ...(defaultSchema.attributes || {}),
    img: [
      // Only allow http(s) image sources
      ["src", /^https?:\/\//i],
      "alt",
      "title",
      "loading",
      "decoding",
      "width",
      "height",
      // you can add "referrerpolicy" if you want: e.g., "no-referrer"
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      ["href", /^https?:\/\//i], // ensure links are http(s) (optional, but safe)
      "target",
      "rel",
      "title",
    ],
  },
};

const pillBase =
  "inline-flex items-center gap-1 h-7 px-3 rounded-full border text-xs font-medium shadow-sm";
const pillAmber = "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300";
const pillIndigo = "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300";
const pillRose = "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50";

type AxiosLike = {
  message?: string;
  response?: { data?: { detail?: unknown } };
};

function toRoman(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return String(n);
  const vals = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ] as const;
  let num = Math.floor(n);
  let out = "";
  for (const [v, sym] of vals) {
    while (num >= v) {
      out += sym;
      num -= v;
    }
  }
  return out.toLowerCase();
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as AxiosLike;
    const detail = e.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      const msg = (detail as { message?: string }).message;
      if (typeof msg === "string") return msg;
    }
    if (e.message) return e.message;
  }
  return "An error occurred.";
}

const listPublicCache = new Map<string, boolean>();

function ListPillMaybeActive({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  // /lists/<token>[?...]
  const token = to.replace(/^\/lists\//, "").split(/[?#]/)[0];
  const [isPublic, setIsPublic] = useState<boolean | null>(
    listPublicCache.has(token) ? listPublicCache.get(token)! : null
  );

  useEffect(() => {
    if (isPublic !== null) return;
    let cancelled = false;
    (async () => {
      try {
        await getPublicReadingList(token);
        if (!cancelled) {
          listPublicCache.set(token, true);
          setIsPublic(true);
        }
      } catch {
        if (!cancelled) {
          listPublicCache.set(token, false);
          setIsPublic(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isPublic]);

  const base =
    "inline-flex items-center gap-1 h-7 px-3 rounded-full border text-xs font-medium shadow-sm";
  const activeClass =
    "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900/60 dark:hover:bg-emerald-950/45";

  // Unknown: show active styling while we check (optional)
  if (isPublic === null) {
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-200 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900/60`}
      >
        <span aria-hidden className="text-[11px]">
          L
        </span>
        <span className="truncate">{children}</span>
      </span>
    );
  }

  if (!isPublic) {
    // ⛔ Unshared now → gray pill, no link
    return (
      <span
        className={`${base} bg-gray-100 text-gray-500 ring-gray-200 dark:bg-[#241d19] dark:text-slate-400 dark:ring-[#3a3028]`}
        title="This list is no longer public"
      >
        <span aria-hidden className="text-[11px]">
          L
        </span>
        <span className="truncate">{children}</span>
      </span>
    );
  }

  // ✅ Public → green pill link
  return (
    <Link
      to={to}
      className={`${base} ${activeClass} no-underline`}
      title="Open reading list"
    >
      <span aria-hidden className="text-[11px]">
        L
      </span>
      <span className="truncate">{children}</span>
    </Link>
  );
}

// Reddit/YouTube-style branch rail geometry. A parent owns the visible rail
// for its direct replies, so the final curve can end naturally without a tail.
const RAIL_AVATAR = 32; // UserAvatar size="sm" (h-8 w-8)
const RAIL_GAP = 8; // gap between the avatar/rail column and the content
const RAIL_X = RAIL_AVATAR / 2;
const RAIL_CHILD_AVATAR_LEFT = RAIL_AVATAR + RAIL_GAP;
const RAIL_CHILD_CURVE_X = RAIL_X + 10;
const RAIL_ELBOW_RADIUS = 12;
const RAIL_START_Y = RAIL_AVATAR + 4;

/** Total number of nested descendants under a post (for the collapsed label). */
function countDescendants(
  postId: number,
  byParent: Record<number, ForumPost[]>
): number {
  const kids = byParent[postId] || [];
  let total = kids.length;
  for (const k of kids) total += countDescendants(k.id, byParent);
  return total;
}

function MarkdownProse({
  children,
  className,
  size = "base",
}: {
  children: string;
  className?: string;
  size?: "base" | "sm";
}) {
  // Remove [Title](series:123) and [Title](/series/123) from the markdown itself
  const safeMd = children
    // [Title](series:123)
    .replace(/\[([^\]]+?)\]\(\s*series:\s*\d+\s*\)/gi, "$1")
    // [Title](/series/123)  (also tolerate query/hash)
    .replace(/\[([^\]]+?)\]\(\s*\/series\/\d+(?:[?#][^)]+)?\s*\)/gi, "$1");

  return (
    <div
      className={`${
        size === "sm" ? "prose prose-sm" : "prose"
      } max-w-none prose-slate dark:prose-invert dark:prose-headings:text-stone-50 dark:prose-p:text-stone-200 dark:prose-strong:text-stone-50 dark:prose-li:text-stone-200 dark:prose-a:text-emerald-300 dark:prose-a:no-underline hover:dark:prose-a:text-emerald-200 dark:prose-hr:border-[#3a3028] dark:prose-blockquote:border-l-[#5b4b3e] dark:prose-blockquote:text-stone-300 dark:prose-code:text-emerald-200 dark:prose-pre:bg-[#18120f] dark:prose-pre:text-stone-100 ${
        className || ""
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, sanitizeSchema], // ⬅️ use our schema that allows <img> http(s)
        ]}
        components={{
          // Render http(s) images (schema already guarantees http(s))
          img: ({ src = "", alt = "", ...props }) => {
            return (
              <img
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                {...props}
              />
            );
          },

          // Keep your smart in-app linking behavior
          a: ({ children: linkChildren, href, ...props }) => {
            const url = String(href ?? "");

            if (/^https?:\/\/.+\.(?:png|jpe?g|webp|gif)$/i.test(url)) {
              return (
                <img
                  src={url}
                  alt={
                    typeof linkChildren === "string" ? linkChildren : "image"
                  }
                  loading="lazy"
                  decoding="async"
                  className="max-w-full rounded"
                />
              );
            }
            const isSeriesLink =
              /^series:\s*\d+$/i.test(url) ||
              /^\/series\/\d+(?:[/?#].*)?$/i.test(url);

            if (isSeriesLink) {
              return (
                <span className="font-medium text-slate-900 dark:text-stone-100">
                  {linkChildren}
                </span>
              );
            }

            if (url.startsWith("list:")) {
              const tokenOrId = url.slice("list:".length);
              const isToken = /\D/.test(tokenOrId);
              const to = isToken
                ? `/lists/${tokenOrId}`
                : `/my-lists#list-${tokenOrId}`;
              return (
                <ListPillMaybeActive to={to}>
                  {linkChildren}
                </ListPillMaybeActive>
              );
            }

            const toURL = (() => {
              try {
                const u = new URL(url, window.location.origin);
                if (
                  u.origin === window.location.origin &&
                  u.pathname.startsWith("/")
                ) {
                  return u.pathname + u.search + u.hash;
                }
              } catch {
                if (url.startsWith("/")) return url;
              }
              return null;
            })();

            if (toURL && /^\/lists\//.test(toURL)) {
              return (
                <ListPillMaybeActive to={toURL}>
                  {linkChildren}
                </ListPillMaybeActive>
              );
            }

            if (toURL) {
              return (
                <Link
                  to={toURL}
                  className="font-medium text-emerald-700 underline decoration-emerald-600/40 underline-offset-4 hover:text-emerald-600 hover:decoration-emerald-500 dark:text-emerald-300 dark:decoration-emerald-300/40 dark:hover:text-emerald-200 dark:hover:decoration-emerald-200"
                >
                  {linkChildren}
                </Link>
              );
            }

            const isExternal = /^https?:/i.test(url);
            return (
              <a
                {...props}
                href={url}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noreferrer" : undefined}
                className="font-medium text-emerald-700 underline decoration-emerald-600/40 underline-offset-4 hover:text-emerald-600 hover:decoration-emerald-500 dark:text-emerald-300 dark:decoration-emerald-300/40 dark:hover:text-emerald-200 dark:hover:decoration-emerald-200"
              >
                {linkChildren}
              </a>
            );
          },
        }}
      >
        {safeMd}
      </ReactMarkdown>
    </div>
  );
}

function LegacyThreadPager({
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
    <nav className="flex items-center gap-2 text-sm" aria-label="Pagination">
      <button
        className="px-2 py-1 border rounded disabled:opacity-50"
        onClick={() => onGo(page - 1)}
        // disabled={page <= 1}
        disabled={hasPrev === undefined ? page <= 1 : !hasPrev}
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
              className={`px-2 py-1 border rounded ${
                n === page ? "bg-gray-100 font-semibold" : ""
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
        className="px-2 py-1 border rounded disabled:opacity-50"
        onClick={() => onGo(page + 1)}
        // disabled={page >= totalPages}
        disabled={hasNext === undefined ? page >= totalPages : !hasNext}
      >
        Next
      </button>
    </nav>
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
    <nav className="flex items-center gap-2 text-sm" aria-label="Pagination">
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
            {gap && (
              <span className="px-1 text-slate-400 dark:text-stone-500">
                ...
              </span>
            )}
            <button
              className={`rounded-full border px-3 py-1.5 transition ${
                n === page
                  ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
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

void LegacyThreadPager;

const THREAD_PAGE_SIZE = 15;

const IMG_MD_RE = /!\[[^\]]*]\((?<src>https?:\/\/[^\s)]+)\)/i;
function firstImageFromMarkdown(md: string): string | null {
  const m = IMG_MD_RE.exec(md || "");
  return m?.groups?.src ?? null;
}
function safeText(s: string, max = 155): string {
  return (s || "")
    .replace(/[#*_`>]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

type ThreadLoaderData = {
  thread: ForumThread | null;
  posts: ForumPost[];
  totalTopLevel: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

// SSR loader: fetch the thread + first page of posts on the server so the
// discussion content + meta/JSON-LD are in the initial HTML for crawlers.
export async function loader({
  params,
}: LoaderFunctionArgs): Promise<ThreadLoaderData> {
  const threadId = Number(params.id);
  const empty: ThreadLoaderData = {
    thread: null,
    posts: [],
    totalTopLevel: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  };
  if (!Number.isFinite(threadId)) return empty;
  const r = await getForumThreadPaged(threadId, 1, THREAD_PAGE_SIZE).catch(
    () => null
  );
  if (!r) return empty;
  return {
    thread: r.thread ?? null,
    posts: r.posts ?? [],
    totalTopLevel: r.total_top_level ?? 0,
    totalPages: r.total_pages ?? 1,
    hasPrev: r.has_prev ?? false,
    hasNext: r.has_next ?? false,
  };
}

export function meta({
  data,
  params,
}: {
  data?: ThreadLoaderData;
  params: { id?: string };
}) {
  const thread = data?.thread ?? null;
  const posts = data?.posts ?? [];
  const canonical = `${SITE_ORIGIN}/forum/${params.id}`;
  const title = thread?.title
    ? `${thread.title} - Forum - ${SITE_NAME}`
    : `Forum thread - ${SITE_NAME}`;
  const op = posts[0];
  const raw = op?.content_markdown || "";
  const desc = safeText(raw, 155);
  const ogImage =
    (op ? firstImageFromMarkdown(op.content_markdown) : null) ||
    thread?.series_refs?.[0]?.cover_url ||
    DEFAULT_SOCIAL_IMAGE;
  const publishedTime = op ? new Date(op.created_at).toISOString() : undefined;
  const modifiedTime = op ? new Date(op.updated_at).toISOString() : undefined;
  const upvoteCount = op?.upvote_count ?? op?.heart_count ?? 0;
  const commentCount = Math.max(0, (thread?.post_count ?? 0) - 1);

  const threadJsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: thread?.title || "Forum thread",
    articleBody: safeText(raw, 10000),
    url: canonical,
    image: ogImage ? [ogImage] : undefined,
    datePublished: publishedTime,
    dateModified: modifiedTime,
    author: op?.author_username
      ? { "@type": "Person", name: op.author_username }
      : undefined,
    interactionStatistic: [
      upvoteCount > 0
        ? {
            "@type": "InteractionCounter",
            interactionType: { "@type": "LikeAction" },
            userInteractionCount: upvoteCount,
          }
        : null,
      commentCount > 0
        ? {
            "@type": "InteractionCounter",
            interactionType: { "@type": "CommentAction" },
            userInteractionCount: commentCount,
          }
        : null,
    ].filter(Boolean),
    commentCount,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forum", item: `${SITE_ORIGIN}/forum` },
      {
        "@type": "ListItem",
        position: 2,
        name: thread?.title || "Thread",
        item: canonical,
      },
    ],
  };

  return [
    { title },
    { tagName: "link", rel: "canonical", href: canonical },
    {
      name: "description",
      content: desc || "Read and reply to this Toon Ranks forum thread.",
    },
    {
      name: "robots",
      content:
        "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1",
    },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: "article" },
    { property: "og:url", content: canonical },
    { property: "og:title", content: thread?.title || "Forum thread" },
    {
      property: "og:description",
      content: desc || "Join the discussion on Toon Ranks.",
    },
    { property: "og:image", content: ogImage },
    ...(publishedTime
      ? [{ property: "article:published_time", content: publishedTime }]
      : []),
    ...(modifiedTime
      ? [{ property: "article:modified_time", content: modifiedTime }]
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: thread?.title || "Forum thread" },
    {
      name: "twitter:description",
      content: desc || "Join the discussion on Toon Ranks.",
    },
    { name: "twitter:image", content: ogImage },
    { "script:ld+json": threadJsonLd },
    { "script:ld+json": breadcrumbJsonLd },
  ];
}

export default function ThreadPage() {
  const { id } = useParams();
  const threadId = Number(id);
  const threadData = useLoaderData() as ThreadLoaderData | null;
  const [thread, setThread] = useState<ForumThread | null>(
    threadData?.thread ?? null
  );
  const [posts, setPosts] = useState<ForumPost[]>(threadData?.posts ?? []);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(THREAD_PAGE_SIZE);
  const [totalTopLevel, setTotalTopLevel] = useState(
    threadData?.totalTopLevel ?? 0
  );
  const [totalPages, setTotalPages] = useState(threadData?.totalPages ?? 1);
  const [hasPrev, setHasPrev] = useState(threadData?.hasPrev ?? false);
  const [hasNext, setHasNext] = useState(threadData?.hasNext ?? false);
  const skipInitialLoad = useRef(Boolean(threadData?.thread));
  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useUser();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  // 🔧 edit state kept in ThreadPage and passed down
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [originalReplyComposerOpen, setOriginalReplyComposerOpen] =
    useState(false);

  const notice = useNotice();
  const [rankMap, setRankMap] = useState<Record<string, number>>({});

  // ── Quote-reply state ────────────────────────────────────────────────────
  const [quoteKey, setQuoteKey] = useState(0);
  const [quoteInitial, setQuoteInitial] = useState("");
  const [quoteParentId, setQuoteParentId] = useState<number | null>(null);
  const bottomEditorRef = useRef<HTMLDivElement | null>(null);

  const handleQuote = (post: ForumPost) => {
    const quoted = post.content_markdown
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const attribution = `> **@${post.author_username ?? "?"}** wrote:\n${quoted}\n\n`;
    setQuoteInitial(attribution);
    setQuoteParentId(post.id);
    setQuoteKey((k) => k + 1);
    setTimeout(() => {
      bottomEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const loc = useLocation();

  // Fetch top-10 rank map once for byline badges
  useEffect(() => {
    getTopRankMap().then(setRankMap).catch(() => {});
  }, []);

  // Read page from URL
  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    setPage(Number.isFinite(p) && p > 0 ? p : 1);
  }, [searchParams]);

  // const load = async () => {
  //   const data = await getForumThread(threadId);
  //   setThread(data.thread);
  //   setPosts(data.posts);
  // };

  const load = async () => {
    const r = await getForumThreadPaged(threadId, page, pageSize);
    setThread(r.thread);
    setPosts(r.posts);
    setTotalTopLevel(r.total_top_level);
    setTotalPages(r.total_pages);
    setHasPrev(r.has_prev);
    setHasNext(r.has_next);
  };

  // useEffect(() => {
  //   load();
  // }, [threadId]);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, page]);

  // Mark thread as read after posts load (silent fail — non-critical)
  useEffect(() => {
    if (!user || !posts.length) return;
    const lastPostId = posts[posts.length - 1]?.id;
    if (!lastPostId) return;
    markThreadRead(threadId, lastPostId).catch(() => {});
  }, [posts, threadId, user]);

  // Scroll to a specific post when the URL contains a #post-{id} hash.
  // Fires after posts finish loading so the target element is in the DOM.
  useEffect(() => {
    if (!posts.length || !loc.hash.startsWith("#post-")) return;
    const el = document.getElementById(loc.hash.slice(1));
    if (!el) return;
    const timer = setTimeout(
      () => el.scrollIntoView({ behavior: "smooth", block: "start" }),
      80
    );
    return () => clearTimeout(timer);
  }, [posts, loc.hash]);

  // Called by ReplyBranch → enters edit mode for a specific post
  const handleBeginEdit = (postId: number, content: string) => {
    setEditPostId(postId);
    setEditContent(content);
  };

  const handleSaveEdit = async (content: string, seriesIds: number[]) => {
    if (editPostId == null) return;
    try {
      await editForumPost(threadId, editPostId, {
        content_markdown: content,
        series_ids: seriesIds,
      });
      // Reload to reflect changes (or optimistically update state)
      await load();
    } catch (e: unknown) {
      // alert(getErrorMessage(e) || "Failed to save changes.");
      notice.show({
        message: getErrorMessage(e) || "Failed to save changes.",
        title: "Save failed",
        variant: "error",
      });
      return; // do not close editor if save failed
    }
    setEditPostId(null);
    setEditContent("");
  };

  const handleCancelEdit = () => {
    setEditPostId(null);
    setEditContent("");
  };

  const reportHref = `/report-issue?page_url=${encodeURIComponent(
    `${SITE_ORIGIN}${loc.pathname.replace(/\/+$/, "")}`
  )}`;

  const goToPage = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    const qp: Record<string, string> = {};
    qp.page = String(next);
    setSearchParams(qp); // triggers useEffect → load()
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
{!thread ? (
        <ThreadPageSkeleton />
      ) : (
        <>
      <header className="mb-4 space-y-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Link
              to="/forum"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))] dark:text-slate-200 dark:hover:bg-[#241d19]"
            >
              <span aria-hidden>←</span>
              <span>Forum</span>
            </Link>
            {thread?.category_name && (
              <>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {thread.category_name}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
              {stripMdHeading(thread!.title)}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              {thread?.locked && (
                <span className={`${pillBase} ${pillAmber}`} title="Locked">
                  🔒 Locked
                </span>
              )}
              {thread?.latest_first && (
                <span
                  className={`${pillBase} ${pillIndigo}`}
                  title="Newest updates show first"
                >
                  🛈 Latest updates first
                </span>
              )}

              {user && (
                <button
                  type="button"
                  onClick={async () => {
                    const wasFollowing = !!thread?.viewer_is_following;
                    setThread((t) => t ? { ...t, viewer_is_following: !wasFollowing } : t);
                    try {
                      await toggleThreadFollow(thread!.id);
                    } catch {
                      setThread((t) => t ? { ...t, viewer_is_following: wasFollowing } : t);
                      notice.show({ title: "Action failed", message: "Could not update follow.", variant: "error" });
                    }
                  }}
                  className={`${pillBase} ${
                    thread?.viewer_is_following
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-[#3a3028] dark:bg-transparent dark:text-slate-300 dark:hover:border-emerald-700/60 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-300"
                  }`}
                >
                  {thread?.viewer_is_following ? "✓ Following" : "Follow"}
                </button>
              )}

              <Link
                to={reportHref}
                className={`${pillBase} ${pillRose}`}
                title="Report a bug or issue about this thread"
              >
                🐞 Report issue
              </Link>

              {isAdmin && (
                <ThreadAdminMenu
                  locked={!!thread?.locked}
                  latestFirst={!!thread?.latest_first}
                  onToggleLock={async () => {
                    const next = !thread!.locked;
                    try {
                      await lockForumThread(thread!.id, next);
                      setThread((t) => (t ? { ...t, locked: next } : t));
                    } catch (e) {
                      notice.show({
                        message:
                          (e as { message?: string }).message ||
                          "Failed to toggle lock.",
                        title: "Action failed",
                        variant: "error",
                      });
                    }
                  }}
                  onToggleLatestFirst={async () => {
                    const next = !thread!.latest_first;
                    try {
                      await updateForumThreadSettings(thread!.id, {
                        latest_first: next,
                      });
                      setThread((t) => (t ? { ...t, latest_first: next } : t));
                    } catch (e) {
                      notice.show({
                        message:
                          (e as { message?: string }).message ||
                          "Failed to update ordering.",
                        title: "Action failed",
                        variant: "error",
                      });
                    }
                  }}
                />
              )}
            </div>
          </div>

          {(() => {
            const headerRefs: ForumSeriesRef[] =
              posts[0]?.series_refs && posts[0].series_refs.length > 0
                ? posts[0].series_refs
                : thread?.series_refs ?? [];

            return headerRefs.length ? (
              <div className="mt-2 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Referenced series
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Quick links tied to the opening post.
                  </p>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-3">
                  {headerRefs.map((s) => (
                    <SeriesMiniCard key={s.series_id} s={s} />
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </header>

      <section className="space-y-4">
        {posts[0] && (
          <article
            id={`post-${posts[0].id}`}
            className="rounded-md px-3 py-3 sm:px-4"
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      Original post
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      {posts[0].author_username ? (
                        <>
                          <Link
                            to={`/user/${posts[0].author_username}`}
                            className="inline-flex items-center gap-1.5 hover:underline"
                          >
                            <UserAvatar
                              username={posts[0].author_username}
                              avatarUrl={posts[0].author_avatar_url}
                              avatarPreset={posts[0].author_avatar_preset}
                              size="sm"
                              className="h-6 w-6 text-[10px]"
                            />
                            <span className={inlineUsernameClassName(posts[0].author_role)}>
                              {posts[0].author_username}
                            </span>
                          </Link>
                          <span
                            className="rounded bg-blue-100 px-1 py-px text-[10px] font-bold uppercase leading-none tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                            title="Original poster"
                          >
                            OP
                          </span>
                          <RankerBadge rank={rankMap[posts[0].author_username]} />
                        </>
                      ) : (
                        <>
                          <UserAvatar
                            username="Anonymous"
                            avatarUrl={null}
                            avatarPreset={null}
                            size="sm"
                            className="h-6 w-6 text-[10px]"
                          />
                          <span className={inlineUsernameClassName(null)}>
                            Anonymous
                          </span>
                        </>
                      )}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      suppressHydrationWarning
                      title={fullTimestamp(posts[0].created_at)}
                    >
                      {timeAgo(posts[0].created_at)}
                    </span>
                    {wasEdited(posts[0].created_at, posts[0].updated_at) && (
                      <span className="text-xs italic text-slate-400 dark:text-slate-500">(edited)</span>
                    )}
                  </div>

            <div className="mt-2 space-y-4">
                {editPostId === posts[0].id ? (
                  <div className="mt-1">
                    <RichReplyEditor
                      mode="edit"
                      initial={editContent}
                      threadId={threadId}
                      editingPostId={posts[0].id}
                      onSubmit={async (content, seriesIds) => {
                        await handleSaveEdit(content, seriesIds);
                      }}
                      onCancel={handleCancelEdit}
                    />
                  </div>
                ) : (
                  <MarkdownProse
                    size="sm"
                    className="text-slate-700 dark:text-slate-200 prose-p:my-2 prose-p:leading-[1.55] prose-li:my-1"
                  >
                    {posts[0].content_markdown}
                  </MarkdownProse>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PostVoteControl
                    initialVote={(posts[0].viewer_vote ?? null) as ForumVote | null}
                    initialUpvotes={posts[0].upvote_count ?? posts[0].heart_count ?? 0}
                    initialDownvotes={posts[0].downvote_count ?? 0}
                    label="Original post votes"
                    onVote={async (vote) => {
                      try {
                        const result = await setForumPostVote(threadId, posts[0].id, vote);
                        return {
                          ok: true,
                          viewerVote: result.viewer_vote,
                          upvoteCount: result.upvote_count,
                          downvoteCount: result.downvote_count,
                        };
                      } catch {
                        notice.show({
                          title: "Action failed",
                          message: "Could not update your vote.",
                          variant: "error",
                        });
                        return { ok: false };
                      }
                    }}
                  />
                  {!thread?.latest_first ? (
                    !thread?.locked || isAdmin ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOriginalReplyComposerOpen((open) => !open)
                        }
                        aria-expanded={originalReplyComposerOpen}
                        className="inline-flex items-center px-1.5 py-1 text-sm font-medium text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                      >
                        Reply
                      </button>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                        Replies are locked.
                      </span>
                    )
                  ) : null}
                  {!thread?.latest_first &&
                    originalReplyComposerOpen &&
                    (!thread?.locked || isAdmin) && (
                      <div className="mt-2 w-full basis-full">
                        <RichReplyEditor
                          compact
                          threadId={threadId}
                          onCancel={() => setOriginalReplyComposerOpen(false)}
                          onSubmit={async (content, seriesIds) => {
                            if (!user) {
                              notice.show({
                                message:
                                  "You need to be logged in to post a reply.",
                                title: "Sign in required",
                                variant: "warning",
                              });
                              return;
                            }

                            const trimmed = content.trim();
                            if (!trimmed) {
                              notice.show({
                                message: "Reply cannot be empty.",
                                title: "Cannot post",
                                variant: "warning",
                              });
                              return;
                            }

                            try {
                              const p = await createForumPost(threadId, {
                                content_markdown: trimmed,
                                series_ids: seriesIds,
                                parent_id: posts[0].id,
                              });
                              setPosts((prev) => [...prev, p]);
                              setOriginalReplyComposerOpen(false);
                            } catch (err: unknown) {
                              notice.show({
                                message:
                                  getErrorMessage(err) ||
                                  "Failed to post reply.",
                                title: "Post failed",
                                variant: "error",
                              });
                            }
                          }}
                        />
                      </div>
                    )}
                </div>

                {/* Reply composer — directly under the original post (Reddit-style),
                    inviting replies and separating the OP from the comments below. */}
                <div ref={bottomEditorRef} className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {thread?.latest_first ? "Add an update" : "Join the conversation"}
                  </h3>
                    {!thread?.locked || isAdmin ? (
                      <RichReplyEditor
                        key={quoteKey}
                        compact={false}
                        threadId={threadId}
                        initial={quoteInitial}
                        onSubmit={async (content, seriesIds) => {
                          if (!user) {
                            notice.show({
                              message: "You need to be logged in to post a reply.",
                              title: "Sign in required",
                              variant: "warning",
                            });
                            return;
                          }
                          const trimmed = content.trim();
                          if (!trimmed) {
                            notice.show({
                              message: "Reply cannot be empty.",
                              title: "Cannot post",
                              variant: "warning",
                            });
                            return;
                          }
                          try {
                            const p = await createForumPost(threadId, {
                              content_markdown: trimmed,
                              series_ids: seriesIds,
                              parent_id: quoteParentId ?? undefined,
                            });
                            setPosts((prev) => [...prev, p]);
                            setQuoteInitial("");
                            setQuoteParentId(null);
                          } catch (err: unknown) {
                            notice.show({
                              message:
                                getErrorMessage(err) || "Failed to post reply.",
                              title: "Post failed",
                              variant: "error",
                            });
                          }
                        }}
                      />
                    ) : (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                        This thread is locked. Only admins can add new replies.
                      </div>
                    )}
                </div>

              {(() => {
                const byParent: Record<number, ForumPost[]> = {};
                posts.slice(1).forEach((p) => {
                  const pid = p.parent_id && p.parent_id > 0 ? p.parent_id : 0;
                  (byParent[pid] ||= []).push(p);
                });

                const originalReplies = (byParent[posts[0].id] || []).sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime()
                );

                return originalReplies.length ? (
                  <div className="mt-3 space-y-2">
                    {originalReplies.map((p, idx) => (
                      <ReplyBranch
                        key={p.id}
                        post={p}
                        depth={1}
                        topIndex={idx + 1}
                        byParent={byParent}
                        threadId={threadId}
                        reload={load}
                        isAdmin={isAdmin}
                        currentUsername={user?.username || null}
                        locked={!!thread?.locked}
                        isUpdatesMode={!!thread?.latest_first}
                        editingPostId={editPostId}
                        editInitial={editContent}
                        onBeginEdit={handleBeginEdit}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={handleCancelEdit}
                        onPostCreated={(post) =>
                          setPosts((prev) => [...prev, post])
                        }
                        onQuote={handleQuote}
                        notify={notice.show}
                        rankMap={rankMap}
                        opUsername={posts[0]?.author_username ?? null}
                      />
                    ))}
                  </div>
                ) : null;
              })()}

            </div>
          </article>
        )}

        {/* TOP controls (pager) */}
        {totalPages > 1 && (
          <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-white/95 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-[#322922] dark:bg-[#1b1613]/95 dark:shadow-[0_12px_30px_rgba(0,0,0,0.5)] sm:px-5">
            <div className="flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-300 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>
                <span className="hidden text-slate-300 sm:inline">/</span>
                <span>
                  Top-level replies: <strong>{totalTopLevel}</strong>
                </span>
              </div>
              <Pager
                page={page}
                totalPages={totalPages}
                hasPrev={hasPrev}
                hasNext={hasNext}
                onGo={goToPage}
              />
            </div>
          </div>
        )}

                {(() => {
          const byParent: Record<number, ForumPost[]> = {};
          posts.slice(1).forEach((p) => {
            const pid = p.parent_id && p.parent_id > 0 ? p.parent_id : 0;
            (byParent[pid] ||= []).push(p);
          });

          const topLevel = (byParent[0] || []).sort((a, b) => {
            const ta = new Date(a.created_at).getTime();
            const tb = new Date(b.created_at).getTime();
            return thread?.latest_first ? tb - ta : ta - tb;
          });

          // const reload = async () => {
          //   const data = await getForumThread(threadId);
          //   setThread(data.thread);
          //   setPosts(data.posts);
          // };

          const reload = async () => {
            const r = await getForumThreadPaged(threadId, page, pageSize);
            setThread(r.thread);
            setPosts(r.posts);
          };

          return (
            <>
              {topLevel.map((p, idx) => (
                <ReplyBranch
                  key={p.id}
                  post={p}
                  depth={0}
                  topIndex={idx + 1}
                  byParent={byParent}
                  threadId={threadId}
                  reload={reload}
                  isAdmin={isAdmin}
                  currentUsername={user?.username || null}
                  locked={!!thread?.locked}
                  isUpdatesMode={!!thread?.latest_first}
                  // 🔽 edit wiring
                  editingPostId={editPostId}
                  editInitial={editContent}
                  onBeginEdit={handleBeginEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onPostCreated={(post) =>
                    setPosts((prev) => [...prev, post])
                  }
                  onQuote={handleQuote}
                  notify={notice.show}
                  rankMap={rankMap}
                  opUsername={posts[0]?.author_username ?? null}
                />
              ))}
            </>
          );
        })()}
      </section>

      {/* BOTTOM controls (pager) */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pager page={page} totalPages={totalPages} onGo={goToPage} />
        </div>
      )}

        </>
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

/** Admin "⋯" overflow for thread-level moderation (Lock, reply ordering). */
function ThreadAdminMenu({
  locked,
  latestFirst,
  onToggleLock,
  onToggleLatestFirst,
}: {
  locked: boolean;
  latestFirst: boolean;
  onToggleLock: () => void;
  onToggleLatestFirst: () => void;
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Thread admin actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${pillBase} border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#3a3028] dark:bg-transparent dark:text-slate-300 dark:hover:bg-[#241d19]`}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,rgba(30,24,20,0.99),rgba(21,17,14,0.99))]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onToggleLock();
            }}
            className={itemClass}
          >
            {locked ? "Unlock thread" : "Lock thread"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onToggleLatestFirst();
            }}
            className={itemClass}
          >
            {latestFirst ? "Show oldest first" : "Show latest first"}
          </button>
        </div>
      )}
    </div>
  );
}

function ThreadPageSkeleton() {
  const block = "rounded bg-slate-200 dark:bg-slate-700/50";
  return (
    <div className="animate-pulse space-y-4">
      <div className="mb-4 space-y-3">
        <div className={`h-8 w-28 rounded-full ${block}`} />
        <div className={`h-7 w-2/3 ${block}`} />
      </div>

      {/* OP card */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white dark:border-[#322922] dark:bg-[#1b1613]">
        <div className="border-b border-slate-200/70 px-5 py-4 dark:border-[#322922] sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`h-5 w-20 rounded-full ${block}`} />
            <div className={`h-6 w-6 rounded-full ${block}`} />
            <div className={`h-4 w-28 ${block}`} />
            <div className={`h-4 w-32 ${block}`} />
          </div>
        </div>
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <div className="space-y-3 rounded-3xl border border-slate-200/80 p-4 dark:border-[#322922] sm:p-5">
            <div className={`h-4 w-full ${block}`} />
            <div className={`h-4 w-5/6 ${block}`} />
            <div className={`h-4 w-3/4 ${block}`} />
            <div className="mt-4 flex gap-3 border-t border-slate-200/80 pt-4 dark:border-[#3a3028]">
              <div className={`h-8 w-16 rounded-full ${block}`} />
              <div className={`h-8 w-16 rounded-full ${block}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Reply skeletons */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white dark:border-[#322922] dark:bg-[#1b1613]"
        >
          <div className="space-y-3 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className={`h-5 w-24 rounded-full ${block}`} />
              <div className={`h-6 w-6 rounded-full ${block}`} />
              <div className={`h-4 w-28 ${block}`} />
            </div>
            <div className={`h-4 w-3/4 ${block}`} />
            <div className="flex gap-3">
              <div className={`h-7 w-14 rounded-full ${block}`} />
              <div className={`h-7 w-14 rounded-full ${block}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReplyBranch({
  post,
  depth,
  topIndex,
  byParent,
  threadId,
  reload,
  isAdmin,
  currentUsername,
  locked,
  isUpdatesMode,
  // 🔽 edit props from ThreadPage
  editingPostId,
  editInitial,
  onBeginEdit,
  onSaveEdit,
  onCancelEdit,
  onPostCreated,
  onQuote,
  notify,
  rankMap,
  opUsername,
}: {
  post: ForumPost;
  depth: number;
  topIndex: number;
  byParent: Record<number, ForumPost[]>;
  threadId: number;
  reload: () => Promise<void>;
  isAdmin: boolean;
  currentUsername: string | null;
  locked: boolean;
  isUpdatesMode: boolean;

  editingPostId: number | null;
  editInitial: string;
  onBeginEdit: (postId: number, content: string) => void;
  onSaveEdit: (content: string, seriesIds: number[]) => Promise<void> | void;
  onCancelEdit: () => void;
  onPostCreated: (post: ForumPost) => void;
  onQuote?: (post: ForumPost) => void;
  notify: (opts: {
    title?: string;
    message: string | React.ReactNode;
    variant?: "info" | "success" | "warning" | "error";
  }) => void;
  rankMap: Record<string, number>;
  opUsername: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [replyComposerOpen, setReplyComposerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reported, setReported] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(!!post.viewer_has_bookmarked);
  const branchRef = useRef<HTMLDivElement | null>(null);
  const childRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [railSvg, setRailSvg] = useState<{ d: string; height: number } | null>(
    null
  );
  const [railHover, setRailHover] = useState(false);

  const idxRoman = toRoman(topIndex);
  const isOp = !!post.author_username && post.author_username === opUsername;

  // const labelText = isTopLevel
  //   ? isUpdatesMode
  //     ? `Update #${topIndex}`
  //     : `Reply #${topIndex}`
  //   : isUpdatesMode
  //   ? `↳ Comment on Update #${topIndex}`
  //   : `↳ Reply to ${
  //       post.author_username ? `@${post.author_username} ` : ""
  //     }#${topIndex}`;

  const children = (byParent[post.id] || []).sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const canModify =
    isAdmin ||
    (!!currentUsername && currentUsername === (post.author_username || null));

  const handleDelete = async () => {
    if (!canModify) return;
    setConfirmOpen(true); // open the modal instead of window.confirm
  };

  const actuallyDelete = async () => {
    if (!canModify) return;
    try {
      setBusyDelete(true);
      if (isAdmin) {
        await deleteForumPost(threadId, post.id);
      } else {
        await deleteMyForumPost(threadId, post.id);
      }
      await reload();
      setConfirmOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ||
        (err as Error)?.message ||
        "Failed to delete post.";
      // alert(msg);
      notify({
        message: msg,
        title: "Delete failed",
        variant: "error",
      });
    } finally {
      setBusyDelete(false);
    }
  };

  const isEditingThis = editingPostId === post.id;
  const collapsedCount = collapsed ? countDescendants(post.id, byParent) : 0;
  const childIds = children.map((child) => child.id).join(",");

  useEffect(() => {
    if (collapsed || children.length === 0) {
      setRailSvg(null);
      return;
    }

    const branch = branchRef.current;
    if (!branch) return;

    const updateRail = () => {
      const branchTop = branch.getBoundingClientRect().top;
      const childCenters = children
        .map((child) => childRefs.current[child.id])
        .filter((node): node is HTMLDivElement => !!node)
        .map(
          (node) =>
            node.getBoundingClientRect().top - branchTop + RAIL_AVATAR / 2
        );

      if (childCenters.length === 0) {
        setRailSvg(null);
        return;
      }

      const lastCenter = childCenters[childCenters.length - 1];
      const lastCurveStart = Math.max(
        RAIL_START_Y,
        lastCenter - RAIL_ELBOW_RADIUS
      );
      const d = [
        `M ${RAIL_X} ${RAIL_START_Y} V ${lastCurveStart}`,
        ...childCenters.map((center) => {
          const curveStart = Math.max(RAIL_START_Y, center - RAIL_ELBOW_RADIUS);
          return `M ${RAIL_X} ${curveStart} Q ${RAIL_X} ${center} ${RAIL_CHILD_CURVE_X} ${center} H ${RAIL_CHILD_AVATAR_LEFT}`;
        }),
      ].join(" ");
      const next = { d, height: Math.ceil(lastCenter + 1) };

      setRailSvg((current) =>
        current?.d === next.d && current.height === next.height ? current : next
      );
    };

    updateRail();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateRail)
        : null;
    resizeObserver?.observe(branch);
    children.forEach((child) => {
      const node = childRefs.current[child.id];
      if (node) resizeObserver?.observe(node);
    });
    window.addEventListener("resize", updateRail);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateRail);
    };
  }, [childIds, children, collapsed]);

  return (
    <div ref={branchRef} className="relative flex" style={{ gap: RAIL_GAP }}>
      {railSvg && (
        <svg
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 z-0 overflow-visible transition-colors ${
            railHover
              ? "text-slate-500 dark:text-slate-500"
              : "text-slate-400/70 dark:text-[#3a3028]"
          }`}
          fill="none"
          height={railSvg.height}
          width={RAIL_CHILD_AVATAR_LEFT + 1}
          viewBox={`0 0 ${RAIL_CHILD_AVATAR_LEFT + 1} ${railSvg.height}`}
        >
          <path
            d={railSvg.d}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1"
          />
        </svg>
      )}
      {/* Avatar + rail column — the rail runs from this comment's avatar down
          its entire subtree as one continuous, fully-clickable line. */}
      <div
        className="relative flex shrink-0 flex-col items-center"
        style={{ width: RAIL_AVATAR }}
      >
        {post.author_username ? (
          <Link
            to={`/user/${post.author_username}`}
            className="relative z-10 transition hover:opacity-90"
            title={post.author_username}
          >
            <UserAvatar
              username={post.author_username}
              avatarUrl={post.author_avatar_url}
              avatarPreset={post.author_avatar_preset}
              size="sm"
            />
          </Link>
        ) : (
          <span className="relative z-10">
            <UserAvatar
              username="Anonymous"
              avatarUrl={null}
              avatarPreset={null}
              size="sm"
            />
          </span>
        )}
        {collapsed && children.length > 0 && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expand thread"
            title="Expand thread"
            className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold leading-none text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-[#4a3c31] dark:bg-[#18120f] dark:text-slate-400 dark:hover:bg-[#241d19] dark:hover:text-slate-200"
          >
            +
          </button>
        )}
        {!collapsed && children.length > 0 && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            onMouseEnter={() => setRailHover(true)}
            onMouseLeave={() => setRailHover(false)}
            onFocus={() => setRailHover(true)}
            onBlur={() => setRailHover(false)}
            aria-label="Collapse thread"
            aria-expanded={true}
            title="Collapse thread"
            className="group relative mt-1 w-full flex-1 cursor-pointer outline-none"
          >
            {/* A left border (not a bg block) so it renders pixel-identically to
                the child elbow's border — same width/anti-aliasing — and the two
                read as one continuous line. Pinned to the avatar centre. */}
            <span className="sr-only">Collapse thread</span>
          </button>
        )}
      </div>

      {/* Content column */}
      <div className="min-w-0 flex-1">
        <article
          id={`post-${post.id}`}
          className="rounded-md px-2 py-1"
        >
          <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {isUpdatesMode && (
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Update {idxRoman}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 font-medium">
              {post.author_username ? (
                <>
                  <Link
                    to={`/user/${post.author_username}`}
                    className="hover:underline"
                  >
                    <span className={inlineUsernameClassName(post.author_role)}>
                      {post.author_username}
                    </span>
                  </Link>
                  {isOp && (
                    <span
                      className="rounded bg-blue-100 px-1 py-px text-[10px] font-bold uppercase leading-none tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      title="Original poster"
                    >
                      OP
                    </span>
                  )}
                  <RankerBadge rank={rankMap[post.author_username]} />
                </>
              ) : (
                <span className={inlineUsernameClassName(null)}>Anonymous</span>
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span suppressHydrationWarning title={fullTimestamp(post.created_at)}>
              {timeAgo(post.created_at)}
            </span>
            {wasEdited(post.created_at, post.updated_at) && (
              <span className="italic text-slate-400 dark:text-slate-500">
                · edited
              </span>
            )}
            {collapsed && collapsedCount > 0 && (
              <span className="text-slate-400 dark:text-slate-500">
                ({collapsedCount} {collapsedCount === 1 ? "reply" : "replies"})
              </span>
            )}
          </div>

        {/* Content OR Editor */}
        {isEditingThis ? (
          <div className="mt-1">
            <RichReplyEditor
              mode="edit"
              initial={editInitial || post.content_markdown}
              threadId={threadId}
              editingPostId={post.id}
              onSubmit={async (content, seriesIds) => {
                await onSaveEdit(content, seriesIds);
              }}
              onCancel={onCancelEdit}
              compact
            />
          </div>
        ) : (
          <MarkdownProse
            size="sm"
            className="text-slate-700 dark:text-slate-200 prose-p:my-2 prose-p:leading-[1.55] prose-li:my-1"
          >
            {post.content_markdown}
          </MarkdownProse>
        )}

        {post.series_refs?.length ? (
          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
            {post.series_refs.map((s) => (
              <SeriesMiniCard key={s.series_id} s={s} />
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PostVoteControl
            initialVote={(post.viewer_vote ?? null) as ForumVote | null}
            initialUpvotes={post.upvote_count ?? post.heart_count ?? 0}
            initialDownvotes={post.downvote_count ?? 0}
            label="Reply votes"
            onVote={async (vote) => {
              try {
                const result = await setForumPostVote(threadId, post.id, vote);
                return {
                  ok: true,
                  viewerVote: result.viewer_vote,
                  upvoteCount: result.upvote_count,
                  downvoteCount: result.downvote_count,
                };
              } catch {
                notify({
                  title: "Action failed",
                  message: "Could not update your vote.",
                  variant: "error",
                });
                return { ok: false };
              }
            }}
          />

          {/* Bookmark button — visible to authenticated users */}
          {!isUpdatesMode ? (
            !locked || isAdmin ? (
              <button
                type="button"
                onClick={() => setReplyComposerOpen((open) => !open)}
                aria-expanded={replyComposerOpen}
                className="inline-flex items-center px-1.5 py-1 text-sm font-medium text-blue-700 transition hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
              >
                Reply
              </button>
            ) : (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                Replies are locked.
              </span>
            )
          ) : null}

          {currentUsername && (
            <button
              type="button"
              onClick={async () => {
                const prev = bookmarked;
                setBookmarked(!prev);
                try {
                  await togglePostBookmark(threadId, post.id);
                } catch {
                  setBookmarked(prev);
                  notify({ title: "Action failed", message: "Could not update bookmark.", variant: "error" });
                }
              }}
              title={bookmarked ? "Remove bookmark" : "Bookmark this post"}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
                bookmarked
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-300"
                  : "border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-[#3a3028] dark:text-slate-400 dark:hover:border-amber-700/60 dark:hover:bg-amber-950/20 dark:hover:text-amber-300"
              }`}
            >
              {bookmarked ? "🔖 Saved" : "🔖"}
            </button>
          )}

          {/* Report button — visible to authenticated non-authors on unlocked threads */}
          {(onQuote ||
            (canModify && !isEditingThis) ||
            (currentUsername &&
              currentUsername !== post.author_username &&
              !reported)) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActionMenuOpen((open) => !open)}
                aria-expanded={actionMenuOpen}
                aria-label="More comment actions"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-[#3a3028] dark:text-slate-400 dark:hover:bg-[#241d19] dark:hover:text-slate-100"
              >
                ...
              </button>
              {actionMenuOpen && (
                <div className="absolute right-0 z-30 mt-2 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg dark:border-[#3a3028] dark:bg-[#18120f]">
                  {!locked && onQuote && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onQuote(post);
                      }}
                      className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#241d19]"
                    >
                      Quote
                    </button>
                  )}
                  {canModify && !isEditingThis && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        onBeginEdit(post.id, post.content_markdown);
                      }}
                      className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#241d19]"
                    >
                      Edit
                    </button>
                  )}
                  {canModify && !isEditingThis && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleDelete();
                      }}
                      className="block w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20"
                    >
                      Delete
                    </button>
                  )}
                  {currentUsername &&
                    currentUsername !== post.author_username &&
                    !reported && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionMenuOpen(false);
                          setReportFormOpen((open) => !open);
                        }}
                        className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#241d19]"
                      >
                        Report
                      </button>
                    )}
                </div>
              )}
            </div>
          )}

          {reportFormOpen && !reported && (
            <div
              className="w-full mt-2 rounded-2xl border border-rose-200 bg-rose-50/60 px-3 py-3 dark:border-rose-800/40 dark:bg-rose-950/20"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                Report this post
              </p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                maxLength={500}
                placeholder="Reason (optional)"
                rows={2}
                className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 dark:border-rose-800/40 dark:bg-[#18120f] dark:text-slate-100"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={reportBusy}
                  onClick={async () => {
                    setReportBusy(true);
                    try {
                      await reportPost(threadId, post.id, reportReason.trim() || undefined);
                      setReported(true);
                      setReportFormOpen(false);
                      notify({ message: "Report submitted. Our team will review it.", variant: "success" });
                    } catch (err: unknown) {
                      const status = (err as { response?: { status?: number } })?.response?.status;
                      if (status === 409) {
                        notify({ message: "You have already reported this post.", variant: "warning" });
                      } else {
                        notify({ message: "Failed to submit report.", variant: "error" });
                      }
                    } finally {
                      setReportBusy(false);
                    }
                  }}
                  className="rounded-full bg-rose-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50 hover:bg-rose-700"
                >
                  {reportBusy ? "Submitting..." : "Submit report"}
                </button>
                <button
                  type="button"
                  onClick={() => { setReportFormOpen(false); setReportReason(""); }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!isUpdatesMode && replyComposerOpen && (!locked || isAdmin) && (
            <div className="mt-2 w-full basis-full">
              <RichReplyEditor
                compact
                threadId={threadId}
                onCancel={() => setReplyComposerOpen(false)}
                onSubmit={async (content, seriesIds) => {
                  if (!content.trim()) {
                    notify({
                      message: "Reply cannot be empty.",
                      title: "Cannot post",
                      variant: "warning",
                    });
                    return;
                  }
                  try {
                    const createdPost = await createForumPost(threadId, {
                      content_markdown: content.trim(),
                      series_ids: seriesIds,
                      parent_id: post.id,
                    });
                    setReplyComposerOpen(false);
                    onPostCreated(createdPost);
                  } catch (err: unknown) {
                    notify({
                      message: getErrorMessage(err) || "Failed to post reply.",
                      title: "Post failed",
                      variant: "error",
                    });
                  }
                }}
              />
            </div>
          )}
        </div>
      </article>

      <ConfirmModal
        open={confirmOpen}
        title="Delete this post?"
        message={
          <div>
            <div className="mb-2">This action cannot be undone.</div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.96),_rgba(18,15,12,0.96))] dark:text-stone-300">
              {/* Small preview of the content */}
              {post.content_markdown.length > 140
                ? post.content_markdown.slice(0, 140) + "..."
                : post.content_markdown || "(no content)"}
            </div>
          </div>
        }
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        busy={busyDelete}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={actuallyDelete}
      />

        {!collapsed && children.length > 0 && (
          <div className="mt-1 space-y-1">
            {children.map((child) => (
              <div
                key={child.id}
                ref={(node) => {
                  childRefs.current[child.id] = node;
                }}
              >
                <ReplyBranch
                  post={child}
                  depth={depth + 1}
                  topIndex={topIndex}
                  byParent={byParent}
                  threadId={threadId}
                  reload={reload}
                  isAdmin={isAdmin}
                  currentUsername={currentUsername}
                  locked={locked}
                  isUpdatesMode={isUpdatesMode}
                  editingPostId={editingPostId}
                  editInitial={editInitial}
                  onBeginEdit={onBeginEdit}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onPostCreated={onPostCreated}
                  onQuote={onQuote}
                  notify={notify}
                  rankMap={rankMap}
                  opUsername={opUsername}
                />
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
  );
}

function SeriesMiniCard({ s }: { s: ForumSeriesRef }) {
  const statusClasses: Record<string, string> = {
    ONGOING:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200",
    COMPLETE:
      "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
    HIATUS:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
    UNKNOWN:
      "bg-gray-100 text-gray-700 dark:bg-[#241d19] dark:text-stone-300",
  };
  const statusKey = (s.status || "").toUpperCase();
  const statusClass =
    statusClasses[statusKey] ||
    "bg-gray-100 text-gray-700 dark:bg-[#241d19] dark:text-stone-300";

  return (
    <Link
      to={`/series/${s.series_id}`}
      className="group flex w-full items-start gap-3 rounded-lg border bg-white p-2 hover:shadow dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.96),_rgba(21,17,14,0.96))]"
      title={s.title || `#${s.series_id}`}
    >
      {s.cover_url ? (
        <img
          src={s.cover_url}
          alt={s.title || `Series #${s.series_id}`}
          className="h-16 w-12 shrink-0 rounded bg-gray-200 object-cover dark:bg-[#241d19]"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="h-16 w-12 shrink-0 rounded bg-gray-200 dark:bg-[#241d19]" />
      )}

      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
          {s.title || `#${s.series_id}`}
        </div>

        <div className="mt-1 flex flex-wrap gap-1">
          {s.type && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700 dark:bg-[#241d19] dark:text-slate-300">
              {s.type}
            </span>
          )}
          {s.status && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${statusClass}`}
            >
              {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
