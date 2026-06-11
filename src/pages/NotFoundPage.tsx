// src/pages/NotFoundPage.tsx

import { Link } from "react-router-dom";
import { HomeIcon, ChatBubbleLeftRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { SITE_NAME } from "../config/site";
import { infoPageBodyText, infoPageHeadingText, infoPageSubtleText } from "../util/infoPageStyles";

// Return a real HTTP 404 (not a soft-404/200) for unknown URLs so search engines
// drop them instead of indexing empty pages. The loader throws a 404 Response and
// the ErrorBoundary below renders this page.
export function loader() {
  throw new Response("Not Found", { status: 404 });
}

export function meta() {
  return [
    { title: `404 — Page Not Found | ${SITE_NAME}` },
    { name: "robots", content: "noindex, nofollow" },
    { name: "description", content: "This page could not be found." },
  ];
}

const NotFoundPage = () => {
  return (
    <div className="max-w-2xl mx-auto py-24 px-4 text-center">

      {/* Large 404 badge */}
      <div className="inline-flex items-center justify-center mb-8">
        <span
          className="
            text-[7rem] sm:text-[9rem] font-black leading-none tracking-tighter select-none
            bg-[linear-gradient(135deg,_#315ff4,_#2347c5)]
            dark:bg-[linear-gradient(135deg,_rgba(45,212,191,0.9),_rgba(59,130,246,0.85))]
            bg-clip-text text-transparent
          "
        >
          404
        </span>
      </div>

      {/* Heading */}
      <h1 className={`text-2xl sm:text-3xl font-bold mb-3 ${infoPageHeadingText}`}>
        This page went on hiatus.
      </h1>

      {/* Sub-message */}
      <p className={`text-base sm:text-lg mb-2 ${infoPageBodyText}`}>
        The page you're looking for doesn't exist, was moved, or the URL may have a typo.
      </p>
      <p className={`text-sm mb-10 ${infoPageSubtleText}`}>
        If you followed a link from somewhere, the content may have been removed or renamed.
      </p>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        <Link
          to="/"
          className="
            flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all
            bg-white dark:bg-[#1e1712]
            border-slate-200 dark:border-[#2e2520]
            hover:border-blue-400 dark:hover:border-blue-600
            hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]
            hover:-translate-y-0.5
            group
          "
        >
          <HomeIcon className="w-6 h-6 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span className={`text-sm font-semibold ${infoPageHeadingText}`}>Rankings</span>
          <span className={`text-xs ${infoPageSubtleText}`}>Back to the home page</span>
        </Link>

        <Link
          to="/forum"
          className="
            flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all
            bg-white dark:bg-[#1e1712]
            border-slate-200 dark:border-[#2e2520]
            hover:border-blue-400 dark:hover:border-blue-600
            hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]
            hover:-translate-y-0.5
            group
          "
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span className={`text-sm font-semibold ${infoPageHeadingText}`}>Forum</span>
          <span className={`text-xs ${infoPageSubtleText}`}>Browse discussions</span>
        </Link>

        <Link
          to="/contact"
          className="
            flex flex-col items-center gap-2 p-5 rounded-2xl border transition-all
            bg-white dark:bg-[#1e1712]
            border-slate-200 dark:border-[#2e2520]
            hover:border-blue-400 dark:hover:border-blue-600
            hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]
            hover:-translate-y-0.5
            group
          "
        >
          <MagnifyingGlassIcon className="w-6 h-6 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
          <span className={`text-sm font-semibold ${infoPageHeadingText}`}>Contact</span>
          <span className={`text-xs ${infoPageSubtleText}`}>Report a broken link</span>
        </Link>
      </div>

      {/* Inline back link */}
      <button
        onClick={() => window.history.back()}
        className={`text-sm underline underline-offset-2 cursor-pointer ${infoPageSubtleText} hover:text-blue-500 dark:hover:text-blue-400 transition-colors`}
      >
        ← Go back to where you were
      </button>
    </div>
  );
};

export default NotFoundPage;

// The loader always throws a 404, so this is what actually renders for unknown
// URLs — giving a 404 status with the friendly page above.
export function ErrorBoundary() {
  return <NotFoundPage />;
}
