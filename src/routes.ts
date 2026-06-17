import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Mirrors the old App.tsx <Routes> block. Paths are relative to `src/`
// (appDirectory). Each file is an existing page component reused as-is.
export default [
  index("pages/Home.tsx"),
  route("login", "pages/LoginPage.tsx"),
  route("signup", "pages/SignupPage.tsx"),
  route("forgot-password", "pages/ForgotPasswordPage.tsx"),
  route("reset-password", "pages/ResetPasswordPage.tsx"),
  route("series/:id", "pages/SeriesDetailPage.tsx"),
  route("contact", "pages/ContactPage.tsx"),
  route("verify-email", "pages/VerifyEmailPage.tsx"),
  route("check-your-email", "pages/CheckYourEmailPage.tsx"),
  route("type/:seriesType", "pages/FilteredSeriesPage.tsx"),
  route("about", "pages/AboutPage.tsx"),
  route("terms", "pages/TermsPage.tsx"),
  route("privacy", "pages/PrivacyPage.tsx"),
  route("how-rankings-work", "pages/RankingsInfoPage.tsx"),
  route("compare", "pages/ComparePage.tsx"),
  route("account", "pages/AccountPage.tsx"),
  route("user/:username", "pages/UserProfilePage.tsx"),
  route("leaderboard", "pages/LeaderboardPage.tsx"),
  route("my-lists", "pages/MyReadingListsPage.tsx"),
  route("my-submissions", "pages/MySubmissionsPage.tsx"),
  route("pending-titles", "pages/PendingTitlesPage.tsx"),
  route("admin/reports", "pages/AdminReportsPage.tsx"),
  route("issues", "pages/IssuesPage.tsx"),
  route("report-issue", "pages/ReportIssuePage.tsx"),
  route("forum", "pages/ForumPage.tsx"),
  route("forum/:id", "pages/ThreadPage.tsx"),
  route("lists/:token", "pages/PublicReadingListPage.tsx"),
  route("articles", "pages/ArticlesIndexPage.tsx"),
  route("articles/:slug", "pages/ArticlePage.tsx"),

  // Sitemap proxies (resource routes) — replicate the old Amplify rewrites that
  // served these XML files from the backend on the www host. Must be registered
  // before the "*" catch-all so they aren't swallowed by it.
  route("sitemap.xml", "sitemap/sitemapIndex.ts"),
  route("sitemap-static.xml", "sitemap/sitemapStatic.ts"),
  route("sitemap-articles.xml", "sitemap/sitemapArticles.ts"),
  route("sitemaps/*", "sitemap/sitemapsSplat.ts"),

  route("*", "pages/NotFoundPage.tsx"),
] satisfies RouteConfig;
