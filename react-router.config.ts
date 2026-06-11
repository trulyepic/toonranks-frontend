import type { Config } from "@react-router/dev/config";

// Phase 3: real SSR. Every route is rendered on the server, so the full content
// (including dynamic /series/:id pages and series added after the last build) is
// in the initial HTML that crawlers and AdSense receive — no client round-trip,
// no per-route static files, no trailing-slash redirects.
//
// Requires a Node host (the server build, run via react-router-serve) instead of
// static-only hosting.
export default {
  appDirectory: "src",
  ssr: true,
} satisfies Config;
