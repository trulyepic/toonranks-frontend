import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Image as ImageIcon } from "lucide-react";
import {
  fetchMyFollowing,
  fetchMyBookmarks,
  type ForumThread,
  type ForumPost,
} from "../api/manApi";
import { timeAgo } from "../util/timeAgo";

type PersonalView = "following" | "saved";

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), "img"],
  attributes: {
    ...(defaultSchema.attributes || {}),
    img: [
      ["src", /^https?:\/\//i],
      "alt",
      "title",
      "loading",
      "decoding",
      "width",
      "height",
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      ["href", /^https?:\/\//i],
      "title",
    ],
  },
};

function hasMarkdownImage(markdown: string): boolean {
  return (
    /!\[[^\]]*]\(\s*https?:\/\/[^)]+\)/i.test(markdown) ||
    /\[[^\]]*]\(\s*https?:\/\/[^)]+\.(?:png|jpe?g|webp|gif)(?:[?#][^)]*)?\s*\)/i.test(markdown)
  );
}

/**
 * The personalized forum views ("Following" + "Bookmarked") shown to logged-in
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
        {view === "following" ? "followed threads" : "bookmarked posts"}. Please try
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

  // Bookmarked posts
  if (posts.length === 0) {
    return (
      <EmptyState
        title="No bookmarked posts yet"
        body="Bookmark a reply to save it here. Open any post and tap the bookmark icon to keep it for later."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {posts.map((p) => {
        const href = p.thread_id ? `/forum/${p.thread_id}#post-${p.id}` : "/forum";
        const hasImage = hasMarkdownImage(p.content_markdown);
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
                {hasImage ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/30 dark:text-sky-300">
                    <ImageIcon className="h-3 w-3" aria-hidden="true" />
                    Image
                  </span>
                ) : null}
              </div>
              <BookmarkedPostPreview markdown={p.content_markdown} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BookmarkedPostPreview({ markdown }: { markdown: string }) {
  const safeMd = markdown
    .replace(/\[([^\]]+?)\]\(\s*series:\s*\d+\s*\)/gi, "$1")
    .replace(/\[([^\]]+?)\]\(\s*\/series\/\d+(?:[?#][^)]+)?\s*\)/gi, "$1")
    .trim();

  if (!safeMd) {
    return (
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
        (no content)
      </p>
    );
  }

  return (
    <div className="mt-1 max-h-48 overflow-hidden text-sm text-slate-700 dark:text-slate-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          p: ({ children }) => (
            <p className="my-1 leading-6 first:mt-0 last:mb-0">{children}</p>
          ),
          img: ({ src = "", alt = "", ...props }) => (
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="mt-2 max-h-40 max-w-full rounded-lg object-contain"
              {...props}
            />
          ),
          a: ({ children, href }) => {
            const url = String(href ?? "");
            if (/^https?:\/\/.+\.(?:png|jpe?g|webp|gif)$/i.test(url)) {
              return (
                <img
                  src={url}
                  alt={typeof children === "string" ? children : "image"}
                  loading="lazy"
                  decoding="async"
                  className="mt-2 max-h-40 max-w-full rounded-lg object-contain"
                />
              );
            }

            return (
              <span className="font-medium text-slate-900 dark:text-stone-100">
                {children}
              </span>
            );
          },
          ul: ({ children }) => (
            <ul className="my-1 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-slate-300 pl-3 text-slate-500 dark:border-[#5b4b3e] dark:text-stone-400">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-[#18120f]">
              {children}
            </code>
          ),
        }}
      >
        {safeMd}
      </ReactMarkdown>
    </div>
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
