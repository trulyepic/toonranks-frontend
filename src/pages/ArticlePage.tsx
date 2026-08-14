import { Link, useLoaderData } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { absoluteUrl, SITE_NAME, SITE_ORIGIN, DEFAULT_SOCIAL_IMAGE } from "../config/site";
import {
  getArticleBySlug,
  readingTimeMinutes,
  type Article,
} from "../content/articles";

type ArticleLoaderData = { article: Article };

// SSR loader: resolve the article on the server so the full text is in the
// initial HTML. Unknown slugs return a real 404 (not a soft-404 200).
export async function loader({ params }: LoaderFunctionArgs): Promise<ArticleLoaderData> {
  const article = getArticleBySlug(params.slug ?? "");
  if (!article) {
    throw new Response("Article not found", { status: 404 });
  }
  return { article };
}

export function meta({ data }: { data?: ArticleLoaderData }) {
  const article = data?.article;
  if (!article) {
    return [
      { title: `Article not found | ${SITE_NAME}` },
      { name: "robots", content: "noindex, nofollow" },
    ];
  }
  const url = absoluteUrl(`/articles/${article.slug}`);
  const title = `${article.title} | ${SITE_NAME}`;
  const image = article.image
    ? article.image.src.startsWith("http")
      ? article.image.src
      : absoluteUrl(article.image.src)
    : DEFAULT_SOCIAL_IMAGE;
  return [
    { title },
    { name: "description", content: article.description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:title", content: article.title },
    { property: "og:description", content: article.description },
    { property: "og:url", content: url },
    { property: "og:type", content: "article" },
    { property: "article:published_time", content: article.publishedAt },
    { property: "article:modified_time", content: article.updatedAt },
    { property: "og:image", content: image },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: article.title },
    { name: "twitter:description", content: article.description },
    { name: "twitter:image", content: image },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        author: { "@type": "Organization", name: article.author },
        publisher: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_ORIGIN,
          logo: { "@type": "ImageObject", url: DEFAULT_SOCIAL_IMAGE },
        },
        image,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        keywords: article.tags.join(", "),
      },
    },
  ];
}

function formatDate(iso: string): string {
  // timeZone: "UTC" so a YYYY-MM-DD renders as the intended calendar date and
  // stays identical between SSR (server TZ) and client (avoids hydration drift).
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function ArticleTitleCard({ article }: { article: Article }) {
  const card = article.titleCard;
  if (!card) return null;

  const content = (
    <div className="my-7 rounded-lg border border-slate-200 bg-slate-50 p-5 not-prose shadow-sm transition hover:border-blue-300 hover:bg-white hover:shadow-md dark:border-[#3a3028] dark:bg-[#1d1714] dark:hover:border-blue-500/60 dark:hover:bg-[#211a16]">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
        {card.eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
        {card.title}
      </h2>
      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
        {card.subtitle}
      </p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {card.meta}
      </p>
      {card.href && (
        <p className="mt-4 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white dark:bg-blue-500">
          {card.cta ?? "Open title"}
        </p>
      )}
    </div>
  );

  return card.href ? (
    <Link to={card.href} className="block no-underline" aria-label={`Open ${card.title}`}>
      {content}
    </Link>
  ) : (
    content
  );
}

function ArticleBody({ article }: { article: Article }) {
  const marker = "{{titleCard}}";
  const parts = article.body.split(marker);

  if (parts.length === 1) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {article.body}
      </ReactMarkdown>
    );
  }

  return (
    <>
      {parts.map((part, index) => (
        <div key={index}>
          {part.trim() && (
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {part}
            </ReactMarkdown>
          )}
          {index < parts.length - 1 && <ArticleTitleCard article={article} />}
        </div>
      ))}
    </>
  );
}

export default function ArticlePage() {
  const { article } = useLoaderData() as ArticleLoaderData;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
      <Link
        to="/articles"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        ← All articles
      </Link>

      <article className="mt-6">
        <header className="border-b border-slate-200 pb-6 dark:border-[#322922]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{formatDate(article.publishedAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{readingTimeMinutes(article)} min read</span>
            <span aria-hidden="true">·</span>
            <span>{article.author}</span>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-3 text-lg leading-7 text-slate-600 dark:text-slate-300">
            {article.description}
          </p>
        </header>

        {article.image && (
          <img
            src={article.image.src}
            alt={article.image.alt}
            className="mt-8 aspect-[16/9] w-full rounded-2xl border border-slate-200 object-cover dark:border-[#322922]"
            loading="lazy"
          />
        )}

        <div className="prose prose-slate mt-8 max-w-none dark:prose-invert prose-headings:font-black prose-headings:tracking-tight prose-a:text-blue-600 dark:prose-a:text-blue-300 prose-img:rounded-xl">
          <ArticleBody article={article} />
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-200 pt-6 dark:border-[#322922]">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-[#241d19] dark:text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </article>

      {/* Internal links back into the product: crawl paths plus a next step for readers. */}
      <div className="mt-10 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark-theme-card">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">
          Find your next series
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Browse community rankings for manga, manhwa, and manhua, or see how the
          scores are calculated.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Browse rankings
          </Link>
          <Link
            to="/how-rankings-work"
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-300 dark:hover:bg-[#241d19]"
          >
            How rankings work
          </Link>
          <Link
            to="/articles"
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-300 dark:hover:bg-[#241d19]"
          >
            More articles
          </Link>
        </div>
      </div>
    </div>
  );
}
