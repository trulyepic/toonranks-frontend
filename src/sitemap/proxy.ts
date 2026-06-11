// Replicates the old Amplify rewrites that proxied the sitemap paths to the
// backend (status 200, target https://api.toonranks.com/...). Under SSR these are
// resource routes: the loader fetches the XML from the backend and returns it
// verbatim so /sitemap.xml, /sitemap-static.xml and /sitemaps/* keep serving real
// XML on the www host (what Google Search Console crawls), not the app HTML.

const API_BASE =
  (import.meta.env.VITE_APP_BASE_URL as string | undefined)?.replace(
    /\/$/,
    ""
  ) ?? "https://api.toonranks.com";

export async function proxySitemap(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  const target = `${API_BASE}${pathname}`;
  try {
    const upstream = await fetch(target, {
      headers: { Accept: "application/xml,text/xml" },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ??
          "application/xml; charset=utf-8",
        // Sitemaps change as series/threads are added; an hour is plenty.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Sitemap temporarily unavailable", { status: 502 });
  }
}
