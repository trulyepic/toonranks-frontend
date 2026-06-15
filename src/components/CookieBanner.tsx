/**
 * CookieBanner
 *
 * Shown on first visit. User can Accept all cookies or open a Manage
 * preferences modal to choose per-category. Choice is persisted to
 * localStorage under "cookie-consent" and Google Consent Mode v2 is
 * updated accordingly.
 *
 * Consent categories:
 *   necessary   — always on, no toggle
 *   analytics   — Google Analytics / gtag
 *   advertising — Google AdSense (once added)
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent";

type ConsentState = {
  necessary: true;
  analytics: boolean;
  advertising: boolean;
};

type SavedConsent = ConsentState & { decided: true };

function loadConsent(): SavedConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.decided === true) return parsed as SavedConsent;
    return null;
  } catch {
    return null;
  }
}

function saveConsent(state: ConsentState): void {
  const saved: SavedConsent = { ...state, decided: true };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

/** Push choices into Google Consent Mode v2 */
function applyGoogleConsent(state: ConsentState): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  w.gtag("consent", "update", {
    analytics_storage: state.analytics ? "granted" : "denied",
    ad_storage: state.advertising ? "granted" : "denied",
    ad_user_data: state.advertising ? "granted" : "denied",
    ad_personalization: state.advertising ? "granted" : "denied",
  });
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [advertising, setAdvertising] = useState(true);

  useEffect(() => {
    const saved = loadConsent();
    if (!saved) {
      setVisible(true);
    } else {
      // Re-apply on every page load so consent state is always current
      applyGoogleConsent(saved);
    }
  }, []);

  function acceptAll() {
    const state: ConsentState = { necessary: true, analytics: true, advertising: true };
    saveConsent(state);
    applyGoogleConsent(state);
    setVisible(false);
  }

  function savePreferences() {
    const state: ConsentState = { necessary: true, analytics, advertising };
    saveConsent(state);
    applyGoogleConsent(state);
    setVisible(false);
    setShowModal(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* ── Banner ── */}
      <div
        role="dialog"
        aria-live="polite"
        aria-label="Cookie consent"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-4 pt-4 pb-[calc(1rem_+_env(safe-area-inset-bottom))] shadow-[0_-8px_32px_-8px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-[#322922]/80 dark:bg-[#18120f]/95"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            We use cookies to improve your experience and show relevant ads.{" "}
            <a
              href="/privacy"
              className="underline hover:text-slate-900 dark:hover:text-white"
            >
              Learn more
            </a>
            .
          </p>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-300 dark:hover:bg-[#241d19]"
            >
              Manage
            </button>
            <button
              onClick={acceptAll}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>

      {/* ── Preferences modal ── */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cookie preferences"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#322922] dark:bg-[#1e1612]">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Cookie preferences
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose which cookies you allow. Necessary cookies cannot be
              disabled — they are required for the site to function.
            </p>

            <div className="mt-5 space-y-4">
              {/* Necessary — always on */}
              <PreferenceRow
                label="Necessary"
                description="Authentication, security, and core site features."
                checked={true}
                disabled
                onChange={() => {}}
              />

              {/* Analytics */}
              <PreferenceRow
                label="Analytics"
                description="Helps us understand how visitors use the site (Google Analytics)."
                checked={analytics}
                onChange={setAnalytics}
              />

              {/* Advertising */}
              <PreferenceRow
                label="Advertising"
                description="Used to show relevant ads and measure ad performance (Google AdSense)."
                checked={advertising}
                onChange={setAdvertising}
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-300 dark:hover:bg-[#241d19]"
              >
                Cancel
              </button>
              <button
                onClick={savePreferences}
                className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Save preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────

interface PreferenceRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (val: boolean) => void;
}

function PreferenceRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: PreferenceRowProps) {
  const id = `cookie-pref-${label.toLowerCase()}`;
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {label}
          {disabled && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-[#2a211c] dark:text-slate-400">
              Always on
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={[
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer",
          checked
            ? "bg-blue-600 dark:bg-blue-500"
            : "bg-slate-200 dark:bg-[#3a3028]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
