import { Link } from "react-router-dom";
import { absoluteUrl, SITE_NAME, SITE_ORIGIN } from "../config/site";
import { getAllArticles, readingTimeMinutes } from "../content/articles";

const PAGE_TITLE = `Articles | ${SITE_NAME}`;
const PAGE_DESCRIPTION =
  "Guides, explainers, and recommendations for manga, manhwa, and manhua readers — from the Toon Ranks community.";

export function meta() {
  const articles = getAllArticles();
  return [
    { title: PAGE_TITLE },
    { name: "description", content: PAGE_DESCRIPTION },
    { property: "og:title", content: PAGE_TITLE },
    { property: "og:description", content: PAGE_DESCRIPTION },
    { property: "og:url", content: absoluteUrl("/articles") },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: `${SITE_NAME} Articles`,
        url: absoluteUrl("/articles"),
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_ORIGIN },
        blogPost: articles.map((a) => ({
          "@type": "BlogPosting",
          headline: a.title,
          description: a.description,
          datePublished: a.publishedAt,
          dateModified: a.updatedAt,
          author: { "@type": "Organization", name: a.author },
          url: absoluteUrl(`/articles/${a.slug}`),
        })),
      },
    },
  ];
}

export function links() {
  return [{ rel: "canonical", href: absoluteUrl("/articles") }];
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

export default function ArticlesIndexPage() {
  const articles = getAllArticles();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
          {SITE_NAME}
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
          Articles
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Guides, explainers, and recommendations for manga, manhwa, and manhua
          readers — written by the Toon Ranks community.
        </p>
      </header>

      <div className="space-y-4">
        {articles.map((article) => (
          <Link
            key={article.slug}
            to={`/articles/${article.slug}`}
            className="group block rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md dark-theme-card sm:p-7"
          >
            {article.image && (
              <img
                src={article.image.src}
                alt={article.image.alt}
                className="mb-4 aspect-[16/9] w-full rounded-2xl object-cover"
                loading="lazy"
              />
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{formatDate(article.publishedAt)}</span>
              <span aria-hidden="true">·</span>
              <span>{readingTimeMinutes(article)} min read</span>
            </div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 transition group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300 sm:text-2xl">
              {article.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {article.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-[#241d19] dark:text-slate-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
