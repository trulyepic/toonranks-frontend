import { absoluteUrl } from "../config/site";
import { getAllArticles } from "../content/articles";

// Resource route for /sitemap-articles.xml. Articles are defined in the
// frontend (src/content/articles.ts), so the backend-proxied sitemaps can't
// include them — this generates their <urlset> here. Declared in robots.txt so
// crawlers discover it.
export function loader(): Response {
  const articles = getAllArticles();
  const urls = [
    { loc: absoluteUrl("/articles"), lastmod: articles[0]?.updatedAt },
    ...articles.map((a) => ({
      loc: absoluteUrl(`/articles/${a.slug}`),
      lastmod: a.updatedAt,
    })),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>` +
          (u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "") +
          `\n  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
