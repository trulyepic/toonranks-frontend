/**
 * GetAndroidAppCard
 *
 * A small, always-visible card on the logged-in Account page inviting the user
 * to get the Toon Ranks Android app. This is the highest-intent placement —
 * the user already cares about their saved lists, ratings, and forum activity,
 * so "keep doing this on Android" lands well here.
 *
 * Unlike AndroidAppBanner, this is NOT Android-gated: a desktop or iOS user may
 * still want it on their phone. The "Available on Google Play" label keeps it
 * honest for non-Android users. No dismiss — it's a quiet, permanent card.
 */

import { PLAY_STORE_URL } from "../config/site";

export function GetAndroidAppCard() {
  return (
    <section className="mt-8">
      <div className="flex flex-col items-start gap-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark-theme-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/toonranks-app-icon.png"
            alt=""
            aria-hidden="true"
            className="h-14 w-14 shrink-0 rounded-2xl shadow-sm"
          />
          <div>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">
              Use Toon Ranks on Android
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Your lists, ratings, and forum activity — everywhere you go.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 512 512"
              className="h-4 w-4"
              fill="currentColor"
            >
              <path d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
            </svg>
            Get the app
          </a>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Available on Google Play
          </span>
        </div>
      </div>
    </section>
  );
}
