import { Link } from "react-router-dom";
import { getRelatedArticles, readingTimeMinutes } from "../content/articles";

/**
 * "From the blog" module shown on a series page. Surfaces a few relevant
 * articles (preferring the series' type) to give readers a next step and to
 * build internal links between series pages and editorial content (SEO + AdSense
 * value). Renders nothing when there are no articles to show.
 */
export default function RelatedArticles({ seriesType }: { seriesType?: string }) {
  const articles = getRelatedArticles(seriesType, 3);
  if (articles.length === 0) return null;

  return (
    <section className="mt-8 overflow-visible rounded-[30px] border border-slate-200 bg-white/95 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] dark-theme-shell">
      <div className="border-b border-slate-200/80 px-5 py-5 dark:border-[#342a23] sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          From the blog
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Related reading
        </h2>
      </div>

      <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.slug}
            to={`/articles/${article.slug}`}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md dark-theme-card"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {readingTimeMinutes(article)} min read
            </span>
            <h3 className="mt-1 text-sm font-bold tracking-tight text-slate-950 transition group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300">
              {article.title}
            </h3>
            <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
              {article.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="px-5 pb-5 sm:px-6">
        <Link
          to="/articles"
          className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-300"
        >
          Browse all articles →
        </Link>
      </div>
    </section>
  );
}
