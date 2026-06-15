/**
 * AndroidAppBanner
 *
 * A small, dismissible bottom banner shown only to Android browser visitors,
 * inviting them to get the Toon Ranks Android app on Google Play.
 *
 * SSR safety: this app server-renders (ssr: true), so we never touch
 * `navigator`/`localStorage` during render. We start hidden and only decide
 * to reveal inside an effect on the client — same pattern as CookieBanner.
 *
 * Collision: CookieBanner is also a fixed bottom banner. To avoid stacking the
 * two, we stay hidden until the cookie-consent choice has been made (the
 * "cookie-consent" key with `decided: true`, written by CookieBanner). They
 * therefore appear in sequence, never at once.
 */

import { useEffect, useState } from "react";
import { PLAY_STORE_URL } from "../config/site";

const DISMISS_KEY = "android-app-banner-dismissed";
const COOKIE_CONSENT_KEY = "cookie-consent";

function isAndroidBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function cookieConsentDecided(): boolean {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.decided === true;
  } catch {
    return false;
  }
}

function alreadyDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

export default function AndroidAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAndroidBrowser() || alreadyDismissed()) return;

    // Only show once the cookie banner has been dealt with, so the two
    // bottom-fixed banners never overlap. Poll briefly for the decision.
    if (cookieConsentDecided()) {
      setVisible(true);
      return;
    }

    const interval = window.setInterval(() => {
      if (cookieConsentDecided()) {
        setVisible(true);
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // ignore storage failures — just hide for this session
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Get the Toon Ranks Android app"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] shadow-[0_-8px_32px_-8px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-[#322922]/80 dark:bg-[#18120f]/95"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/toonranks-app-icon.png"
            alt=""
            aria-hidden="true"
            className="h-9 w-9 shrink-0 rounded-lg"
          />
          <p className="min-w-0 text-sm leading-snug text-slate-700 dark:text-slate-200">
            <span className="font-semibold text-slate-900 dark:text-white">
              Toon Ranks
            </span>{" "}
            is available on Android.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Get app
          </a>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-300 dark:hover:bg-[#241d19]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
